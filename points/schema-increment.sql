-- CURRENT CHANGE ONLY; previous increments are replaced, never appended.

-- BASE_COMMIT: ea3087cdf43bd277deffda0c3bea9440efff16d3

-- Requires the maintained database at that commit (or this increment already applied).

-- Historical upgrades belong in Git history, not in this execution file.

BEGIN;

DO $baseline$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='points_notice' AND p.proname='business_event'
  AND pg_get_function_identity_arguments(p.oid)=''
  AND md5(replace(replace(prosrc,E'\r\n',E'\n'),E'\r',E'\n')) IN ('ec09b0a0466d7a1005abd7ed93657d65','9ab52f3f7b6045e0dfd20d4b015c8103')) THEN
  RAISE EXCEPTION 'Database baseline differs for business_event; apply/verify preceding changes first';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='points_notifications_preferences'
  AND pg_get_function_identity_arguments(p.oid)='p_categories text[], p_quiet boolean, p_night_important boolean'
  AND md5(replace(replace(prosrc,E'\r\n',E'\n'),E'\r',E'\n')) IN ('22bababfdbe3dbceb841aa5bd0905b2d','58ab22cec4c8f88723a6de71d831baf1')) THEN
  RAISE EXCEPTION 'Database baseline differs for points_notifications_preferences; apply/verify preceding changes first';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='points_notifications_get_todos'
  AND pg_get_function_identity_arguments(p.oid)='p_before text'
  AND md5(replace(replace(prosrc,E'\r\n',E'\n'),E'\r',E'\n')) IN ('638efb7bd4ffcb858522294db20826af','ae9933470f74e50344ae1ac0f176b04c')) THEN
  RAISE EXCEPTION 'Database baseline differs for points_notifications_get_todos; apply/verify preceding changes first';
 END IF;
END
$baseline$;

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
    WHERE r.created_at >= ((b.monday - 21)::timestamp AT TIME ZONE 'Asia/Shanghai')
      AND r.created_at <= now()
    GROUP BY 1
  ), weekly AS (
    SELECT b.monday - offsets.days AS start_date, count(d.day) AS days, avg(d.lightest) AS mean
    FROM bounds b CROSS JOIN (VALUES (21),(14),(7),(0)) AS offsets(days)
    LEFT JOIN daily d ON d.day BETWEEN b.monday - offsets.days AND b.monday - offsets.days + 6
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'configured', s.starting_weight_jin IS NOT NULL,
    'delta_jin', latest.weight_jin - s.starting_weight_jin,
    'recorded_at', latest.created_at,
    'weeks', (SELECT jsonb_agg(jsonb_build_object('start', w.start_date, 'end', w.start_date + 6,
      'days', w.days, 'mean', CASE WHEN w.days >= 3 THEN w.mean - s.starting_weight_jin END)
      ORDER BY w.start_date) FROM weekly w)
  )
  FROM public.points_fat_settings s
  LEFT JOIN LATERAL (
    SELECT r.weight_jin, r.created_at FROM public.points_fat_records r
    WHERE r.created_at <= now()
    ORDER BY r.created_at DESC, r.id DESC LIMIT 1
  ) latest ON true
  WHERE s.id = 1;
$function$;

ALTER FUNCTION "public"."points_fat_get_progress"() OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_fat_get_progress"() FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_get_progress"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_get_progress"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_fat_get_progress"() TO "authenticated";

CREATE OR REPLACE FUNCTION points_notice.business_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE j jsonb:=to_jsonb(NEW); old_j jsonb:=CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  key text:=TG_TABLE_NAME||':'||coalesce(j->>'id',j->>'week_start'); title text; body text; a text; group_name text;
BEGIN
  IF TG_TABLE_NAME='score_logs' THEN
    -- A meal review is described once by the order event, including its delta.
    IF coalesce(j->>'reason','')~'^(厨房评价 · 订单|家务结算 · 任务) #[0-9]+$' THEN RETURN NEW; END IF;
    PERFORM points_notice.emit(key,'guest','score',CASE WHEN (j->>'delta')::numeric>0 THEN '积分增加了' ELSE '积分有扣减' END,
      CASE WHEN (j->>'delta')::numeric>0 THEN '+' ELSE '' END||(j->>'delta')||' 分 · '||coalesce(nullif(j->>'reason',''),'积分调整'),'score','score',0,j->>'operator_id' IS NOT NULL);
  ELSIF TG_TABLE_NAME='points_shop_admin_inventory_logs' THEN
    body:=CASE j->>'item_code' WHEN 'shield30' THEN '小幸运护盾' WHEN 'upgrade' THEN '奖励升级卡' WHEN 'double_pick' THEN '命运二选一' WHEN 'lucky100' THEN '百元幸运药水' WHEN 'restart' THEN '命运重启卡' WHEN 'wish' THEN '许愿卡' WHEN 'triple_challenge' THEN '三连挑战卡' WHEN 'no10' THEN '十元退散' WHEN 'return10' THEN '幸运返场卡' WHEN 'heartbeat' THEN '心跳翻倍卡' WHEN 'mystery_box' THEN '幸运盲盒' WHEN 'free_mystery_box' THEN '免费幸运盲盒' ELSE '道具' END;
    PERFORM points_notice.emit(key,'guest','assets','道具数量已调整',body||' '||CASE WHEN (j->>'delta')::int>0 THEN '+' ELSE '' END||(j->>'delta')||' 个 · 现在 '||(j->>'quantity_after')||' 个。','assets','assets');
  ELSIF TG_TABLE_NAME='points_wheel_logs' AND j->>'action'='admin_chance_adjust' THEN
    PERFORM points_notice.emit(key,'guest','assets','正式转盘机会已调整','变化 '||(j->>'chance_delta')||' 次 · 现在 '||(j->>'chance_after')||' 次。','wheel','assets');
  ELSIF TG_TABLE_NAME='points_withdrawals' THEN
    group_name:='withdrawal:'||(j->>'id');
    IF TG_OP='INSERT' THEN
      PERFORM points_notice.emit(key||':requested','admin','withdrawal','宝宝发来了提现申请','申请 ¥'||(j->>'amount')||'，请实际兑现后再标记完成。','withdrawals',group_name,1,true,true);
    ELSIF j->>'canceled_at' IS NOT NULL AND old_j->>'canceled_at' IS NULL THEN
      UPDATE points_notice.events SET active=false WHERE group_key=group_name;
      PERFORM points_notice.emit(key||':cancelled','guest','withdrawal','提现申请已取消','这笔 ¥'||(j->>'amount')||' 的申请已取消，请查看记录及余额。','withdrawals',group_name,1);
    ELSIF j->>'status'='settled' AND old_j->>'status' IS DISTINCT FROM 'settled' THEN
      UPDATE points_notice.events SET active=false WHERE group_key=group_name;
      PERFORM points_notice.emit(key||':settled','guest','withdrawal','提现已标记兑现','哥哥已标记兑现 ¥'||(j->>'amount')||'，请实际查收。','withdrawals',group_name,1);
    END IF;
  ELSIF TG_TABLE_NAME='points_kitchen_orders' THEN
    group_name:='kitchen:'||(j->>'id');
    IF TG_OP='UPDATE' AND (j->>'status' IS DISTINCT FROM old_j->>'status' OR j->>'version' IS DISTINCT FROM old_j->>'version') THEN UPDATE points_notice.events SET active=false WHERE group_key=group_name; END IF;
    IF TG_OP='INSERT' OR j->>'version' IS DISTINCT FROM old_j->>'version' OR j->>'status' IS DISTINCT FROM old_j->>'status' THEN
      key:=key||':'||(j->>'version')||':'||(j->>'status');
      IF j->>'status'='settled' THEN
        PERFORM points_notice.emit(key,'guest','kitchen','这餐评价已完成','本单积分变化 '||coalesce(j->>'score_delta','0')||' 分，点开查看每道菜的评价。','kitchen',group_name);
      ELSIF j->>'status' IN ('completed','rejected') THEN
        PERFORM points_notice.emit(key,'admin','kitchen',CASE WHEN j->>'status'='completed' THEN '宝宝做好饭啦' ELSE '这餐有制作反馈' END,'点开厨房查看具体菜品和最新状态。','kitchen',group_name,1,true,j->>'status'='completed');
      ELSE
        title:=CASE WHEN j->>'status'='cancelled' THEN '点菜订单已取消' WHEN TG_OP='INSERT' THEN '哥哥发来了点菜请求' ELSE '点菜菜单已更新' END;
        PERFORM points_notice.emit(key,'guest','kitchen',title,'点开厨房查看最新菜单。','kitchen',group_name,1,true,j->>'status'='pending');
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME='devices' AND (TG_OP='INSERT' OR old_j->>'revoked_at' IS NOT NULL AND j->>'revoked_at' IS NULL) THEN
    PERFORM points_notice.emit('device:'||(j->>'id')||':'||(j->>'verified_at'),'admin','security','新的游客设备已接入','一台游客设备已通过验证码，点开设备管理查看。','devices','device:'||(j->>'id'),1);
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.points_notifications_preferences(p_categories text[] DEFAULT NULL::text[], p_quiet boolean DEFAULT NULL::boolean, p_night_important boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE a text:=points_notice.actor(); p points_notice.preferences; BEGIN
  IF p_categories IS NOT NULL AND NOT p_categories<@ARRAY['score','kitchen','withdrawal','assets','security'] THEN RAISE EXCEPTION 'Invalid categories' USING errcode='22023'; END IF;
  INSERT INTO points_notice.preferences(actor) VALUES(a) ON CONFLICT DO NOTHING;
  UPDATE points_notice.preferences SET categories=coalesce(p_categories,categories),quiet=coalesce(p_quiet,quiet),night_important=coalesce(p_night_important,night_important) WHERE actor=a RETURNING * INTO p;
  RETURN jsonb_build_object('categories',p.categories,'quiet',p.quiet,'nightImportant',p.night_important);
END $function$;

CREATE OR REPLACE FUNCTION public.points_notifications_get_todos(p_before text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE actor text:=points_notice.actor(); administrator boolean:=actor LIKE 'admin:%';
 cursor_data jsonb:=p_before::jsonb; entries jsonb; total bigint; BEGIN
 WITH todos AS (
  SELECT 'family:'||t.id AS key,t.id::text AS target,'kitchen'::text AS route,'家事'::text AS category,
   t.title AS title,CASE t.status WHEN 'review' THEN '待验收' WHEN 'rework' THEN '需返工' ELSE '待完成' END AS status,
   CASE t.status WHEN 'review' THEN '宝宝已提交，等你验收' WHEN 'rework' THEN coalesce(nullif(t.comment,''),'完成返工后重新提交') ELSE coalesce(nullif(t.note,''),'完成后提交哥哥验收') END AS body,t.updated_at AS at
  FROM public.points_family_tasks t
  WHERE CASE WHEN administrator THEN t.status='review' ELSE t.status IN ('pending','rework') END
  UNION ALL
  SELECT 'withdrawal:'||w.id,w.id::text,'withdrawals','提现','提现 ¥'||w.amount,'待兑现','确认实际兑现后完成申请',w.requested_at
  FROM public.points_withdrawals w WHERE administrator AND w.status='pending' AND w.hidden_at IS NULL
 ), page AS (
  SELECT * FROM todos WHERE p_before IS NULL OR (at,key)<((cursor_data->>'at')::timestamptz,cursor_data->>'id')
  ORDER BY at DESC,key DESC LIMIT 31
 )
 SELECT (SELECT count(*) FROM todos),coalesce(jsonb_agg(jsonb_build_object('id',key,'target',target,'route',route,'category',category,'title',title,'status',status,'body',body,'at',at) ORDER BY at DESC,key DESC),'[]') INTO total,entries FROM page;
 RETURN jsonb_build_object('admin',administrator,'total',total,'items',
  (SELECT coalesce(jsonb_agg(x ORDER BY n),'[]') FROM jsonb_array_elements(entries) WITH ORDINALITY e(x,n) WHERE n<=30),
  'more',jsonb_array_length(entries)>30,'cursor',CASE WHEN jsonb_array_length(entries)>30 THEN jsonb_build_object('at',entries->29->>'at','id',entries->29->>'id')::text END);
END $function$;

DO $cleanup$
DECLARE job bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='points_fat_records' AND column_name='bowel_status') THEN
    LOCK TABLE public.points_fat_records IN ACCESS EXCLUSIVE MODE;
    DELETE FROM public.points_fat_records WHERE bowel_status='before';
  END IF;
  IF to_regclass('cron.job') IS NOT NULL THEN
    FOR job IN SELECT jobid FROM cron.job
      WHERE command ~* '\mpoints_fat_(v2_)?reward_[a-z_]+\M'
    LOOP
      PERFORM cron.unschedule(job);
    END LOOP;
  END IF;
END
$cleanup$;

WITH retired AS (
  SELECT id FROM points_notice.events WHERE category IN ('fat','service') AND route IN ('fat','services')
), detached AS (
  DELETE FROM points_notice.batch_items WHERE event_id IN (SELECT id FROM retired)
), forgotten AS (
  DELETE FROM points_notice.receipts WHERE event_id IN (SELECT id FROM retired)
)
DELETE FROM points_notice.events WHERE id IN (SELECT id FROM retired);

UPDATE points_notice.preferences
SET categories=array_remove(array_remove(categories,'fat'),'service')
WHERE categories && ARRAY['fat','service'];

DROP FUNCTION IF EXISTS "public"."points_fat_reward_admin_exchange"(p_kind text, p_operation_id uuid),
  "public"."points_fat_reward_admin_resolve"(p_request_id bigint, p_confirm boolean),
  "public"."points_fat_reward_cutoff"(p_week date),
  "public"."points_fat_reward_delta"(p_change numeric, p_days integer, p_previous_days integer),
  "public"."points_fat_reward_get_state"(p_before bigint),
  "public"."points_fat_reward_guest_serviced"(p_request_id bigint),
  "public"."points_fat_reward_reference"(p_week date),
  "public"."points_fat_reward_sample"(p_week date),
  "public"."points_fat_reward_settle_due"(),
  "public"."points_fat_reward_snapshot"(p_before bigint),
  "public"."points_fat_v2_admin_record_weight"(p_weight_jin numeric, p_bowel_status text),
  "public"."points_fat_v2_get_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer),
  "public"."points_fat_v2_get_state"(p_bowel_status text),
  "public"."points_fat_v2_reward_analysis"(p_week date),
  "public"."points_fat_v2_reward_reference"(p_week date, p_status text),
  "public"."points_fat_v2_reward_sample"(p_week date, p_status text);

ALTER TABLE "points_notice"."preferences" ALTER COLUMN "categories" SET DEFAULT ARRAY['score'::text, 'kitchen'::text, 'withdrawal'::text, 'assets'::text, 'security'::text];

ALTER TABLE "public"."points_fat_records" DROP COLUMN IF EXISTS "bowel_status";

DROP TABLE IF EXISTS "public"."points_fat_reward_operations", "public"."points_fat_reward_requests", "public"."points_fat_reward_state", "public"."points_fat_reward_week_series", "public"."points_fat_reward_weeks", "public"."points_fat_status_migration";

NOTIFY pgrst,'reload schema';

COMMIT;
