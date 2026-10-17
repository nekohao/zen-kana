-- CURRENT CHANGE ONLY; previous increments are replaced, never appended.

-- BASE_COMMIT: 7e408fbd6921987e3f86dc2d2d1cf547c73ddbf7

-- Requires the maintained database at that commit (or this increment already applied).

-- Historical upgrades belong in Git history, not in this execution file.

BEGIN;

DO $baseline$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='points_family_snapshot'
  AND pg_get_function_identity_arguments(p.oid)='p_id bigint'
  AND md5(replace(replace(prosrc,E'\r\n',E'\n'),E'\r',E'\n')) IN ('7c59deefff2b58453e507d346672f7a2','3bc8ee36a68c25ed0403192da6096cbf')) THEN
  RAISE EXCEPTION 'Database baseline differs for points_family_snapshot; apply/verify preceding changes first';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='points_family_write'
  AND pg_get_function_identity_arguments(p.oid)='p_action text, p_payload jsonb, p_operation_id uuid'
  AND md5(replace(replace(prosrc,E'\r\n',E'\n'),E'\r',E'\n')) IN ('1d55d14c327ed58a18afdfadfb06098b','6856487480aac0913bcd8c360757dbd9')) THEN
  RAISE EXCEPTION 'Database baseline differs for points_family_write; apply/verify preceding changes first';
 END IF;
END
$baseline$;

CREATE OR REPLACE FUNCTION public.points_family_snapshot(p_id bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT to_jsonb(t)-'member_id'-'score_log_id' || jsonb_build_object('id',t.id::text,
 'items',(SELECT coalesce(jsonb_agg(jsonb_build_object('slug',d->>'slug','name',d->>'name','request_note',coalesce(d->>'request_note','')) ORDER BY n),'[]') FROM jsonb_array_elements(t.items) WITH ORDINALITY x(d,n)),
 'events',(SELECT coalesce(jsonb_agg(jsonb_build_object('version',e.version,'attempt',e.attempt,'action',e.action,'comment',e.comment,'at',e.created_at) ORDER BY e.version),'[]')
 FROM public.points_family_events e WHERE e.task_id=t.id)) FROM public.points_family_tasks t WHERE t.id=p_id
$function$;

CREATE OR REPLACE FUNCTION public.points_family_write(p_action text, p_payload jsonb, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE a text:=public.points_family_actor(); administrator boolean:=a LIKE 'admin:%'; member bigint; t public.points_family_tasks;
 ty public.points_family_types; op public.points_family_operations; v_id bigint:=(p_payload->>'id')::bigint;
 expected integer:=(p_payload->>'version')::integer; v_items jsonb:='[]'; v_comment text:=coalesce(p_payload->>'comment',''); result jsonb;
BEGIN
 IF p_operation_id IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' THEN RAISE EXCEPTION 'Invalid operation' USING errcode='22023'; END IF;
 IF (SELECT count(*) FROM public.members WHERE active)<>1 THEN RAISE EXCEPTION 'Score object changed' USING errcode='P0001'; END IF;
 SELECT m.id INTO member FROM public.members m WHERE active FOR UPDATE;
 SELECT * INTO op FROM public.points_family_operations WHERE operation_id=p_operation_id;
 IF FOUND THEN
  IF op.actor<>a OR op.kind<>p_action OR op.arguments<>p_payload THEN RAISE EXCEPTION 'Operation conflict' USING errcode='22023'; END IF;
  IF op.result->>'removed'='true' AND p_action<>'cancel' THEN RAISE EXCEPTION 'Task removed' USING errcode='P0002'; END IF;
  RETURN op.result;
 END IF;
 IF p_action='create' THEN
  SELECT * INTO ty FROM public.points_family_types WHERE code=p_payload->>'type' AND active FOR SHARE;
  IF NOT FOUND OR ty.points IS NULL THEN RAISE EXCEPTION 'Points not configured' USING errcode='22023'; END IF;
  IF char_length(coalesce(p_payload->>'note',''))>500 THEN RAISE EXCEPTION 'Note too long' USING errcode='22023'; END IF;
  IF jsonb_array_length(coalesce(p_payload->'items','[]'))>0 THEN RAISE EXCEPTION 'Recipes retired; use the task note' USING errcode='22023'; END IF;
  INSERT INTO public.points_family_tasks(member_id,type_code,title,points,origin,note,items,status,attempt,submitted_at)
   VALUES(member,ty.code,ty.label,ty.points,CASE WHEN administrator THEN 'admin' ELSE 'guest' END,coalesce(p_payload->>'note',''),v_items,
    CASE WHEN administrator THEN 'pending' ELSE 'review' END,CASE WHEN administrator THEN 0 ELSE 1 END,CASE WHEN NOT administrator THEN clock_timestamp() END) RETURNING * INTO t;
 ELSIF p_action='price' THEN
  IF NOT administrator THEN RAISE EXCEPTION 'Admin required' USING errcode='42501'; END IF;
  SELECT * INTO ty FROM public.points_family_types WHERE code=p_payload->>'type' FOR UPDATE;
  IF NOT FOUND OR ty.version IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Price changed' USING errcode='40001'; END IF;
  IF p_payload->>'points' IS NULL OR (p_payload->>'points')!~'^[0-9]+([.][0-9]+)?$' OR (p_payload->>'points')::numeric NOT BETWEEN 0.5 AND 1000 OR mod((p_payload->>'points')::numeric,0.5)<>0 THEN RAISE EXCEPTION 'Invalid points' USING errcode='22023'; END IF;
  UPDATE public.points_family_types SET points=(p_payload->>'points')::numeric,version=version+1,updated_at=clock_timestamp() WHERE code=ty.code;
  UPDATE public.points_family_tasks SET points=(p_payload->>'points')::numeric,version=version+1 WHERE type_code=ty.code AND points IS NULL AND EXISTS(SELECT 1 FROM public.points_family_events e WHERE e.task_id=points_family_tasks.id AND e.action='imported');
  result:=public.points_family_get_types();
 ELSE
  SELECT * INTO t FROM public.points_family_tasks WHERE points_family_tasks.id=v_id FOR UPDATE;
  IF NOT FOUND OR t.member_id<>member THEN RAISE EXCEPTION 'Task not found' USING errcode='P0002'; END IF;
  IF t.version IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Task changed' USING errcode='40001'; END IF;
  IF p_action='submit' THEN
   IF administrator OR t.status NOT IN ('pending','rework') THEN RAISE EXCEPTION 'Cannot submit' USING errcode='42501'; END IF;
   UPDATE public.points_family_tasks SET status='review',attempt=attempt+1,version=version+1,submitted_at=clock_timestamp(),updated_at=clock_timestamp() WHERE points_family_tasks.id=v_id RETURNING * INTO t;
  ELSIF p_action='review' THEN
   IF NOT administrator OR t.status<>'review' THEN RAISE EXCEPTION 'Cannot review' USING errcode='42501'; END IF;
   IF char_length(v_comment)>1000 OR jsonb_typeof(p_payload->'qualified') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid review' USING errcode='22023'; END IF;
   IF (p_payload->>'qualified')::boolean THEN
    IF t.points IS NULL THEN RAISE EXCEPTION 'Points not configured' USING errcode='22023'; END IF;
    UPDATE public.members SET score=score+t.points WHERE id=member RETURNING score INTO t.score_after;
    INSERT INTO public.score_logs(member_id,delta,reason,operator_id)
     VALUES(member,t.points,'家务结算 · 任务 #'||t.id,auth.uid()) RETURNING id INTO t.score_log_id;
   END IF;
   UPDATE public.points_family_tasks SET status=CASE WHEN (p_payload->>'qualified')::boolean THEN 'settled' ELSE 'rework' END,
    version=version+1,comment=v_comment,reviewed_at=clock_timestamp(),updated_at=clock_timestamp(),score_after=t.score_after,score_log_id=t.score_log_id
    WHERE points_family_tasks.id=v_id RETURNING * INTO t;
  ELSIF p_action='cancel' THEN
   IF NOT administrator THEN
    IF t.origin<>'guest' OR t.legacy_order_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.points_family_events e WHERE e.task_id=t.id AND e.action='imported') OR t.status NOT IN ('review','rework') OR t.score_log_id IS NOT NULL THEN RAISE EXCEPTION 'Cannot withdraw task' USING errcode='42501'; END IF;
    result:=jsonb_build_object('id',t.id::text,'removed',true);
    DELETE FROM points_notice.batch_items WHERE event_id IN (SELECT id FROM points_notice.events WHERE group_key='family:'||t.id);
    DELETE FROM points_notice.receipts WHERE event_id IN (SELECT id FROM points_notice.events WHERE group_key='family:'||t.id);
    DELETE FROM points_notice.events WHERE group_key='family:'||t.id;
    UPDATE public.points_family_operations SET task_id=NULL,arguments=jsonb_build_object('id',t.id),result=jsonb_build_object('id',t.id::text,'removed',true) WHERE task_id=t.id;
    DELETE FROM public.points_family_events WHERE task_id=t.id;
    DELETE FROM public.points_family_tasks WHERE id=t.id;
    INSERT INTO public.points_family_operations(operation_id,actor,kind,arguments,result) VALUES(p_operation_id,a,p_action,p_payload,result);
    RETURN result;
   END IF;
   IF NOT administrator OR t.status<>'pending' OR t.attempt<>0 THEN RAISE EXCEPTION 'Cannot cancel submitted task' USING errcode='42501'; END IF;
   UPDATE public.points_family_tasks SET status='cancelled',version=version+1,updated_at=clock_timestamp() WHERE points_family_tasks.id=v_id RETURNING * INTO t;
  ELSE RAISE EXCEPTION 'Invalid action' USING errcode='22023'; END IF;
 END IF;
 IF p_action<>'price' THEN
  INSERT INTO public.points_family_events(task_id,version,attempt,action,comment) VALUES(t.id,t.version,t.attempt,
   CASE WHEN p_action='review' THEN CASE WHEN t.status='settled' THEN 'qualified' ELSE 'rework' END ELSE p_action END,v_comment);
  result:=public.points_family_snapshot(t.id);
 END IF;
 INSERT INTO public.points_family_operations(operation_id,actor,kind,arguments,task_id,result) VALUES(p_operation_id,a,p_action,p_payload,t.id,result);
 RETURN result;
END $function$;

-- Retire recipes; preserve only dish names/notes on existing household tasks.
-- Balances, task status, reviews and score logs remain untouched.
UPDATE public.points_family_tasks t SET items=(
 SELECT coalesce(jsonb_agg(jsonb_build_object('slug',d->>'slug','name',d->>'name',
 'request_note',coalesce(d->>'request_note','')) ORDER BY n),'[]')
 FROM jsonb_array_elements(t.items) WITH ORDINALITY x(d,n)
) WHERE jsonb_array_length(t.items)>0;
UPDATE public.points_family_operations o SET result=jsonb_set(o.result,'{items}',(
 SELECT coalesce(jsonb_agg(jsonb_build_object('slug',d->>'slug','name',d->>'name',
 'request_note',coalesce(d->>'request_note','')) ORDER BY n),'[]')
 FROM jsonb_array_elements(o.result->'items') WITH ORDINALITY x(d,n)
)) WHERE jsonb_typeof(o.result->'items')='array';
DELETE FROM public.points_kitchen_dishes;

NOTIFY pgrst,'reload schema';

COMMIT;
