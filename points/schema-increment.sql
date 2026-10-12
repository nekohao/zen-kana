-- CURRENT INCREMENT: upgrade from sql-backup/online-confirmed.json to the maintained current structure.
-- Keep this fixed filename; preserve repeatability and include dependencies when extending it.
-- Unified family tasks. Incremental upgrade; repeatable; existing settled meals remain intact.
BEGIN;

-- Preserve the previously maintained settlement-read upgrade as a prerequisite.
-- Incremental upgrade from the user-confirmed 2026-10-11 schema. Safe to rerun.
-- Shared settlement reads only; no changes to reward calculation, records or mutation grants.
CREATE OR REPLACE FUNCTION public.points_fat_reward_snapshot(p_before bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_admin boolean:=coalesce(public.points_is_admin(),false); v_result jsonb; v_services jsonb; v_more boolean;
  s record; chosen record; v_series jsonb; v_preview jsonb;
  v_week date:=date_trunc('week',clock_timestamp() AT TIME ZONE 'Asia/Shanghai')::date;
BEGIN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id::text,'status',t.status,'requested_at',t.requested_at,
    'serviced_at',t.serviced_at,'resolved_at',t.resolved_at) ORDER BY t.id DESC),'[]'::jsonb) INTO v_services
    FROM(SELECT * FROM public.points_fat_reward_requests WHERE p_before IS NULL OR id<p_before ORDER BY id DESC LIMIT 30) t;
  SELECT EXISTS(SELECT 1 FROM public.points_fat_reward_requests WHERE (p_before IS NULL OR id<p_before) AND id<
    (SELECT min(x.id) FROM(SELECT id FROM public.points_fat_reward_requests WHERE p_before IS NULL OR id<p_before ORDER BY id DESC LIMIT 30) x)) INTO v_more;
  v_result:=jsonb_build_object('admin',v_admin,'services',v_services,'more',v_more,
    'pending_service',(SELECT count(*) FROM public.points_fat_reward_requests WHERE status='pending_service'),
    'pending_confirmation',(SELECT count(*) FROM public.points_fat_reward_requests WHERE status='pending_confirmation'));
  -- Shared read-only settlement data; privileged mutations retain their original checks.
  SELECT * INTO s FROM public.points_fat_reward_state WHERE id=1;
  SELECT * INTO chosen FROM public.points_fat_reward_weeks WHERE week_start=v_week;
  IF FOUND THEN
    v_preview:=jsonb_build_object('week',v_week,'current_days',chosen.current_days,'previous_days',chosen.previous_days,
      'comparison_basis',chosen.comparison_basis,'reference_available',chosen.previous_mean_jin IS NOT NULL,
      'change_jin',chosen.change_jin,'eligible',chosen.eligible,'calculated_delta',chosen.calculated_delta,
      'applied_delta',chosen.applied_delta,'balance_after',chosen.balance_after,
      'settled',true,'bowel_status',chosen.bowel_status,'rule_version',chosen.rule_version);
  ELSE
    SELECT * INTO chosen FROM public.points_fat_v2_reward_analysis(v_week)
      ORDER BY eligible DESC,current_days DESC,(bowel_status='after') DESC LIMIT 1;
    v_preview:=jsonb_build_object('week',v_week,'current_days',chosen.current_days,'previous_days',chosen.previous_days,
      'comparison_basis',chosen.comparison_basis,'reference_available',chosen.previous_mean_jin IS NOT NULL,
      'change_jin',chosen.change_jin,'eligible',chosen.eligible,'calculated_delta',chosen.calculated_delta,
      'settled',false,'bowel_status',CASE WHEN chosen.eligible THEN chosen.bowel_status ELSE NULL END,'rule_version',2);
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('bowel_status',a.bowel_status,'current_days',a.current_days,
    'previous_days',a.previous_days,'comparison_basis',a.comparison_basis,'reference_available',a.previous_mean_jin IS NOT NULL,
    'change_jin',a.change_jin,'eligible',a.eligible,'calculated_delta',a.calculated_delta) ORDER BY a.bowel_status),'[]'::jsonb)
    INTO v_series FROM public.points_fat_v2_reward_analysis(v_week) a;
  IF (v_preview->>'settled')::boolean AND (v_preview->>'rule_version')::integer=1 THEN v_series:='[]'::jsonb; END IF;
  RETURN v_result||jsonb_build_object('settlement_readable',true,'status_rules',2,'diamonds',s.diamonds,'backpack',s.backpack,
    'next_cutoff',public.points_fat_reward_cutoff(s.next_week),'preview',v_preview||jsonb_build_object('series',v_series),
    'weeks',(SELECT coalesce(jsonb_agg(jsonb_build_object('week',t.week_start,'cutoff',t.cutoff_at,
      'current_days',t.current_days,'previous_days',t.previous_days,'comparison_basis',t.comparison_basis,
      'change_jin',t.change_jin,'eligible',t.eligible,'calculated_delta',t.calculated_delta,
      'applied_delta',t.applied_delta,'balance_after',t.balance_after,'bowel_status',t.bowel_status,'rule_version',t.rule_version)
      ORDER BY t.week_start DESC),'[]'::jsonb) FROM(SELECT * FROM public.points_fat_reward_weeks ORDER BY week_start DESC LIMIT 8)t));
END $function$;
REVOKE ALL ON FUNCTION public.points_fat_reward_snapshot(bigint) FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';


-- Unified household upgrade.
CREATE TABLE IF NOT EXISTS public.points_family_types (
 code text PRIMARY KEY CHECK(code ~ '^[a-z][a-z0-9_]{0,39}$'), label text NOT NULL CHECK(char_length(label) BETWEEN 1 AND 40),
 points integer CHECK(points BETWEEN 1 AND 1000), version integer NOT NULL DEFAULT 1 CHECK(version>0),
 position integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.points_family_tasks (
 id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, member_id bigint NOT NULL REFERENCES public.members(id),
 type_code text NOT NULL REFERENCES public.points_family_types(code), title text NOT NULL,
 points integer CHECK(points BETWEEN 1 AND 1000), origin text NOT NULL CHECK(origin IN ('admin','guest')),
 note text NOT NULL DEFAULT '' CHECK(char_length(note)<=500), items jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(items)='array'),
 task_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Shanghai')::date,
 status text NOT NULL CHECK(status IN ('pending','review','rework','settled','cancelled')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), attempt integer NOT NULL DEFAULT 0 CHECK(attempt>=0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), submitted_at timestamptz,
 reviewed_at timestamptz, comment text NOT NULL DEFAULT '' CHECK(char_length(comment)<=1000),
 score_log_id bigint UNIQUE REFERENCES public.score_logs(id), score_after integer,
 legacy_order_id bigint UNIQUE REFERENCES public.points_kitchen_orders(id)
);
CREATE TABLE IF NOT EXISTS public.points_family_events (
 id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, task_id bigint NOT NULL REFERENCES public.points_family_tasks(id),
 version integer NOT NULL, attempt integer NOT NULL, action text NOT NULL, comment text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(task_id,version)
);
CREATE TABLE IF NOT EXISTS public.points_family_operations (
 operation_id uuid PRIMARY KEY, actor text NOT NULL, kind text NOT NULL, arguments jsonb NOT NULL,
 task_id bigint REFERENCES public.points_family_tasks(id), result jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS points_family_tasks_list ON public.points_family_tasks(status,id DESC);
ALTER TABLE public.points_family_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_family_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_family_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_family_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.points_family_types,public.points_family_tasks,public.points_family_events,public.points_family_operations FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE public.points_family_tasks_id_seq,public.points_family_events_id_seq FROM PUBLIC,anon,authenticated;
INSERT INTO public.points_family_types(code,label,points,position) VALUES
 ('dishes','洗碗',1,1),('cooking','做饭',NULL,2),('floor','扫地 / 拖地',NULL,3),('laundry','洗衣 / 晾衣',NULL,4),
 ('tidying','整理房间',NULL,5),('trash','倒垃圾',NULL,6) ON CONFLICT(code) DO NOTHING;
-- Only open legacy meals become cooking tasks. Their source and historical scores are preserved.
INSERT INTO public.points_family_tasks(member_id,type_code,title,points,origin,note,items,task_date,status,attempt,created_at,submitted_at,legacy_order_id)
 SELECT o.member_id,'cooking',CASE WHEN o.meal IS NULL THEN '做饭' ELSE '做饭 · '||o.meal END,t.points,o.origin,o.note,o.items,
 coalesce(o.meal_date,(o.created_at AT TIME ZONE 'Asia/Shanghai')::date),CASE WHEN o.status='completed' THEN 'review' ELSE 'pending' END,
 CASE WHEN o.status='completed' THEN 1 ELSE 0 END,o.created_at,o.completed_at,o.id
 FROM public.points_kitchen_orders o JOIN public.points_family_types t ON t.code='cooking'
 WHERE o.status IN ('pending','completed') ON CONFLICT(legacy_order_id) DO NOTHING;
INSERT INTO public.points_family_events(task_id,version,attempt,action,comment,created_at)
 SELECT id,version,attempt,'imported','保留原餐次菜单与要求，后续按家庭任务验收。',created_at
 FROM public.points_family_tasks WHERE legacy_order_id IS NOT NULL ON CONFLICT(task_id,version) DO NOTHING;
CREATE OR REPLACE FUNCTION public.points_family_actor() RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $function$
BEGIN
 IF auth.uid() IS NOT NULL THEN
  IF public.points_is_admin() THEN RETURN 'admin:'||auth.uid()::text; END IF;
  RAISE EXCEPTION 'Admin required' USING errcode='42501';
 END IF;
 PERFORM points_access.require_device(); RETURN 'guest';
END $function$;

CREATE OR REPLACE FUNCTION public.points_family_snapshot(p_id bigint) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $function$
 SELECT to_jsonb(t)-'member_id'-'score_log_id' || jsonb_build_object('id',t.id::text,
 'events',(SELECT coalesce(jsonb_agg(jsonb_build_object('version',e.version,'attempt',e.attempt,'action',e.action,'comment',e.comment,'at',e.created_at) ORDER BY e.version),'[]')
 FROM public.points_family_events e WHERE e.task_id=t.id)) FROM public.points_family_tasks t WHERE t.id=p_id
$function$;
CREATE OR REPLACE FUNCTION public.points_family_get_task(p_task_id bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE result jsonb; BEGIN
 PERFORM public.points_family_actor(); result:=public.points_family_snapshot(p_task_id);
 IF result IS NULL THEN RAISE EXCEPTION 'Task not found' USING errcode='P0002'; END IF; RETURN result;
END $function$;
CREATE OR REPLACE FUNCTION public.points_family_get_types() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
BEGIN
 PERFORM public.points_family_actor(); RETURN (SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY position,code),'[]') FROM public.points_family_types t WHERE active);
END $function$;
CREATE OR REPLACE FUNCTION public.points_family_get_state(p_history boolean DEFAULT false,p_before bigint DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE a text:=public.points_family_actor(); tasks jsonb; BEGIN
 SELECT coalesce(jsonb_agg(public.points_family_snapshot(t.id) ORDER BY t.id DESC),'[]') INTO tasks FROM
 (SELECT id FROM public.points_family_tasks WHERE (p_before IS NULL OR id<p_before)
 AND CASE WHEN p_history THEN status IN ('settled','cancelled') ELSE status IN ('pending','review','rework') END ORDER BY id DESC LIMIT 30)t;
 RETURN jsonb_build_object('admin',a LIKE 'admin:%','types',public.points_family_get_types(),'tasks',tasks,
 'more',EXISTS(SELECT 1 FROM public.points_family_tasks WHERE id<(SELECT min((x->>'id')::bigint) FROM jsonb_array_elements(tasks)x)
 AND CASE WHEN p_history THEN status IN ('settled','cancelled') ELSE status IN ('pending','review','rework') END),
 'counts',(SELECT jsonb_build_object('pending',count(*) FILTER(WHERE status='pending'),'review',count(*) FILTER(WHERE status='review'),'rework',count(*) FILTER(WHERE status='rework')) FROM public.points_family_tasks));
END $function$;
CREATE OR REPLACE FUNCTION public.points_family_write(p_action text,p_payload jsonb,p_operation_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
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
  RETURN op.result;
 END IF;
 IF p_action='create' THEN
  SELECT * INTO ty FROM public.points_family_types WHERE code=p_payload->>'type' AND active FOR SHARE;
  IF NOT FOUND OR ty.points IS NULL THEN RAISE EXCEPTION 'Points not configured' USING errcode='22023'; END IF;
  IF char_length(coalesce(p_payload->>'note',''))>500 THEN RAISE EXCEPTION 'Note too long' USING errcode='22023'; END IF;
  IF ty.code='cooking' AND jsonb_array_length(coalesce(p_payload->'items','[]'))>0 THEN v_items:=points_kitchen_v2.items(p_payload->'items',true); END IF;
  INSERT INTO public.points_family_tasks(member_id,type_code,title,points,origin,note,items,status,attempt,submitted_at)
   VALUES(member,ty.code,ty.label,ty.points,CASE WHEN administrator THEN 'admin' ELSE 'guest' END,coalesce(p_payload->>'note',''),v_items,
    CASE WHEN administrator THEN 'pending' ELSE 'review' END,CASE WHEN administrator THEN 0 ELSE 1 END,CASE WHEN NOT administrator THEN clock_timestamp() END) RETURNING * INTO t;
 ELSIF p_action='price' THEN
  IF NOT administrator THEN RAISE EXCEPTION 'Admin required' USING errcode='42501'; END IF;
  SELECT * INTO ty FROM public.points_family_types WHERE code=p_payload->>'type' FOR UPDATE;
  IF NOT FOUND OR ty.version IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Price changed' USING errcode='40001'; END IF;
  IF p_payload->>'points' IS NULL OR (p_payload->>'points')!~'^[0-9]+$' OR (p_payload->>'points')::integer NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Invalid points' USING errcode='22023'; END IF;
  UPDATE public.points_family_types SET points=(p_payload->>'points')::integer,version=version+1,updated_at=clock_timestamp() WHERE code=ty.code;
  UPDATE public.points_family_tasks SET points=(p_payload->>'points')::integer,version=version+1 WHERE type_code=ty.code AND points IS NULL AND legacy_order_id IS NOT NULL;
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
    t.score_after:=public.change_score_single(t.points,'家务结算 · 任务 #'||t.id);
    SELECT l.id INTO t.score_log_id FROM public.score_logs l WHERE member_id=member AND reason='家务结算 · 任务 #'||t.id ORDER BY l.id DESC LIMIT 1;
   END IF;
   UPDATE public.points_family_tasks SET status=CASE WHEN (p_payload->>'qualified')::boolean THEN 'settled' ELSE 'rework' END,
    version=version+1,comment=v_comment,reviewed_at=clock_timestamp(),updated_at=clock_timestamp(),score_after=t.score_after,score_log_id=t.score_log_id
    WHERE points_family_tasks.id=v_id RETURNING * INTO t;
  ELSIF p_action='cancel' THEN
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

CREATE OR REPLACE FUNCTION public.points_family_notice() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE recipient text; headline text; grouped text:='family:'||NEW.id; BEGIN
 IF TG_OP='UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
 UPDATE points_notice.events SET active=false WHERE group_key=grouped;
 recipient:=CASE WHEN NEW.status='review' THEN 'admin' ELSE 'guest' END;
 headline:=CASE NEW.status WHEN 'pending' THEN '哥哥发来了家务请求' WHEN 'review' THEN '宝宝完成了家务，等待验收'
 WHEN 'rework' THEN '这项家务需要返工' WHEN 'settled' THEN '家务合格，积分已结算' ELSE '家务请求已取消' END;
 PERFORM points_notice.emit(grouped||':'||NEW.version,recipient,'kitchen',headline,
 NEW.title||CASE WHEN NEW.status='settled' THEN ' · +'||NEW.points||' 分' ELSE '' END||CASE WHEN NEW.comment<>'' THEN ' · '||NEW.comment ELSE '' END,
 'kitchen',grouped,CASE WHEN NEW.status='settled' THEN 0 ELSE 1 END,true,NEW.status IN ('pending','review','rework'));
 RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.points_family_guard_legacy() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
BEGIN
 IF EXISTS(SELECT 1 FROM public.points_family_tasks WHERE legacy_order_id=OLD.id) THEN
  RAISE EXCEPTION 'Meal moved to family tasks; use current app' USING errcode='40001';
 END IF; RETURN NEW;
END $function$;
DROP TRIGGER IF EXISTS points_family_notice ON public.points_family_tasks;
CREATE TRIGGER points_family_notice AFTER INSERT OR UPDATE ON public.points_family_tasks FOR EACH ROW EXECUTE FUNCTION public.points_family_notice();
DROP TRIGGER IF EXISTS points_family_guard_legacy ON public.points_kitchen_orders;
CREATE TRIGGER points_family_guard_legacy BEFORE UPDATE ON public.points_kitchen_orders FOR EACH ROW EXECUTE FUNCTION public.points_family_guard_legacy();
REVOKE ALL ON FUNCTION public.points_family_actor(),public.points_family_snapshot(bigint),public.points_family_notice(),public.points_family_guard_legacy() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.points_family_get_types(),public.points_family_get_state(boolean,bigint),public.points_family_get_task(bigint),public.points_family_write(text,jsonb,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.points_family_get_types(),public.points_family_get_state(boolean,bigint),public.points_family_get_task(bigint),public.points_family_write(text,jsonb,uuid) TO anon,authenticated;
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
    PERFORM points_notice.emit(key,'guest','score',CASE WHEN (j->>'delta')::int>0 THEN '积分增加了' ELSE '积分有扣减' END,
      CASE WHEN (j->>'delta')::int>0 THEN '+' ELSE '' END||(j->>'delta')||' 分 · '||coalesce(nullif(j->>'reason',''),'积分调整'),'score','score',0,j->>'operator_id' IS NOT NULL);
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
  ELSIF TG_TABLE_NAME='points_fat_reward_weeks' AND TG_OP='INSERT' THEN
    PERFORM points_notice.emit(key,'admin','fat','减脂周结算已完成',CASE WHEN (j->>'eligible')::boolean THEN '本周钻石奖扣 '||(j->>'applied_delta')||'，余额 '||(j->>'balance_after')||'。' ELSE '本周记录条件未满足，没有奖扣。' END,'fat','fat:'||(j->>'week_start'),0,(j->>'eligible')::boolean);
  ELSIF TG_TABLE_NAME='points_fat_reward_requests' THEN
    group_name:='service:'||(j->>'id');
    IF TG_OP='INSERT' OR j->>'status' IS DISTINCT FROM old_j->>'status' THEN
      UPDATE points_notice.events SET active=false WHERE group_key=group_name;
      a:=CASE WHEN j->>'status'='pending_confirmation' THEN 'admin' ELSE 'guest' END;
      title:=CASE j->>'status' WHEN 'pending_service' THEN '有新的服务请求' WHEN 'pending_confirmation' THEN '服务请求等待确认' WHEN 'returned' THEN '服务请求已退回' ELSE '服务请求已确认' END;
      PERFORM points_notice.emit(key||':'||(j->>'status'),a,'service',title,'点开查看请求状态和详情。','services',group_name,1,true,j->>'status' IN ('pending_service','pending_confirmation'));
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
-- Old clients can still read meal history, but cannot create or settle parallel meal tasks.
DO $guard$
DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname ~ '^points_kitchen_(v[23]_)?(admin_save|admin_review|guest_save|guest_resolve)$' LOOP
  EXECUTE 'REVOKE EXECUTE ON FUNCTION '||f.signature||' FROM PUBLIC,anon,authenticated';
 END LOOP;
END $guard$;
NOTIFY pgrst,'reload schema';
COMMIT;
