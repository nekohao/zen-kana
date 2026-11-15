-- CURRENT CHANGE ONLY; previous increments are replaced, never appended.

-- BASE_COMMIT: d33a2d44c41b6a5c68f24f6aa7ff0cef3eb3e0c7

-- Requires the maintained database at that commit (or this increment already applied).

-- Historical upgrades belong in Git history, not in this execution file.

BEGIN;

DO $baseline$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='points_fat_admin_get_settings'
  AND pg_get_function_identity_arguments(p.oid)=''
  AND md5(replace(replace(prosrc,E'\r\n',E'\n'),E'\r',E'\n')) IN ('c60346dd5443863b13e35bbe0167635d','1901f7c2d449f4ef1ce87fbae116eab3')) THEN
  RAISE EXCEPTION 'Database baseline differs for points_fat_admin_get_settings; apply/verify preceding changes first';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='points_fat_admin_set_starting_weight'
  AND pg_get_function_identity_arguments(p.oid)='p_weight_jin numeric'
  AND md5(replace(replace(prosrc,E'\r\n',E'\n'),E'\r',E'\n')) IN ('24931ee8a3fff12123b35b4395ba992d','a691215cdee605fbe0b1b12974539924')) THEN
  RAISE EXCEPTION 'Database baseline differs for points_fat_admin_set_starting_weight; apply/verify preceding changes first';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='points_fat_get_progress'
  AND pg_get_function_identity_arguments(p.oid)=''
  AND md5(replace(replace(prosrc,E'\r\n',E'\n'),E'\r',E'\n')) IN ('23c0e382eb1e99481123bf02a470cb9b','2ce488844d0d8b3807e0bc18b0808b3d')) THEN
  RAISE EXCEPTION 'Database baseline differs for points_fat_get_progress; apply/verify preceding changes first';
 END IF;
END
$baseline$;

CREATE TABLE IF NOT EXISTS "public"."points_fat_record_operations" (
  "operation_id" uuid NOT NULL,
  "actor" uuid NOT NULL,
  "record_id" bigint NOT NULL,
  CONSTRAINT "points_fat_record_operations_pkey" PRIMARY KEY (operation_id)
);

ALTER TABLE "public"."points_fat_record_operations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_fat_record_operations" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_fat_record_operations" FROM PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_fat_record_operations" TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_admin_submit_weight(p_weight_jin numeric, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_id bigint;
  v_weight numeric;
BEGIN
  IF v_actor IS NULL OR NOT coalesce(public.points_is_admin(), false) THEN
    RAISE EXCEPTION 'Admin permission required' USING errcode = '42501';
  END IF;
  IF p_operation_id IS NULL THEN
    RAISE EXCEPTION 'Operation ID required' USING errcode = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('points-fat-record:' || p_operation_id::text, 0)
  );
  SELECT o.actor, o.record_id, r.weight_jin
    INTO v_owner, v_id, v_weight
    FROM public.points_fat_record_operations o
    LEFT JOIN public.points_fat_records r ON r.id = o.record_id
    WHERE o.operation_id = p_operation_id;
  IF FOUND THEN
    IF v_owner <> v_actor THEN
      RAISE EXCEPTION 'Operation owner mismatch' USING errcode = '42501';
    END IF;
    RETURN jsonb_build_object('id', v_id::text, 'removed', v_weight IS NULL,
      'matched', p_weight_jin IS NULL OR p_weight_jin IS NOT DISTINCT FROM v_weight);
  END IF;
  IF p_weight_jin IS NULL THEN
    RETURN jsonb_build_object('id', NULL);
  END IF;

  SELECT r.id INTO STRICT v_id FROM public.points_fat_admin_record_weight(p_weight_jin) r;
  INSERT INTO public.points_fat_record_operations (operation_id, actor, record_id)
  VALUES (p_operation_id, v_actor, v_id);
  RETURN jsonb_build_object('id', v_id::text, 'removed', false, 'matched', true);
END;
$function$;

ALTER FUNCTION "public"."points_fat_admin_submit_weight"(p_weight_jin numeric, p_operation_id uuid) OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_fat_admin_submit_weight"(p_weight_jin numeric, p_operation_id uuid) FROM PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."points_fat_admin_submit_weight"(p_weight_jin numeric, p_operation_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_admin_submit_weight"(p_weight_jin numeric, p_operation_id uuid) TO "authenticated";

CREATE OR REPLACE FUNCTION public.points_fat_admin_get_settings()
 RETURNS TABLE(starting_weight_jin numeric, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NOT coalesce(public.points_is_admin(), false) THEN
    RAISE EXCEPTION 'Admin permission required'
      USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT s.starting_weight_jin, s.updated_at
  FROM (VALUES (1)) AS initial(id)
  LEFT JOIN public.points_fat_settings s ON s.id = initial.id;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."points_fat_admin_record_weight"(p_weight_jin numeric) FROM PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."points_fat_admin_record_weight"(p_weight_jin numeric) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_admin_record_weight"(p_weight_jin numeric) TO "authenticated";

CREATE OR REPLACE FUNCTION public.points_fat_admin_set_starting_weight(p_weight_jin numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NOT coalesce(public.points_is_admin(), false) THEN
    RAISE EXCEPTION 'Admin permission required'
      USING errcode = '42501';
  END IF;

  IF p_weight_jin IS NULL
    OR p_weight_jin <= 0
    OR p_weight_jin >= 10000
    OR p_weight_jin <> pg_catalog.round(p_weight_jin, 2)
  THEN
    RAISE EXCEPTION 'Invalid weight: positive, below 10000, maximum 2 decimals'
      USING errcode = '22023';
  END IF;

  INSERT INTO public.points_fat_settings (id, starting_weight_jin, updated_at, updated_by)
  VALUES (1, p_weight_jin, pg_catalog.clock_timestamp(), auth.uid())
  ON CONFLICT (id) DO UPDATE SET
    starting_weight_jin = EXCLUDED.starting_weight_jin,
    updated_at = EXCLUDED.updated_at,
    updated_by = EXCLUDED.updated_by;
END;
$function$;

CREATE OR REPLACE FUNCTION public.points_fat_get_progress()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  WITH bounds AS (
    SELECT date_trunc('week', now() AT TIME ZONE 'Asia/Shanghai')::date AS monday
  ), daily AS (
    SELECT (r.created_at AT TIME ZONE 'Asia/Shanghai')::date AS day,
           min(r.weight_jin) AS lightest
    FROM public.points_fat_records r CROSS JOIN bounds b
    WHERE r.created_at >= ((b.monday - 28)::timestamp AT TIME ZONE 'Asia/Shanghai')
      AND r.created_at <= now()
    GROUP BY 1
  ), weekly AS (
    SELECT b.monday - offsets.days AS start_date, count(d.day) AS days,
           min(d.lightest) AS low, CASE WHEN count(d.day) >= 3 THEN avg(d.lightest) END AS mean
    FROM bounds b CROSS JOIN (VALUES (28),(21),(14),(7),(0)) AS offsets(days)
    LEFT JOIN daily d ON d.day BETWEEN b.monday - offsets.days AND b.monday - offsets.days + 6
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'configured', s.starting_weight_jin IS NOT NULL,
    'delta_jin', latest.weight_jin - s.starting_weight_jin,
    'recorded_at', latest.created_at,
    'weeks', (SELECT jsonb_agg(jsonb_build_object('start', w.start_date, 'end', w.start_date + 6,
      'days', w.days, 'low', w.low - s.starting_weight_jin, 'mean', w.mean - s.starting_weight_jin)
      ORDER BY w.start_date) FROM weekly w WHERE w.start_date >= (SELECT monday - 21 FROM bounds)),
    'previous_week', (SELECT jsonb_build_object('low', w.low - s.starting_weight_jin,
      'mean', w.mean - s.starting_weight_jin) FROM weekly w WHERE w.start_date = (SELECT monday - 28 FROM bounds))
  )
  FROM (VALUES (1)) AS initial(id)
  LEFT JOIN public.points_fat_settings s ON s.id = initial.id
  LEFT JOIN LATERAL (
    SELECT r.weight_jin, r.created_at FROM public.points_fat_records r
    WHERE r.created_at <= now()
    ORDER BY r.created_at DESC, r.id DESC LIMIT 1
  ) latest ON true;
$function$;

NOTIFY pgrst,'reload schema';

COMMIT;
