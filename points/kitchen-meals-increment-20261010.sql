-- Run after kitchen-increment-20261008.sql, as postgres. Safe to rerun.
-- Existing meals, reviews and score logs are preserved, without guessing legacy meal times.
BEGIN;
ALTER TABLE public.points_kitchen_orders ADD COLUMN IF NOT EXISTS meal_mode boolean NOT NULL DEFAULT false;
ALTER TABLE public.points_kitchen_orders DROP CONSTRAINT IF EXISTS points_kitchen_orders_meal_check;
ALTER TABLE public.points_kitchen_orders ADD CONSTRAINT points_kitchen_orders_meal_check CHECK(meal IN ('早饭','午饭','晚饭'));
-- Reuse a dated legacy meal only when its slot is unambiguous; duplicate histories stay intact.
UPDATE public.points_kitchen_orders o SET meal_mode=true,items=(
  SELECT jsonb_agg(x || jsonb_build_object('made',o.status IN ('completed','settled'),'requested',o.origin='admin') ORDER BY n)
  FROM jsonb_array_elements(o.items) WITH ORDINALITY AS d(x,n))
WHERE NOT o.meal_mode AND o.meal_date IS NOT NULL AND o.meal IS NOT NULL AND o.status NOT IN ('cancelled','rejected')
  AND (SELECT count(*) FROM public.points_kitchen_orders other WHERE other.member_id=o.member_id
    AND other.meal_date=o.meal_date AND other.meal=o.meal AND other.status NOT IN ('cancelled','rejected'))=1;
CREATE UNIQUE INDEX IF NOT EXISTS points_kitchen_meal_slot ON public.points_kitchen_orders(member_id,meal_date,meal)
  WHERE meal_mode AND status NOT IN ('cancelled','rejected');
DO $$ BEGIN
  IF to_regprocedure('points_kitchen_v2.legacy_write(text,jsonb,uuid)') IS NULL THEN
    ALTER FUNCTION points_kitchen_v2.write(text,jsonb,uuid) RENAME TO legacy_write;
  END IF;
END $$;
-- Old clients cannot replace a meal snapshot or bypass its completion rules.
CREATE OR REPLACE FUNCTION points_kitchen_v2.write(p_kind text,p_payload jsonb,p_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_payload->>'p_order_id' IS NULL OR EXISTS(SELECT 1 FROM public.points_kitchen_orders WHERE id=(p_payload->>'p_order_id')::bigint AND meal_mode) THEN
    RAISE EXCEPTION 'Meal client upgrade required' USING errcode='40001';
  END IF;
  RETURN points_kitchen_v2.legacy_write(p_kind,p_payload,p_operation_id);
END $$;
CREATE OR REPLACE FUNCTION points_kitchen_v2.snapshot(p_id bigint)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT public.points_kitchen_order_json(o.id) || jsonb_build_object('meal_mode',o.meal_mode,
    'draft',CASE WHEN public.points_is_admin() THEN coalesce((SELECT ratings FROM public.points_kitchen_drafts
      WHERE order_id=o.id AND user_id=auth.uid()),'[]'::jsonb) ELSE '[]'::jsonb END,
    'versions',coalesce((SELECT jsonb_agg(to_jsonb(v)-'order_id'-'changed_by' ORDER BY version)
      FROM public.points_kitchen_versions v WHERE v.order_id=o.id),'[]'::jsonb))
  FROM public.points_kitchen_orders o WHERE o.id=p_id;
$$;
CREATE OR REPLACE FUNCTION public.points_kitchen_v3_get_state(p_before bigint DEFAULT NULL,p_month date DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT public.points_kitchen_v2_get_state(p_before,p_month) || '{"meal_supported":true}'::jsonb;
$$;
CREATE OR REPLACE FUNCTION public.points_kitchen_v3_get_order(p_order_id bigint)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT public.points_kitchen_v2_get_order(p_order_id);
$$;
CREATE OR REPLACE FUNCTION public.points_kitchen_v3_get_meal(p_meal_date date,p_meal text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE a text:=points_kitchen_v2.actor(); result jsonb;
BEGIN
  IF p_meal_date IS NULL OR p_meal IS NULL OR p_meal NOT IN ('早饭','午饭','晚饭') THEN
    RAISE EXCEPTION 'Invalid meal' USING errcode='22023';
  END IF;
  SELECT points_kitchen_v2.snapshot(o.id) INTO result FROM public.points_kitchen_orders o
    JOIN public.members m ON m.id=o.member_id AND m.active
    WHERE o.meal_mode AND o.meal_date=p_meal_date AND o.meal=p_meal AND o.status NOT IN ('cancelled','rejected');
  RETURN result;
END $$;
CREATE OR REPLACE FUNCTION points_kitchen_v2.meal_write(p_kind text,p_payload jsonb,p_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
#variable_conflict use_variable
DECLARE a text:=points_kitchen_v2.actor(); member bigint; op public.points_kitchen_operations;
  o public.points_kitchen_orders; id bigint:=(p_payload->>'p_order_id')::bigint;
  ver integer:=(p_payload->>'p_version')::integer; mealday date:=(p_payload->>'p_meal_date')::date;
  mealname text:=p_payload->>'p_meal'; items jsonb:='[]'; entry jsonb; previous jsonb; cooked boolean;
  cancelled boolean:=coalesce((p_payload->>'p_cancel')::boolean,false); pending_count integer; seen integer;
BEGIN
  IF p_operation_id IS NULL THEN RAISE EXCEPTION 'Operation ID required' USING errcode='22023'; END IF;
  IF p_kind NOT IN ('meal_admin_save','meal_guest_save','meal_resolve','meal_review') THEN
    RAISE EXCEPTION 'Invalid operation' USING errcode='22023';
  END IF;
  IF (p_kind IN ('meal_admin_save','meal_review') AND a='guest') OR (p_kind IN ('meal_guest_save','meal_resolve') AND a<>'guest') THEN
    RAISE EXCEPTION 'Wrong role' USING errcode='42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_operation_id::text,0));
  SELECT * INTO op FROM public.points_kitchen_operations WHERE operation_id=p_operation_id;
  IF FOUND THEN
    IF op.actor IS DISTINCT FROM auth.uid() OR op.kind NOT IN (p_kind,CASE p_kind WHEN 'meal_review' THEN 'admin_review' WHEN 'meal_resolve' THEN 'guest_resolve' ELSE p_kind END) OR op.arguments<>p_payload THEN
      RAISE EXCEPTION 'Operation conflict' USING errcode='22023';
    END IF;
    RETURN points_kitchen_v2.snapshot(op.order_id);
  END IF;
  IF (SELECT count(*) FROM public.members WHERE active)<>1 THEN RAISE EXCEPTION 'Score object changed' USING errcode='P0001'; END IF;
  SELECT m.id INTO member FROM public.members m WHERE active FOR UPDATE;
  IF id IS NOT NULL THEN
    SELECT * INTO o FROM public.points_kitchen_orders WHERE points_kitchen_orders.id=id FOR UPDATE;
    IF NOT FOUND OR o.member_id<>member THEN RAISE EXCEPTION 'Meal not found' USING errcode='P0002'; END IF;
    IF ver IS NULL OR o.version<>ver THEN RAISE EXCEPTION 'Meal changed' USING errcode='40001'; END IF;
  END IF;
  IF p_kind IN ('meal_admin_save','meal_guest_save') THEN
    IF mealday IS NULL OR mealname IS NULL OR mealname NOT IN ('早饭','午饭','晚饭')
      OR p_kind='meal_guest_save' AND mealday>(clock_timestamp() AT TIME ZONE 'Asia/Shanghai')::date
      OR id IS NULL AND p_kind='meal_admin_save' AND mealday<(clock_timestamp() AT TIME ZONE 'Asia/Shanghai')::date THEN
      RAISE EXCEPTION 'Invalid meal date' USING errcode='22023';
    END IF;
    IF char_length(coalesce(p_payload->>'p_note',''))>500 THEN RAISE EXCEPTION 'Note too long' USING errcode='22023'; END IF;
    IF id IS NULL THEN
      IF EXISTS(SELECT 1 FROM public.points_kitchen_orders WHERE member_id=member AND meal_mode AND meal_date=mealday
        AND meal=mealname AND status NOT IN ('cancelled','rejected')) THEN
        RAISE EXCEPTION 'Meal changed; reopen the meal' USING errcode='40001';
      END IF;
    ELSE
      IF o.status NOT IN ('pending','completed') THEN RAISE EXCEPTION 'Meal closed for editing' USING errcode='P0001'; END IF;
      IF o.meal_mode AND (o.meal_date<>mealday OR o.meal<>mealname) THEN RAISE EXCEPTION 'Meal slot is fixed' USING errcode='22023'; END IF;
      -- Legacy meals can finish their original workflow; never silently merge old records.
      IF NOT o.meal_mode THEN RAISE EXCEPTION 'Legacy meal cannot be edited here' USING errcode='22023'; END IF;
    END IF;
    IF cancelled THEN
      IF id IS NULL OR p_kind<>'meal_admin_save' OR EXISTS(SELECT 1 FROM jsonb_array_elements(o.items) x WHERE x->>'made'='true') THEN
        RAISE EXCEPTION 'Cannot cancel a prepared meal' USING errcode='22023';
      END IF;
      UPDATE public.points_kitchen_orders SET status='cancelled',version=version+1,resolved_at=clock_timestamp(),updated_at=clock_timestamp() WHERE points_kitchen_orders.id=id;
    ELSE
      FOR entry IN SELECT value FROM jsonb_array_elements(points_kitchen_v2.items(p_payload->'p_items',p_kind='meal_guest_save' OR id IS NOT NULL)) LOOP
        SELECT x INTO previous FROM jsonb_array_elements(coalesce(o.items,'[]')) x WHERE x->>'slug'=entry->>'slug';
        IF p_kind='meal_admin_save' AND entry->>'custom'='true' AND previous IS NULL THEN RAISE EXCEPTION 'Custom dish unavailable' USING errcode='22023'; END IF;
        -- Already prepared dishes keep their snapshots and completion. Guests may add, never rewrite requests.
        cooked:=coalesce((previous->>'made')::boolean,false);
        IF previous IS NOT NULL AND (cooked OR p_kind='meal_guest_save') THEN entry:=previous;
        ELSE entry:=entry || jsonb_build_object('made',p_kind='meal_guest_save','requested',p_kind='meal_admin_save'); END IF;
        items:=items || jsonb_build_array(entry);
      END LOOP;
      IF EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(o.items,'[]')) old
        WHERE (old->>'made'='true' OR p_kind='meal_guest_save')
          AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(items) x WHERE x->>'slug'=old->>'slug')) THEN
        RAISE EXCEPTION 'Cannot remove completed or requested dishes' USING errcode='22023';
      END IF;
      SELECT count(*) INTO pending_count FROM jsonb_array_elements(items) x WHERE x->>'made' IS DISTINCT FROM 'true';
      IF id IS NULL THEN
        INSERT INTO public.points_kitchen_orders(member_id,origin,status,items,note,meal_date,meal,meal_mode,completed_at,created_by)
          VALUES(member,CASE WHEN p_kind='meal_guest_save' THEN 'guest' ELSE 'admin' END,
            CASE WHEN pending_count=0 THEN 'completed' ELSE 'pending' END,items,coalesce(p_payload->>'p_note',''),mealday,mealname,true,
            CASE WHEN pending_count=0 THEN clock_timestamp() END,auth.uid()) RETURNING points_kitchen_orders.id INTO id;
      ELSE
        UPDATE public.points_kitchen_orders SET items=items,note=CASE WHEN p_kind='meal_guest_save' THEN o.note ELSE coalesce(p_payload->>'p_note','') END,
          origin=CASE WHEN p_kind='meal_admin_save' THEN 'admin' ELSE origin END,
          status=CASE WHEN pending_count=0 THEN 'completed' ELSE 'pending' END,version=version+1,
          completed_at=CASE WHEN pending_count=0 THEN coalesce(completed_at,clock_timestamp()) ELSE NULL END,updated_at=clock_timestamp()
          WHERE points_kitchen_orders.id=id;
      END IF;
    END IF;
  ELSIF p_kind='meal_resolve' THEN
    IF o.status<>'pending' THEN RAISE EXCEPTION 'Meal already processed' USING errcode='P0001'; END IF;
    IF NOT o.meal_mode THEN
      RETURN points_kitchen_v2.legacy_write('guest_resolve',p_payload,p_operation_id);
    END IF;
    SELECT seen_version INTO seen FROM points_kitchen_v2.receipts WHERE order_id=id AND actor='guest';
    IF coalesce(seen,0)<o.version THEN RAISE EXCEPTION 'Meal changed' USING errcode='40001'; END IF;
    IF p_payload->>'p_reject' IS NULL OR char_length(coalesce(p_payload->>'p_reason',''))>500 THEN RAISE EXCEPTION 'Invalid resolution' USING errcode='22023'; END IF;
    IF (p_payload->>'p_reject')::boolean THEN
      IF EXISTS(SELECT 1 FROM jsonb_array_elements(o.items) x WHERE x->>'made'='true') THEN RAISE EXCEPTION 'Cannot reject a prepared meal' USING errcode='22023'; END IF;
      UPDATE public.points_kitchen_orders SET status='rejected',version=version+1,resolution_note=coalesce(p_payload->>'p_reason',''),resolved_at=clock_timestamp(),updated_at=clock_timestamp() WHERE points_kitchen_orders.id=id;
    ELSE
      IF o.meal_date>(clock_timestamp() AT TIME ZONE 'Asia/Shanghai')::date THEN RAISE EXCEPTION 'Future meal cannot be completed' USING errcode='22023'; END IF;
      SELECT jsonb_agg(x || '{"made":true}'::jsonb ORDER BY n) INTO items FROM jsonb_array_elements(o.items) WITH ORDINALITY AS d(x,n);
      UPDATE public.points_kitchen_orders SET items=items,status='completed',version=version+1,completed_at=clock_timestamp(),updated_at=clock_timestamp() WHERE points_kitchen_orders.id=id;
    END IF;
  ELSE
    IF o.meal_mode AND EXISTS(SELECT 1 FROM jsonb_array_elements(o.items) x WHERE x->>'made' IS DISTINCT FROM 'true') THEN
      RAISE EXCEPTION 'Meal not ready for review' USING errcode='P0001';
    END IF;
    -- Reuse validated ratings, the original score primitive and one-log settlement.
    RETURN points_kitchen_v2.legacy_write('admin_review',p_payload,p_operation_id);
  END IF;
  DELETE FROM public.points_kitchen_drafts WHERE order_id=id;
  SELECT * INTO o FROM public.points_kitchen_orders WHERE points_kitchen_orders.id=id;
  INSERT INTO public.points_kitchen_versions(order_id,version,items,note,status,changed_by)
    VALUES(id,o.version,o.items,o.note,o.status,auth.uid()) ON CONFLICT(order_id,version) DO NOTHING;
  INSERT INTO public.points_kitchen_operations(operation_id,actor,kind,arguments,order_id) VALUES(p_operation_id,auth.uid(),p_kind,p_payload,id);
  RETURN points_kitchen_v2.snapshot(id);
END $$;
CREATE OR REPLACE FUNCTION public.points_kitchen_v3_admin_save(p_items jsonb,p_note text,p_meal_date date,p_meal text,p_order_id bigint,p_version integer,p_cancel boolean,p_operation_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  SELECT points_kitchen_v2.meal_write('meal_admin_save',jsonb_build_object('p_items',p_items,'p_note',p_note,'p_meal_date',p_meal_date,'p_meal',p_meal,'p_order_id',p_order_id,'p_version',p_version,'p_cancel',p_cancel),p_operation_id);
$$;
CREATE OR REPLACE FUNCTION public.points_kitchen_v3_guest_save(p_items jsonb,p_note text,p_meal_date date,p_meal text,p_order_id bigint,p_version integer,p_cancel boolean,p_operation_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  SELECT points_kitchen_v2.meal_write('meal_guest_save',jsonb_build_object('p_items',p_items,'p_note',p_note,'p_meal_date',p_meal_date,'p_meal',p_meal,'p_order_id',p_order_id,'p_version',p_version,'p_cancel',p_cancel),p_operation_id);
$$;
CREATE OR REPLACE FUNCTION public.points_kitchen_v3_guest_resolve(p_order_id bigint,p_version integer,p_reject boolean,p_reason text,p_operation_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  SELECT points_kitchen_v2.meal_write('meal_resolve',jsonb_build_object('p_order_id',p_order_id,'p_version',p_version,'p_reject',p_reject,'p_reason',p_reason),p_operation_id);
$$;
CREATE OR REPLACE FUNCTION public.points_kitchen_v3_admin_review(p_order_id bigint,p_version integer,p_ratings jsonb,p_operation_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  SELECT points_kitchen_v2.meal_write('meal_review',jsonb_build_object('p_order_id',p_order_id,'p_version',p_version,'p_ratings',p_ratings),p_operation_id);
$$;
REVOKE ALL ON FUNCTION points_kitchen_v2.legacy_write(text,jsonb,uuid),points_kitchen_v2.write(text,jsonb,uuid),points_kitchen_v2.meal_write(text,jsonb,uuid) FROM PUBLIC,anon,authenticated;
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT oid::regprocedure signature,proname FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'points_kitchen_v3_%' LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %s',f.signature,
      CASE WHEN f.proname IN ('points_kitchen_v3_admin_save','points_kitchen_v3_admin_review') THEN 'authenticated'
        WHEN f.proname IN ('points_kitchen_v3_guest_save','points_kitchen_v3_guest_resolve') THEN 'anon' ELSE 'anon,authenticated' END);
  END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
