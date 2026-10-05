-- 减脂钻石奖励迁移。只新增本模块对象，不修改原有体重/积分/转盘表。
-- 在 Supabase SQL Editor 以 postgres 执行整个文件；可重复执行。
BEGIN;

DO $$ BEGIN
  IF to_regclass('public.points_fat_records') IS NULL
     OR to_regclass('public.points_fat_settings') IS NULL
     OR to_regprocedure('public.points_is_admin()') IS NULL THEN
    RAISE EXCEPTION '请先部署已有减脂模块，再执行奖励迁移';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.points_fat_reward_state (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  diamonds bigint NOT NULL DEFAULT 0 CHECK (diamonds >= 0),
  backpack bigint NOT NULL DEFAULT 0 CHECK (backpack >= 0),
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  next_week date NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS public.points_fat_reward_weeks (
  week_start date PRIMARY KEY,
  cutoff_at timestamptz NOT NULL,
  current_days integer NOT NULL,
  previous_days integer NOT NULL,
  current_mean_jin numeric,
  previous_mean_jin numeric,
  comparison_basis text NOT NULL DEFAULT 'previous_week'
    CHECK (comparison_basis IN ('previous_week','starting_weight')),
  change_jin numeric,
  eligible boolean NOT NULL,
  calculated_delta bigint NOT NULL,
  applied_delta bigint NOT NULL,
  balance_after bigint NOT NULL CHECK (balance_after >= 0),
  settled_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
-- 老版本已结算记录保留原比较基准和奖扣；升级只影响尚未结算的周。
ALTER TABLE public.points_fat_reward_weeks ADD COLUMN IF NOT EXISTS
  comparison_basis text NOT NULL DEFAULT 'previous_week'
  CHECK (comparison_basis IN ('previous_week','starting_weight'));
CREATE TABLE IF NOT EXISTS public.points_fat_reward_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending_service'
    CHECK (status IN ('pending_service','pending_confirmation','completed','returned')),
  requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  serviced_at timestamptz,
  resolved_at timestamptz,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS points_fat_reward_requests_pending_idx
  ON public.points_fat_reward_requests(status, id DESC)
  WHERE status IN ('pending_service','pending_confirmation');
CREATE TABLE IF NOT EXISTS public.points_fat_reward_operations (
  operation_id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('buy','use')),
  request_id bigint REFERENCES public.points_fat_reward_requests(id),
  diamond_delta bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.points_fat_reward_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_fat_reward_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_fat_reward_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_fat_reward_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.points_fat_reward_state, public.points_fat_reward_weeks,
  public.points_fat_reward_requests, public.points_fat_reward_operations
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.points_fat_reward_requests_id_seq FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.points_fat_reward_cutoff(p_week date)
RETURNS timestamptz LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT (p_week + 6 + time '12:00') AT TIME ZONE 'Asia/Shanghai';
$$;

INSERT INTO public.points_fat_reward_state(id, next_week)
SELECT 1, w + CASE WHEN clock_timestamp() >= public.points_fat_reward_cutoff(w) THEN 7 ELSE 0 END
FROM (SELECT date_trunc('week', clock_timestamp() AT TIME ZONE 'Asia/Shanghai')::date AS w) t
ON CONFLICT (id) DO NOTHING;

-- 首笔按北京时间日期去重。周日 12:00 及之后的记录不参与该周结算。
CREATE OR REPLACE FUNCTION public.points_fat_reward_sample(p_week date)
RETURNS TABLE(days integer, mean_jin numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT count(*)::integer, avg(d.weight_jin) FROM (
    SELECT DISTINCT ON ((r.created_at AT TIME ZONE 'Asia/Shanghai')::date) r.weight_jin
    FROM public.points_fat_records r
    WHERE r.created_at >= (p_week::timestamp AT TIME ZONE 'Asia/Shanghai')
      AND r.created_at < public.points_fat_reward_cutoff(p_week)
    ORDER BY (r.created_at AT TIME ZONE 'Asia/Shanghai')::date, r.created_at, r.id
  ) d;
$$;

CREATE OR REPLACE FUNCTION public.points_fat_reward_delta(p_change numeric, p_days integer, p_previous_days integer)
RETURNS bigint LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE WHEN p_change IS NULL OR p_days < 3 OR p_previous_days < 3 THEN 0
    WHEN p_change < 0 THEN floor(-p_change)::bigint
    WHEN p_change > 0 THEN -greatest(1, floor(p_change)::bigint)
    ELSE 0 END;
$$;

-- 仅首次记录所在周使用起始体重；后续缺记录的周不能再次使用此例外。
-- 已结算且有记录的周参与识别首周，删除原记录不会重新触发首周奖励。
CREATE OR REPLACE FUNCTION public.points_fat_reward_reference(p_week date)
RETURNS TABLE(days integer, mean_jin numeric, basis text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_first_week date;
BEGIN
  SELECT least(
    (SELECT date_trunc('week', r.created_at AT TIME ZONE 'Asia/Shanghai')::date
      FROM public.points_fat_records r ORDER BY r.created_at, r.id LIMIT 1),
    (SELECT min(w.week_start) FROM public.points_fat_reward_weeks w WHERE w.current_days > 0)
  ) INTO v_first_week;
  IF p_week = v_first_week THEN
    RETURN QUERY SELECT 0, s.starting_weight_jin, 'starting_weight'::text
      FROM public.points_fat_settings s WHERE s.id = 1;
    RETURN;
  END IF;
  RETURN QUERY SELECT w.current_days, w.current_mean_jin, 'previous_week'::text
    FROM public.points_fat_reward_weeks w WHERE w.week_start = p_week - 7;
  IF NOT FOUND THEN
    RETURN QUERY SELECT s.days, s.mean_jin, 'previous_week'::text
      FROM public.points_fat_reward_sample(p_week - 7) s;
  END IF;
END;
$$;

-- 内部结算：调用者不能指定日期或体重。周唯一键 + 行锁保证只结算一次。
CREATE OR REPLACE FUNCTION public.points_fat_reward_settle_due()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s public.points_fat_reward_state%ROWTYPE;
  c record; p record; v_change numeric; v_calculated bigint; v_applied bigint; v_eligible boolean; v_count integer := 0;
BEGIN
  SELECT * INTO s FROM public.points_fat_reward_state WHERE id = 1;
  IF public.points_fat_reward_cutoff(s.next_week) > clock_timestamp() THEN RETURN 0; END IF;
  -- 与原有记录/删除接口保持同一锁顺序，避免结算遗漏已经开始提交的记录。
  PERFORM id FROM public.points_fat_settings WHERE id = 1 FOR UPDATE;
  SELECT * INTO STRICT s FROM public.points_fat_reward_state WHERE id = 1 FOR UPDATE;
  WHILE public.points_fat_reward_cutoff(s.next_week) <= clock_timestamp() LOOP
    IF NOT EXISTS (SELECT 1 FROM public.points_fat_reward_weeks WHERE week_start = s.next_week) THEN
      SELECT * INTO c FROM public.points_fat_reward_sample(s.next_week);
      SELECT * INTO p FROM public.points_fat_reward_reference(s.next_week);
      v_change := c.mean_jin - p.mean_jin;
      v_eligible := v_change IS NOT NULL AND c.days >= 3 AND (p.basis = 'starting_weight' OR p.days >= 3);
      v_calculated := public.points_fat_reward_delta(v_change, c.days,
        CASE WHEN p.basis = 'starting_weight' THEN 3 ELSE p.days END);
      v_applied := greatest(-s.diamonds, v_calculated);
      s.diamonds := s.diamonds + v_applied;
      INSERT INTO public.points_fat_reward_weeks(week_start, cutoff_at, current_days, previous_days,
        current_mean_jin, previous_mean_jin, comparison_basis, change_jin, eligible, calculated_delta, applied_delta, balance_after)
      VALUES (s.next_week, public.points_fat_reward_cutoff(s.next_week), c.days, p.days,
        c.mean_jin, p.mean_jin, p.basis, v_change, v_eligible, v_calculated, v_applied, s.diamonds);
      v_count := v_count + 1;
    END IF;
    s.next_week := s.next_week + 7;
  END LOOP;
  UPDATE public.points_fat_reward_state
    SET diamonds = s.diamonds, next_week = s.next_week, updated_at = clock_timestamp() WHERE id = 1;
  RETURN v_count;
END;
$$;

-- 服务列表每页 30 条，游标按 bigint 文本传递，避免 JavaScript 大整数丢失精度。
CREATE OR REPLACE FUNCTION public.points_fat_reward_snapshot(p_before bigint DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin boolean := coalesce(public.points_is_admin(), false);
  v_result jsonb; v_services jsonb; v_more boolean; s record; c record; p record;
  v_week date := date_trunc('week', clock_timestamp() AT TIME ZONE 'Asia/Shanghai')::date;
BEGIN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', t.id::text, 'status', t.status,
    'requested_at', t.requested_at, 'serviced_at', t.serviced_at, 'resolved_at', t.resolved_at)
    ORDER BY t.id DESC), '[]'::jsonb) INTO v_services
    FROM (SELECT * FROM public.points_fat_reward_requests
      WHERE p_before IS NULL OR id < p_before ORDER BY id DESC LIMIT 30) t;
  SELECT EXISTS(SELECT 1 FROM public.points_fat_reward_requests
    WHERE (p_before IS NULL OR id < p_before) AND id <
      (SELECT min(x.id) FROM (SELECT id FROM public.points_fat_reward_requests
        WHERE p_before IS NULL OR id < p_before ORDER BY id DESC LIMIT 30) x)) INTO v_more;
  v_result := jsonb_build_object('admin', v_admin, 'services', v_services, 'more', v_more,
    'pending_service', (SELECT count(*) FROM public.points_fat_reward_requests WHERE status = 'pending_service'),
    'pending_confirmation', (SELECT count(*) FROM public.points_fat_reward_requests WHERE status = 'pending_confirmation'));
  IF NOT v_admin THEN RETURN v_result; END IF;
  SELECT * INTO s FROM public.points_fat_reward_state WHERE id = 1;
  SELECT current_days AS days, current_mean_jin AS mean_jin INTO c
    FROM public.points_fat_reward_weeks WHERE week_start = v_week;
  IF NOT FOUND THEN SELECT * INTO c FROM public.points_fat_reward_sample(v_week); END IF;
  SELECT previous_days AS days, previous_mean_jin AS mean_jin, comparison_basis AS basis INTO p
    FROM public.points_fat_reward_weeks WHERE week_start = v_week;
  IF NOT FOUND THEN
    SELECT * INTO p FROM public.points_fat_reward_reference(v_week);
  END IF;
  RETURN v_result || jsonb_build_object('diamonds', s.diamonds, 'backpack', s.backpack,
    'next_cutoff', public.points_fat_reward_cutoff(s.next_week),
    'preview', jsonb_build_object('week', v_week, 'current_days', c.days, 'previous_days', p.days,
      'comparison_basis', p.basis, 'reference_available', p.mean_jin IS NOT NULL,
      'change_jin', c.mean_jin - p.mean_jin,
      'eligible', c.mean_jin IS NOT NULL AND p.mean_jin IS NOT NULL AND c.days >= 3
        AND (p.basis = 'starting_weight' OR p.days >= 3),
      'calculated_delta', public.points_fat_reward_delta(c.mean_jin - p.mean_jin, c.days,
        CASE WHEN p.basis = 'starting_weight' THEN 3 ELSE p.days END),
      'settled', EXISTS(SELECT 1 FROM public.points_fat_reward_weeks WHERE week_start = v_week)),
    'weeks', (SELECT coalesce(jsonb_agg(jsonb_build_object('week', t.week_start, 'cutoff', t.cutoff_at,
      'current_days', t.current_days, 'previous_days', t.previous_days,
      'comparison_basis', t.comparison_basis, 'change_jin', t.change_jin,
      'eligible', t.eligible, 'calculated_delta', t.calculated_delta, 'applied_delta', t.applied_delta,
      'balance_after', t.balance_after) ORDER BY t.week_start DESC), '[]'::jsonb)
      FROM (SELECT * FROM public.points_fat_reward_weeks ORDER BY week_start DESC LIMIT 8) t));
END;
$$;

CREATE OR REPLACE FUNCTION public.points_fat_reward_get_state(p_before bigint DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM public.points_fat_reward_settle_due();
  RETURN public.points_fat_reward_snapshot(p_before);
END;
$$;

-- 同一次购买或使用必须重用 operation_id，网络重试不会重复收费或重复发起服务。
CREATE OR REPLACE FUNCTION public.points_fat_reward_admin_exchange(p_kind text, p_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s record; o record; v_request bigint;
BEGIN
  IF NOT coalesce(public.points_is_admin(), false) THEN
    RAISE EXCEPTION 'Admin permission required' USING errcode = '42501';
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('buy','use') OR p_operation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid operation' USING errcode = '22023';
  END IF;
  PERFORM public.points_fat_reward_settle_due();
  SELECT * INTO STRICT s FROM public.points_fat_reward_state WHERE id = 1 FOR UPDATE;
  SELECT * INTO o FROM public.points_fat_reward_operations WHERE operation_id = p_operation_id;
  IF FOUND THEN
    IF o.kind <> p_kind OR o.created_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Operation conflict' USING errcode = '22023';
    END IF;
    RETURN public.points_fat_reward_snapshot();
  END IF;
  IF p_kind = 'buy' THEN
    IF s.diamonds < 1 THEN RAISE EXCEPTION 'Insufficient diamonds' USING errcode = 'P0001'; END IF;
    UPDATE public.points_fat_reward_state
      SET diamonds = diamonds - 1, backpack = backpack + 1, updated_at = clock_timestamp() WHERE id = 1;
  ELSE
    IF s.backpack < 1 THEN RAISE EXCEPTION 'Empty backpack' USING errcode = 'P0001'; END IF;
    INSERT INTO public.points_fat_reward_requests(requested_by)
      VALUES (auth.uid()) RETURNING id INTO v_request;
    UPDATE public.points_fat_reward_state
      SET backpack = backpack - 1, updated_at = clock_timestamp() WHERE id = 1;
  END IF;
  INSERT INTO public.points_fat_reward_operations(operation_id, kind, request_id, diamond_delta, created_by)
    VALUES (p_operation_id, p_kind, v_request, CASE WHEN p_kind = 'buy' THEN -1 ELSE 0 END, auth.uid());
  RETURN public.points_fat_reward_snapshot();
END;
$$;

CREATE OR REPLACE FUNCTION public.points_fat_reward_guest_serviced(p_request_id bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r record;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Guest access required' USING errcode = '42501';
  END IF;
  PERFORM public.points_fat_reward_settle_due();
  PERFORM id FROM public.points_fat_reward_state WHERE id = 1 FOR UPDATE;
  SELECT * INTO r FROM public.points_fat_reward_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found' USING errcode = 'P0002'; END IF;
  IF r.status = 'pending_service' THEN
    UPDATE public.points_fat_reward_requests SET status = 'pending_confirmation',
      serviced_at = clock_timestamp() WHERE id = p_request_id;
  END IF;
  RETURN public.points_fat_reward_snapshot();
END;
$$;

CREATE OR REPLACE FUNCTION public.points_fat_reward_admin_resolve(p_request_id bigint, p_confirm boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r record; v_status text;
BEGIN
  IF NOT coalesce(public.points_is_admin(), false) THEN
    RAISE EXCEPTION 'Admin permission required' USING errcode = '42501';
  END IF;
  IF p_confirm IS NULL THEN RAISE EXCEPTION 'Invalid confirmation' USING errcode = '22023'; END IF;
  PERFORM public.points_fat_reward_settle_due();
  PERFORM id FROM public.points_fat_reward_state WHERE id = 1 FOR UPDATE;
  SELECT * INTO r FROM public.points_fat_reward_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found' USING errcode = 'P0002'; END IF;
  v_status := CASE WHEN p_confirm THEN 'completed' ELSE 'returned' END;
  IF r.status = v_status THEN RETURN public.points_fat_reward_snapshot(); END IF;
  IF r.status <> 'pending_confirmation' THEN
    RAISE EXCEPTION 'Request is not awaiting confirmation' USING errcode = 'P0001';
  END IF;
  UPDATE public.points_fat_reward_requests SET status = v_status, resolved_at = clock_timestamp()
    WHERE id = p_request_id;
  IF NOT p_confirm THEN
    UPDATE public.points_fat_reward_state SET backpack = backpack + 1, updated_at = clock_timestamp() WHERE id = 1;
  END IF;
  RETURN public.points_fat_reward_snapshot();
END;
$$;

-- 内部函数和所有表禁止浏览器直接调用/读取。
REVOKE ALL ON FUNCTION public.points_fat_reward_cutoff(date), public.points_fat_reward_sample(date),
  public.points_fat_reward_reference(date),
  public.points_fat_reward_delta(numeric, integer, integer), public.points_fat_reward_settle_due(),
  public.points_fat_reward_snapshot(bigint), public.points_fat_reward_get_state(bigint),
  public.points_fat_reward_admin_exchange(text, uuid), public.points_fat_reward_guest_serviced(bigint),
  public.points_fat_reward_admin_resolve(bigint, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.points_fat_reward_get_state(bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.points_fat_reward_guest_serviced(bigint) TO anon;
GRANT EXECUTE ON FUNCTION public.points_fat_reward_admin_exchange(text, uuid),
  public.points_fat_reward_admin_resolve(bigint, boolean) TO authenticated;

-- 独立每周一次的数据库任务：浏览器关闭仍会结算。
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
DECLARE v_timezone text := coalesce(current_setting('cron.timezone', true), 'GMT'); v_schedule text;
BEGIN
  IF v_timezone IN ('GMT', 'UTC', 'Etc/UTC', 'Etc/GMT') THEN v_schedule := '0 4 * * 0';
  ELSIF v_timezone = 'Asia/Shanghai' THEN v_schedule := '0 12 * * 0';
  ELSE RAISE EXCEPTION 'cron.timezone=%，请按北京时间周日12:00配置任务时区后重试', v_timezone;
  END IF;
  PERFORM cron.schedule('points-fat-rewards-sunday-noon', v_schedule,
    'SELECT public.points_fat_reward_settle_due();');
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;

-- 部署后核查任务（不需要改动现有任务）：
SELECT jobid, jobname, schedule, active FROM cron.job
WHERE jobname = 'points-fat-rewards-sunday-noon';
