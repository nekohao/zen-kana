-- Incremental upgrade from the user-confirmed 2026-10-11 schema. Safe to rerun.
-- Shared settlement reads only; no changes to reward calculation, records or mutation grants.
BEGIN;
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
COMMIT;
