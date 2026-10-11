-- COMPLETE EXPORTED APPLICATION SCHEMA; structure and logic only, no business/config rows.

-- Reference baseline, NOT the incremental upgrade script. Requires Supabase platform schemas/roles/extensions.

-- Includes every object in the supplied export, including unrelated public application objects.

-- Platform auth helper definitions are retained below; review before restoring into a fresh project.

-- Sequence current values, extension setup, platform schemas and cron jobs were not exported.

-- Online confirmed at: 2026-10-11T06:33:35.096125+00:00

-- Confirmed applied migrations: (none)

-- Pending online migrations: fat-settlement-increment-20261011.sql

-- Source PostgreSQL: 17.6

SET check_function_bodies = false;



CREATE SCHEMA IF NOT EXISTS "pgbouncer";

ALTER SCHEMA "pgbouncer" OWNER TO "pgbouncer";

CREATE SCHEMA IF NOT EXISTS "points_access";

ALTER SCHEMA "points_access" OWNER TO "postgres";

CREATE SCHEMA IF NOT EXISTS "points_kitchen_v2";

ALTER SCHEMA "points_kitchen_v2" OWNER TO "postgres";

CREATE SCHEMA IF NOT EXISTS "points_notice";

ALTER SCHEMA "points_notice" OWNER TO "postgres";

CREATE SCHEMA IF NOT EXISTS "points_push";

ALTER SCHEMA "points_push" OWNER TO "postgres";

CREATE SCHEMA IF NOT EXISTS "public";

ALTER SCHEMA "public" OWNER TO "pg_database_owner";

CREATE TABLE "points_access"."attempts" (
  "minute" timestamp with time zone NOT NULL,
  "count" integer NOT NULL
);

CREATE TABLE "points_access"."codes" (
  "token_hash" text NOT NULL,
  "created_by" uuid NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "consumed_device" uuid
);

CREATE TABLE "points_access"."devices" (
  "id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "label" text NOT NULL,
  "verified_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "revoked_at" timestamp with time zone
);

CREATE TABLE "points_kitchen_v2"."receipts" (
  "order_id" bigint NOT NULL,
  "actor" text NOT NULL,
  "ack_version" integer DEFAULT 0 NOT NULL,
  "seen_version" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "points_notice"."batch_items" (
  "batch_id" bigint NOT NULL,
  "event_id" bigint NOT NULL
);

CREATE TABLE "points_notice"."batches" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "subscription_id" uuid,
  "priority" integer NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "available_at" timestamp with time zone NOT NULL,
  "expires_at" timestamp with time zone DEFAULT (clock_timestamp() + '24:00:00'::interval) NOT NULL,
  "lease" uuid,
  "lease_until" timestamp with time zone,
  "last_code" integer
);

CREATE TABLE "points_notice"."events" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "event_key" text NOT NULL,
  "audience" text NOT NULL,
  "category" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "route" text NOT NULL,
  "group_key" text NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL,
  "push_allowed" boolean DEFAULT true NOT NULL,
  "pending" boolean DEFAULT false NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "target_actor" text,
  "created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

CREATE TABLE "points_notice"."preferences" (
  "actor" text NOT NULL,
  "categories" text[] DEFAULT ARRAY['score'::text, 'kitchen'::text, 'withdrawal'::text, 'assets'::text, 'fat'::text, 'service'::text, 'security'::text] NOT NULL,
  "quiet" boolean DEFAULT true NOT NULL,
  "night_important" boolean DEFAULT false NOT NULL,
  "last_regular_at" timestamp with time zone,
  "last_poll_at" timestamp with time zone
);

CREATE TABLE "points_notice"."receipts" (
  "actor" text NOT NULL,
  "event_id" bigint NOT NULL,
  "presented_at" timestamp with time zone,
  "read_at" timestamp with time zone
);

CREATE TABLE "points_push"."config" (
  "id" boolean DEFAULT true NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "public_key" text DEFAULT ''::text NOT NULL,
  "app_url" text,
  "subject" text,
  "private_secret_id" uuid,
  "worker_secret_id" uuid,
  "backend_url" text
);

CREATE TABLE "points_push"."jobs" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "subscription_id" uuid NOT NULL,
  "event_key" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "available_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "expires_at" timestamp with time zone DEFAULT (clock_timestamp() + '02:00:00'::interval) NOT NULL,
  "lease_until" timestamp with time zone,
  "lease_token" uuid,
  "finished_at" timestamp with time zone,
  "last_code" integer
);

CREATE TABLE "points_push"."pairings" (
  "token_hash" text NOT NULL,
  "created_by" uuid NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone
);

CREATE TABLE "points_push"."subscriptions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "token_hash" text NOT NULL,
  "endpoint" text NOT NULL,
  "subscription" jsonb NOT NULL,
  "public_key" text NOT NULL,
  "audience" text NOT NULL,
  "user_id" uuid,
  "enabled" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "tested_at" timestamp with time zone,
  "access_device_id" uuid,
  "last_regular_at" timestamp with time zone
);

CREATE TABLE "public"."autosar_study_progress" (
  "user_id" uuid NOT NULL,
  "knowledge_id" text NOT NULL,
  "completed" boolean DEFAULT false NOT NULL,
  "completed_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."autosar_user_settings" (
  "user_id" uuid NOT NULL,
  "last_course" text,
  "last_module" text DEFAULT 'courses'::text NOT NULL,
  "theme" text DEFAULT 'auto'::text NOT NULL,
  "font_size" text DEFAULT 'normal'::text NOT NULL,
  "density" text DEFAULT 'normal'::text NOT NULL,
  "expanded_chapters" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."members" (
  "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  "name" text NOT NULL,
  "score" integer DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."points_fat_records" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "weight_jin" numeric(6,2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "recorded_by" uuid,
  "bowel_status" text NOT NULL
);

CREATE TABLE "public"."points_fat_reward_operations" (
  "operation_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "request_id" bigint,
  "diamond_delta" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "created_by" uuid
);

CREATE TABLE "public"."points_fat_reward_requests" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "status" text DEFAULT 'pending_service'::text NOT NULL,
  "requested_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "serviced_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "requested_by" uuid
);

CREATE TABLE "public"."points_fat_reward_state" (
  "id" smallint DEFAULT 1 NOT NULL,
  "diamonds" bigint DEFAULT 0 NOT NULL,
  "backpack" bigint DEFAULT 0 NOT NULL,
  "started_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "next_week" date NOT NULL,
  "updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

CREATE TABLE "public"."points_fat_reward_week_series" (
  "week_start" date NOT NULL,
  "bowel_status" text NOT NULL,
  "current_days" integer NOT NULL,
  "previous_days" integer NOT NULL,
  "current_mean_jin" numeric,
  "previous_mean_jin" numeric,
  "comparison_basis" text NOT NULL,
  "change_jin" numeric,
  "eligible" boolean NOT NULL,
  "calculated_delta" bigint NOT NULL
);

CREATE TABLE "public"."points_fat_reward_weeks" (
  "week_start" date NOT NULL,
  "cutoff_at" timestamp with time zone NOT NULL,
  "current_days" integer NOT NULL,
  "previous_days" integer NOT NULL,
  "current_mean_jin" numeric,
  "previous_mean_jin" numeric,
  "change_jin" numeric,
  "eligible" boolean NOT NULL,
  "calculated_delta" bigint NOT NULL,
  "applied_delta" bigint NOT NULL,
  "balance_after" bigint NOT NULL,
  "settled_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "comparison_basis" text DEFAULT 'previous_week'::text NOT NULL,
  "bowel_status" text,
  "rule_version" smallint DEFAULT 1 NOT NULL
);

CREATE TABLE "public"."points_fat_settings" (
  "id" smallint DEFAULT 1 NOT NULL,
  "starting_weight_jin" numeric(6,2),
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid
);

CREATE TABLE "public"."points_fat_status_migration" (
  "id" smallint NOT NULL,
  "history_status" text,
  "last_legacy_id" bigint NOT NULL,
  "applied_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

CREATE TABLE "public"."points_kitchen_dishes" (
  "slug" text NOT NULL,
  "recipe" jsonb NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

CREATE TABLE "public"."points_kitchen_drafts" (
  "order_id" bigint NOT NULL,
  "user_id" uuid NOT NULL,
  "ratings" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

CREATE TABLE "public"."points_kitchen_operations" (
  "operation_id" uuid NOT NULL,
  "actor" uuid,
  "kind" text NOT NULL,
  "arguments" jsonb NOT NULL,
  "order_id" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

CREATE TABLE "public"."points_kitchen_orders" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "member_id" bigint NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "items" jsonb NOT NULL,
  "note" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "created_by" uuid,
  "completed_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "resolution_note" text DEFAULT ''::text NOT NULL,
  "acknowledged_version" integer DEFAULT 0 NOT NULL,
  "seen_version" integer DEFAULT 0 NOT NULL,
  "score_delta" integer,
  "score_after" integer,
  "origin" text DEFAULT 'admin'::text NOT NULL,
  "meal_date" date,
  "meal" text,
  "meal_mode" boolean DEFAULT false NOT NULL
);

CREATE TABLE "public"."points_kitchen_reviews" (
  "order_id" bigint NOT NULL,
  "dish_slug" text NOT NULL,
  "stars" integer NOT NULL,
  "comment" text DEFAULT ''::text NOT NULL,
  "recipe_snapshot" jsonb NOT NULL,
  "reviewed_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "reviewed_by" uuid NOT NULL
);

CREATE TABLE "public"."points_kitchen_versions" (
  "order_id" bigint NOT NULL,
  "version" integer NOT NULL,
  "items" jsonb NOT NULL,
  "note" text NOT NULL,
  "status" text NOT NULL,
  "changed_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "changed_by" uuid
);

CREATE TABLE "public"."points_shop_admin_inventory_logs" (
  "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  "item_code" text NOT NULL,
  "delta" integer NOT NULL,
  "quantity_before" integer NOT NULL,
  "quantity_after" integer NOT NULL,
  "changed_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "guest_seen_at" timestamp with time zone
);

CREATE TABLE "public"."points_shop_inventory" (
  "item_code" text NOT NULL,
  "quantity" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."points_shop_pending_spin" (
  "id" smallint NOT NULL,
  "pending_type" text NOT NULL,
  "chance_before" integer NOT NULL,
  "initial_roll" integer NOT NULL,
  "initial_prize" integer NOT NULL,
  "lucky100_applied" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."points_shop_purchase_logs" (
  "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  "item_code" text NOT NULL,
  "price" integer NOT NULL,
  "week_start" date NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."points_shop_spin_details" (
  "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  "wheel_log_id" bigint NOT NULL,
  "modifier" text,
  "first_roll" integer NOT NULL,
  "first_prize" integer NOT NULL,
  "second_roll" integer,
  "second_prize" integer,
  "selected_prize" integer NOT NULL,
  "lucky100_applied" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "payout_amount" integer,
  "bonus_amount" integer DEFAULT 0 NOT NULL,
  "wish_target" integer,
  "chance_refunded" boolean DEFAULT false NOT NULL,
  "decision_type" text,
  "decision_choice" text,
  "challenge_bonus" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "public"."points_shop_state" (
  "id" smallint NOT NULL,
  "equipped_one_shot" text,
  "lucky100_remaining" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "equipped_param" integer,
  "challenge_active" boolean DEFAULT false NOT NULL,
  "challenge_spins_done" integer DEFAULT 0 NOT NULL,
  "challenge_hits" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "public"."points_shop_weekly_feature" (
  "week_start" date NOT NULL,
  "item_code" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "discount_claimed_at" timestamp with time zone
);

CREATE TABLE "public"."points_wheel_logs" (
  "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  "action" text NOT NULL,
  "prize_amount" integer,
  "roll" integer,
  "chance_delta" integer DEFAULT 0 NOT NULL,
  "chance_before" integer NOT NULL,
  "chance_after" integer NOT NULL,
  "cash_delta" integer DEFAULT 0 NOT NULL,
  "cash_before" integer NOT NULL,
  "cash_after" integer NOT NULL,
  "reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "changed_by" uuid,
  "hidden_at" timestamp with time zone,
  "hidden_by" uuid
);

CREATE TABLE "public"."points_wheel_prizes" (
  "amount" integer NOT NULL,
  "sort_order" smallint NOT NULL,
  "probability_bp" integer NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid
);

CREATE TABLE "public"."points_wheel_probability_logs" (
  "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  "before_config" jsonb NOT NULL,
  "after_config" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "changed_by" uuid
);

CREATE TABLE "public"."points_wheel_probability_logs_v2" (
  "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  "before_config" jsonb NOT NULL,
  "after_config" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "changed_by" uuid,
  "legacy_source_id" bigint
);

CREATE TABLE "public"."points_wheel_probability_v2" (
  "id" smallint NOT NULL,
  "p10" integer NOT NULL,
  "p20" integer NOT NULL,
  "p30" integer NOT NULL,
  "p50" integer NOT NULL,
  "p60" integer NOT NULL,
  "p80" integer NOT NULL,
  "p100" integer NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid
);

CREATE TABLE "public"."points_wheel_state" (
  "id" smallint DEFAULT 1 NOT NULL,
  "spin_chances" integer DEFAULT 0 NOT NULL,
  "cash_balance" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."points_withdrawals" (
  "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  "amount" integer NOT NULL,
  "cash_before" integer NOT NULL,
  "cash_after" integer NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "requested_at" timestamp with time zone DEFAULT now() NOT NULL,
  "requested_by" uuid,
  "settled_at" timestamp with time zone,
  "settled_by" uuid,
  "legacy_wheel_log_id" bigint,
  "hidden_at" timestamp with time zone,
  "hidden_by" uuid,
  "canceled_at" timestamp with time zone,
  "canceled_by" uuid
);

CREATE TABLE "public"."profiles" (
  "user_id" uuid NOT NULL,
  "role" text DEFAULT 'viewer'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."score_logs" (
  "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  "member_id" bigint NOT NULL,
  "delta" integer NOT NULL,
  "reason" text DEFAULT ''::text NOT NULL,
  "operator_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reverts_log_id" bigint
);

CREATE OR REPLACE FUNCTION auth.email()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$function$;

ALTER FUNCTION "auth"."email"() OWNER TO "supabase_auth_admin";

CREATE OR REPLACE FUNCTION auth.role()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$function$;

ALTER FUNCTION "auth"."role"() OWNER TO "supabase_auth_admin";

CREATE OR REPLACE FUNCTION auth.uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$;

ALTER FUNCTION "auth"."uid"() OWNER TO "supabase_auth_admin";

CREATE OR REPLACE FUNCTION pgbouncer.get_auth(p_usename text)
 RETURNS TABLE(username text, password text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $function$;

ALTER FUNCTION "pgbouncer"."get_auth"(p_usename text) OWNER TO "supabase_admin";

CREATE OR REPLACE FUNCTION points_access.hash(p_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ SELECT encode(sha256(convert_to(p_value,'UTF8')),'hex'); $function$;

ALTER FUNCTION "points_access"."hash"(p_value text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION points_access.require_device(p_lock boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE token text; result uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Guest device required' USING errcode='42501'; END IF;
  token:=(regexp_match(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-client-info',''),'(?:^|;)points-device=([a-f0-9]{64})(?:;|$)'))[1];
  IF p_lock THEN SELECT id INTO result FROM points_access.devices WHERE token_hash=points_access.hash(token) AND revoked_at IS NULL FOR SHARE;
  ELSE SELECT id INTO result FROM points_access.devices WHERE token_hash=points_access.hash(token) AND revoked_at IS NULL; END IF;
  IF result IS NULL THEN RAISE EXCEPTION 'POINTS_DEVICE_REQUIRED' USING errcode='42501'; END IF;
  RETURN result;
END $function$;

ALTER FUNCTION "points_access"."require_device"(p_lock boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION points_kitchen_v2.ack(p_versions jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE a text:=points_kitchen_v2.actor(); item jsonb; o public.points_kitchen_orders;
BEGIN
  IF p_versions IS NULL OR jsonb_typeof(p_versions)<>'array' OR jsonb_array_length(p_versions)>200 THEN RAISE EXCEPTION 'Invalid receipts'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_versions) LOOP
    IF jsonb_typeof(item)<>'object' OR item->>'id' IS NULL OR item->>'version' IS NULL OR (item->>'version')::integer<1 THEN RAISE EXCEPTION 'Invalid receipt' USING errcode='22023'; END IF;
    SELECT * INTO o FROM public.points_kitchen_orders WHERE id=(item->>'id')::bigint;
    IF NOT FOUND OR (a='guest' AND o.origin<>'admin') OR (a<>'guest' AND o.origin<>'guest') THEN CONTINUE; END IF;
    IF a='guest' THEN UPDATE public.points_kitchen_orders SET acknowledged_version=greatest(acknowledged_version,least(version,(item->>'version')::integer)) WHERE id=o.id; END IF;
    INSERT INTO points_kitchen_v2.receipts(order_id,actor,ack_version)
      VALUES(o.id,a,least(o.version,(item->>'version')::integer))
      ON CONFLICT(order_id,actor) DO UPDATE SET ack_version=greatest(points_kitchen_v2.receipts.ack_version,excluded.ack_version);
  END LOOP;
END $function$;

ALTER FUNCTION "points_kitchen_v2"."ack"(p_versions jsonb) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION points_kitchen_v2.actor()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'guest'; END IF;
  IF coalesce(public.points_is_admin(),false) THEN RETURN 'admin:'||auth.uid()::text; END IF;
  RAISE EXCEPTION 'Kitchen access denied' USING errcode='42501';
END $function$;

ALTER FUNCTION "points_kitchen_v2"."actor"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION points_kitchen_v2.items(p_items jsonb, p_custom boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_variable
DECLARE entry jsonb; recipe jsonb; result jsonb:='[]'; slug text; name text; seen text[]:='{}';
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 24 THEN RAISE EXCEPTION 'Invalid dishes' USING errcode='22023'; END IF;
  FOR entry IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    slug:=CASE WHEN jsonb_typeof(entry)='string' THEN entry#>>'{}' ELSE entry->>'slug' END;
    IF slug IS NULL OR slug=ANY(seen) OR char_length(coalesce(entry->>'note',''))>200 THEN RAISE EXCEPTION 'Invalid dish' USING errcode='22023'; END IF;
    seen:=array_append(seen,slug);
    IF p_custom AND entry->>'custom'='true' THEN
      name:=btrim(entry->>'name');
      IF name IS NULL OR char_length(name) NOT BETWEEN 1 AND 40 OR slug!~'^custom-[a-f0-9-]{36}$' THEN RAISE EXCEPTION 'Invalid custom dish' USING errcode='22023'; END IF;
      recipe:=jsonb_build_object('slug',slug,'name',name,'custom',true,'no_recipe',true,'category','自定义');
    ELSE
      SELECT d.recipe INTO recipe FROM public.points_kitchen_dishes d WHERE d.slug=slug AND d.active;
      IF NOT FOUND THEN RAISE EXCEPTION 'Dish unavailable' USING errcode='22023'; END IF;
    END IF;
    result:=result || jsonb_build_array(recipe || jsonb_build_object('request_note',coalesce(entry->>'note','')));
  END LOOP;
  RETURN result;
END $function$;

ALTER FUNCTION "points_kitchen_v2"."items"(p_items jsonb, p_custom boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION points_kitchen_v2.legacy_write(p_kind text, p_payload jsonb, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_variable
DECLARE a text:=points_kitchen_v2.actor(); member bigint; op public.points_kitchen_operations;
  o public.points_kitchen_orders; items jsonb; ratings jsonb; r jsonb; d jsonb;
  total integer:=0; score integer; id bigint:=(p_payload->>'p_order_id')::bigint;
  ver integer:=(p_payload->>'p_version')::integer; cancel boolean:=coalesce((p_payload->>'p_cancel')::boolean,false);
  seen integer; keys text[]:='{}'; stars integer; mealday date;
BEGIN
  IF p_operation_id IS NULL THEN RAISE EXCEPTION 'Operation ID required' USING errcode='22023'; END IF;
  IF (p_kind IN ('admin_save','admin_review') AND a='guest') OR (p_kind IN ('guest_save','guest_resolve') AND a<>'guest') THEN RAISE EXCEPTION 'Wrong role' USING errcode='42501'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_operation_id::text,0));
  SELECT * INTO op FROM public.points_kitchen_operations WHERE operation_id=p_operation_id;
  IF FOUND THEN
    IF op.actor IS DISTINCT FROM auth.uid() OR op.kind<>p_kind OR op.arguments<>p_payload THEN RAISE EXCEPTION 'Operation conflict' USING errcode='22023'; END IF;
    RETURN points_kitchen_v2.snapshot(op.order_id);
  END IF;
  IF (SELECT count(*) FROM public.members WHERE active)<>1 THEN RAISE EXCEPTION 'Score object changed' USING errcode='P0001'; END IF;
  SELECT m.id INTO member FROM public.members m WHERE active FOR UPDATE;
  IF id IS NOT NULL THEN
    SELECT * INTO o FROM public.points_kitchen_orders WHERE points_kitchen_orders.id=id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found' USING errcode='P0002'; END IF;
    IF o.member_id<>member THEN RAISE EXCEPTION 'Score object changed' USING errcode='P0001'; END IF;
    IF ver IS NULL OR o.version<>ver THEN RAISE EXCEPTION 'Order changed' USING errcode='40001'; END IF;
  END IF;
  IF p_kind IN ('admin_save','guest_save') THEN
    IF char_length(coalesce(p_payload->>'p_note',''))>500 THEN RAISE EXCEPTION 'Note too long' USING errcode='22023'; END IF;
    IF id IS NOT NULL AND (o.origin<>CASE WHEN p_kind='guest_save' THEN 'guest' ELSE 'admin' END
      OR o.status<>CASE WHEN p_kind='guest_save' THEN 'completed' ELSE 'pending' END) THEN RAISE EXCEPTION 'Order closed for editing' USING errcode='P0001'; END IF;
    IF cancel THEN
      IF id IS NULL THEN RAISE EXCEPTION 'Order required' USING errcode='22023'; END IF;
      UPDATE public.points_kitchen_orders SET status='cancelled',version=version+1,resolved_at=clock_timestamp(),updated_at=clock_timestamp() WHERE points_kitchen_orders.id=id;
    ELSE
      items:=points_kitchen_v2.items(p_payload->'p_items',p_kind='guest_save');
      IF p_kind='guest_save' THEN
        mealday:=(p_payload->>'p_meal_date')::date;
        IF mealday IS NULL OR mealday>(clock_timestamp() AT TIME ZONE 'Asia/Shanghai')::date OR p_payload->>'p_meal' NOT IN ('午饭','晚饭') OR p_payload->>'p_meal' IS NULL THEN RAISE EXCEPTION 'Invalid meal' USING errcode='22023'; END IF;
      END IF;
      IF id IS NULL THEN
        INSERT INTO public.points_kitchen_orders(member_id,origin,status,items,note,meal_date,meal,completed_at,created_by)
          VALUES(member,CASE WHEN p_kind='guest_save' THEN 'guest' ELSE 'admin' END,
            CASE WHEN p_kind='guest_save' THEN 'completed' ELSE 'pending' END,items,coalesce(p_payload->>'p_note',''),mealday,
            CASE WHEN p_kind='guest_save' THEN p_payload->>'p_meal' END,
            CASE WHEN p_kind='guest_save' THEN clock_timestamp() END,auth.uid()) RETURNING points_kitchen_orders.id INTO id;
      END IF;
      IF o.id IS NOT NULL THEN
        UPDATE public.points_kitchen_orders SET items=points_kitchen_v2.items(p_payload->'p_items',p_kind='guest_save'),
          note=coalesce(p_payload->>'p_note',''),meal_date=mealday,
          meal=CASE WHEN p_kind='guest_save' THEN p_payload->>'p_meal' END,version=version+1,updated_at=clock_timestamp()
          WHERE points_kitchen_orders.id=id;
      END IF;
    END IF;
  ELSIF p_kind='guest_resolve' THEN
    IF p_payload->>'p_reject' IS NULL THEN RAISE EXCEPTION 'Resolution required' USING errcode='22023'; END IF;
    IF o.origin<>'admin' OR o.status<>'pending' THEN RAISE EXCEPTION 'Order already processed' USING errcode='P0001'; END IF;
    SELECT seen_version INTO seen FROM points_kitchen_v2.receipts WHERE order_id=id AND actor='guest';
    IF coalesce(seen,0)<o.version THEN RAISE EXCEPTION 'Order changed' USING errcode='40001'; END IF;
    IF char_length(coalesce(p_payload->>'p_reason',''))>500 THEN RAISE EXCEPTION 'Note too long' USING errcode='22023'; END IF;
    UPDATE public.points_kitchen_orders SET status=CASE WHEN (p_payload->>'p_reject')::boolean THEN 'rejected' ELSE 'completed' END,
      resolution_note=coalesce(p_payload->>'p_reason',''),
      completed_at=CASE WHEN NOT (p_payload->>'p_reject')::boolean THEN clock_timestamp() END,
      resolved_at=CASE WHEN (p_payload->>'p_reject')::boolean THEN clock_timestamp() END WHERE points_kitchen_orders.id=id;
  ELSIF p_kind='admin_review' THEN
    IF o.status<>'completed' THEN RAISE EXCEPTION 'Order not awaiting review' USING errcode='P0001'; END IF;
    ratings:=p_payload->'p_ratings';
    IF ratings IS NULL OR jsonb_typeof(ratings)<>'array' OR jsonb_array_length(ratings)<>jsonb_array_length(o.items) THEN RAISE EXCEPTION 'Incomplete ratings' USING errcode='22023'; END IF;
    FOR r IN SELECT value FROM jsonb_array_elements(ratings) LOOP
      stars:=(r->>'stars')::integer;
      IF stars IS NULL OR stars NOT BETWEEN 1 AND 5 OR (r->>'slug')=ANY(keys) OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(o.items) x WHERE x->>'slug'=r->>'slug') OR char_length(coalesce(r->>'comment',''))>1000 THEN RAISE EXCEPTION 'Invalid rating' USING errcode='22023'; END IF;
      keys:=array_append(keys,r->>'slug');total:=total+CASE WHEN stars<=2 THEN -1 WHEN stars=3 THEN 0 WHEN stars=4 THEN 1 ELSE 2 END;
    END LOOP;
    -- Use the verified existing +/-1000 primitive: one meal creates one score log.
    total:=public.points_kitchen_validate_ratings(o.items,ratings,true);
    IF total<>0 THEN score:=public.change_score_single(total,'厨房评价 · 订单 #'||id);
    ELSE SELECT x.score INTO score FROM public.points_get_state() x; END IF;
    FOR r IN SELECT value FROM jsonb_array_elements(ratings) LOOP
      INSERT INTO public.points_kitchen_reviews(order_id,dish_slug,stars,comment,recipe_snapshot,reviewed_by)
        SELECT id,r->>'slug',(r->>'stars')::integer,coalesce(r->>'comment',''),x,auth.uid()
        FROM jsonb_array_elements(o.items) x WHERE x->>'slug'=r->>'slug';
    END LOOP;
    UPDATE public.points_kitchen_orders SET status='settled',score_delta=total,score_after=score,
      resolved_at=clock_timestamp(),updated_at=clock_timestamp() WHERE points_kitchen_orders.id=id;
  ELSE RAISE EXCEPTION 'Unknown mutation' USING errcode='22023';
  END IF;
  DELETE FROM public.points_kitchen_drafts WHERE order_id=id;
  SELECT * INTO o FROM public.points_kitchen_orders WHERE points_kitchen_orders.id=id;
  INSERT INTO public.points_kitchen_versions(order_id,version,items,note,status,changed_by) VALUES(id,o.version,o.items,o.note,o.status,auth.uid())
    ON CONFLICT(order_id,version) DO NOTHING;
  INSERT INTO public.points_kitchen_operations(operation_id,actor,kind,arguments,order_id) VALUES(p_operation_id,auth.uid(),p_kind,p_payload,id);
  RETURN points_kitchen_v2.snapshot(id);
END $function$;

ALTER FUNCTION "points_kitchen_v2"."legacy_write"(p_kind text, p_payload jsonb, p_operation_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION points_kitchen_v2.meal_write(p_kind text, p_payload jsonb, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
END $function$;

ALTER FUNCTION "points_kitchen_v2"."meal_write"(p_kind text, p_payload jsonb, p_operation_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION points_kitchen_v2.snapshot(p_id bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT public.points_kitchen_order_json(o.id) || jsonb_build_object('meal_mode',o.meal_mode,
    'draft',CASE WHEN public.points_is_admin() THEN coalesce((SELECT ratings FROM public.points_kitchen_drafts
      WHERE order_id=o.id AND user_id=auth.uid()),'[]'::jsonb) ELSE '[]'::jsonb END,
    'versions',coalesce((SELECT jsonb_agg(to_jsonb(v)-'order_id'-'changed_by' ORDER BY version)
      FROM public.points_kitchen_versions v WHERE v.order_id=o.id),'[]'::jsonb))
  FROM public.points_kitchen_orders o WHERE o.id=p_id;
$function$;

ALTER FUNCTION "points_kitchen_v2"."snapshot"(p_id bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION points_kitchen_v2.write(p_kind text, p_payload jsonb, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF p_payload->>'p_order_id' IS NULL OR EXISTS(SELECT 1 FROM public.points_kitchen_orders WHERE id=(p_payload->>'p_order_id')::bigint AND meal_mode) THEN
    RAISE EXCEPTION 'Meal client upgrade required' USING errcode='40001';
  END IF;
  RETURN points_kitchen_v2.legacy_write(p_kind,p_payload,p_operation_id);
END $function$;

ALTER FUNCTION "points_kitchen_v2"."write"(p_kind text, p_payload jsonb, p_operation_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION points_notice.actor()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT coalesce(public.points_is_admin(),false) THEN RAISE EXCEPTION 'Admin required' USING errcode='42501'; END IF;
    RETURN 'admin:'||auth.uid();
  END IF;
  RETURN 'guest:'||points_access.require_device();
END $function$;

ALTER FUNCTION "points_notice"."actor"() OWNER TO "postgres";

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
    IF coalesce(j->>'reason','')~'^厨房评价 · 订单 #[0-9]+$' THEN RETURN NEW; END IF;
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

ALTER FUNCTION "points_notice"."business_event"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION points_notice.emit(p_key text, p_audience text, p_category text, p_title text, p_body text, p_route text, p_group text, p_priority integer DEFAULT 0, p_push boolean DEFAULT true, p_pending boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE event_id bigint; s points_push.subscriptions; batch bigint; a text;
BEGIN
  INSERT INTO points_notice.events(event_key,audience,category,title,body,route,group_key,priority,push_allowed,pending)
    VALUES(p_key,p_audience,p_category,p_title,left(p_body,1200),p_route,p_group,p_priority,p_push,p_pending) ON CONFLICT(event_key) DO NOTHING RETURNING id INTO event_id;
  IF event_id IS NULL OR NOT p_push OR NOT EXISTS(SELECT 1 FROM points_push.config WHERE id AND enabled) THEN RETURN; END IF;
  FOR s IN SELECT * FROM points_push.subscriptions WHERE enabled AND audience=p_audience LOOP
    a:=s.audience||':'||coalesce(s.user_id,s.access_device_id);
    IF s.audience='guest' AND NOT EXISTS(SELECT 1 FROM points_access.devices WHERE id=s.access_device_id AND revoked_at IS NULL) THEN CONTINUE; END IF;
    IF s.audience='admin' AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=s.user_id AND role='admin') THEN CONTINUE; END IF;
    IF EXISTS(SELECT 1 FROM points_notice.preferences WHERE actor=a AND NOT p_category=ANY(categories)) THEN CONTINUE; END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('notice:'||s.id,0));
    INSERT INTO points_notice.batches(subscription_id,priority,available_at)
      VALUES(s.id,p_priority,clock_timestamp()+CASE WHEN p_priority=1 THEN CASE WHEN EXISTS(SELECT 1 FROM points_notice.preferences WHERE actor=a AND last_poll_at>clock_timestamp()-interval '15 seconds') THEN interval '15 seconds' ELSE interval '5 seconds' END ELSE interval '30 seconds' END)
      ON CONFLICT(subscription_id,priority) WHERE status='pending' DO UPDATE SET available_at=points_notice.batches.available_at RETURNING id INTO batch;
    INSERT INTO points_notice.batch_items VALUES(batch,event_id) ON CONFLICT DO NOTHING;
  END LOOP;
  IF p_priority=1 THEN PERFORM points_notice.wake(); END IF;
END $function$;

ALTER FUNCTION "points_notice"."emit"(p_key text, p_audience text, p_category text, p_title text, p_body text, p_route text, p_group text, p_priority integer, p_push boolean, p_pending boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION points_notice.tick()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ BEGIN
  IF EXISTS(SELECT 1 FROM points_notice.batches WHERE status IN ('pending','retry') AND available_at<=clock_timestamp() OR status='sending' AND lease_until<clock_timestamp()) THEN PERFORM points_notice.wake(); END IF;
END $function$;

ALTER FUNCTION "points_notice"."tick"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION points_notice.wake()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE c points_push.config; secret text;
BEGIN
  SELECT * INTO c FROM points_push.config WHERE id;
  IF NOT c.enabled OR c.worker_secret_id IS NULL THEN RETURN; END IF;
  SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE id=c.worker_secret_id;
  -- pg_net sends only after commit; a transport failure never cancels a business operation.
  PERFORM net.http_post(url:=c.backend_url,headers:=jsonb_build_object('Content-Type','application/json','x-push-secret',secret),body:='{}'::jsonb,timeout_milliseconds:=60000);
EXCEPTION WHEN OTHERS THEN NULL;
END $function$;

ALTER FUNCTION "points_notice"."wake"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION points_push.hash(p_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  SELECT encode(sha256(convert_to(p_value,'UTF8')),'hex');
$function$;

ALTER FUNCTION "points_push"."hash"(p_value text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION points_push.kitchen_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_audience text; title text; body text; v_event_key text; kind text;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM points_push.config WHERE id AND enabled) THEN RETURN NEW; END IF;
  IF NEW.origin='admin' THEN
    IF TG_OP='INSERT' THEN v_audience:='guest'; kind:='new'; title:='哥哥发来点菜请求';
    ELSIF NEW.status='cancelled' AND OLD.status IS DISTINCT FROM NEW.status THEN v_audience:='guest';kind:='cancelled';title:='哥哥取消了点菜订单';
    ELSIF NEW.version>OLD.version AND NEW.status='pending' THEN v_audience:='guest';kind:='edited';title:='哥哥修改了点菜订单';
    ELSIF NEW.status='completed' AND OLD.status IS DISTINCT FROM NEW.status THEN v_audience:='admin';kind:='completed';title:='宝宝做好饭啦';
    ELSE RETURN NEW; END IF;
  ELSIF NEW.origin='guest' AND NEW.status='completed' AND (TG_OP='INSERT' OR NEW.version>OLD.version) THEN
    v_audience:='admin';kind:='meal';title:='宝宝做好饭啦';
  ELSE RETURN NEW; END IF;
  body:='点开小世界，查看厨房里的最新消息。';
  v_event_key:='kitchen:'||NEW.id||':'||NEW.version||':'||kind;
  INSERT INTO points_push.jobs(subscription_id,event_key,payload)
    SELECT s.id,v_event_key,jsonb_build_object('title',title,'body',body,'tag','kitchen-'||NEW.id)
      FROM points_push.subscriptions s WHERE s.enabled AND s.audience=v_audience
        AND s.public_key=(SELECT public_key FROM points_push.config WHERE id)
        AND (s.audience='guest' OR EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=s.user_id AND p.role='admin'))
    ON CONFLICT(subscription_id,event_key) DO NOTHING;
  RETURN NEW;
END $function$;

ALTER FUNCTION "points_push"."kitchen_event"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.add_member(p_name text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
    v_id bigint;
    v_name text;
begin

    if auth.uid() is null or not public.is_admin() then
        raise exception 'Permission denied';
    end if;

    v_name := trim(coalesce(p_name, ''));

    if char_length(v_name) < 1
       or char_length(v_name) > 30 then
        raise exception 'Invalid member name';
    end if;

    insert into public.members(name)
    values (v_name)
    returning id into v_id;

    return v_id;
end;
$function$;

ALTER FUNCTION "public"."add_member"(p_name text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.change_score(p_member_id bigint, p_delta integer, p_reason text DEFAULT ''::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
    v_score integer;
    v_reason text;
begin

    if auth.uid() is null or not public.is_admin() then
        raise exception 'Permission denied';
    end if;

    if p_delta is null
       or p_delta = 0
       or p_delta < -1000
       or p_delta > 1000 then
        raise exception 'Invalid score change';
    end if;

    v_reason := trim(coalesce(p_reason, ''));

    if char_length(v_reason) > 200 then
        raise exception 'Reason too long';
    end if;

    update public.members
    set score = score + p_delta
    where id = p_member_id
      and active = true
    returning score into v_score;

    if not found then
        raise exception 'Member not found or inactive';
    end if;

    insert into public.score_logs(
        member_id,
        delta,
        reason,
        operator_id
    )
    values (
        p_member_id,
        p_delta,
        v_reason,
        auth.uid()
    );

    return v_score;
end;
$function$;

ALTER FUNCTION "public"."change_score"(p_member_id bigint, p_delta integer, p_reason text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.change_score_single(p_delta integer, p_reason text DEFAULT ''::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_member_id bigint;
  v_new_score integer;
  v_reason text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Permission denied';
  end if;

  if p_delta is null or p_delta = 0 or p_delta < -1000 or p_delta > 1000 then
    raise exception 'Invalid score change';
  end if;

  v_reason := trim(coalesce(p_reason, ''));
  if char_length(v_reason) > 200 then
    raise exception 'Reason too long';
  end if;

  select id into v_member_id
  from public.members
  where active = true
  order by id asc
  limit 1
  for update;

  if v_member_id is null then
    raise exception 'Score object not found';
  end if;

  update public.members
  set score = score + p_delta
  where id = v_member_id
  returning score into v_new_score;

  insert into public.score_logs(member_id, delta, reason, operator_id)
  values (v_member_id, p_delta, v_reason, auth.uid());

  return v_new_score;
end;
$function$;

ALTER FUNCTION "public"."change_score_single"(p_delta integer, p_reason text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.get_public_state()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select jsonb_build_object(
    'score',
    coalesce(
      (
        select jsonb_build_object(
          'id', m.id,
          'score', m.score,
          'created_at', m.created_at
        )
        from public.members m
        where m.active = true
        order by m.id asc
        limit 1
      ),
      jsonb_build_object('id', null, 'score', 5, 'created_at', null)
    ),
    'logs',
    coalesce(
      (
        select jsonb_agg(to_jsonb(x))
        from (
          select
            sl.id,
            sl.delta,
            sl.reason,
            sl.created_at,
            sl.reverts_log_id
          from public.score_logs sl
          join public.members m on m.id = sl.member_id
          where m.active = true
          order by sl.created_at desc
          limit 5000
        ) x
      ),
      '[]'::jsonb
    )
  );
$function$;

ALTER FUNCTION "public"."get_public_state"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
    select exists (
        select 1
        from public.profiles
        where user_id = auth.uid()
          and role = 'admin'
    );
$function$;

ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_access_admin_code()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE code text; deadline timestamptz:=clock_timestamp()+interval '15 minutes';
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.points_is_admin(),false) THEN RAISE EXCEPTION 'Admin required' USING errcode='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('points-access-code:'||auth.uid()::text,0));
  code:=lpad(((('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint)%100000000)::text,8,'0');
  DELETE FROM points_access.codes WHERE created_by=auth.uid() OR expires_at<clock_timestamp();
  DELETE FROM points_access.attempts WHERE minute<clock_timestamp()-interval '1 day';
  INSERT INTO points_access.codes(token_hash,created_by,expires_at) VALUES(points_access.hash(code),auth.uid(),deadline);
  RETURN jsonb_build_object('code',code,'expiresAt',deadline);
END $function$;

ALTER FUNCTION "public"."points_access_admin_code"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_access_admin_devices()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE result jsonb; BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.points_is_admin(),false) THEN RAISE EXCEPTION 'Admin required' USING errcode='42501'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'label',label,'verifiedAt',verified_at,'revoked',revoked_at IS NOT NULL) ORDER BY verified_at DESC),'[]') INTO result FROM points_access.devices;
  RETURN result;
END $function$;

ALTER FUNCTION "public"."points_access_admin_devices"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_access_admin_revoke(p_device_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.points_is_admin(),false) THEN RAISE EXCEPTION 'Admin required' USING errcode='42501'; END IF;
  UPDATE points_access.devices SET revoked_at=clock_timestamp() WHERE id=p_device_id;
  UPDATE points_push.subscriptions SET enabled=false WHERE access_device_id=p_device_id;
  UPDATE points_push.jobs j SET status='dead',finished_at=clock_timestamp() FROM points_push.subscriptions s
    WHERE s.id=j.subscription_id AND s.access_device_id=p_device_id AND j.status IN ('pending','sending');
END $function$;

ALTER FUNCTION "public"."points_access_admin_revoke"(p_device_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_access_check_request()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE path text:=ltrim(coalesce(current_setting('request.path',true),''),'/'); claims jsonb;
BEGIN
  -- Scope the hook to this app, preserving AUTOSAR and unrelated API routes.
  IF path!~'^(rpc/points_|points_)' AND path NOT IN ('rpc/get_public_state','rpc/change_score_single','members','score_logs','profiles') THEN RETURN; END IF;
  claims:=coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb);
  IF claims->>'role'='service_role' OR current_setting('role',true)='service_role' THEN RETURN; END IF;
  IF auth.uid() IS NOT NULL AND coalesce(public.points_is_admin(),false) THEN RETURN; END IF;
  IF path IN ('rpc/points_is_admin','rpc/points_access_redeem','rpc/points_push_remove') THEN RETURN; END IF;
  PERFORM points_access.require_device();
END $function$;

ALTER FUNCTION "public"."points_access_check_request"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_access_get_device()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ SELECT jsonb_build_object('ok',true,'deviceId',points_access.require_device()); $function$;

ALTER FUNCTION "public"."points_access_get_device"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_access_redeem(p_code text, p_device_id uuid, p_device_token text, p_label text DEFAULT '游客设备'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE h text; counter integer; used text; known points_access.devices;
BEGIN
  IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Sign out before guest enrollment' USING errcode='42501'; END IF;
  IF p_device_id IS NULL OR p_device_token IS NULL OR p_device_token!~'^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid device credential' USING errcode='22023'; END IF;
  h:=points_access.hash(p_device_token);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_device_id::text,0));
  SELECT * INTO known FROM points_access.devices WHERE id=p_device_id;
  -- Repeating an ambiguous successful request with the same credential is safe.
  IF known.token_hash=h AND known.revoked_at IS NULL THEN RETURN jsonb_build_object('ok',true,'deviceId',known.id); END IF;
  INSERT INTO points_access.attempts VALUES(date_trunc('minute',clock_timestamp()),1)
    ON CONFLICT(minute) DO UPDATE SET count=points_access.attempts.count+1 RETURNING count INTO counter;
  IF counter>60 THEN RETURN jsonb_build_object('ok',false,'reason','rate_limit'); END IF;
  IF coalesce(p_code,'')!~'^[0-9]{8}$' THEN RETURN jsonb_build_object('ok',false,'reason','invalid_code'); END IF;
  UPDATE points_access.codes SET consumed_at=clock_timestamp(),consumed_device=p_device_id
    WHERE token_hash=points_access.hash(p_code) AND consumed_at IS NULL AND expires_at>clock_timestamp() RETURNING token_hash INTO used;
  IF used IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','invalid_code'); END IF;
  INSERT INTO points_access.devices(id,token_hash,label) VALUES(p_device_id,h,left(coalesce(nullif(btrim(p_label),''),'游客设备'),40))
    ON CONFLICT(id) DO UPDATE SET token_hash=excluded.token_hash,label=excluded.label,revoked_at=NULL,verified_at=clock_timestamp();
  RETURN jsonb_build_object('ok',true,'deviceId',p_device_id);
END $function$;

ALTER FUNCTION "public"."points_access_redeem"(p_code text, p_device_id uuid, p_device_token text, p_label text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_admin_adjust_shop_inventory(p_item_code text, p_delta integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_code text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_item_code,'')));
  v_before integer;
  v_after integer;
  v_inventory jsonb;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if not coalesce(public.points_is_admin(),false) then
    raise exception 'Admin only' using errcode='42501';
  end if;

  if v_code not in (
    'shield30','upgrade','double_pick','lucky100','restart','wish',
    'triple_challenge','no10','return10','heartbeat',
    'mystery_box','free_mystery_box'
  ) then
    raise exception 'Unsupported inventory item: %',v_code using errcode='22023';
  end if;

  if p_delta is null or p_delta=0 or pg_catalog.abs(p_delta)>999 then
    raise exception 'delta must be between -999 and -1 or 1 and 999' using errcode='22023';
  end if;

  select i.quantity
    into v_before
  from public.points_shop_inventory i
  where i.item_code=v_code
  for update;

  if not found then
    raise exception 'Inventory row missing for %',v_code using errcode='P0001';
  end if;

  v_after := v_before + p_delta;

  if v_after < 0 then
    raise exception 'Inventory cannot become negative' using errcode='22023';
  end if;

  if v_after > 999 then
    raise exception 'Inventory cannot exceed 999' using errcode='22023';
  end if;

  update public.points_shop_inventory
     set quantity=v_after,
         updated_at=v_now
   where item_code=v_code;

  /* 已激活持续效果不受库存回收影响；只清理已选中但尚未消耗的单次卡。 */
  if v_after=0 then
    update public.points_shop_state
       set equipped_one_shot=null,
           equipped_param=null,
           updated_at=v_now
     where id=1 and equipped_one_shot=v_code;
  end if;

  insert into public.points_shop_admin_inventory_logs(
    item_code,delta,quantity_before,quantity_after,changed_by,created_at,guest_seen_at
  ) values(
    v_code,p_delta,v_before,v_after,auth.uid(),v_now,
    case when p_delta>0 then null else v_now end
  );

  select coalesce(pg_catalog.jsonb_object_agg(i.item_code,i.quantity),'{}'::jsonb)
    into v_inventory
  from public.points_shop_inventory i;

  return pg_catalog.jsonb_build_object(
    'item_code',v_code,
    'delta',p_delta,
    'quantity_before',v_before,
    'quantity_after',v_after,
    'inventory',v_inventory
  );
end;
$function$;

ALTER FUNCTION "public"."points_admin_adjust_shop_inventory"(p_item_code text, p_delta integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_admin_adjust_wheel_chances(p_delta integer)
 RETURNS TABLE(spin_chances integer, cash_balance integer, updated_at timestamp with time zone, wheel_log_id bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_before integer;
  v_after integer;
  v_cash integer;
  v_now timestamptz := clock_timestamp();
  v_log_id bigint;
begin
  if not coalesce(public.points_is_admin(), false) then
    raise exception 'Admin permission required'
      using errcode = '42501';
  end if;

  if p_delta is null or p_delta not in (-1, 1) then
    raise exception 'Wheel chance delta must be exactly +1 or -1'
      using errcode = '22023';
  end if;

  insert into public.points_wheel_state(id, spin_chances, cash_balance)
  values (1, 0, 0)
  on conflict (id) do nothing;

  select w.spin_chances, w.cash_balance
    into v_before, v_cash
  from public.points_wheel_state w
  where w.id = 1
  for update;

  if v_before is null then
    raise exception 'Wheel state not found'
      using errcode = 'P0001';
  end if;

  v_after := v_before + p_delta;

  if v_after < 0 then
    raise exception 'Wheel chances cannot be negative'
      using errcode = '22023';
  end if;

  update public.points_wheel_state
  set spin_chances = v_after,
      updated_at = v_now
  where id = 1;

  insert into public.points_wheel_logs(
    action,
    prize_amount,
    roll,
    chance_delta,
    chance_before,
    chance_after,
    cash_delta,
    cash_before,
    cash_after,
    reason,
    created_at,
    changed_by
  )
  values(
    'admin_chance_adjust',
    null,
    null,
    p_delta,
    v_before,
    v_after,
    0,
    v_cash,
    v_cash,
    case
      when p_delta = 1
        then '管理员增加 1 次正式大转盘机会'
      else '管理员减少 1 次正式大转盘机会'
    end,
    v_now,
    auth.uid()
  )
  returning id into v_log_id;

  return query
  select v_after, v_cash, v_now, v_log_id;
end;
$function$;

ALTER FUNCTION "public"."points_admin_adjust_wheel_chances"(p_delta integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_admin_get_shop_inventory()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_inventory jsonb;
  v_state public.points_shop_state%rowtype;
begin
  if not coalesce(public.points_is_admin(),false) then
    raise exception 'Admin only' using errcode='42501';
  end if;

  select coalesce(pg_catalog.jsonb_object_agg(i.item_code,i.quantity),'{}'::jsonb)
    into v_inventory
  from public.points_shop_inventory i;

  select * into v_state
  from public.points_shop_state s
  where s.id=1;

  return pg_catalog.jsonb_build_object(
    'inventory',v_inventory,
    'equipped_one_shot',v_state.equipped_one_shot,
    'lucky100_remaining',v_state.lucky100_remaining,
    'challenge_active',v_state.challenge_active,
    'challenge_spins_done',v_state.challenge_spins_done,
    'challenge_hits',v_state.challenge_hits
  );
end;
$function$;

ALTER FUNCTION "public"."points_admin_get_shop_inventory"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_admin_get_wheel_probabilities()
 RETURNS TABLE(amount integer, probability_bp integer, probability_percent numeric, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.points_is_admin() then
    raise exception 'Admin only'
      using errcode = '42501';
  end if;

  return query
  select
    p.amount,
    p.probability_bp,
    p.probability_bp::numeric / 100,
    p.updated_at
  from public.points_wheel_prizes p
  order by p.sort_order;
end;
$function$;

ALTER FUNCTION "public"."points_admin_get_wheel_probabilities"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_admin_get_wheel_probabilities_v2()
 RETURNS TABLE(amount integer, probability_bp integer, probability_percent numeric, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not coalesce(public.points_is_admin(), false) then
    raise exception 'Admin only' using errcode = '42501';
  end if;

  return query
  select
    x.amount,
    x.probability_bp,
    x.probability_bp::numeric / 100,
    c.updated_at
  from public.points_wheel_probability_v2 c
  cross join lateral (
    values
      (1, 10,  c.p10),
      (2, 20,  c.p20),
      (3, 30,  c.p30),
      (4, 50,  c.p50),
      (5, 60,  c.p60),
      (6, 80,  c.p80),
      (7, 100, c.p100)
  ) as x(sort_order, amount, probability_bp)
  where c.id = 1
  order by x.sort_order;
end;
$function$;

ALTER FUNCTION "public"."points_admin_get_wheel_probabilities_v2"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_admin_get_wheel_probability_logs(p_limit integer DEFAULT 100)
 RETURNS TABLE(id bigint, before_config jsonb, after_config jsonb, created_at timestamp with time zone, changed_by uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.points_is_admin() then
    raise exception 'Admin only'
      using errcode = '42501';
  end if;

  return query
  select
    l.id, l.before_config, l.after_config, l.created_at, l.changed_by
  from public.points_wheel_probability_logs l
  order by l.created_at desc, l.id desc
  limit greatest(1, least(coalesce(p_limit,100), 500));
end;
$function$;

ALTER FUNCTION "public"."points_admin_get_wheel_probability_logs"(p_limit integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_admin_get_wheel_probability_logs_v2(p_limit integer DEFAULT 100)
 RETURNS TABLE(id bigint, before_config jsonb, after_config jsonb, created_at timestamp with time zone, changed_by uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not coalesce(public.points_is_admin(), false) then
    raise exception 'Admin only' using errcode = '42501';
  end if;

  return query
  select
    l.id,
    l.before_config,
    l.after_config,
    l.created_at,
    l.changed_by
  from public.points_wheel_probability_logs_v2 l
  order by l.created_at desc, l.id desc
  limit least(greatest(coalesce(p_limit, 100), 1), 1000);
end;
$function$;

ALTER FUNCTION "public"."points_admin_get_wheel_probability_logs_v2"(p_limit integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_admin_manage_wheel_record(p_record_type text, p_record_id bigint)
 RETURNS TABLE(record_type text, record_id bigint, operation text, cash_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_now timestamptz := clock_timestamp();
  v_withdrawal public.points_withdrawals%rowtype;
  v_cash integer;
begin
  if not coalesce(public.points_is_admin(), false) then
    raise exception 'Admin permission required' using errcode = '42501';
  end if;

  if p_record_id is null then
    raise exception 'Record id required' using errcode = '22023';
  end if;

  if p_record_type = 'wheel_log' then
    update public.points_wheel_logs l
       set hidden_at = v_now,
           hidden_by = auth.uid()
     where l.id = p_record_id
       and l.hidden_at is null;

    if not found then
      raise exception 'Wheel record not found or already hidden' using errcode = 'P0001';
    end if;

    select w.cash_balance
      into v_cash
      from public.points_wheel_state w
     where w.id = 1;

    return query
      select 'wheel_log'::text, p_record_id, 'hidden'::text, coalesce(v_cash, 0);
    return;
  end if;

  if p_record_type = 'withdrawal' then
    select *
      into v_withdrawal
      from public.points_withdrawals w
     where w.id = p_record_id
       and w.hidden_at is null
     for update;

    if not found then
      raise exception 'Withdrawal record not found or already hidden' using errcode = 'P0001';
    end if;

    if v_withdrawal.status = 'pending' then
      select w.cash_balance
        into v_cash
        from public.points_wheel_state w
       where w.id = 1
       for update;

      if v_cash is null then
        raise exception 'Wheel state not found' using errcode = 'P0001';
      end if;

      v_cash := v_cash + v_withdrawal.amount;

      update public.points_wheel_state
         set cash_balance = v_cash,
             updated_at = v_now
       where id = 1;

      update public.points_withdrawals w
         set status = 'canceled',
             canceled_at = v_now,
             canceled_by = auth.uid(),
             hidden_at = v_now,
             hidden_by = auth.uid()
       where w.id = p_record_id;

      return query
        select 'withdrawal'::text, p_record_id, 'withdrawal_cancelled'::text, v_cash;
      return;
    end if;

    if v_withdrawal.status = 'settled' then
      update public.points_withdrawals w
         set hidden_at = v_now,
             hidden_by = auth.uid()
       where w.id = p_record_id;

      select s.cash_balance
        into v_cash
        from public.points_wheel_state s
       where s.id = 1;

      return query
        select 'withdrawal'::text, p_record_id, 'hidden'::text, coalesce(v_cash, 0);
      return;
    end if;

    raise exception 'Withdrawal record cannot be managed in current status'
      using errcode = 'P0001';
  end if;

  raise exception 'Unsupported record type: %', p_record_type using errcode = '22023';
end;
$function$;

ALTER FUNCTION "public"."points_admin_manage_wheel_record"(p_record_type text, p_record_id bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_admin_set_wheel_probabilities(p_config jsonb)
 RETURNS TABLE(amount integer, probability_bp integer, probability_percent numeric, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_count integer;
  v_supported integer;
  v_sum integer;
  v_min integer;
  v_max integer;
  v_before jsonb;
  v_after jsonb;
  v_now timestamptz := clock_timestamp();
begin
  if not public.points_is_admin() then
    raise exception 'Admin only'
      using errcode = '42501';
  end if;

  if p_config is null or jsonb_typeof(p_config) <> 'object' then
    raise exception 'Invalid probability config'
      using errcode = '22023';
  end if;

  /*
     关键修复：
     不再把 CTE 字段命名为 amount / probability_bp，
     避免与 RETURNS TABLE 的输出变量同名。
  */
  with parsed as (
    select
      j.key::integer as cfg_amount,
      (j.value #>> '{}')::integer as cfg_probability_bp
    from jsonb_each(p_config) as j
  )
  select
    count(*),
    count(*) filter (
      where q.cfg_amount in (10,20,30,50,60,80,100)
    ),
    coalesce(sum(q.cfg_probability_bp), 0),
    coalesce(min(q.cfg_probability_bp), 0),
    coalesce(max(q.cfg_probability_bp), 0)
  into
    v_count,
    v_supported,
    v_sum,
    v_min,
    v_max
  from parsed as q;

  if v_count <> 7 or v_supported <> 7 then
    raise exception 'Probability config must contain exactly the 7 supported prizes'
      using errcode = '22023';
  end if;

  if v_min < 0 or v_max > 10000 then
    raise exception 'Each probability must be between 0 and 10000'
      using errcode = '22023';
  end if;

  if v_sum <> 10000 then
    raise exception 'Probability sum must equal 10000'
      using errcode = '22023';
  end if;

  select jsonb_object_agg(
           p.amount::text,
           p.probability_bp
           order by p.sort_order
         )
    into v_before
  from public.points_wheel_prizes as p;

  update public.points_wheel_prizes as p
  set
    probability_bp = (p_config ->> p.amount::text)::integer,
    updated_at = v_now,
    updated_by = auth.uid();

  select jsonb_object_agg(
           p.amount::text,
           p.probability_bp
           order by p.sort_order
         )
    into v_after
  from public.points_wheel_prizes as p;

  if v_before is distinct from v_after then
    insert into public.points_wheel_probability_logs (
      before_config,
      after_config,
      created_at,
      changed_by
    )
    values (
      v_before,
      v_after,
      v_now,
      auth.uid()
    );
  end if;

  return query
  select
    p.amount,
    p.probability_bp,
    p.probability_bp::numeric / 100,
    p.updated_at
  from public.points_wheel_prizes as p
  order by p.sort_order;
end;
$function$;

ALTER FUNCTION "public"."points_admin_set_wheel_probabilities"(p_config jsonb) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_admin_set_wheel_probabilities_v2(p_config jsonb)
 RETURNS TABLE(amount integer, probability_bp integer, probability_percent numeric, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v10 integer;
  v20 integer;
  v30 integer;
  v50 integer;
  v60 integer;
  v80 integer;
  v100 integer;
  v_sum integer;
  v_key_count integer;
  v_before jsonb;
  v_after jsonb;
  v_now timestamptz := clock_timestamp();
begin
  if not coalesce(public.points_is_admin(), false) then
    raise exception 'Admin only' using errcode = '42501';
  end if;

  if p_config is null or jsonb_typeof(p_config) <> 'object' then
    raise exception 'Probability config must be a JSON object'
      using errcode = '22023';
  end if;

  /* 用官方 jsonb_object_keys() 统计对象 key 数，替代旧版错误的对象长度调用。 */
  select count(*)::integer
    into v_key_count
  from pg_catalog.jsonb_object_keys(p_config);

  if v_key_count <> 7
     or not (p_config ? '10')
     or not (p_config ? '20')
     or not (p_config ? '30')
     or not (p_config ? '50')
     or not (p_config ? '60')
     or not (p_config ? '80')
     or not (p_config ? '100') then
    raise exception 'Probability config must contain exactly 10,20,30,50,60,80,100'
      using errcode = '22023';
  end if;

  /* JSON null 不允许进入后面的整数计算。 */
  if (p_config ->> '10')  is null
     or (p_config ->> '20')  is null
     or (p_config ->> '30')  is null
     or (p_config ->> '50')  is null
     or (p_config ->> '60')  is null
     or (p_config ->> '80')  is null
     or (p_config ->> '100') is null then
    raise exception 'Every probability must be a non-null integer basis-point value'
      using errcode = '22023';
  end if;

  begin
    v10  := (p_config ->> '10')::integer;
    v20  := (p_config ->> '20')::integer;
    v30  := (p_config ->> '30')::integer;
    v50  := (p_config ->> '50')::integer;
    v60  := (p_config ->> '60')::integer;
    v80  := (p_config ->> '80')::integer;
    v100 := (p_config ->> '100')::integer;
  exception
    when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Every probability must be an integer basis-point value'
        using errcode = '22023';
  end;

  if least(v10, v20, v30, v50, v60, v80, v100) < 0
     or greatest(v10, v20, v30, v50, v60, v80, v100) > 10000 then
    raise exception 'Each probability must be between 0 and 10000'
      using errcode = '22023';
  end if;

  v_sum := v10 + v20 + v30 + v50 + v60 + v80 + v100;
  if v_sum <> 10000 then
    raise exception 'Probability sum must equal 10000, got %', v_sum
      using errcode = '22023';
  end if;

  /* 保底 singleton；正常情况下 id=1 已存在。 */
  insert into public.points_wheel_probability_v2 (
    id, p10, p20, p30, p50, p60, p80, p100, updated_at, updated_by
  ) values (
    1, 1000, 3000, 3000, 1200, 1000, 500, 300, v_now, null
  )
  on conflict (id) do nothing;

  select jsonb_build_object(
           '10', c.p10,
           '20', c.p20,
           '30', c.p30,
           '50', c.p50,
           '60', c.p60,
           '80', c.p80,
           '100', c.p100
         )
    into v_before
  from public.points_wheel_probability_v2 c
  where c.id = 1
  for update;

  if v_before is null then
    raise exception 'Probability singleton not found'
      using errcode = 'P0001';
  end if;

  v_after := jsonb_build_object(
    '10', v10,
    '20', v20,
    '30', v30,
    '50', v50,
    '60', v60,
    '80', v80,
    '100', v100
  );

  update public.points_wheel_probability_v2 c
     set p10 = v10,
         p20 = v20,
         p30 = v30,
         p50 = v50,
         p60 = v60,
         p80 = v80,
         p100 = v100,
         updated_at = v_now,
         updated_by = auth.uid()
   where c.id = 1;

  if v_before is distinct from v_after then
    insert into public.points_wheel_probability_logs_v2 (
      before_config,
      after_config,
      created_at,
      changed_by
    ) values (
      v_before,
      v_after,
      v_now,
      auth.uid()
    );
  end if;

  return query
  select
    x.amount,
    x.probability_bp,
    x.probability_bp::numeric / 100,
    v_now
  from (
    values
      (1, 10,  v10),
      (2, 20,  v20),
      (3, 30,  v30),
      (4, 50,  v50),
      (5, 60,  v60),
      (6, 80,  v80),
      (7, 100, v100)
  ) as x(sort_order, amount, probability_bp)
  order by x.sort_order;
end;
$function$;

ALTER FUNCTION "public"."points_admin_set_wheel_probabilities_v2"(p_config jsonb) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_admin_settle_withdrawal(p_withdrawal_id bigint)
 RETURNS TABLE(id bigint, amount integer, status text, requested_at timestamp with time zone, settled_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_row public.points_withdrawals%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if not coalesce(public.points_is_admin(), false) then
    raise exception 'Admin permission required' using errcode = '42501';
  end if;

  select *
    into v_row
  from public.points_withdrawals w
  where w.id = p_withdrawal_id
  for update;

  if not found then
    raise exception 'Withdrawal request not found' using errcode = 'P0001';
  end if;

  if v_row.status <> 'pending' then
    raise exception 'Withdrawal request already settled' using errcode = 'P0001';
  end if;

  update public.points_withdrawals
  set status = 'settled',
      settled_at = v_now,
      settled_by = auth.uid()
  where points_withdrawals.id = p_withdrawal_id;

  return query
  select p_withdrawal_id, v_row.amount, 'settled'::text, v_row.requested_at, v_now;
end;
$function$;

ALTER FUNCTION "public"."points_admin_settle_withdrawal"(p_withdrawal_id bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_change_score(p_delta integer, p_reason text DEFAULT NULL::text)
 RETURNS TABLE(score integer, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_score integer;
begin
  if not coalesce(public.points_is_admin(), false) then
    raise exception 'Admin permission required'
      using errcode = '42501';
  end if;

  if p_delta is null
     or p_delta = 0
     or abs(p_delta) > 9 then
    raise exception 'delta must be between -9 and -1 or between 1 and 9'
      using errcode = '22023';
  end if;

  v_score := public.change_score_single(
    p_delta,
    coalesce(p_reason, '')
  );

  return query
  select v_score, clock_timestamp();
end;
$function$;

ALTER FUNCTION "public"."points_change_score"(p_delta integer, p_reason text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_admin_delete_record(p_record_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_deleted integer;
BEGIN
  IF NOT coalesce(public.points_is_admin(), false) THEN
    RAISE EXCEPTION 'Admin permission required' USING errcode = '42501';
  END IF;

  IF p_record_id IS NULL OR p_record_id <= 0 THEN
    RAISE EXCEPTION 'Invalid record id' USING errcode = '22023';
  END IF;

  -- Serialize with the existing baseline and recording RPCs.
  PERFORM s.id FROM public.points_fat_settings AS s
  WHERE s.id = 1 FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fat settings not found' USING errcode = '55000';
  END IF;

  DELETE FROM public.points_fat_records AS r WHERE r.id = p_record_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted > 0 THEN
    UPDATE public.points_fat_settings
    SET updated_at = pg_catalog.clock_timestamp(), updated_by = auth.uid()
    WHERE id = 1;
  END IF;
  RETURN v_deleted > 0;
END;
$function$;

ALTER FUNCTION "public"."points_fat_admin_delete_record"(p_record_id bigint) OWNER TO "postgres";

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
  FROM public.points_fat_settings s
  WHERE s.id = 1;
END;
$function$;

ALTER FUNCTION "public"."points_fat_admin_get_settings"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_admin_record_weight(p_weight_jin numeric)
 RETURNS TABLE(id bigint, delta_jin numeric, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_starting_weight numeric;
  v_record_id bigint;
  v_recorded_at timestamptz;
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

  SELECT s.starting_weight_jin
  INTO v_starting_weight
  FROM public.points_fat_settings s
  WHERE s.id = 1
  FOR UPDATE;

  IF v_starting_weight IS NULL THEN
    RAISE EXCEPTION 'Starting weight required'
      USING errcode = '55000';
  END IF;

  v_recorded_at := pg_catalog.clock_timestamp();

  INSERT INTO public.points_fat_records AS r (
    weight_jin, created_at, recorded_by
  )
  VALUES (
    p_weight_jin, v_recorded_at, auth.uid()
  )
  RETURNING r.id INTO v_record_id;

  RETURN QUERY
  SELECT
    v_record_id,
    pg_catalog.round(p_weight_jin - v_starting_weight, 2),
    v_recorded_at;
END;
$function$;

ALTER FUNCTION "public"."points_fat_admin_record_weight"(p_weight_jin numeric) OWNER TO "postgres";

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

  PERFORM s.id
  FROM public.points_fat_settings s
  WHERE s.id = 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fat settings not found'
      USING errcode = '55000';
  END IF;

  UPDATE public.points_fat_settings
  SET starting_weight_jin = p_weight_jin,
      updated_at = pg_catalog.clock_timestamp(),
      updated_by = auth.uid()
  WHERE id = 1;
END;
$function$;

ALTER FUNCTION "public"."points_fat_admin_set_starting_weight"(p_weight_jin numeric) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_get_logs(p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 10000)
 RETURNS TABLE(id bigint, delta_jin numeric, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT
    r.id,
    pg_catalog.round(r.weight_jin - s.starting_weight_jin, 2),
    r.created_at
  FROM public.points_fat_records r
  JOIN public.points_fat_settings s ON s.id = 1
  WHERE s.starting_weight_jin IS NOT NULL
    AND (p_from IS NULL OR r.created_at >= p_from)
    AND (p_to IS NULL OR r.created_at < p_to)
  ORDER BY r.created_at DESC, r.id DESC
  LIMIT least(greatest(coalesce(p_limit, 10000), 1), 10000);
$function$;

ALTER FUNCTION "public"."points_fat_get_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_get_state()
 RETURNS TABLE(configured boolean, delta_jin numeric, recorded_at timestamp with time zone, updated_at timestamp with time zone, record_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT
    s.starting_weight_jin IS NOT NULL,
    pg_catalog.round(r.weight_jin - s.starting_weight_jin, 2),
    r.created_at,
    greatest(s.updated_at, r.created_at),
    (SELECT pg_catalog.count(*) FROM public.points_fat_records)
  FROM public.points_fat_settings s
  LEFT JOIN LATERAL (
    SELECT x.weight_jin, x.created_at
    FROM public.points_fat_records x
    ORDER BY x.created_at DESC, x.id DESC
    LIMIT 1
  ) r ON true
  WHERE s.id = 1;
$function$;

ALTER FUNCTION "public"."points_fat_get_state"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_reward_admin_exchange(p_kind text, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

ALTER FUNCTION "public"."points_fat_reward_admin_exchange"(p_kind text, p_operation_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_reward_admin_resolve(p_request_id bigint, p_confirm boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

ALTER FUNCTION "public"."points_fat_reward_admin_resolve"(p_request_id bigint, p_confirm boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_reward_cutoff(p_week date)
 RETURNS timestamp with time zone
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  SELECT (p_week + 6 + time '12:00') AT TIME ZONE 'Asia/Shanghai';
$function$;

ALTER FUNCTION "public"."points_fat_reward_cutoff"(p_week date) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_reward_delta(p_change numeric, p_days integer, p_previous_days integer)
 RETURNS bigint
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  SELECT CASE WHEN p_change IS NULL OR p_days < 3 OR p_previous_days < 3 THEN 0
    WHEN p_change < 0 THEN floor(-p_change)::bigint
    WHEN p_change > 0 THEN -greatest(1, floor(p_change)::bigint)
    ELSE 0 END;
$function$;

ALTER FUNCTION "public"."points_fat_reward_delta"(p_change numeric, p_days integer, p_previous_days integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_reward_get_state(p_before bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  PERFORM public.points_fat_reward_settle_due();
  RETURN public.points_fat_reward_snapshot(p_before);
END;
$function$;

ALTER FUNCTION "public"."points_fat_reward_get_state"(p_before bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_reward_guest_serviced(p_request_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

ALTER FUNCTION "public"."points_fat_reward_guest_serviced"(p_request_id bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_reward_reference(p_week date)
 RETURNS TABLE(days integer, mean_jin numeric, basis text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

ALTER FUNCTION "public"."points_fat_reward_reference"(p_week date) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_reward_sample(p_week date)
 RETURNS TABLE(days integer, mean_jin numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT count(*)::integer, avg(d.weight_jin) FROM (
    SELECT DISTINCT ON ((r.created_at AT TIME ZONE 'Asia/Shanghai')::date) r.weight_jin
    FROM public.points_fat_records r
    WHERE r.created_at >= (p_week::timestamp AT TIME ZONE 'Asia/Shanghai')
      AND r.created_at < public.points_fat_reward_cutoff(p_week)
    ORDER BY (r.created_at AT TIME ZONE 'Asia/Shanghai')::date, r.created_at, r.id
  ) d;
$function$;

ALTER FUNCTION "public"."points_fat_reward_sample"(p_week date) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_reward_settle_due()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE s public.points_fat_reward_state%ROWTYPE; chosen record; v_count integer:=0; v_applied bigint;
BEGIN
  SELECT * INTO s FROM public.points_fat_reward_state WHERE id=1;
  IF public.points_fat_reward_cutoff(s.next_week)>clock_timestamp() THEN RETURN 0; END IF;
  -- Same lock order as recording/deleting: settings, then reward wallet.
  PERFORM id FROM public.points_fat_settings WHERE id=1 FOR UPDATE;
  SELECT * INTO STRICT s FROM public.points_fat_reward_state WHERE id=1 FOR UPDATE;
  WHILE public.points_fat_reward_cutoff(s.next_week)<=clock_timestamp() LOOP
    IF NOT EXISTS(SELECT 1 FROM public.points_fat_reward_weeks WHERE week_start=s.next_week) THEN
      SELECT * INTO chosen FROM public.points_fat_v2_reward_analysis(s.next_week)
        ORDER BY eligible DESC,current_days DESC,(bowel_status='after') DESC LIMIT 1;
      v_applied:=greatest(-s.diamonds,chosen.calculated_delta);
      s.diamonds:=s.diamonds+v_applied;
      INSERT INTO public.points_fat_reward_weeks(week_start,cutoff_at,current_days,previous_days,current_mean_jin,
        previous_mean_jin,comparison_basis,change_jin,eligible,calculated_delta,applied_delta,balance_after,bowel_status,rule_version)
      VALUES(s.next_week,public.points_fat_reward_cutoff(s.next_week),chosen.current_days,chosen.previous_days,
        chosen.current_mean_jin,chosen.previous_mean_jin,chosen.comparison_basis,chosen.change_jin,chosen.eligible,
        chosen.calculated_delta,v_applied,s.diamonds,CASE WHEN chosen.eligible THEN chosen.bowel_status ELSE NULL END,2);
      INSERT INTO public.points_fat_reward_week_series SELECT s.next_week,a.* FROM public.points_fat_v2_reward_analysis(s.next_week) a;
      v_count:=v_count+1;
    END IF;
    s.next_week:=s.next_week+7;
  END LOOP;
  UPDATE public.points_fat_reward_state SET diamonds=s.diamonds,next_week=s.next_week,updated_at=clock_timestamp() WHERE id=1;
  RETURN v_count;
END $function$;

ALTER FUNCTION "public"."points_fat_reward_settle_due"() OWNER TO "postgres";

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

ALTER FUNCTION "public"."points_fat_reward_snapshot"(p_before bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_v2_admin_record_weight(p_weight_jin numeric, p_bowel_status text)
 RETURNS TABLE(id bigint, delta_jin numeric, created_at timestamp with time zone, bowel_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_start numeric; v_id bigint; v_at timestamptz;
BEGIN
  IF NOT coalesce(public.points_is_admin(),false) THEN
    RAISE EXCEPTION 'Admin permission required' USING errcode='42501';
  END IF;
  IF p_bowel_status IS NULL OR p_bowel_status NOT IN ('before','after') THEN
    RAISE EXCEPTION 'Invalid bowel status' USING errcode='22023';
  END IF;
  IF p_weight_jin IS NULL OR p_weight_jin<=0 OR p_weight_jin>=10000 OR p_weight_jin<>round(p_weight_jin,2) THEN
    RAISE EXCEPTION 'Invalid weight' USING errcode='22023';
  END IF;
  SELECT s.starting_weight_jin INTO v_start FROM public.points_fat_settings s WHERE s.id=1 FOR UPDATE;
  IF v_start IS NULL THEN RAISE EXCEPTION 'Starting weight required' USING errcode='55000'; END IF;
  v_at:=clock_timestamp();
  INSERT INTO public.points_fat_records AS r(weight_jin,created_at,recorded_by,bowel_status)
    VALUES(p_weight_jin,v_at,auth.uid(),p_bowel_status) RETURNING r.id INTO v_id;
  RETURN QUERY SELECT v_id,round(p_weight_jin-v_start,2),v_at,p_bowel_status;
END $function$;

ALTER FUNCTION "public"."points_fat_v2_admin_record_weight"(p_weight_jin numeric, p_bowel_status text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_v2_get_logs(p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 10000)
 RETURNS TABLE(id bigint, delta_jin numeric, created_at timestamp with time zone, bowel_status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT r.id,round(r.weight_jin-s.starting_weight_jin,2),r.created_at,r.bowel_status
  FROM public.points_fat_records r JOIN public.points_fat_settings s ON s.id=1
  WHERE s.starting_weight_jin IS NOT NULL AND (p_from IS NULL OR r.created_at>=p_from)
    AND (p_to IS NULL OR r.created_at<p_to)
  ORDER BY r.created_at DESC,r.id DESC LIMIT least(greatest(coalesce(p_limit,10000),1),10000);
$function$;

ALTER FUNCTION "public"."points_fat_v2_get_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_v2_get_state(p_bowel_status text DEFAULT 'after'::text)
 RETURNS TABLE(configured boolean, delta_jin numeric, recorded_at timestamp with time zone, updated_at timestamp with time zone, record_count bigint, bowel_status text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF p_bowel_status IS NULL OR p_bowel_status NOT IN ('before','after','unmarked') THEN
    RAISE EXCEPTION 'Invalid bowel status' USING errcode='22023';
  END IF;
  RETURN QUERY SELECT s.starting_weight_jin IS NOT NULL,
    round(r.weight_jin-s.starting_weight_jin,2),r.created_at,greatest(s.updated_at,r.created_at),
    (SELECT count(*) FROM public.points_fat_records x WHERE
      x.bowel_status=p_bowel_status OR p_bowel_status='unmarked' AND x.bowel_status IS NULL),p_bowel_status
  FROM public.points_fat_settings s LEFT JOIN LATERAL(
    SELECT x.weight_jin,x.created_at FROM public.points_fat_records x WHERE
      x.bowel_status=p_bowel_status OR p_bowel_status='unmarked' AND x.bowel_status IS NULL
    ORDER BY x.created_at DESC,x.id DESC LIMIT 1
  ) r ON true WHERE s.id=1;
END $function$;

ALTER FUNCTION "public"."points_fat_v2_get_state"(p_bowel_status text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_v2_reward_analysis(p_week date)
 RETURNS TABLE(bowel_status text, current_days integer, previous_days integer, current_mean_jin numeric, previous_mean_jin numeric, comparison_basis text, change_jin numeric, eligible boolean, calculated_delta bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_status text; c record; p record; v_change numeric; v_eligible boolean;
BEGIN
  FOREACH v_status IN ARRAY ARRAY['before','after'] LOOP
    RETURN QUERY SELECT w.bowel_status,w.current_days,w.previous_days,w.current_mean_jin,w.previous_mean_jin,
      w.comparison_basis,w.change_jin,w.eligible,w.calculated_delta
      FROM public.points_fat_reward_week_series w WHERE w.week_start=p_week AND w.bowel_status=v_status;
    IF FOUND THEN CONTINUE; END IF;
    SELECT * INTO c FROM public.points_fat_v2_reward_sample(p_week,v_status);
    SELECT * INTO p FROM public.points_fat_v2_reward_reference(p_week,v_status);
    v_change:=c.mean_jin-p.mean_jin;
    v_eligible:=v_change IS NOT NULL AND c.days>=3 AND (p.basis='starting_weight' OR p.days>=3);
    RETURN QUERY SELECT v_status,c.days,coalesce(p.days,0),c.mean_jin,p.mean_jin,coalesce(p.basis,'previous_week'),
      v_change,coalesce(v_eligible,false),public.points_fat_reward_delta(v_change,c.days,CASE WHEN p.basis='starting_weight' THEN 3 ELSE coalesce(p.days,0) END);
  END LOOP;
END $function$;

ALTER FUNCTION "public"."points_fat_v2_reward_analysis"(p_week date) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_v2_reward_reference(p_week date, p_status text)
 RETURNS TABLE(days integer, mean_jin numeric, basis text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_first date;
BEGIN
  SELECT min(date_trunc('week',created_at AT TIME ZONE 'Asia/Shanghai')::date) INTO v_first
    FROM public.points_fat_records WHERE bowel_status=p_status
      AND created_at<public.points_fat_reward_cutoff(date_trunc('week',created_at AT TIME ZONE 'Asia/Shanghai')::date);
  -- A deleted first record must not reset the category's established first week.
  SELECT least(v_first,min(week_start)) INTO v_first FROM public.points_fat_reward_week_series
    WHERE bowel_status=p_status AND current_days>0;
  IF p_week=v_first THEN
    RETURN QUERY SELECT 0,s.starting_weight_jin,'starting_weight'::text FROM public.points_fat_settings s WHERE id=1;
    RETURN;
  END IF;
  RETURN QUERY SELECT w.current_days,w.current_mean_jin,'previous_week'::text
    FROM public.points_fat_reward_week_series w WHERE week_start=p_week-7 AND bowel_status=p_status;
  IF NOT FOUND THEN
    RETURN QUERY SELECT s.days,s.mean_jin,'previous_week'::text FROM public.points_fat_v2_reward_sample(p_week-7,p_status) s;
  END IF;
END $function$;

ALTER FUNCTION "public"."points_fat_v2_reward_reference"(p_week date, p_status text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_fat_v2_reward_sample(p_week date, p_status text)
 RETURNS TABLE(days integer, mean_jin numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT count(*)::integer,avg(d.weight_jin) FROM(
    SELECT DISTINCT ON((r.created_at AT TIME ZONE 'Asia/Shanghai')::date) r.weight_jin
    FROM public.points_fat_records r WHERE r.bowel_status=p_status
      AND r.created_at>=(p_week::timestamp AT TIME ZONE 'Asia/Shanghai')
      AND r.created_at<public.points_fat_reward_cutoff(p_week)
    ORDER BY (r.created_at AT TIME ZONE 'Asia/Shanghai')::date,r.created_at,r.id
  ) d;
$function$;

ALTER FUNCTION "public"."points_fat_v2_reward_sample"(p_week date, p_status text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_get_logs(p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 10000)
 RETURNS TABLE(id bigint, delta integer, reason text, created_at timestamp with time zone, score_before integer, score_after integer, action text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with active_member as (
    select m.id, m.score
    from public.members m
    where m.active = true
    order by m.id asc
    limit 1
  ),
  reconstructed as (
    select
      sl.id,
      sl.delta,
      sl.reason,
      sl.created_at,
      am.score as current_score,
      coalesce(
        sum(sl.delta) over (
          order by sl.created_at desc, sl.id desc
          rows between unbounded preceding and 1 preceding
        ),
        0
      )::integer as later_delta
    from public.score_logs sl
    join active_member am on am.id = sl.member_id
  )
  select
    r.id,
    r.delta,
    r.reason,
    r.created_at,
    (r.current_score - r.later_delta - r.delta)::integer as score_before,
    (r.current_score - r.later_delta)::integer as score_after,
    case
      when r.reason = '重置到初始值 5' then 'reset'
      when r.reason = '兑换 1 次大转盘机会' then 'wheel_chance_redeem'
      when r.reason = '兑换 ¥30 可提现余额' then 'cash_redeem'
      when r.reason = '旧版积分兑换（已迁移）' then 'legacy_redeem'
      else 'change'
    end::text as action
  from reconstructed r
  where (p_from is null or r.created_at >= p_from)
    and (p_to is null or r.created_at < p_to)
  order by r.created_at desc, r.id desc
  limit least(greatest(coalesce(p_limit, 1000), 1), 10000);
$function$;

ALTER FUNCTION "public"."points_get_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_get_state()
 RETURNS TABLE(score integer, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    m.score,
    coalesce(
      (
        select max(sl.created_at)
        from public.score_logs sl
        where sl.member_id = m.id
      ),
      m.created_at
    ) as updated_at
  from public.members m
  where m.active = true
  order by m.id asc
  limit 1;
$function$;

ALTER FUNCTION "public"."points_get_state"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_get_wheel_logs(p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 10000)
 RETURNS TABLE(id bigint, action text, prize_amount integer, roll integer, chance_delta integer, chance_before integer, chance_after integer, cash_delta integer, cash_before integer, cash_after integer, reason text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    l.id, l.action, l.prize_amount, l.roll,
    l.chance_delta, l.chance_before, l.chance_after,
    l.cash_delta, l.cash_before, l.cash_after,
    l.reason, l.created_at
  from public.points_wheel_logs l
  where l.hidden_at is null
    and (p_from is null or l.created_at >= p_from)
    and (p_to is null or l.created_at < p_to)
  order by l.created_at desc, l.id desc
  limit least(greatest(coalesce(p_limit, 1000), 1), 10000);
$function$;

ALTER FUNCTION "public"."points_get_wheel_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_get_wheel_state()
 RETURNS TABLE(spin_chances integer, cash_balance integer, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select w.spin_chances, w.cash_balance, w.updated_at
  from public.points_wheel_state w
  where w.id = 1;
$function$;

ALTER FUNCTION "public"."points_get_wheel_state"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_get_wheel_totals()
 RETURNS TABLE(total_won bigint, total_settled bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    coalesce((
      select sum(greatest(coalesce(l.cash_delta,0),0))::bigint
      from public.points_wheel_logs l
      where l.action='spin_win' and l.hidden_at is null
    ),0::bigint),
    coalesce((
      select sum(greatest(coalesce(w.amount,0),0))::bigint
      from public.points_withdrawals w
      where w.status='settled' and w.hidden_at is null
    ),0::bigint);
$function$;

ALTER FUNCTION "public"."points_get_wheel_totals"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_get_withdrawals(p_limit integer DEFAULT 1000)
 RETURNS TABLE(id bigint, amount integer, cash_before integer, cash_after integer, status text, requested_at timestamp with time zone, settled_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    w.id,
    w.amount,
    w.cash_before,
    w.cash_after,
    w.status,
    w.requested_at,
    w.settled_at
  from public.points_withdrawals w
  where w.hidden_at is null
    and w.status <> 'canceled'
  order by w.requested_at desc, w.id desc
  limit least(greatest(coalesce(p_limit, 1000), 1), 10000);
$function$;

ALTER FUNCTION "public"."points_get_withdrawals"(p_limit integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select public.is_admin();
$function$;

ALTER FUNCTION "public"."points_is_admin"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_admin_draft(p_order_id bigint, p_ratings jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE o public.points_kitchen_orders%ROWTYPE;
BEGIN
  PERFORM public.points_kitchen_check(true);
  SELECT * INTO o FROM public.points_kitchen_orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND OR o.status<>'completed' THEN RAISE EXCEPTION 'Order not awaiting review' USING errcode='P0001'; END IF;
  PERFORM public.points_kitchen_validate_ratings(o.items,p_ratings,false);
  INSERT INTO public.points_kitchen_drafts(order_id,user_id,ratings) VALUES(o.id,auth.uid(),p_ratings)
    ON CONFLICT(order_id,user_id) DO UPDATE SET ratings=excluded.ratings,updated_at=clock_timestamp();
END $function$;

ALTER FUNCTION "public"."points_kitchen_admin_draft"(p_order_id bigint, p_ratings jsonb) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_admin_review(p_order_id bigint, p_ratings jsonb, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE o public.points_kitchen_orders%ROWTYPE; v_id bigint; v_args jsonb; v_delta integer;
  v_score integer; v_member bigint; r jsonb;
BEGIN
  PERFORM public.points_kitchen_check(true);
  v_args:=jsonb_build_object('id',p_order_id,'ratings',p_ratings);
  v_id:=public.points_kitchen_operation(p_operation_id,'review',v_args);
  IF v_id IS NOT NULL THEN RETURN public.points_kitchen_get_order(v_id); END IF;
  SELECT * INTO o FROM public.points_kitchen_orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND OR o.status<>'completed' THEN RAISE EXCEPTION 'Order not awaiting review' USING errcode='P0001'; END IF;
  v_delta:=public.points_kitchen_validate_ratings(o.items,p_ratings,true);
  SELECT id,score INTO v_member,v_score FROM public.members WHERE active ORDER BY id LIMIT 1 FOR UPDATE;
  IF v_member IS DISTINCT FROM o.member_id THEN RAISE EXCEPTION 'Score object changed' USING errcode='P0001'; END IF;
  IF v_delta<>0 THEN v_score:=public.change_score_single(v_delta,'厨房订单 #'||o.id::text||' · 菜品评价结算'); END IF;
  FOR r IN SELECT value FROM jsonb_array_elements(p_ratings) LOOP
    INSERT INTO public.points_kitchen_reviews(order_id,dish_slug,stars,comment,recipe_snapshot,reviewed_by)
      SELECT o.id,r->>'slug',(r->>'stars')::integer,trim(coalesce(r->>'comment','')),i,auth.uid()
      FROM jsonb_array_elements(o.items) i WHERE i->>'slug'=r->>'slug';
  END LOOP;
  UPDATE public.points_kitchen_orders SET status='settled',score_delta=v_delta,score_after=v_score,
    resolved_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=o.id;
  DELETE FROM public.points_kitchen_drafts WHERE order_id=o.id;
  INSERT INTO public.points_kitchen_operations(operation_id,actor,kind,arguments,order_id)
    VALUES(p_operation_id,auth.uid(),'review',v_args,o.id);
  RETURN public.points_kitchen_get_order(o.id);
END $function$;

ALTER FUNCTION "public"."points_kitchen_admin_review"(p_order_id bigint, p_ratings jsonb, p_operation_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_admin_save(p_items jsonb, p_note text, p_operation_id uuid, p_order_id bigint DEFAULT NULL::bigint, p_version integer DEFAULT NULL::integer, p_cancel boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE o public.points_kitchen_orders%ROWTYPE; v_args jsonb; v_id bigint; v_items jsonb; v_slug text; v_recipe jsonb; v_item jsonb; v_item_note text; v_slugs text[] := '{}';
  v_member bigint; v_note text := trim(coalesce(p_note,'')); v_cancel boolean := coalesce(p_cancel,false);
BEGIN
  PERFORM public.points_kitchen_check(true);
  v_args := jsonb_build_object('items',p_items,'note',v_note,'id',p_order_id,'version',p_version,'cancel',v_cancel);
  v_id := public.points_kitchen_operation(p_operation_id,'save',v_args);
  IF v_id IS NOT NULL THEN RETURN public.points_kitchen_get_order(v_id); END IF;
  IF char_length(v_note)>500 THEN RAISE EXCEPTION 'Note too long' USING errcode='22023'; END IF;
  IF p_order_id IS NOT NULL THEN
    SELECT * INTO o FROM public.points_kitchen_orders WHERE id=p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found' USING errcode='P0002'; END IF;
    IF o.status<>'pending' THEN RAISE EXCEPTION 'Order is closed for editing' USING errcode='P0001'; END IF;
    IF p_version IS DISTINCT FROM o.version THEN RAISE EXCEPTION 'Order version changed' USING errcode='40001'; END IF;
  ELSIF v_cancel THEN RAISE EXCEPTION 'Cannot cancel a new order' USING errcode='22023'; END IF;
  IF v_cancel THEN v_items:=o.items;
  ELSE
    IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 24 THEN
      RAISE EXCEPTION 'Select 1 to 24 distinct dishes' USING errcode='22023'; END IF;
    v_items:='[]'::jsonb;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
      IF jsonb_typeof(v_item)='string' THEN v_slug:=v_item #>> '{}';
      ELSIF jsonb_typeof(v_item)='object' AND jsonb_typeof(v_item->'slug')='string'
        AND (NOT v_item ? 'note' OR jsonb_typeof(v_item->'note')='string') THEN v_slug:=v_item->>'slug';
      ELSE RAISE EXCEPTION 'Invalid dish request' USING errcode='22023'; END IF;
      IF v_slug=ANY(v_slugs) THEN RAISE EXCEPTION 'Duplicate dish' USING errcode='22023'; END IF;
      v_slugs:=array_append(v_slugs,v_slug);
      SELECT value INTO v_recipe FROM jsonb_array_elements(coalesce(o.items,'[]'::jsonb)) WHERE value->>'slug'=v_slug;
      v_item_note:=CASE WHEN jsonb_typeof(v_item)='object' THEN trim(coalesce(v_item->>'note','')) ELSE coalesce(v_recipe->>'request_note','') END;
      IF char_length(v_item_note)>200 THEN RAISE EXCEPTION 'Dish note too long' USING errcode='22023'; END IF;
      IF v_recipe IS NULL THEN
        SELECT recipe || jsonb_build_object('slug',slug) INTO v_recipe FROM public.points_kitchen_dishes WHERE slug=v_slug AND active;
      END IF;
      IF v_recipe IS NULL THEN RAISE EXCEPTION 'Dish unavailable' USING errcode='22023'; END IF;
      v_items:=v_items || jsonb_build_array((v_recipe-'request_note') || CASE WHEN v_item_note<>'' THEN jsonb_build_object('request_note',v_item_note) ELSE '{}'::jsonb END);
    END LOOP;
  END IF;
  IF p_order_id IS NULL THEN
    SELECT id INTO v_member FROM public.members WHERE active ORDER BY id LIMIT 1;
    IF v_member IS NULL THEN RAISE EXCEPTION 'Score object not found' USING errcode='P0001'; END IF;
    INSERT INTO public.points_kitchen_orders(member_id,items,note,created_by)
      VALUES(v_member,v_items,v_note,auth.uid()) RETURNING * INTO o;
  ELSIF v_cancel OR v_items<>o.items OR v_note<>o.note THEN
    UPDATE public.points_kitchen_orders SET items=v_items,note=v_note,version=version+1,
      status=CASE WHEN v_cancel THEN 'cancelled' ELSE 'pending' END,
      resolved_at=CASE WHEN v_cancel THEN clock_timestamp() ELSE NULL END,updated_at=clock_timestamp()
      WHERE id=o.id RETURNING * INTO o;
  END IF;
  INSERT INTO public.points_kitchen_versions(order_id,version,items,note,status,changed_by)
    VALUES(o.id,o.version,o.items,o.note,o.status,auth.uid()) ON CONFLICT DO NOTHING;
  INSERT INTO public.points_kitchen_operations(operation_id,actor,kind,arguments,order_id)
    VALUES(p_operation_id,auth.uid(),'save',v_args,o.id);
  RETURN public.points_kitchen_get_order(o.id);
END $function$;

ALTER FUNCTION "public"."points_kitchen_admin_save"(p_items jsonb, p_note text, p_operation_id uuid, p_order_id bigint, p_version integer, p_cancel boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_check(p_admin boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF p_admin AND (auth.uid() IS NULL OR NOT coalesce(public.points_is_admin(),false)) THEN
    RAISE EXCEPTION 'Admin permission required' USING errcode='42501';
  ELSIF NOT p_admin AND auth.uid() IS NOT NULL AND NOT coalesce(public.points_is_admin(),false) THEN
    RAISE EXCEPTION 'Unverified identity' USING errcode='42501';
  END IF;
END $function$;

ALTER FUNCTION "public"."points_kitchen_check"(p_admin boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_get_order(p_order_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_result jsonb;
BEGIN
  PERFORM public.points_kitchen_check(); v_result := public.points_kitchen_order_json(p_order_id);
  IF v_result IS NULL THEN RAISE EXCEPTION 'Order not found' USING errcode='P0002'; END IF;
  RETURN v_result || jsonb_build_object('versions',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'version',v.version,'items',v.items,'note',v.note,'status',v.status,'changed_at',v.changed_at) ORDER BY v.version)
    FROM public.points_kitchen_versions v WHERE v.order_id=p_order_id),'[]'::jsonb),
    'draft',CASE WHEN auth.uid() IS NULL THEN NULL ELSE (SELECT d.ratings FROM public.points_kitchen_drafts d
      WHERE d.order_id=p_order_id AND d.user_id=auth.uid()) END);
END $function$;

ALTER FUNCTION "public"."points_kitchen_get_order"(p_order_id bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_get_reviews(p_slug text, p_before bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  PERFORM public.points_kitchen_check();
  RETURN jsonb_build_object('reviews',coalesce((SELECT jsonb_agg(jsonb_build_object('order_id',r.order_id::text,
    'stars',r.stars,'comment',r.comment,'reviewed_at',r.reviewed_at,'recipe_version',r.recipe_snapshot->>'recipe_version')
    ORDER BY r.order_id DESC) FROM (SELECT * FROM public.points_kitchen_reviews WHERE dish_slug=p_slug
      AND (p_before IS NULL OR order_id<p_before) ORDER BY order_id DESC LIMIT 20) r),'[]'::jsonb),
    'more',(SELECT count(*)>20 FROM public.points_kitchen_reviews WHERE dish_slug=p_slug AND (p_before IS NULL OR order_id<p_before)));
END $function$;

ALTER FUNCTION "public"."points_kitchen_get_reviews"(p_slug text, p_before bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_get_state(p_before bigint DEFAULT NULL::bigint, p_month date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_admin boolean; v_month date; v_end date; v_oldest bigint;
BEGIN
  PERFORM public.points_kitchen_check(); v_admin := auth.uid() IS NOT NULL;
  v_month := date_trunc('month',coalesce(p_month,(clock_timestamp() AT TIME ZONE 'Asia/Shanghai')::date))::date;
  v_end := (v_month+interval '1 month')::date;
  SELECT min(t.id) INTO v_oldest FROM (SELECT id FROM public.points_kitchen_orders
    WHERE status NOT IN ('pending','completed') AND (p_before IS NULL OR id<p_before) ORDER BY id DESC LIMIT 20) t;
  RETURN jsonb_build_object('admin',v_admin,'month',v_month,
    'dishes',coalesce((SELECT jsonb_agg(d.recipe || jsonb_build_object('slug',d.slug,'active',d.active,
      'rating_count',(SELECT count(*) FROM public.points_kitchen_reviews r WHERE r.dish_slug=d.slug),
      'rating_average',(SELECT round(avg(r.stars),1) FROM public.points_kitchen_reviews r WHERE r.dish_slug=d.slug))
      ORDER BY d.recipe->>'category',d.recipe->>'name') FROM public.points_kitchen_dishes d),'[]'::jsonb),
    'orders',coalesce((SELECT jsonb_agg(public.points_kitchen_order_json(o.id) ORDER BY o.id DESC)
      FROM public.points_kitchen_orders o WHERE o.status IN ('pending','completed') OR o.id IN (
        SELECT id FROM public.points_kitchen_orders WHERE status NOT IN ('pending','completed')
          AND (p_before IS NULL OR id<p_before) ORDER BY id DESC LIMIT 20)),'[]'::jsonb),
    'more',EXISTS(SELECT 1 FROM public.points_kitchen_orders WHERE status NOT IN ('pending','completed') AND id<v_oldest),
    'cursor',v_oldest::text,
    'month_orders',coalesce((SELECT jsonb_agg(public.points_kitchen_order_json(o.id) ORDER BY o.created_at,o.id)
      FROM public.points_kitchen_orders o WHERE o.created_at >= (v_month::timestamp AT TIME ZONE 'Asia/Shanghai')
        AND o.created_at < (v_end::timestamp AT TIME ZONE 'Asia/Shanghai')),'[]'::jsonb),
    'notifications',CASE WHEN v_admin THEN '[]'::jsonb ELSE coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id',o.id::text,'version',o.version,'status',o.status,'items',o.items,'note',o.note,
      'previous', (SELECT jsonb_build_object('items',v.items,'note',v.note,'status',v.status)
        FROM public.points_kitchen_versions v WHERE v.order_id=o.id AND v.version=o.acknowledged_version)) ORDER BY o.id)
      FROM (SELECT * FROM public.points_kitchen_orders WHERE acknowledged_version<version
        AND status IN ('pending','cancelled') ORDER BY id LIMIT 50) o),'[]'::jsonb) END);
END $function$;

ALTER FUNCTION "public"."points_kitchen_get_state"(p_before bigint, p_month date) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_guest_ack(p_versions jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v record;
BEGIN
  IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Guest access required' USING errcode='42501'; END IF;
  IF jsonb_typeof(p_versions) IS DISTINCT FROM 'array' OR jsonb_array_length(p_versions)>50 THEN
    RAISE EXCEPTION 'Invalid acknowledgement' USING errcode='22023'; END IF;
  FOR v IN SELECT * FROM jsonb_to_recordset(p_versions) AS x(id bigint,version integer) LOOP
    IF v.version IS NULL OR v.version<1 THEN RAISE EXCEPTION 'Invalid version' USING errcode='22023'; END IF;
    UPDATE public.points_kitchen_orders SET acknowledged_version=greatest(acknowledged_version,least(version,v.version)) WHERE id=v.id;
  END LOOP;
END $function$;

ALTER FUNCTION "public"."points_kitchen_guest_ack"(p_versions jsonb) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_guest_resolve(p_order_id bigint, p_version integer, p_reject boolean, p_reason text, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE o public.points_kitchen_orders%ROWTYPE; v_id bigint; v_args jsonb;
  v_reason text:=trim(coalesce(p_reason,''));
BEGIN
  IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Guest access required' USING errcode='42501'; END IF;
  IF p_reject IS NULL OR char_length(v_reason)>500 THEN RAISE EXCEPTION 'Invalid resolution' USING errcode='22023'; END IF;
  v_args:=jsonb_build_object('id',p_order_id,'version',p_version,'reject',p_reject,'reason',v_reason);
  v_id:=public.points_kitchen_operation(p_operation_id,'resolve',v_args);
  IF v_id IS NOT NULL THEN RETURN public.points_kitchen_get_order(v_id); END IF;
  SELECT * INTO o FROM public.points_kitchen_orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found' USING errcode='P0002'; END IF;
  IF p_version IS DISTINCT FROM o.version THEN RAISE EXCEPTION 'Order version changed' USING errcode='40001'; END IF;
  IF o.status<>'pending' THEN RAISE EXCEPTION 'Order already processed' USING errcode='P0001'; END IF;
  IF o.seen_version<o.version THEN RAISE EXCEPTION 'View the latest order first' USING errcode='P0001'; END IF;
  UPDATE public.points_kitchen_orders SET status=CASE WHEN p_reject THEN 'rejected' ELSE 'completed' END,
    completed_at=CASE WHEN p_reject THEN NULL ELSE clock_timestamp() END,
    resolved_at=CASE WHEN p_reject THEN clock_timestamp() ELSE NULL END,
    resolution_note=v_reason,acknowledged_version=version,updated_at=clock_timestamp() WHERE id=o.id;
  INSERT INTO public.points_kitchen_operations(operation_id,actor,kind,arguments,order_id)
    VALUES(p_operation_id,NULL,'resolve',v_args,o.id);
  RETURN public.points_kitchen_get_order(o.id);
END $function$;

ALTER FUNCTION "public"."points_kitchen_guest_resolve"(p_order_id bigint, p_version integer, p_reject boolean, p_reason text, p_operation_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_guest_seen(p_order_id bigint, p_version integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Guest access required' USING errcode='42501'; END IF;
  IF p_version IS NULL OR p_version<1 THEN RAISE EXCEPTION 'Invalid version' USING errcode='22023'; END IF;
  UPDATE public.points_kitchen_orders SET seen_version=greatest(seen_version,least(version,p_version)) WHERE id=p_order_id;
END $function$;

ALTER FUNCTION "public"."points_kitchen_guest_seen"(p_order_id bigint, p_version integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_operation(p_id uuid, p_kind text, p_args jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v public.points_kitchen_operations%ROWTYPE;
BEGIN
  IF p_id IS NULL THEN RAISE EXCEPTION 'Operation ID required' USING errcode='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  SELECT * INTO v FROM public.points_kitchen_operations WHERE operation_id=p_id;
  IF FOUND THEN
    IF v.actor IS DISTINCT FROM auth.uid() OR v.kind<>p_kind OR v.arguments<>p_args THEN
      RAISE EXCEPTION 'Operation conflict' USING errcode='22023'; END IF;
    RETURN v.order_id;
  END IF;
  RETURN NULL;
END $function$;

ALTER FUNCTION "public"."points_kitchen_operation"(p_id uuid, p_kind text, p_args jsonb) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_order_json(p_id bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT (to_jsonb(o)-'created_by') || jsonb_build_object('id',o.id::text,'member_id',o.member_id::text,
    'reviews',coalesce((SELECT jsonb_agg(jsonb_build_object('slug',r.dish_slug,'stars',r.stars,'comment',r.comment))
      FROM public.points_kitchen_reviews r WHERE r.order_id=o.id),'[]'::jsonb))
  FROM public.points_kitchen_orders o WHERE o.id=p_id;
$function$;

ALTER FUNCTION "public"."points_kitchen_order_json"(p_id bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_v2_admin_ack(p_versions jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN IF points_kitchen_v2.actor()='guest' THEN RAISE EXCEPTION 'Admin required' USING errcode='42501'; END IF; PERFORM points_kitchen_v2.ack(p_versions); END $function$;

ALTER FUNCTION "public"."points_kitchen_v2_admin_ack"(p_versions jsonb) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_v2_admin_draft(p_order_id bigint, p_version integer, p_ratings jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE o public.points_kitchen_orders; r jsonb; seen text[]:='{}';
BEGIN
  IF points_kitchen_v2.actor()='guest' THEN RAISE EXCEPTION 'Admin required' USING errcode='42501'; END IF;
  IF p_ratings IS NULL OR jsonb_typeof(p_ratings)<>'array' OR jsonb_array_length(p_ratings)>24 OR octet_length(p_ratings::text)>30000 THEN RAISE EXCEPTION 'Invalid draft' USING errcode='22023'; END IF;
  SELECT * INTO o FROM public.points_kitchen_orders WHERE id=p_order_id AND version=p_version AND status='completed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order changed' USING errcode='40001'; END IF;
  IF jsonb_array_length(p_ratings)<>jsonb_array_length(o.items) THEN RAISE EXCEPTION 'Invalid draft' USING errcode='22023'; END IF;
  FOR r IN SELECT value FROM jsonb_array_elements(p_ratings) LOOP
    IF r->>'slug' IS NULL OR r->>'slug'=ANY(seen) OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(o.items) x WHERE x->>'slug'=r->>'slug')
      OR ((r->>'stars') IS NOT NULL AND (r->>'stars')::integer NOT BETWEEN 1 AND 5)
      OR char_length(coalesce(r->>'comment',''))>1000 THEN RAISE EXCEPTION 'Invalid draft' USING errcode='22023'; END IF;
    seen:=array_append(seen,r->>'slug');
  END LOOP;
  PERFORM public.points_kitchen_validate_ratings(o.items,p_ratings,false);
  INSERT INTO public.points_kitchen_drafts(order_id,user_id,ratings) VALUES(p_order_id,auth.uid(),p_ratings)
    ON CONFLICT(order_id,user_id) DO UPDATE SET ratings=excluded.ratings,updated_at=clock_timestamp();
END $function$;

ALTER FUNCTION "public"."points_kitchen_v2_admin_draft"(p_order_id bigint, p_version integer, p_ratings jsonb) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_v2_admin_review(p_order_id bigint, p_version integer, p_ratings jsonb, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
SELECT points_kitchen_v2.write('admin_review',jsonb_build_object('p_order_id',p_order_id,'p_version',p_version,'p_ratings',p_ratings),p_operation_id);
$function$;

ALTER FUNCTION "public"."points_kitchen_v2_admin_review"(p_order_id bigint, p_version integer, p_ratings jsonb, p_operation_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_v2_admin_save(p_items jsonb, p_note text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
SELECT points_kitchen_v2.write('admin_save',jsonb_build_object('p_items',p_items,'p_note',p_note,'p_order_id',p_order_id,'p_version',p_version,'p_cancel',p_cancel),p_operation_id);
$function$;

ALTER FUNCTION "public"."points_kitchen_v2_admin_save"(p_items jsonb, p_note text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_v2_get_order(p_order_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v jsonb;
BEGIN
  PERFORM points_kitchen_v2.actor(); v:=points_kitchen_v2.snapshot(p_order_id);
  IF v IS NULL THEN RAISE EXCEPTION 'Order not found' USING errcode='P0002'; END IF;
  RETURN v;
END $function$;

ALTER FUNCTION "public"."points_kitchen_v2_get_order"(p_order_id bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_v2_get_reviews(p_slug text, p_before bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT public.points_kitchen_get_reviews(p_slug,p_before);
$function$;

ALTER FUNCTION "public"."points_kitchen_v2_get_reviews"(p_slug text, p_before bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_v2_get_state(p_before bigint DEFAULT NULL::bigint, p_month date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE a text:=points_kitchen_v2.actor(); m date; ids bigint[]; notices jsonb;
BEGIN
  m:=date_trunc('month',coalesce(p_month,(clock_timestamp() AT TIME ZONE 'Asia/Shanghai')::date))::date;
  SELECT array_agg(id ORDER BY id DESC) INTO ids FROM (
    SELECT id FROM public.points_kitchen_orders WHERE p_before IS NULL OR id<p_before ORDER BY id DESC LIMIT 30
  ) t;
  SELECT coalesce(jsonb_agg(points_kitchen_v2.snapshot(o.id) || jsonb_build_object(
    'previous',(SELECT to_jsonb(v)-'order_id' FROM public.points_kitchen_versions v
      WHERE v.order_id=o.id AND v.version=r.ack_version)) ORDER BY o.id),'[]') INTO notices
    FROM public.points_kitchen_orders o LEFT JOIN points_kitchen_v2.receipts r ON r.order_id=o.id AND r.actor=a
    WHERE o.version>coalesce(r.ack_version,0) AND
      ((a='guest' AND o.origin='admin' AND o.status IN ('pending','cancelled'))
       OR (a<>'guest' AND o.origin='guest' AND o.status='completed'));
  RETURN jsonb_build_object('admin',a<>'guest','month',m,'notifications',notices,
    'dishes',(SELECT coalesce(jsonb_agg(d.recipe || jsonb_build_object(
      'rating_count',(SELECT count(*) FROM public.points_kitchen_reviews r WHERE r.dish_slug=d.slug),
      'rating_average',(SELECT avg(r.stars) FROM public.points_kitchen_reviews r WHERE r.dish_slug=d.slug)
    ) ORDER BY d.slug),'[]') FROM public.points_kitchen_dishes d),
    'orders',(SELECT coalesce(jsonb_agg(points_kitchen_v2.snapshot(t.id) ORDER BY t.id DESC),'[]') FROM (
      SELECT id FROM public.points_kitchen_orders WHERE id=ANY(ids) OR (p_before IS NULL AND status IN ('pending','completed'))
    ) t),'cursor',(SELECT min(x)::text FROM unnest(ids) x),
    'more',EXISTS(SELECT 1 FROM public.points_kitchen_orders WHERE id<(SELECT min(x) FROM unnest(ids) x)),
    'month_orders',(SELECT coalesce(jsonb_agg(points_kitchen_v2.snapshot(o.id) ORDER BY o.id DESC),'[]')
      FROM public.points_kitchen_orders o WHERE coalesce(o.meal_date,(o.created_at AT TIME ZONE 'Asia/Shanghai')::date)>=m
      AND coalesce(o.meal_date,(o.created_at AT TIME ZONE 'Asia/Shanghai')::date)<(m+interval '1 month')::date));
END $function$;

ALTER FUNCTION "public"."points_kitchen_v2_get_state"(p_before bigint, p_month date) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_v2_guest_ack(p_versions jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN IF points_kitchen_v2.actor()<>'guest' THEN RAISE EXCEPTION 'Guest required' USING errcode='42501'; END IF; PERFORM points_kitchen_v2.ack(p_versions); END $function$;

ALTER FUNCTION "public"."points_kitchen_v2_guest_ack"(p_versions jsonb) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_v2_guest_resolve(p_order_id bigint, p_version integer, p_reject boolean, p_reason text, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
SELECT points_kitchen_v2.write('guest_resolve',jsonb_build_object('p_order_id',p_order_id,'p_version',p_version,'p_reject',p_reject,'p_reason',p_reason),p_operation_id);
$function$;

ALTER FUNCTION "public"."points_kitchen_v2_guest_resolve"(p_order_id bigint, p_version integer, p_reject boolean, p_reason text, p_operation_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_v2_guest_save(p_items jsonb, p_note text, p_meal_date date, p_meal text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
SELECT points_kitchen_v2.write('guest_save',jsonb_build_object('p_items',p_items,'p_note',p_note,'p_meal_date',p_meal_date,'p_meal',p_meal,'p_order_id',p_order_id,'p_version',p_version,'p_cancel',p_cancel),p_operation_id);
$function$;

ALTER FUNCTION "public"."points_kitchen_v2_guest_save"(p_items jsonb, p_note text, p_meal_date date, p_meal text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_v2_guest_seen(p_order_id bigint, p_version integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF points_kitchen_v2.actor()<>'guest' THEN RAISE EXCEPTION 'Guest required' USING errcode='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.points_kitchen_orders WHERE id=p_order_id AND version=p_version AND origin='admin') THEN RAISE EXCEPTION 'Order changed' USING errcode='40001'; END IF;
  UPDATE public.points_kitchen_orders SET seen_version=greatest(seen_version,p_version) WHERE id=p_order_id;
  INSERT INTO points_kitchen_v2.receipts(order_id,actor,seen_version) VALUES(p_order_id,'guest',p_version)
    ON CONFLICT(order_id,actor) DO UPDATE SET seen_version=greatest(points_kitchen_v2.receipts.seen_version,excluded.seen_version);
END $function$;

ALTER FUNCTION "public"."points_kitchen_v2_guest_seen"(p_order_id bigint, p_version integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_v3_admin_review(p_order_id bigint, p_version integer, p_ratings jsonb, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT points_kitchen_v2.meal_write('meal_review',jsonb_build_object('p_order_id',p_order_id,'p_version',p_version,'p_ratings',p_ratings),p_operation_id);
$function$;

ALTER FUNCTION "public"."points_kitchen_v3_admin_review"(p_order_id bigint, p_version integer, p_ratings jsonb, p_operation_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_v3_admin_save(p_items jsonb, p_note text, p_meal_date date, p_meal text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT points_kitchen_v2.meal_write('meal_admin_save',jsonb_build_object('p_items',p_items,'p_note',p_note,'p_meal_date',p_meal_date,'p_meal',p_meal,'p_order_id',p_order_id,'p_version',p_version,'p_cancel',p_cancel),p_operation_id);
$function$;

ALTER FUNCTION "public"."points_kitchen_v3_admin_save"(p_items jsonb, p_note text, p_meal_date date, p_meal text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_v3_get_meal(p_meal_date date, p_meal text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE a text:=points_kitchen_v2.actor(); result jsonb;
BEGIN
  IF p_meal_date IS NULL OR p_meal IS NULL OR p_meal NOT IN ('早饭','午饭','晚饭') THEN
    RAISE EXCEPTION 'Invalid meal' USING errcode='22023';
  END IF;
  SELECT points_kitchen_v2.snapshot(o.id) INTO result FROM public.points_kitchen_orders o
    JOIN public.members m ON m.id=o.member_id AND m.active
    WHERE o.meal_mode AND o.meal_date=p_meal_date AND o.meal=p_meal AND o.status NOT IN ('cancelled','rejected');
  RETURN result;
END $function$;

ALTER FUNCTION "public"."points_kitchen_v3_get_meal"(p_meal_date date, p_meal text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_v3_get_order(p_order_id bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT public.points_kitchen_v2_get_order(p_order_id);
$function$;

ALTER FUNCTION "public"."points_kitchen_v3_get_order"(p_order_id bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_v3_get_state(p_before bigint DEFAULT NULL::bigint, p_month date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT public.points_kitchen_v2_get_state(p_before,p_month) || '{"meal_supported":true}'::jsonb;
$function$;

ALTER FUNCTION "public"."points_kitchen_v3_get_state"(p_before bigint, p_month date) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_v3_guest_resolve(p_order_id bigint, p_version integer, p_reject boolean, p_reason text, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT points_kitchen_v2.meal_write('meal_resolve',jsonb_build_object('p_order_id',p_order_id,'p_version',p_version,'p_reject',p_reject,'p_reason',p_reason),p_operation_id);
$function$;

ALTER FUNCTION "public"."points_kitchen_v3_guest_resolve"(p_order_id bigint, p_version integer, p_reject boolean, p_reason text, p_operation_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_v3_guest_save(p_items jsonb, p_note text, p_meal_date date, p_meal text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT points_kitchen_v2.meal_write('meal_guest_save',jsonb_build_object('p_items',p_items,'p_note',p_note,'p_meal_date',p_meal_date,'p_meal',p_meal,'p_order_id',p_order_id,'p_version',p_version,'p_cancel',p_cancel),p_operation_id);
$function$;

ALTER FUNCTION "public"."points_kitchen_v3_guest_save"(p_items jsonb, p_note text, p_meal_date date, p_meal text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_kitchen_validate_ratings(p_items jsonb, p_ratings jsonb, p_complete boolean)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE r jsonb; v_total integer:=0; v_slug text;
BEGIN
  IF jsonb_typeof(p_ratings) IS DISTINCT FROM 'array' OR jsonb_array_length(p_ratings)>24
    OR (SELECT count(DISTINCT value->>'slug') FROM jsonb_array_elements(p_ratings))<>jsonb_array_length(p_ratings)
    OR (p_complete AND jsonb_array_length(p_ratings)<>jsonb_array_length(p_items)) THEN
    RAISE EXCEPTION 'Every dish must be rated exactly once' USING errcode='22023'; END IF;
  FOR r IN SELECT value FROM jsonb_array_elements(p_ratings) LOOP
    v_slug:=r->>'slug';
    IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) i WHERE i->>'slug'=v_slug)
      OR char_length(coalesce(r->>'comment',''))>1000
      OR (r ? 'comment' AND jsonb_typeof(r->'comment') IS DISTINCT FROM 'string') THEN
      RAISE EXCEPTION 'Invalid dish or comment' USING errcode='22023'; END IF;
    IF r->>'stars' IS NULL AND NOT p_complete THEN CONTINUE; END IF;
    IF jsonb_typeof(r->'stars') IS DISTINCT FROM 'number' OR (r->>'stars') !~ '^[1-5]$' THEN
      RAISE EXCEPTION 'Choose 1 to 5 stars for every dish' USING errcode='22023'; END IF;
    v_total:=v_total+CASE (r->>'stars')::integer WHEN 1 THEN -1 WHEN 2 THEN -1 WHEN 3 THEN 0 WHEN 4 THEN 1 ELSE 2 END;
  END LOOP;
  RETURN v_total;
END $function$;

ALTER FUNCTION "public"."points_kitchen_validate_ratings"(p_items jsonb, p_ratings jsonb, p_complete boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_notice_worker_claim()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE b points_notice.batches; s points_push.subscriptions; a text; prefs points_notice.preferences;
  now_local timestamp:=clock_timestamp() AT TIME ZONE 'Asia/Shanghai'; list jsonb; ids bigint[]; title text; body text; route text; result jsonb:='[]';
BEGIN
  IF NOT EXISTS(SELECT 1 FROM points_push.config WHERE id AND enabled) THEN RETURN result; END IF;
  UPDATE points_notice.batches SET status='dead' WHERE status IN ('pending','retry','sending') AND (expires_at<clock_timestamp() OR attempts>=5 AND lease_until<clock_timestamp());
  FOR b IN SELECT * FROM points_notice.batches WHERE attempts<5 AND available_at<=clock_timestamp() AND (status IN ('pending','retry') OR status='sending' AND lease_until<clock_timestamp()) ORDER BY priority DESC,id LIMIT 20 FOR UPDATE SKIP LOCKED LOOP
    SELECT * INTO s FROM points_push.subscriptions WHERE id=b.subscription_id AND enabled;
    IF s.id IS NULL OR s.public_key<>(SELECT public_key FROM points_push.config WHERE id) OR s.audience='guest' AND NOT EXISTS(SELECT 1 FROM points_access.devices WHERE id=s.access_device_id AND revoked_at IS NULL) OR s.audience='admin' AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=s.user_id AND role='admin') THEN UPDATE points_notice.batches SET status='dead' WHERE id=b.id;CONTINUE; END IF;
    a:=s.audience||':'||coalesce(s.user_id,s.access_device_id);
    INSERT INTO points_notice.preferences(actor) VALUES(a) ON CONFLICT DO NOTHING;
    SELECT * INTO prefs FROM points_notice.preferences WHERE actor=a FOR UPDATE;
    SELECT array_agg(e.id),jsonb_agg(jsonb_build_object('title',e.title,'category',e.category,'route',e.route) ORDER BY e.id DESC) INTO ids,list
      FROM points_notice.batch_items x JOIN points_notice.events e ON e.id=x.event_id LEFT JOIN points_notice.receipts r ON r.event_id=e.id AND r.actor=a
      WHERE x.batch_id=b.id AND e.active AND e.push_allowed AND e.category=ANY(prefs.categories) AND r.presented_at IS NULL;
    IF ids IS NULL THEN UPDATE points_notice.batches SET status='dead' WHERE id=b.id;CONTINUE; END IF;
    IF prefs.quiet AND (now_local::time>='22:30'::time OR now_local::time<'08:00'::time) AND NOT (b.priority=1 AND prefs.night_important) THEN
      UPDATE points_notice.batches SET available_at=((now_local::date+CASE WHEN now_local::time>='22:30'::time THEN 1 ELSE 0 END)+time '08:00') AT TIME ZONE 'Asia/Shanghai' WHERE id=b.id;CONTINUE;
    END IF;
    IF b.priority=0 AND s.last_regular_at>clock_timestamp()-interval '2 minutes' THEN UPDATE points_notice.batches SET available_at=s.last_regular_at+interval '2 minutes' WHERE id=b.id;CONTINUE; END IF;
    title:=CASE WHEN cardinality(ids)=1 THEN list->0->>'title' ELSE '小世界有 '||cardinality(ids)||' 项更新' END;
    body:=CASE WHEN cardinality(ids)=1 THEN '点开查看详情。' ELSE '消息已合并，点开消息中心查看全部明细。' END;
    route:=CASE WHEN cardinality(ids)=1 THEN list->0->>'route' ELSE 'messages' END;
    UPDATE points_notice.batches SET status='sending',attempts=attempts+1,lease=gen_random_uuid(),lease_until=clock_timestamp()+interval '90 seconds' WHERE id=b.id RETURNING * INTO b;
    IF b.priority=0 THEN UPDATE points_push.subscriptions SET last_regular_at=clock_timestamp() WHERE id=s.id; END IF;
    result:=result||jsonb_build_array(jsonb_build_object('id',b.id,'lease',b.lease,'subscription',s.subscription,'payload',jsonb_build_object('title',title,'body',body,'route',route,'priority',b.priority,'tag',CASE WHEN b.priority=0 THEN 'points-updates' ELSE 'points-batch-'||b.id END)));
  END LOOP;
  RETURN result;
END $function$;

ALTER FUNCTION "public"."points_notice_worker_claim"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_notice_worker_finish(p_id bigint, p_lease uuid, p_code integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ BEGIN
  UPDATE points_notice.batches SET status=CASE WHEN p_code BETWEEN 200 AND 299 THEN 'sent' WHEN p_code IN (404,410) OR attempts>=5 OR p_code BETWEEN 400 AND 499 AND p_code NOT IN (408,429) THEN 'dead' ELSE 'retry' END,
    last_code=p_code,available_at=clock_timestamp()+make_interval(secs=>least(1800,30*(2^attempts)::integer)),lease=NULL,lease_until=NULL WHERE id=p_id AND lease=p_lease AND status='sending';
  IF p_code IN (404,410) THEN UPDATE points_push.subscriptions SET enabled=false WHERE id=(SELECT subscription_id FROM points_notice.batches WHERE id=p_id); END IF;
END $function$;

ALTER FUNCTION "public"."points_notice_worker_finish"(p_id bigint, p_lease uuid, p_code integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_notice_worker_validate(p_id bigint, p_lease uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS(SELECT 1 FROM points_notice.batches b JOIN points_push.subscriptions s ON s.id=b.subscription_id JOIN points_notice.batch_items x ON x.batch_id=b.id JOIN points_notice.events e ON e.id=x.event_id
    LEFT JOIN points_notice.receipts r ON r.event_id=e.id AND r.actor=s.audience||':'||coalesce(s.user_id,s.access_device_id)
    JOIN points_notice.preferences p ON p.actor=s.audience||':'||coalesce(s.user_id,s.access_device_id)
    WHERE b.id=p_id AND b.lease=p_lease AND b.status='sending' AND s.enabled AND e.active AND e.push_allowed AND e.category=ANY(p.categories) AND r.presented_at IS NULL
      AND (s.audience='admin' AND EXISTS(SELECT 1 FROM public.profiles WHERE user_id=s.user_id AND role='admin') OR s.audience='guest' AND EXISTS(SELECT 1 FROM points_access.devices WHERE id=s.access_device_id AND revoked_at IS NULL)));
$function$;

ALTER FUNCTION "public"."points_notice_worker_validate"(p_id bigint, p_lease uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_notifications_ack(p_ids bigint[], p_read boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE a text:=points_notice.actor(); BEGIN
  IF cardinality(p_ids)>50 THEN RAISE EXCEPTION 'Too many messages' USING errcode='22023'; END IF;
  INSERT INTO points_notice.receipts(actor,event_id,presented_at,read_at)
    SELECT a,id,clock_timestamp(),CASE WHEN p_read THEN clock_timestamp() END FROM points_notice.events WHERE id=ANY(p_ids) AND audience=split_part(a,':',1) AND (target_actor IS NULL OR target_actor=a)
    ON CONFLICT(actor,event_id) DO UPDATE SET presented_at=coalesce(points_notice.receipts.presented_at,excluded.presented_at),read_at=coalesce(points_notice.receipts.read_at,excluded.read_at);
  -- All authorized guest devices represent the same baby; preferences/presentation remain per device.
  IF p_read AND a LIKE 'guest:%' THEN
    INSERT INTO points_notice.receipts(actor,event_id,read_at)
      SELECT 'guest:'||d.id,e.id,clock_timestamp() FROM points_access.devices d CROSS JOIN points_notice.events e
      WHERE d.revoked_at IS NULL AND e.id=ANY(p_ids) AND e.audience='guest' AND e.target_actor IS NULL
      ON CONFLICT(actor,event_id) DO UPDATE SET read_at=coalesce(points_notice.receipts.read_at,excluded.read_at);
  END IF;
END $function$;

ALTER FUNCTION "public"."points_notifications_ack"(p_ids bigint[], p_read boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_notifications_get(p_before bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE a text:=points_notice.actor(); v_audience text:=split_part(a,':',1); items jsonb; unread bigint;
BEGIN
  INSERT INTO points_notice.preferences(actor,last_poll_at) VALUES(a,clock_timestamp()) ON CONFLICT(actor) DO UPDATE SET last_poll_at=excluded.last_poll_at;
  SELECT count(*) INTO unread FROM points_notice.events e LEFT JOIN points_notice.receipts r ON r.event_id=e.id AND r.actor=a WHERE e.audience=v_audience AND (e.target_actor IS NULL OR e.target_actor=a) AND e.active AND r.read_at IS NULL
    AND (v_audience<>'guest' OR e.created_at>=(SELECT verified_at FROM points_access.devices WHERE id=split_part(a,':',2)::uuid))
    AND NOT (v_audience='guest' AND e.target_actor IS NULL AND EXISTS(SELECT 1 FROM points_notice.receipts shared WHERE shared.event_id=e.id AND shared.actor LIKE 'guest:%' AND shared.read_at IS NOT NULL));
  SELECT coalesce(jsonb_agg(item ORDER BY id DESC),'[]') INTO items FROM (
    SELECT e.id,jsonb_build_object('id',e.id::text,'category',e.category,'title',e.title,'body',e.body,'route',e.route,'at',e.created_at,'unread',e.active AND r.read_at IS NULL
      AND (v_audience<>'guest' OR e.created_at>=(SELECT verified_at FROM points_access.devices WHERE id=split_part(a,':',2)::uuid))
      AND NOT (v_audience='guest' AND e.target_actor IS NULL AND EXISTS(SELECT 1 FROM points_notice.receipts shared WHERE shared.event_id=e.id AND shared.actor LIKE 'guest:%' AND shared.read_at IS NOT NULL)),
      'presented',r.presented_at IS NOT NULL,'pending',e.pending AND e.active,'active',e.active,'alert',e.push_allowed,'priority',e.priority) item
      FROM points_notice.events e LEFT JOIN points_notice.receipts r ON r.event_id=e.id AND r.actor=a
      WHERE e.audience=v_audience AND (e.target_actor IS NULL OR e.target_actor=a) AND (p_before IS NULL OR e.id<p_before) ORDER BY e.id DESC LIMIT 50
  ) x;
  RETURN jsonb_build_object('items',items,'unread',unread);
END $function$;

ALTER FUNCTION "public"."points_notifications_get"(p_before bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_notifications_preferences(p_categories text[] DEFAULT NULL::text[], p_quiet boolean DEFAULT NULL::boolean, p_night_important boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE a text:=points_notice.actor(); p points_notice.preferences; BEGIN
  IF p_categories IS NOT NULL AND NOT p_categories<@ARRAY['score','kitchen','withdrawal','assets','fat','service','security'] THEN RAISE EXCEPTION 'Invalid categories' USING errcode='22023'; END IF;
  INSERT INTO points_notice.preferences(actor) VALUES(a) ON CONFLICT DO NOTHING;
  UPDATE points_notice.preferences SET categories=coalesce(p_categories,categories),quiet=coalesce(p_quiet,quiet),night_important=coalesce(p_night_important,night_important) WHERE actor=a RETURNING * INTO p;
  RETURN jsonb_build_object('categories',p.categories,'quiet',p.quiet,'nightImportant',p.night_important);
END $function$;

ALTER FUNCTION "public"."points_notifications_preferences"(p_categories text[], p_quiet boolean, p_night_important boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_preview_wheel()
 RETURNS TABLE(prize_amount integer, roll integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_roll integer;
begin
  v_roll := public.points_secure_roll_10000();
  return query
  select public.points_wheel_prize_for_roll(v_roll), v_roll;
end;
$function$;

ALTER FUNCTION "public"."points_preview_wheel"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_push_admin_pairing()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE code text:=upper(replace(gen_random_uuid()::text,'-','')); deadline timestamptz:=clock_timestamp()+interval '15 minutes';
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.points_is_admin(),false) THEN
    RAISE EXCEPTION 'Admin required' USING errcode='42501';
  END IF;
  DELETE FROM points_push.pairings WHERE expires_at<clock_timestamp() OR created_by=auth.uid();
  INSERT INTO points_push.pairings VALUES(points_push.hash(code),auth.uid(),deadline,NULL);
  RETURN jsonb_build_object('code',code,'expiresAt',deadline);
END $function$;

ALTER FUNCTION "public"."points_push_admin_pairing"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_push_get_subscription(p_device_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE device uuid; result boolean;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT coalesce(public.points_is_admin(),false) THEN RAISE EXCEPTION 'Admin required' USING errcode='42501'; END IF;
  ELSE device:=points_access.require_device(); END IF;
  SELECT enabled INTO result FROM points_push.subscriptions
    WHERE token_hash=points_push.hash(p_device_token)
      AND (audience='admin' AND user_id=auth.uid() OR audience='guest' AND access_device_id=device);
  RETURN jsonb_build_object('enabled',coalesce(result,false));
END $function$;

ALTER FUNCTION "public"."points_push_get_subscription"(p_device_token text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_push_register(p_device_token text, p_subscription jsonb, p_public_key text, p_pairing_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE h text; a text; uid uuid:=auth.uid(); device uuid; existing points_push.subscriptions;
  v_endpoint text:=p_subscription->>'endpoint'; expected text; enabled_config boolean;
BEGIN
  IF p_device_token IS NULL OR p_device_token!~'^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid device token' USING errcode='22023'; END IF;
  SELECT enabled,public_key INTO enabled_config,expected FROM points_push.config WHERE id;
  IF NOT coalesce(enabled_config,false) OR p_public_key IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Push is not configured' USING errcode='P0001'; END IF;
  IF uid IS NOT NULL THEN
    IF NOT coalesce(public.points_is_admin(),false) THEN RAISE EXCEPTION 'Admin required' USING errcode='42501'; END IF;
    a:='admin';
  ELSE a:='guest';device:=points_access.require_device(true); END IF;
  IF v_endpoint IS NULL OR char_length(v_endpoint)>2048 OR v_endpoint!~'^https://([a-z0-9-]+\.)*push\.apple\.com/[^[:space:]]+$'
    AND v_endpoint!~'^https://fcm\.googleapis\.com/[^[:space:]]+$' AND v_endpoint!~'^https://updates\.push\.services\.mozilla\.com/[^[:space:]]+$'
    OR coalesce(p_subscription#>>'{keys,p256dh}','')!~'^[A-Za-z0-9_-]{87}=?$' OR coalesce(p_subscription#>>'{keys,auth}','')!~'^[A-Za-z0-9_-]{22}(==)?$' THEN RAISE EXCEPTION 'Invalid subscription' USING errcode='22023'; END IF;
  h:=points_push.hash(p_device_token);PERFORM pg_advisory_xact_lock(hashtextextended(h,0));
  SELECT * INTO existing FROM points_push.subscriptions WHERE token_hash=h FOR UPDATE;
  IF EXISTS(SELECT 1 FROM points_push.subscriptions WHERE endpoint=v_endpoint AND token_hash<>h) THEN RAISE EXCEPTION 'Subscription belongs to another device' USING errcode='23505'; END IF;
  INSERT INTO points_push.subscriptions(token_hash,endpoint,subscription,public_key,audience,user_id,access_device_id)
    VALUES(h,v_endpoint,jsonb_build_object('endpoint',v_endpoint,'keys',p_subscription->'keys'),expected,a,uid,device)
    ON CONFLICT(token_hash) DO UPDATE SET endpoint=excluded.endpoint,subscription=excluded.subscription,public_key=excluded.public_key,
      audience=excluded.audience,user_id=excluded.user_id,access_device_id=excluded.access_device_id,enabled=true,updated_at=clock_timestamp();
  IF existing.id IS NOT NULL AND (existing.audience<>a OR existing.endpoint<>v_endpoint OR existing.public_key<>expected OR existing.access_device_id IS DISTINCT FROM device OR existing.user_id IS DISTINCT FROM uid) THEN
    UPDATE points_push.jobs SET status='dead',finished_at=clock_timestamp() WHERE subscription_id=existing.id AND status IN ('pending','sending');
  END IF;
  RETURN jsonb_build_object('audience',a,'enabled',true);
END $function$;

ALTER FUNCTION "public"."points_push_register"(p_device_token text, p_subscription jsonb, p_public_key text, p_pairing_code text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_push_remove(p_device_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE sid uuid;
BEGIN
  IF p_device_token IS NULL OR p_device_token!~'^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid device token' USING errcode='22023'; END IF;
  UPDATE points_push.subscriptions SET enabled=false WHERE token_hash=points_push.hash(p_device_token) RETURNING id INTO sid;
  UPDATE points_push.jobs SET status='dead',finished_at=clock_timestamp() WHERE subscription_id=sid AND status IN ('pending','sending');
END $function$;

ALTER FUNCTION "public"."points_push_remove"(p_device_token text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_push_test(p_device_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE s points_push.subscriptions; a text:=points_notice.actor(); event_id bigint; batch bigint;
BEGIN
  SELECT * INTO s FROM points_push.subscriptions WHERE token_hash=points_push.hash(p_device_token) AND enabled AND audience||':'||coalesce(user_id,access_device_id)=a FOR UPDATE;
  IF s.id IS NULL OR s.tested_at>clock_timestamp()-interval '1 minute' THEN RAISE EXCEPTION 'Not subscribed or test requested too recently' USING errcode='P0001'; END IF;
  UPDATE points_push.subscriptions SET tested_at=clock_timestamp() WHERE id=s.id;
  INSERT INTO points_notice.events(event_key,audience,category,title,body,route,group_key,priority,target_actor) VALUES('test:'||gen_random_uuid(),s.audience,'security','小世界提醒已连接','这是本机测试通知。','messages','test',1,a) RETURNING id INTO event_id;
  INSERT INTO points_notice.batches(subscription_id,priority,available_at) VALUES(s.id,1,clock_timestamp()) ON CONFLICT(subscription_id,priority) WHERE status='pending' DO UPDATE SET available_at=clock_timestamp() RETURNING id INTO batch;
  INSERT INTO points_notice.batch_items VALUES(batch,event_id);PERFORM points_notice.wake();
END $function$;

ALTER FUNCTION "public"."points_push_test"(p_device_token text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_push_worker_claim()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE result jsonb;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM points_push.config WHERE id AND enabled) THEN RETURN '[]'::jsonb; END IF;
  UPDATE points_push.jobs SET status='dead',finished_at=clock_timestamp() WHERE status IN ('pending','sending') AND (expires_at<=clock_timestamp() OR attempts>=5 AND lease_until<clock_timestamp());
  DELETE FROM points_push.jobs WHERE finished_at<clock_timestamp()-interval '7 days';
  DELETE FROM points_push.pairings WHERE expires_at<clock_timestamp()-interval '1 day';
  WITH selected AS (
    SELECT j.id FROM points_push.jobs j JOIN points_push.subscriptions s ON s.id=j.subscription_id
    WHERE s.enabled AND s.public_key=(SELECT public_key FROM points_push.config WHERE id)
      AND (s.audience='guest' OR EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=s.user_id AND p.role='admin'))
      AND j.expires_at>clock_timestamp() AND j.attempts<5 AND j.available_at<=clock_timestamp()
      AND (j.status='pending' OR j.status='sending' AND j.lease_until<clock_timestamp())
    ORDER BY j.id LIMIT 20 FOR UPDATE OF j SKIP LOCKED
  ), leased AS (
    UPDATE points_push.jobs j SET status='sending',attempts=j.attempts+1,lease_until=clock_timestamp()+interval '90 seconds',lease_token=gen_random_uuid()
      FROM selected x WHERE j.id=x.id RETURNING j.*
  ) SELECT coalesce(jsonb_agg(jsonb_build_object('id',j.id,'lease',j.lease_token,'subscription',s.subscription,'payload',j.payload)),'[]'::jsonb)
      INTO result FROM leased j JOIN points_push.subscriptions s ON s.id=j.subscription_id;
  RETURN result;
END $function$;

ALTER FUNCTION "public"."points_push_worker_claim"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_push_worker_config()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT jsonb_build_object('enabled',enabled,'publicKey',public_key) FROM points_push.config WHERE id;
$function$;

ALTER FUNCTION "public"."points_push_worker_config"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_push_worker_finish(p_id bigint, p_lease uuid, p_code integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE j points_push.jobs;
BEGIN
  SELECT * INTO j FROM points_push.jobs WHERE id=p_id AND status='sending' AND lease_token=p_lease FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF p_code IN (404,410) THEN UPDATE points_push.subscriptions SET enabled=false WHERE id=j.subscription_id; END IF;
  UPDATE points_push.jobs SET last_code=p_code,
    status=CASE WHEN p_code BETWEEN 200 AND 299 THEN 'sent' WHEN p_code IN (404,410) OR attempts>=5 OR p_code BETWEEN 400 AND 499 AND p_code NOT IN (408,429) THEN 'dead' ELSE 'pending' END,
    finished_at=CASE WHEN p_code BETWEEN 200 AND 299 OR p_code IN (404,410) OR attempts>=5 OR p_code BETWEEN 400 AND 499 AND p_code NOT IN (408,429) THEN clock_timestamp() END,
    available_at=clock_timestamp()+make_interval(secs=>least(1800,30*(2^attempts)::integer)),lease_until=NULL,lease_token=NULL
    WHERE id=j.id;
END $function$;

ALTER FUNCTION "public"."points_push_worker_finish"(p_id bigint, p_lease uuid, p_code integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_push_worker_initialize(p_admin_id uuid, p_app_url text, p_backend_url text, p_public_key text, p_private_key text, p_subject text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE c points_push.config; private_id uuid; worker_id uuid; job bigint;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=p_admin_id AND role='admin') THEN RAISE EXCEPTION 'Admin required' USING errcode='42501'; END IF;
  IF p_app_url!~'^https://[^[:space:]?#@]+/$' OR p_backend_url!~'^https://[a-z0-9]+\.supabase\.co/functions/v1/points-web-push$'
    OR p_public_key!~'^[A-Za-z0-9_-]{87}$' OR p_private_key!~'^[A-Za-z0-9_-]{43}$' OR p_subject!~'^mailto:[^[:space:]@]+@[^[:space:]@]+$' THEN RAISE EXCEPTION 'Invalid configuration' USING errcode='22023'; END IF;
  SELECT * INTO c FROM points_push.config WHERE id FOR UPDATE;
  IF c.private_secret_id IS NOT NULL THEN
    IF c.app_url IS DISTINCT FROM p_app_url THEN RAISE EXCEPTION 'Existing application URL differs; review before changing' USING errcode='22023'; END IF;
    RETURN jsonb_build_object('configured',c.enabled,'publicKey',c.public_key,'appUrl',c.app_url);
  END IF;
  private_id:=vault.create_secret(p_private_key,'points_vapid_private_v1','Web Push signing private key');
  worker_id:=vault.create_secret(replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),'points_push_worker_v1','Web Push delivery authentication');
  UPDATE points_push.config SET public_key=p_public_key,app_url=p_app_url,subject=p_subject,private_secret_id=private_id,worker_secret_id=worker_id,backend_url=p_backend_url,enabled=true WHERE id;
  FOR job IN SELECT jobid FROM cron.job WHERE jobname IN ('points-kitchen-web-push','points-notice-worker') LOOP PERFORM cron.unschedule(job); END LOOP;
  BEGIN PERFORM cron.schedule('points-notice-worker','15 seconds','SELECT points_notice.tick();');
  EXCEPTION WHEN OTHERS THEN PERFORM cron.schedule('points-notice-worker','* * * * *','SELECT points_notice.tick();'); END;
  RETURN jsonb_build_object('configured',true,'publicKey',p_public_key,'appUrl',p_app_url);
END $function$;

ALTER FUNCTION "public"."points_push_worker_initialize"(p_admin_id uuid, p_app_url text, p_backend_url text, p_public_key text, p_private_key text, p_subject text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_push_worker_settings()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT jsonb_build_object('configured',c.enabled AND c.private_secret_id IS NOT NULL,'publicKey',c.public_key,'appUrl',c.app_url,'subject',c.subject,'privateKey',v.decrypted_secret,'workerSecret',w.decrypted_secret)
  FROM points_push.config c LEFT JOIN vault.decrypted_secrets v ON v.id=c.private_secret_id LEFT JOIN vault.decrypted_secrets w ON w.id=c.worker_secret_id WHERE c.id;
$function$;

ALTER FUNCTION "public"."points_push_worker_settings"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_redeem_cash()
 RETURNS TABLE(score integer, spin_chances integer, cash_balance integer, redeemed_cash integer, score_updated_at timestamp with time zone, wheel_updated_at timestamp with time zone, score_log_id bigint, wheel_log_id bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_member_id bigint;
  v_score_before integer;
  v_score_after integer;
  v_chances integer;
  v_cash_before integer;
  v_cash_after integer;
  v_now timestamptz := clock_timestamp();
  v_score_log_id bigint;
  v_wheel_log_id bigint;
begin
  if auth.uid() is not null then
    raise exception 'Guest mode required' using errcode = '42501';
  end if;

  select m.id, m.score
    into v_member_id, v_score_before
  from public.members m
  where m.active = true
  order by m.id asc
  limit 1
  for update;

  if v_member_id is null then
    raise exception 'Score object not found' using errcode = 'P0001';
  end if;

  if v_score_before < 10 then
    raise exception 'Insufficient score: at least 10 points are required'
      using errcode = 'P0001';
  end if;

  select w.spin_chances, w.cash_balance
    into v_chances, v_cash_before
  from public.points_wheel_state w
  where w.id = 1
  for update;

  v_score_after := v_score_before - 10;
  v_cash_after := v_cash_before + 30;

  update public.members
  set score = v_score_after
  where id = v_member_id;

  update public.points_wheel_state
  set cash_balance = v_cash_after,
      updated_at = v_now
  where id = 1;

  insert into public.score_logs (
    member_id, delta, reason, operator_id, created_at
  ) values (
    v_member_id, -10, '兑换 ¥30 可提现余额', null, v_now
  ) returning id into v_score_log_id;

  insert into public.points_wheel_logs (
    action, prize_amount, roll,
    chance_delta, chance_before, chance_after,
    cash_delta, cash_before, cash_after,
    reason, created_at, changed_by
  ) values (
    'cash_redeem', null, null,
    0, v_chances, v_chances,
    30, v_cash_before, v_cash_after,
    '10 分兑换 ¥30 可提现余额', v_now, null
  ) returning id into v_wheel_log_id;

  return query
  select
    v_score_after, v_chances, v_cash_after, 30,
    v_now, v_now, v_score_log_id, v_wheel_log_id;
end;
$function$;

ALTER FUNCTION "public"."points_redeem_cash"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_redeem_wheel_chance()
 RETURNS TABLE(score integer, spin_chances integer, cash_balance integer, score_updated_at timestamp with time zone, wheel_updated_at timestamp with time zone, score_log_id bigint, wheel_log_id bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_member_id bigint;
  v_score_before integer;
  v_score_after integer;
  v_chance_before integer;
  v_chance_after integer;
  v_cash integer;
  v_now timestamptz := clock_timestamp();
  v_score_log_id bigint;
  v_wheel_log_id bigint;
begin
  if auth.uid() is not null then
    raise exception 'Guest mode required' using errcode = '42501';
  end if;

  select m.id, m.score
    into v_member_id, v_score_before
  from public.members m
  where m.active = true
  order by m.id asc
  limit 1
  for update;

  if v_member_id is null then
    raise exception 'Score object not found' using errcode = 'P0001';
  end if;

  if v_score_before < 10 then
    raise exception 'Insufficient score: at least 10 points are required'
      using errcode = 'P0001';
  end if;

  select w.spin_chances, w.cash_balance
    into v_chance_before, v_cash
  from public.points_wheel_state w
  where w.id = 1
  for update;

  v_score_after := v_score_before - 10;
  v_chance_after := v_chance_before + 1;

  update public.members
  set score = v_score_after
  where id = v_member_id;

  update public.points_wheel_state
  set spin_chances = v_chance_after,
      updated_at = v_now
  where id = 1;

  insert into public.score_logs (
    member_id, delta, reason, operator_id, created_at
  ) values (
    v_member_id, -10, '兑换 1 次大转盘机会', null, v_now
  ) returning id into v_score_log_id;

  insert into public.points_wheel_logs (
    action, prize_amount, roll,
    chance_delta, chance_before, chance_after,
    cash_delta, cash_before, cash_after,
    reason, created_at, changed_by
  ) values (
    'chance_redeem', null, null,
    1, v_chance_before, v_chance_after,
    0, v_cash, v_cash,
    '10 分兑换 1 次正式大转盘机会', v_now, null
  ) returning id into v_wheel_log_id;

  return query
  select
    v_score_after, v_chance_after, v_cash,
    v_now, v_now, v_score_log_id, v_wheel_log_id;
end;
$function$;

ALTER FUNCTION "public"."points_redeem_wheel_chance"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_request_withdrawal(p_amount integer)
 RETURNS TABLE(withdrawal_id bigint, spin_chances integer, cash_balance integer, requested_amount integer, status text, requested_at timestamp with time zone, wheel_updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_chances integer;
  v_cash_before integer;
  v_cash_after integer;
  v_now timestamptz := clock_timestamp();
  v_id bigint;
begin
  if auth.uid() is not null then
    raise exception 'Guest mode required' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Withdraw amount must be greater than zero'
      using errcode = '22023';
  end if;

  select w.spin_chances, w.cash_balance
    into v_chances, v_cash_before
  from public.points_wheel_state w
  where w.id = 1
  for update;

  if p_amount > v_cash_before then
    raise exception 'Withdraw amount exceeds cash balance'
      using errcode = 'P0001';
  end if;

  v_cash_after := v_cash_before - p_amount;

  update public.points_wheel_state
  set cash_balance = v_cash_after,
      updated_at = v_now
  where id = 1;

  insert into public.points_withdrawals (
    amount, cash_before, cash_after,
    status, requested_at, requested_by
  ) values (
    p_amount, v_cash_before, v_cash_after,
    'pending', v_now, null
  ) returning id into v_id;

  return query
  select v_id, v_chances, v_cash_after, p_amount, 'pending'::text, v_now, v_now;
end;
$function$;

ALTER FUNCTION "public"."points_request_withdrawal"(p_amount integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_reset_score(p_confirm_discard boolean DEFAULT false)
 RETURNS TABLE(score integer, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_current integer;
  v_score integer;
begin
  if not coalesce(public.points_is_admin(), false) then
    raise exception 'Admin permission required' using errcode = '42501';
  end if;

  select m.score
    into v_current
  from public.members m
  where m.active = true
  order by m.id asc
  limit 1;

  if v_current is null then
    raise exception 'Score object not found' using errcode = 'P0001';
  end if;

  if v_current >= 10 and not coalesce(p_confirm_discard, false) then
    raise exception 'Discard redeemable score confirmation required'
      using errcode = 'P0001';
  end if;

  v_score := public.reset_score();
  return query select v_score, now();
end;
$function$;

ALTER FUNCTION "public"."points_reset_score"(p_confirm_discard boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_secure_roll_10000()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_uuid uuid;
  v_bytes bytea;
  v_raw integer;
begin
  loop
    v_uuid := pg_catalog.gen_random_uuid();
    v_bytes := pg_catalog.decode(
      pg_catalog.substr(pg_catalog.replace(v_uuid::text, '-', ''), 1, 4),
      'hex'
    );
    v_raw := pg_catalog.get_byte(v_bytes, 0) * 256
           + pg_catalog.get_byte(v_bytes, 1);

    if v_raw < 60000 then
      return v_raw % 10000;
    end if;
  end loop;
end;
$function$;

ALTER FUNCTION "public"."points_secure_roll_10000"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_ack_admin_grants()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_count integer;
begin
  if auth.uid() is not null then
    raise exception 'Guest mode required' using errcode='42501';
  end if;

  update public.points_shop_admin_inventory_logs
     set guest_seen_at=pg_catalog.clock_timestamp()
   where delta>0 and guest_seen_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

ALTER FUNCTION "public"."points_shop_ack_admin_grants"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_activate_challenge_v2()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_qty integer; v_active boolean; v_now timestamptz:=pg_catalog.clock_timestamp();
begin
  if auth.uid() is not null then raise exception 'Guest mode required' using errcode='42501'; end if;
  if exists(select 1 from public.points_shop_pending_spin where id=1) then raise exception 'Pending spin must be resolved first' using errcode='P0001'; end if;
  select challenge_active into v_active from public.points_shop_state where id=1 for update;
  if coalesce(v_active,false) then raise exception 'Triple challenge already active' using errcode='P0001'; end if;
  select quantity into v_qty from public.points_shop_inventory where item_code='triple_challenge' for update;
  if coalesce(v_qty,0)<=0 then raise exception 'No triple challenge inventory available' using errcode='P0001'; end if;
  update public.points_shop_inventory set quantity=quantity-1,updated_at=v_now where item_code='triple_challenge';
  update public.points_shop_state set challenge_active=true,challenge_spins_done=0,challenge_hits=0,updated_at=v_now where id=1;
  return public.points_shop_state_json_v2();
end;
$function$;

ALTER FUNCTION "public"."points_shop_activate_challenge_v2"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_activate_lucky100()
 RETURNS TABLE(score integer, inventory jsonb, weekly_counts jsonb, equipped_one_shot text, lucky100_remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_remaining integer;
  v_qty integer;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if auth.uid() is not null then
    raise exception 'Guest mode required'
      using errcode = '42501';
  end if;

  select s.lucky100_remaining
    into v_remaining
  from public.points_shop_state s
  where s.id = 1
  for update;

  if not found then
    raise exception 'Shop state singleton not found'
      using errcode = 'P0001';
  end if;

  if coalesce(v_remaining, 0) > 0 then
    raise exception 'Lucky potion already active'
      using errcode = 'P0001';
  end if;

  select i.quantity
    into v_qty
  from public.points_shop_inventory i
  where i.item_code = 'lucky100'
  for update;

  if coalesce(v_qty, 0) <= 0 then
    raise exception 'No lucky potion inventory available'
      using errcode = 'P0001';
  end if;

  update public.points_shop_inventory i
     set quantity = i.quantity - 1,
         updated_at = v_now
   where i.item_code = 'lucky100';

  update public.points_shop_state s
     set lucky100_remaining = 5,
         updated_at = v_now
   where s.id = 1;

  return query
  select *
  from public.points_shop_get_state();
end;
$function$;

ALTER FUNCTION "public"."points_shop_activate_lucky100"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_activate_lucky100_v2()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_qty integer; v_rem integer; v_selected text; v_now timestamptz:=pg_catalog.clock_timestamp();
begin
  if auth.uid() is not null then raise exception 'Guest mode required' using errcode='42501'; end if;
  if exists(select 1 from public.points_shop_pending_spin where id=1) then raise exception 'Pending spin must be resolved first' using errcode='P0001'; end if;
  select lucky100_remaining,equipped_one_shot into v_rem,v_selected from public.points_shop_state where id=1 for update;
  if coalesce(v_rem,0)>0 then raise exception 'Lucky potion already active' using errcode='P0001'; end if;
  if v_selected='no10' then raise exception 'No10 cannot stack with lucky100' using errcode='P0001'; end if;
  select quantity into v_qty from public.points_shop_inventory where item_code='lucky100' for update;
  if coalesce(v_qty,0)<=0 then raise exception 'No lucky potion inventory available' using errcode='P0001'; end if;
  update public.points_shop_inventory set quantity=quantity-1,updated_at=v_now where item_code='lucky100';
  update public.points_shop_state set lucky100_remaining=5,updated_at=v_now where id=1;
  return public.points_shop_state_json_v2();
end;
$function$;

ALTER FUNCTION "public"."points_shop_activate_lucky100_v2"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_claim_weekly_mystery_box()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_week date := public.points_shop_current_week_start();
  v_claimed timestamptz;
  v_grant text;
  v_state jsonb;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if auth.uid() is not null then
    raise exception 'Guest mode required' using errcode='42501';
  end if;

  perform public.points_shop_ensure_weekly_feature_v3();

  select f.discount_claimed_at
    into v_claimed
  from public.points_shop_weekly_feature f
  where f.week_start=v_week and f.item_code='mystery_box'
  for update;

  if not found then
    raise exception 'Weekly mystery gift not found' using errcode='P0001';
  end if;

  if v_claimed is not null then
    raise exception 'Weekly mystery gift already claimed' using errcode='P0001';
  end if;

  update public.points_shop_weekly_feature
     set discount_claimed_at=v_now
   where week_start=v_week and item_code='mystery_box';

  v_grant := public.points_shop_grant_mystery_reward('weekly_free');
  v_state := public.points_shop_state_json_v2();

  return v_state || pg_catalog.jsonb_build_object(
    'weekly_gift_claimed',true,
    'granted_item_code',v_grant
  );
end;
$function$;

ALTER FUNCTION "public"."points_shop_claim_weekly_mystery_box"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_current_week_start()
 RETURNS date
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select pg_catalog.date_trunc('week', pg_catalog.now() at time zone 'Asia/Shanghai')::date;
$function$;

ALTER FUNCTION "public"."points_shop_current_week_start"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_ensure_weekly_feature_v3()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_week date := public.points_shop_current_week_start();
  v_code text;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('points_shop_weekly_feature_v4'),
    pg_catalog.hashtext(v_week::text)
  );

  insert into public.points_shop_weekly_feature(
    week_start,item_code,discount_claimed_at,created_at
  ) values (
    v_week,'mystery_box',null,pg_catalog.clock_timestamp()
  )
  on conflict (week_start) do update
     set item_code = 'mystery_box',
         discount_claimed_at = case
           when public.points_shop_weekly_feature.item_code = 'mystery_box'
             then public.points_shop_weekly_feature.discount_claimed_at
           else null
         end;

  select f.item_code into v_code
  from public.points_shop_weekly_feature f
  where f.week_start = v_week;

  return v_code;
end;
$function$;

ALTER FUNCTION "public"."points_shop_ensure_weekly_feature_v3"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_get_state()
 RETURNS TABLE(score integer, inventory jsonb, weekly_counts jsonb, equipped_one_shot text, lucky100_remaining integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with active_member as (
    select m.score
    from public.members m
    where m.active = true
    order by m.id asc
    limit 1
  ),
  inv as (
    select
      coalesce(
        pg_catalog.jsonb_object_agg(i.item_code, i.quantity),
        '{}'::jsonb
      ) as data
    from public.points_shop_inventory i
  ),
  weekly as (
    select
      coalesce(
        pg_catalog.jsonb_object_agg(x.item_code, x.cnt),
        '{}'::jsonb
      ) as data
    from (
      select
        l.item_code,
        pg_catalog.count(*)::integer as cnt
      from public.points_shop_purchase_logs l
      where l.week_start = public.points_shop_current_week_start()
      group by l.item_code
    ) x
  )
  select
    coalesce(m.score, 0)::integer,
    inv.data,
    weekly.data,
    s.equipped_one_shot,
    s.lucky100_remaining
  from public.points_shop_state s
  cross join inv
  cross join weekly
  left join active_member m on true
  where s.id = 1;
$function$;

ALTER FUNCTION "public"."points_shop_get_state"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_get_state_v2()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform public.points_shop_ensure_weekly_feature_v3();
  return public.points_shop_state_json_v2();
end;
$function$;

ALTER FUNCTION "public"."points_shop_get_state_v2"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_get_unseen_admin_grants()
 RETURNS TABLE(id bigint, item_code text, delta integer, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select l.id,l.item_code,l.delta,l.created_at
  from public.points_shop_admin_inventory_logs l
  where auth.uid() is null
    and l.delta>0
    and l.guest_seen_at is null
  order by l.created_at asc,l.id asc;
$function$;

ALTER FUNCTION "public"."points_shop_get_unseen_admin_grants"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_grant_mystery_reward(p_source text DEFAULT 'mystery_box'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_roll integer;
  v_grant text;
  v_chance_before integer;
  v_chance_after integer;
  v_cash integer;
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_free_pool boolean := coalesce(p_source,'') in ('weekly_free','admin_free_inventory');
begin
  v_roll := public.points_secure_roll_10000();

  if v_free_pool then
    /* 免费池：弱道具权重更高，正式转盘券仍保留 1%。 */
    v_grant := case
      when v_roll < 1300 then 'wish'                -- 13%
      when v_roll < 3000 then 'no10'                -- 17%
      when v_roll < 4500 then 'return10'            -- 15%
      when v_roll < 5100 then 'lucky100'            -- 6%
      when v_roll < 6400 then 'triple_challenge'    -- 13%
      when v_roll < 7200 then 'heartbeat'           -- 8%
      when v_roll < 8300 then 'shield30'            -- 11%
      when v_roll < 8800 then 'upgrade'             -- 5%
      when v_roll < 9200 then 'double_pick'         -- 4%
      when v_roll < 9900 then 'restart'             -- 7%
      else 'wheel_ticket'                            -- 1%
    end;
  else
    /* 常规池：保持 v4 原始概率不变。 */
    v_grant := case
      when v_roll < 1350 then 'wish'                -- 13.5%
      when v_roll < 2700 then 'no10'                -- 13.5%
      when v_roll < 4050 then 'return10'            -- 13.5%
      when v_roll < 5000 then 'lucky100'            -- 9.5%
      when v_roll < 5950 then 'triple_challenge'    -- 9.5%
      when v_roll < 6900 then 'heartbeat'           -- 9.5%
      when v_roll < 7650 then 'shield30'            -- 7.5%
      when v_roll < 8400 then 'upgrade'             -- 7.5%
      when v_roll < 9150 then 'double_pick'         -- 7.5%
      when v_roll < 9900 then 'restart'             -- 7.5%
      else 'wheel_ticket'                            -- 1%
    end;
  end if;

  if v_grant='wheel_ticket' then
    select w.spin_chances,w.cash_balance
      into v_chance_before,v_cash
    from public.points_wheel_state w
    where w.id=1
    for update;

    if v_chance_before is null then
      raise exception 'Wheel state not found' using errcode='P0001';
    end if;

    v_chance_after := v_chance_before+1;

    update public.points_wheel_state
       set spin_chances=v_chance_after,
           updated_at=v_now
     where id=1;

    insert into public.points_wheel_logs(
      action,prize_amount,roll,
      chance_delta,chance_before,chance_after,
      cash_delta,cash_before,cash_after,
      reason,created_at,changed_by
    ) values(
      'chance_redeem',null,null,
      1,v_chance_before,v_chance_after,
      0,v_cash,v_cash,
      case p_source
        when 'weekly_free' then '每周免费幸运盲盒 · 获得正式转盘券'
        when 'admin_free_inventory' then '管理员发放免费幸运盲盒 · 获得正式转盘券'
        when 'admin_inventory' then '管理员发放幸运盲盒 · 获得正式转盘券'
        else '幸运盲盒 · 获得正式转盘券'
      end,
      v_now,null
    );
  else
    update public.points_shop_inventory
       set quantity=quantity+1,
           updated_at=v_now
     where item_code=v_grant;

    if not found then
      raise exception 'Mystery grant inventory row missing: %',v_grant using errcode='P0001';
    end if;
  end if;

  return v_grant;
end;
$function$;

ALTER FUNCTION "public"."points_shop_grant_mystery_reward"(p_source text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_open_free_mystery_box()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_qty integer;
  v_grant text;
  v_state jsonb;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if auth.uid() is not null then
    raise exception 'Guest mode required' using errcode='42501';
  end if;

  select i.quantity
    into v_qty
  from public.points_shop_inventory i
  where i.item_code='free_mystery_box'
  for update;

  if coalesce(v_qty,0) <= 0 then
    raise exception 'No free mystery box inventory available' using errcode='P0001';
  end if;

  update public.points_shop_inventory
     set quantity=quantity-1,
         updated_at=v_now
   where item_code='free_mystery_box';

  v_grant := public.points_shop_grant_mystery_reward('admin_free_inventory');
  v_state := public.points_shop_state_json_v2();

  return v_state || pg_catalog.jsonb_build_object(
    'opened_free_mystery_box',true,
    'granted_item_code',v_grant
  );
end;
$function$;

ALTER FUNCTION "public"."points_shop_open_free_mystery_box"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_open_mystery_box()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_qty integer;
  v_grant text;
  v_state jsonb;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if auth.uid() is not null then
    raise exception 'Guest mode required' using errcode='42501';
  end if;

  select i.quantity into v_qty
  from public.points_shop_inventory i
  where i.item_code='mystery_box'
  for update;

  if coalesce(v_qty,0) <= 0 then
    raise exception 'No mystery box inventory available' using errcode='P0001';
  end if;

  update public.points_shop_inventory
     set quantity=quantity-1,updated_at=v_now
   where item_code='mystery_box';

  v_grant := public.points_shop_grant_mystery_reward('admin_inventory');
  v_state := public.points_shop_state_json_v2();

  return v_state || pg_catalog.jsonb_build_object(
    'opened_mystery_box',true,
    'granted_item_code',v_grant
  );
end;
$function$;

ALTER FUNCTION "public"."points_shop_open_mystery_box"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_prepare_spin_v2(p_item_code text DEFAULT NULL::text, p_param integer DEFAULT NULL::integer, p_activate_potion boolean DEFAULT false, p_activate_challenge boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_code text:=nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_item_code,''))),'');
  v_qty integer;v_lucky integer;v_active boolean;v_now timestamptz:=pg_catalog.clock_timestamp();
begin
  if auth.uid() is not null then raise exception 'Guest mode required' using errcode='42501'; end if;
  if exists(select 1 from public.points_shop_pending_spin where id=1) then raise exception 'Pending spin must be resolved first' using errcode='P0001'; end if;

  select lucky100_remaining,challenge_active into v_lucky,v_active from public.points_shop_state where id=1 for update;
  if v_code is not null and v_code not in ('shield30','upgrade','double_pick','restart','wish','no10','return10') then
    raise exception 'Unsupported one-shot item: %',v_code using errcode='22023';
  end if;
  if v_code='wish' and p_param not in (10,20,30,50,60,80,100) then raise exception 'Wish target is required' using errcode='22023'; end if;
  if v_code is distinct from 'wish' and p_param is not null then raise exception 'Unexpected item parameter' using errcode='22023'; end if;
  if v_code='no10' and (coalesce(v_lucky,0)>0 or coalesce(p_activate_potion,false)) then raise exception 'No10 cannot stack with lucky100' using errcode='P0001'; end if;

  if v_code is not null then
    select quantity into v_qty from public.points_shop_inventory where item_code=v_code for update;
    if coalesce(v_qty,0)<=0 then raise exception 'No inventory available for %',v_code using errcode='P0001'; end if;
  end if;

  if coalesce(p_activate_potion,false) then
    if coalesce(v_lucky,0)>0 then raise exception 'Lucky potion already active' using errcode='P0001'; end if;
    select quantity into v_qty from public.points_shop_inventory where item_code='lucky100' for update;
    if coalesce(v_qty,0)<=0 then raise exception 'No lucky potion inventory available' using errcode='P0001'; end if;
    update public.points_shop_inventory set quantity=quantity-1,updated_at=v_now where item_code='lucky100';
    v_lucky:=5;
  end if;

  if coalesce(p_activate_challenge,false) then
    if coalesce(v_active,false) then raise exception 'Triple challenge already active' using errcode='P0001'; end if;
    select quantity into v_qty from public.points_shop_inventory where item_code='triple_challenge' for update;
    if coalesce(v_qty,0)<=0 then raise exception 'No triple challenge inventory available' using errcode='P0001'; end if;
    update public.points_shop_inventory set quantity=quantity-1,updated_at=v_now where item_code='triple_challenge';
    v_active:=true;
    update public.points_shop_state set challenge_spins_done=0,challenge_hits=0 where id=1;
  end if;

  update public.points_shop_state
     set equipped_one_shot=v_code,
         equipped_param=case when v_code='wish' then p_param else null end,
         lucky100_remaining=coalesce(v_lucky,0),
         challenge_active=coalesce(v_active,false),
         updated_at=v_now
   where id=1;
  return public.points_shop_state_json_v2();
end;
$function$;

ALTER FUNCTION "public"."points_shop_prepare_spin_v2"(p_item_code text, p_param integer, p_activate_potion boolean, p_activate_challenge boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_prize_for_roll(p_roll integer, p_lucky100 boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v10 integer;
  v20 integer;
  v30 integer;
  v50 integer;
  v60 integer;
  v80 integer;
  v100 integer;
  v_shift integer := 0;
begin
  if p_roll is null or p_roll < 0 or p_roll > 9999 then
    return null;
  end if;

  if not coalesce(p_lucky100, false) then
    return public.points_wheel_prize_for_roll(p_roll);
  end if;

  select
    c.p10,
    c.p20,
    c.p30,
    c.p50,
    c.p60,
    c.p80,
    c.p100
  into
    v10,
    v20,
    v30,
    v50,
    v60,
    v80,
    v100
  from public.points_wheel_probability_v2 c
  where c.id = 1;

  if not found then
    raise exception 'Wheel probability singleton not found'
      using errcode = 'P0001';
  end if;

  /*
     当前库 p10=1000，所以固定完整转移 200bp。
     若未来管理员把 p10 改到不足 2%，这里最多只转移现有 p10，
     保证总概率仍为 10000bp，绝不产生负概率。
  */
  v_shift := least(200, greatest(v10, 0));
  v10 := v10 - v_shift;
  v100 := v100 + v_shift;

  if p_roll < v10 then
    return 10;
  elsif p_roll < v10 + v20 then
    return 20;
  elsif p_roll < v10 + v20 + v30 then
    return 30;
  elsif p_roll < v10 + v20 + v30 + v50 then
    return 50;
  elsif p_roll < v10 + v20 + v30 + v50 + v60 then
    return 60;
  elsif p_roll < v10 + v20 + v30 + v50 + v60 + v80 then
    return 80;
  else
    return 100;
  end if;
end;
$function$;

ALTER FUNCTION "public"."points_shop_prize_for_roll"(p_roll integer, p_lucky100 boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_prize_for_roll_v2(p_roll integer, p_lucky100 boolean DEFAULT false, p_no10 boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v10 integer;v20 integer;v30 integer;v50 integer;v60 integer;v80 integer;v100 integer;
  v_shift integer:=0; v_non10 integer; v_add20 integer;v_add30 integer;v_add50 integer;v_add60 integer;v_add80 integer;v_used integer;
begin
  if p_roll is null or p_roll<0 or p_roll>9999 then return null; end if;
  if coalesce(p_lucky100,false) and coalesce(p_no10,false) then raise exception 'Probability tools conflict' using errcode='P0001'; end if;
  select p10,p20,p30,p50,p60,p80,p100 into v10,v20,v30,v50,v60,v80,v100 from public.points_wheel_probability_v2 where id=1;
  if not found then raise exception 'Wheel probability singleton not found' using errcode='P0001'; end if;

  if coalesce(p_lucky100,false) then
    v_shift:=least(200,greatest(v10,0));
    v10:=v10-v_shift; v100:=v100+v_shift;
  elsif coalesce(p_no10,false) then
    v_shift:=least(1000,greatest(v10,0));
    v10:=v10-v_shift;
    v_non10:=v20+v30+v50+v60+v80+v100;
    if v_shift>0 and v_non10>0 then
      v_add20:=pg_catalog.floor(v_shift::numeric*v20/v_non10)::integer;
      v_add30:=pg_catalog.floor(v_shift::numeric*v30/v_non10)::integer;
      v_add50:=pg_catalog.floor(v_shift::numeric*v50/v_non10)::integer;
      v_add60:=pg_catalog.floor(v_shift::numeric*v60/v_non10)::integer;
      v_add80:=pg_catalog.floor(v_shift::numeric*v80/v_non10)::integer;
      v_used:=v_add20+v_add30+v_add50+v_add60+v_add80;
      v20:=v20+v_add20;v30:=v30+v_add30;v50:=v50+v_add50;v60:=v60+v_add60;v80:=v80+v_add80;
      v100:=v100+(v_shift-v_used);
    end if;
  end if;

  if p_roll<v10 then return 10;
  elsif p_roll<v10+v20 then return 20;
  elsif p_roll<v10+v20+v30 then return 30;
  elsif p_roll<v10+v20+v30+v50 then return 50;
  elsif p_roll<v10+v20+v30+v50+v60 then return 60;
  elsif p_roll<v10+v20+v30+v50+v60+v80 then return 80;
  else return 100; end if;
end;
$function$;

ALTER FUNCTION "public"."points_shop_prize_for_roll_v2"(p_roll integer, p_lucky100 boolean, p_no10 boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_purchase(p_item_code text)
 RETURNS TABLE(item_code text, score integer, inventory jsonb, weekly_counts jsonb, equipped_one_shot text, lucky100_remaining integer, spin_chances integer, cash_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_code text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_item_code, '')));
  v_price integer;
  v_weekly_limit integer;
  v_week_start date := public.points_shop_current_week_start();
  v_weekly_count integer := 0;

  v_member_id bigint;
  v_score_before integer;
  v_score_after integer;

  v_now timestamptz := pg_catalog.clock_timestamp();
  v_reason text;
  v_dummy integer;
begin
  if auth.uid() is not null then
    raise exception 'Guest mode required'
      using errcode = '42501';
  end if;

  select x.price, x.weekly_limit
    into v_price, v_weekly_limit
  from (
    values
      ('wheel_ticket'::text, 10, 0),
      ('cash_box'::text,     10, 0),
      ('shield30'::text,      2, 2),
      ('upgrade'::text,       3, 1),
      ('double_pick'::text,   3, 1),
      ('lucky100'::text,      2, 1)
  ) as x(code, price, weekly_limit)
  where x.code = v_code;

  if v_price is null then
    raise exception 'Unknown shop item: %', v_code
      using errcode = '22023';
  end if;

  /* 同商品 + 同一周串行检查，防止极端并发突破周限购。 */
  if v_weekly_limit > 0 then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtext('points_shop_purchase'),
      pg_catalog.hashtext(v_code || ':' || v_week_start::text)
    );

    select pg_catalog.count(*)::integer
      into v_weekly_count
    from public.points_shop_purchase_logs l
    where l.item_code = v_code
      and l.week_start = v_week_start;

    if v_weekly_count >= v_weekly_limit then
      raise exception 'Weekly limit reached for %', v_code
        using errcode = 'P0001';
    end if;
  end if;

  if v_code = 'wheel_ticket' then
    select r.score
      into v_dummy
    from public.points_redeem_wheel_chance() r;

  elsif v_code = 'cash_box' then
    select r.score
      into v_dummy
    from public.points_redeem_cash() r;

  else
    select m.id, m.score
      into v_member_id, v_score_before
    from public.members m
    where m.active = true
    order by m.id asc
    limit 1
    for update;

    if v_member_id is null then
      raise exception 'Score object not found'
        using errcode = 'P0001';
    end if;

    if v_score_before < v_price then
      raise exception 'Insufficient score: at least % points are required', v_price
        using errcode = 'P0001';
    end if;

    v_score_after := v_score_before - v_price;

    v_reason := case v_code
      when 'shield30' then '积分商城 · 兑换小幸运护盾'
      when 'upgrade' then '积分商城 · 兑换奖励升级卡'
      when 'double_pick' then '积分商城 · 兑换命运二选一'
      when 'lucky100' then '积分商城 · 兑换百元幸运药水'
      else '积分商城 · 兑换道具'
    end;

    update public.members m
       set score = v_score_after
     where m.id = v_member_id;

    insert into public.score_logs (
      member_id,
      delta,
      reason,
      operator_id,
      created_at
    )
    values (
      v_member_id,
      -v_price,
      v_reason,
      null,
      v_now
    );

    update public.points_shop_inventory i
       set quantity = i.quantity + 1,
           updated_at = v_now
     where i.item_code = v_code;

    if not found then
      raise exception 'Shop inventory row missing for %', v_code
        using errcode = 'P0001';
    end if;
  end if;

  insert into public.points_shop_purchase_logs (
    item_code,
    price,
    week_start,
    created_at
  )
  values (
    v_code,
    v_price,
    v_week_start,
    v_now
  );

  return query
  select
    v_code,
    s.score,
    s.inventory,
    s.weekly_counts,
    s.equipped_one_shot,
    s.lucky100_remaining,
    w.spin_chances,
    w.cash_balance
  from public.points_shop_get_state() s
  cross join public.points_wheel_state w
  where w.id = 1;
end;
$function$;

ALTER FUNCTION "public"."points_shop_purchase"(p_item_code text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_purchase_v2(p_item_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_code text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_item_code,'')));
  v_price integer;
  v_limit integer;
  v_week date := public.points_shop_current_week_start();
  v_count integer;
  v_member_id bigint;
  v_score integer;
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_reason text;
  v_dummy integer;
  v_grant text := null;
  v_state jsonb;
begin
  if auth.uid() is not null then raise exception 'Guest mode required' using errcode='42501'; end if;

  select x.price,x.weekly_limit into v_price,v_limit
  from (values
    ('wheel_ticket'::text,10,0),('cash_box',10,0),
    ('shield30',3,2),('upgrade',3,1),('double_pick',3,1),('lucky100',2,1),
    ('restart',3,2),('wish',1,2),('triple_challenge',2,1),('no10',1,2),
    ('return10',1,2),('heartbeat',2,2),('mystery_box',2,5)
  ) x(code,price,weekly_limit)
  where x.code=v_code;

  if v_price is null then
    raise exception 'Unknown shop item: %',v_code using errcode='22023';
  end if;

  perform public.points_shop_ensure_weekly_feature_v3();

  if v_limit>0 then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtext('points_shop_purchase_v4'),
      pg_catalog.hashtext(v_code||':'||v_week::text)
    );

    select pg_catalog.count(*)::integer into v_count
    from public.points_shop_purchase_logs l
    where l.item_code=v_code and l.week_start=v_week;

    if v_count>=v_limit then
      raise exception 'Weekly limit reached for %',v_code using errcode='P0001';
    end if;
  end if;

  if v_code='wheel_ticket' then
    select r.score into v_dummy from public.points_redeem_wheel_chance() r;
  elsif v_code='cash_box' then
    select r.score into v_dummy from public.points_redeem_cash() r;
  else
    select m.id,m.score into v_member_id,v_score
    from public.members m
    where m.active=true
    order by m.id asc
    limit 1
    for update;

    if v_member_id is null then
      raise exception 'Score object not found' using errcode='P0001';
    end if;
    if v_score<v_price then
      raise exception 'Insufficient score: at least % points are required',v_price using errcode='P0001';
    end if;

    update public.members set score=v_score-v_price where id=v_member_id;

    v_reason := case v_code
      when 'shield30' then '积分商城 · 兑换小幸运护盾'
      when 'upgrade' then '积分商城 · 兑换奖励升级卡'
      when 'double_pick' then '积分商城 · 兑换命运二选一'
      when 'lucky100' then '积分商城 · 兑换百元幸运药水'
      when 'restart' then '积分商城 · 兑换命运重启卡'
      when 'wish' then '积分商城 · 兑换许愿卡'
      when 'triple_challenge' then '积分商城 · 兑换三连挑战卡'
      when 'no10' then '积分商城 · 兑换十元退散卡'
      when 'return10' then '积分商城 · 兑换幸运返场卡'
      when 'heartbeat' then '积分商城 · 兑换心跳翻倍卡'
      when 'mystery_box' then '积分商城 · 兑换幸运盲盒'
      else '积分商城 · 兑换道具'
    end;

    insert into public.score_logs(member_id,delta,reason,operator_id,created_at)
    values(v_member_id,-v_price,v_reason,null,v_now);

    if v_code='mystery_box' then
      v_grant := public.points_shop_grant_mystery_reward('purchase');
    else
      update public.points_shop_inventory
         set quantity=quantity+1,updated_at=v_now
       where item_code=v_code;
      if not found then
        raise exception 'Shop inventory row missing for %',v_code using errcode='P0001';
      end if;
    end if;
  end if;

  insert into public.points_shop_purchase_logs(item_code,price,week_start,created_at)
  values(v_code,v_price,v_week,v_now);

  v_state := public.points_shop_state_json_v2();
  return v_state || pg_catalog.jsonb_build_object(
    'purchased_item_code',v_code,
    'granted_item_code',v_grant,
    'base_price',v_price,
    'charged_price',v_price,
    'weekly_feature_discount_applied',false
  );
end;
$function$;

ALTER FUNCTION "public"."points_shop_purchase_v2"(p_item_code text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_resolve_pending_spin_v2(p_choice text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_choice text:=pg_catalog.lower(pg_catalog.btrim(coalesce(p_choice,'')));
  v_type text;v_chance_before integer;v_roll1 integer;v_prize1 integer;v_lucky boolean;
  v_roll2 integer:=null;v_prize2 integer:=null;v_visual integer;v_payout integer;v_modifier text:=null;v_decision_choice text;v_qty integer;v_coin integer;
begin
  if auth.uid() is not null then raise exception 'Guest mode required' using errcode='42501'; end if;
  select pending_type,chance_before,initial_roll,initial_prize,lucky100_applied
    into v_type,v_chance_before,v_roll1,v_prize1,v_lucky
  from public.points_shop_pending_spin where id=1 for update;
  if not found then raise exception 'No pending spin' using errcode='P0001'; end if;
  v_visual:=v_prize1;v_payout:=v_prize1;

  if v_type='restart' then
    if v_choice not in ('accept','reroll') then raise exception 'Invalid restart choice' using errcode='22023'; end if;
    v_modifier:='restart';
    if v_choice='reroll' then
      v_roll2:=public.points_secure_roll_10000();
      v_prize2:=public.points_shop_prize_for_roll_v2(v_roll2,v_lucky,false);
      v_visual:=v_prize2;v_payout:=v_prize2;v_decision_choice:='reroll';
    else
      v_decision_choice:='accept';
    end if;
  elsif v_type='heartbeat' then
    if v_choice not in ('accept','risk') then raise exception 'Invalid heartbeat choice' using errcode='22023'; end if;
    if v_choice='risk' then
      select quantity into v_qty from public.points_shop_inventory where item_code='heartbeat' for update;
      if coalesce(v_qty,0)<=0 then raise exception 'No heartbeat inventory available' using errcode='P0001'; end if;
      update public.points_shop_inventory set quantity=quantity-1,updated_at=pg_catalog.clock_timestamp() where item_code='heartbeat';
      v_modifier:='heartbeat';
      v_coin:=public.points_secure_roll_10000();
      if v_coin<5000 then v_payout:=v_prize1*2;v_decision_choice:='risk_win';
      else v_payout:=v_prize1/2;v_decision_choice:='risk_lose'; end if;
    else
      v_decision_choice:='accept';
    end if;
  else
    raise exception 'Unknown pending type' using errcode='P0001';
  end if;

  delete from public.points_shop_pending_spin where id=1;
  return public.points_shop_settle_spin_v2(
    v_chance_before,true,v_roll1,v_prize1,v_roll2,v_prize2,v_visual,v_payout,v_modifier,null,v_lucky,false,v_type,v_decision_choice,false
  );
end;
$function$;

ALTER FUNCTION "public"."points_shop_resolve_pending_spin_v2"(p_choice text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_set_equipped(p_item_code text DEFAULT NULL::text)
 RETURNS TABLE(score integer, inventory jsonb, weekly_counts jsonb, equipped_one_shot text, lucky100_remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_code text :=
    nullif(
      pg_catalog.lower(pg_catalog.btrim(coalesce(p_item_code, ''))),
      ''
    );
  v_qty integer;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if auth.uid() is not null then
    raise exception 'Guest mode required'
      using errcode = '42501';
  end if;

  if v_code is not null
     and v_code not in ('shield30', 'upgrade', 'double_pick') then
    raise exception 'Unsupported one-shot item: %', v_code
      using errcode = '22023';
  end if;

  /* 锁 singleton，保证本次选择更新有明确顺序。 */
  perform 1
  from public.points_shop_state s
  where s.id = 1
  for update;

  if not found then
    raise exception 'Shop state singleton not found'
      using errcode = 'P0001';
  end if;

  if v_code is not null then
    select i.quantity
      into v_qty
    from public.points_shop_inventory i
    where i.item_code = v_code
    for update;

    if coalesce(v_qty, 0) <= 0 then
      raise exception 'No inventory available for %', v_code
        using errcode = 'P0001';
    end if;
  end if;

  update public.points_shop_state s
     set equipped_one_shot = v_code,
         updated_at = v_now
   where s.id = 1;

  return query
  select *
  from public.points_shop_get_state();
end;
$function$;

ALTER FUNCTION "public"."points_shop_set_equipped"(p_item_code text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_set_selection_v2(p_item_code text DEFAULT NULL::text, p_param integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_code text := nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_item_code,''))),'');
  v_qty integer;
  v_lucky integer;
begin
  if auth.uid() is not null then raise exception 'Guest mode required' using errcode='42501'; end if;
  if exists(select 1 from public.points_shop_pending_spin where id=1) then raise exception 'Pending spin must be resolved first' using errcode='P0001'; end if;
  if v_code is not null and v_code not in ('shield30','upgrade','double_pick','restart','wish','no10','return10') then
    raise exception 'Unsupported one-shot item: %',v_code using errcode='22023';
  end if;
  if v_code='wish' and p_param not in (10,20,30,50,60,80,100) then
    raise exception 'Wish target is required' using errcode='22023';
  end if;
  if v_code is distinct from 'wish' and p_param is not null then
    raise exception 'Unexpected item parameter' using errcode='22023';
  end if;
  if v_code is not null then
    select quantity into v_qty from public.points_shop_inventory where item_code=v_code for update;
    if coalesce(v_qty,0)<=0 then raise exception 'No inventory available for %',v_code using errcode='P0001'; end if;
  end if;
  if v_code='no10' then
    select lucky100_remaining into v_lucky from public.points_shop_state where id=1 for update;
    if coalesce(v_lucky,0)>0 then raise exception 'No10 cannot stack with lucky100' using errcode='P0001'; end if;
  end if;
  update public.points_shop_state
     set equipped_one_shot=v_code,equipped_param=case when v_code='wish' then p_param else null end,updated_at=pg_catalog.clock_timestamp()
   where id=1;
  return public.points_shop_state_json_v2();
end;
$function$;

ALTER FUNCTION "public"."points_shop_set_selection_v2"(p_item_code text, p_param integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_settle_spin_v2(p_chance_before integer, p_reserved boolean, p_roll1 integer, p_prize1 integer, p_roll2 integer, p_prize2 integer, p_visual_prize integer, p_payout integer, p_modifier text, p_wish_target integer, p_lucky_applied boolean, p_refund_chance boolean, p_decision_type text, p_decision_choice text, p_consume_modifier boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_now timestamptz:=pg_catalog.clock_timestamp();
  v_chance_current integer;v_chance_after integer;
  v_cash_before integer;v_cash_after integer;
  v_item_qty integer;
  v_lucky_before integer;v_lucky_after integer;
  v_challenge_active boolean;v_done integer;v_hits integer;v_new_done integer;v_new_hits integer;
  v_challenge_completed boolean:=false;v_challenge_won boolean:=false;v_challenge_bonus integer:=0;
  v_bonus integer:=greatest(coalesce(p_payout,0)-coalesce(p_visual_prize,0),0);
  v_log_id bigint;v_log_roll integer;v_reason text:='正式转动大转盘';
begin
  select spin_chances,cash_balance into v_chance_current,v_cash_before from public.points_wheel_state where id=1 for update;
  if not found then raise exception 'Wheel state singleton not found' using errcode='P0001'; end if;

  if coalesce(p_reserved,false) then
    v_chance_after:=v_chance_current;
  else
    if v_chance_current<=0 then raise exception 'No wheel chance available' using errcode='P0001'; end if;
    v_chance_after:=v_chance_current-1+case when coalesce(p_refund_chance,false) then 1 else 0 end;
  end if;

  if coalesce(p_consume_modifier,false) and p_modifier is not null then
    select quantity into v_item_qty from public.points_shop_inventory where item_code=p_modifier for update;
    if coalesce(v_item_qty,0)<=0 then raise exception 'Selected shop item disappeared before settlement' using errcode='P0001'; end if;
    update public.points_shop_inventory set quantity=quantity-1,updated_at=v_now where item_code=p_modifier;
  end if;

  select lucky100_remaining,challenge_active,challenge_spins_done,challenge_hits
    into v_lucky_before,v_challenge_active,v_done,v_hits
  from public.points_shop_state where id=1 for update;

  v_lucky_after:=case when coalesce(p_lucky_applied,false) then greatest(coalesce(v_lucky_before,0)-1,0) else coalesce(v_lucky_before,0) end;

  if coalesce(v_challenge_active,false) then
    v_new_done:=coalesce(v_done,0)+1;
    v_new_hits:=coalesce(v_hits,0)+case when p_payout>=50 then 1 else 0 end;
    if v_new_done>=3 then
      v_challenge_completed:=true;
      v_challenge_won:=v_new_hits>=2;
      v_challenge_bonus:=case when v_challenge_won then 20 else 0 end;
      update public.points_shop_state
         set challenge_active=false,challenge_spins_done=0,challenge_hits=0,lucky100_remaining=v_lucky_after,
             equipped_one_shot=null,equipped_param=null,updated_at=v_now
       where id=1;
    else
      update public.points_shop_state
         set challenge_spins_done=v_new_done,challenge_hits=v_new_hits,lucky100_remaining=v_lucky_after,
             equipped_one_shot=null,equipped_param=null,updated_at=v_now
       where id=1;
    end if;
  else
    v_new_done:=0;v_new_hits:=0;
    update public.points_shop_state
       set lucky100_remaining=v_lucky_after,equipped_one_shot=null,equipped_param=null,updated_at=v_now
     where id=1;
  end if;

  v_log_roll:=case
    when p_roll2 is not null and p_visual_prize=p_prize2 and (p_modifier='double_pick' or p_decision_type='restart') then p_roll2
    else p_roll1 end;

  v_cash_after:=v_cash_before+p_payout+v_challenge_bonus;
  update public.points_wheel_state set spin_chances=v_chance_after,cash_balance=v_cash_after,updated_at=v_now where id=1;

  v_reason:=v_reason || case coalesce(p_modifier,'')
    when 'shield30' then ' · 小幸运护盾'
    when 'upgrade' then ' · 奖励升级卡'
    when 'double_pick' then ' · 命运二选一'
    when 'restart' then ' · 命运重启卡'
    when 'wish' then ' · 许愿卡'
    when 'no10' then ' · 十元退散卡'
    when 'return10' then ' · 幸运返场卡'
    when 'heartbeat' then ' · 心跳翻倍卡'
    else '' end;
  if p_modifier='wish' then
    v_reason:=v_reason||case when v_bonus>0 then pg_catalog.format(' · 愿望¥%s命中 +¥%s',p_wish_target,v_bonus) else pg_catalog.format(' · 愿望¥%s未命中',p_wish_target) end;
  end if;
  if coalesce(p_refund_chance,false) then v_reason:=v_reason||' · 返还1次正式机会'; end if;
  if p_decision_type='restart' then v_reason:=v_reason||case when p_decision_choice='reroll' then ' · 已选择重抽' else ' · 已收下首抽' end; end if;
  if p_decision_type='heartbeat' and p_decision_choice in ('risk_win','risk_lose') then
    v_reason:=v_reason||case when p_decision_choice='risk_win' then ' · 心跳一搏翻倍成功' else ' · 心跳一搏回落' end;
  end if;
  if coalesce(p_lucky_applied,false) then v_reason:=v_reason||' · 百元幸运药水'; end if;
  if coalesce(v_challenge_active,false) then
    if v_challenge_completed then v_reason:=v_reason||case when v_challenge_won then ' · 三连挑战完成 +¥20' else ' · 三连挑战结束' end;
    else v_reason:=v_reason||pg_catalog.format(' · 三连挑战 %s/3（命中%s/2）',v_new_done,v_new_hits); end if;
  end if;

  insert into public.points_wheel_logs(action,prize_amount,roll,chance_delta,chance_before,chance_after,cash_delta,cash_before,cash_after,reason,created_at,changed_by)
  values('spin_win',p_visual_prize,v_log_roll,v_chance_after-p_chance_before,p_chance_before,v_chance_after,p_payout+v_challenge_bonus,v_cash_before,v_cash_after,v_reason,v_now,null)
  returning id into v_log_id;

  insert into public.points_shop_spin_details(
    wheel_log_id,modifier,first_roll,first_prize,second_roll,second_prize,selected_prize,lucky100_applied,
    payout_amount,bonus_amount,wish_target,chance_refunded,decision_type,decision_choice,challenge_bonus,created_at
  ) values(
    v_log_id,p_modifier,p_roll1,p_prize1,p_roll2,p_prize2,p_visual_prize,coalesce(p_lucky_applied,false),
    p_payout,v_bonus,p_wish_target,coalesce(p_refund_chance,false),p_decision_type,p_decision_choice,v_challenge_bonus,v_now
  );

  return pg_catalog.jsonb_build_object(
    'status','settled','spin_chances',v_chance_after,'cash_balance',v_cash_after,
    'prize_amount',p_payout+v_challenge_bonus,'spin_payout',p_payout,'visual_prize',p_visual_prize,'roll',v_log_roll,
    'wheel_updated_at',v_now,'wheel_log_id',v_log_id,'modifier',p_modifier,
    'first_prize',p_prize1,'second_prize',p_prize2,'second_roll',p_roll2,
    'bonus_amount',v_bonus,'wish_target',p_wish_target,'chance_refunded',coalesce(p_refund_chance,false),
    'lucky100_remaining',v_lucky_after,'lucky100_applied',coalesce(p_lucky_applied,false),
    'decision_type',p_decision_type,'decision_choice',p_decision_choice,
    'challenge_active',case when v_challenge_completed then false else coalesce(v_challenge_active,false) end,
    'challenge_spins_done',case when v_challenge_completed then 0 else v_new_done end,
    'challenge_hits',case when v_challenge_completed then 0 else v_new_hits end,
    'challenge_completed',v_challenge_completed,'challenge_won',v_challenge_won,'challenge_bonus',v_challenge_bonus
  );
end;
$function$;

ALTER FUNCTION "public"."points_shop_settle_spin_v2"(p_chance_before integer, p_reserved boolean, p_roll1 integer, p_prize1 integer, p_roll2 integer, p_prize2 integer, p_visual_prize integer, p_payout integer, p_modifier text, p_wish_target integer, p_lucky_applied boolean, p_refund_chance boolean, p_decision_type text, p_decision_choice text, p_consume_modifier boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_spin_wheel()
 RETURNS TABLE(spin_chances integer, cash_balance integer, prize_amount integer, roll integer, wheel_updated_at timestamp with time zone, wheel_log_id bigint, modifier text, first_prize integer, second_prize integer, lucky100_remaining integer, lucky100_applied boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_chance_before integer;
  v_chance_after integer;

  v_cash_before integer;
  v_cash_after integer;

  v_modifier text;
  v_item_qty integer;

  v_lucky_before integer;
  v_lucky_after integer;
  v_lucky_active boolean;

  v_roll1 integer;
  v_roll2 integer;
  v_selected_roll integer;

  v_prize1 integer;
  v_prize2 integer;
  v_final integer;

  v_now timestamptz := pg_catalog.clock_timestamp();
  v_log_id bigint;
  v_reason text := '正式转动大转盘';
begin
  if auth.uid() is not null then
    raise exception 'Guest mode required'
      using errcode = '42501';
  end if;

  /*
     先锁原 wheel singleton。
     保证机会、现金余额与正式历史仍是一笔事务。
  */
  select w.spin_chances, w.cash_balance
    into v_chance_before, v_cash_before
  from public.points_wheel_state w
  where w.id = 1
  for update;

  if not found then
    raise exception 'Wheel state singleton not found'
      using errcode = 'P0001';
  end if;

  if coalesce(v_chance_before, 0) <= 0 then
    raise exception 'No wheel chance available'
      using errcode = 'P0001';
  end if;

  /*
     再锁商城状态，读取这一次启动转盘时的选择。
  */
  select
    s.equipped_one_shot,
    s.lucky100_remaining
  into
    v_modifier,
    v_lucky_before
  from public.points_shop_state s
  where s.id = 1
  for update;

  if not found then
    raise exception 'Shop state singleton not found'
      using errcode = 'P0001';
  end if;

  /*
     防御：如果临时选择对应的库存已不存在，
     自动清空该选择，绝不让库存变成负数。
  */
  if v_modifier is not null then
    select i.quantity
      into v_item_qty
    from public.points_shop_inventory i
    where i.item_code = v_modifier
    for update;

    if coalesce(v_item_qty, 0) <= 0 then
      v_modifier := null;

      update public.points_shop_state s
         set equipped_one_shot = null,
             updated_at = v_now
       where s.id = 1;
    end if;
  end if;

  v_lucky_active := coalesce(v_lucky_before, 0) > 0;

  /*
     第一个真实随机结果。
  */
  v_roll1 := public.points_secure_roll_10000();
  v_prize1 := public.points_shop_prize_for_roll(
    v_roll1,
    v_lucky_active
  );

  if v_prize1 is null then
    raise exception 'Failed to resolve first wheel prize'
      using errcode = 'P0001';
  end if;

  v_selected_roll := v_roll1;
  v_final := v_prize1;

  /*
     单次道具效果。
  */
  if v_modifier = 'double_pick' then
    v_roll2 := public.points_secure_roll_10000();
    v_prize2 := public.points_shop_prize_for_roll(
      v_roll2,
      v_lucky_active
    );

    if v_prize2 is null then
      raise exception 'Failed to resolve second wheel prize'
        using errcode = 'P0001';
    end if;

    if v_prize2 > v_prize1 then
      v_final := v_prize2;
      v_selected_roll := v_roll2;
    end if;

    v_reason := v_reason || ' · 命运二选一';

  elsif v_modifier = 'shield30' then
    v_final := greatest(v_prize1, 30);
    v_reason := v_reason || ' · 小幸运护盾';

  elsif v_modifier = 'upgrade' then
    v_final := case v_prize1
      when 10 then 20
      when 20 then 30
      when 30 then 50
      else v_prize1
    end;

    v_reason := v_reason || ' · 奖励升级卡';
  end if;

  if v_lucky_active then
    v_reason := v_reason || ' · 百元幸运药水';
  end if;

  /*
     仍然只扣 1 次正式机会，只把最终奖金加到账户。
  */
  v_chance_after := v_chance_before - 1;
  v_cash_after := v_cash_before + v_final;

  update public.points_wheel_state w
     set spin_chances = v_chance_after,
         cash_balance = v_cash_after,
         updated_at = v_now
   where w.id = 1;

  /*
     正式抽奖成功后才真正消耗 1 个单次道具。
  */
  if v_modifier is not null then
    update public.points_shop_inventory i
       set quantity = i.quantity - 1,
           updated_at = v_now
     where i.item_code = v_modifier
       and i.quantity > 0;

    if not found then
      raise exception 'Selected shop item disappeared before settlement'
        using errcode = 'P0001';
    end if;
  end if;

  /*
     药水每次正式抽奖成功后 -1。
  */
  v_lucky_after := case
    when v_lucky_active then greatest(v_lucky_before - 1, 0)
    else coalesce(v_lucky_before, 0)
  end;

  update public.points_shop_state s
     set equipped_one_shot = null,
         lucky100_remaining = v_lucky_after,
         updated_at = v_now
   where s.id = 1;

  /*
     关键兼容点：
     action 继续使用你现有 CHECK 白名单允许的 spin_win。
     prize_amount 只保存最终奖励。
     所以：
     - 累计中奖继续正确
     - 历史继续正确
     - 软删除继续正确
     - 不需要改原 action constraint
  */
  insert into public.points_wheel_logs (
    action,
    prize_amount,
    roll,
    chance_delta,
    chance_before,
    chance_after,
    cash_delta,
    cash_before,
    cash_after,
    reason,
    created_at,
    changed_by
  )
  values (
    'spin_win',
    v_final,
    v_selected_roll,
    -1,
    v_chance_before,
    v_chance_after,
    v_final,
    v_cash_before,
    v_cash_after,
    v_reason,
    v_now,
    null
  )
  returning id into v_log_id;

  /*
     A/B 与道具诊断信息独立记录。
     二选一之外 second_* 必须为 null。
  */
  insert into public.points_shop_spin_details (
    wheel_log_id,
    modifier,
    first_roll,
    first_prize,
    second_roll,
    second_prize,
    selected_prize,
    lucky100_applied,
    created_at
  )
  values (
    v_log_id,
    v_modifier,
    v_roll1,
    v_prize1,
    v_roll2,
    v_prize2,
    v_final,
    v_lucky_active,
    v_now
  );

  return query
  select
    v_chance_after,
    v_cash_after,
    v_final,
    v_selected_roll,
    v_now,
    v_log_id,
    v_modifier,
    v_prize1,
    v_prize2,
    v_lucky_after,
    v_lucky_active;
end;
$function$;

ALTER FUNCTION "public"."points_shop_spin_wheel"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_spin_wheel_v2()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_chance integer;v_cash integer;
  v_modifier text;v_param integer;v_lucky_remaining integer;v_lucky boolean;
  v_qty integer;v_heartbeat_qty integer;
  v_roll1 integer;v_roll2 integer;v_prize1 integer;v_prize2 integer;v_visual integer;v_payout integer;v_bonus integer:=0;
  v_refund boolean:=false;v_now timestamptz:=pg_catalog.clock_timestamp();
  v_pending jsonb;
begin
  if auth.uid() is not null then raise exception 'Guest mode required' using errcode='42501'; end if;

  if exists(select 1 from public.points_shop_pending_spin where id=1) then
    select pg_catalog.jsonb_build_object('status','pending','pending_type',p.pending_type,'prize_amount',p.initial_prize,'visual_prize',p.initial_prize,'roll',p.initial_roll,
      'spin_chances',(select spin_chances from public.points_wheel_state where id=1),'cash_balance',(select cash_balance from public.points_wheel_state where id=1),
      'lucky100_applied',p.lucky100_applied)
      into v_pending from public.points_shop_pending_spin p where p.id=1;
    return v_pending;
  end if;

  select spin_chances,cash_balance into v_chance,v_cash from public.points_wheel_state where id=1 for update;
  if coalesce(v_chance,0)<=0 then raise exception 'No wheel chance available' using errcode='P0001'; end if;
  select equipped_one_shot,equipped_param,lucky100_remaining into v_modifier,v_param,v_lucky_remaining from public.points_shop_state where id=1 for update;
  v_lucky:=coalesce(v_lucky_remaining,0)>0;

  if v_modifier is not null then
    select quantity into v_qty from public.points_shop_inventory where item_code=v_modifier for update;
    if coalesce(v_qty,0)<=0 then raise exception 'No inventory available for selected item' using errcode='P0001'; end if;
  end if;
  if v_modifier='no10' and v_lucky then raise exception 'No10 cannot stack with lucky100' using errcode='P0001'; end if;

  v_roll1:=public.points_secure_roll_10000();
  v_prize1:=public.points_shop_prize_for_roll_v2(v_roll1,v_lucky,v_modifier='no10');
  v_visual:=v_prize1;v_payout:=v_prize1;

  /* 命运重启：10/20/30 才进入待决定；卡在获得“重启权”时即消耗。 */
  if v_modifier='restart' and v_prize1 in (10,20,30) then
    update public.points_wheel_state set spin_chances=v_chance-1,updated_at=v_now where id=1;
    update public.points_shop_inventory set quantity=quantity-1,updated_at=v_now where item_code='restart' and quantity>0;
    if not found then raise exception 'Restart item disappeared' using errcode='P0001'; end if;
    update public.points_shop_state set equipped_one_shot=null,equipped_param=null,updated_at=v_now where id=1;
    insert into public.points_shop_pending_spin(id,pending_type,chance_before,initial_roll,initial_prize,lucky100_applied,created_at)
    values(1,'restart',v_chance,v_roll1,v_prize1,v_lucky,v_now);
    return pg_catalog.jsonb_build_object('status','pending','pending_type','restart','prize_amount',v_prize1,'visual_prize',v_prize1,'roll',v_roll1,
      'spin_chances',v_chance-1,'cash_balance',v_cash,'lucky100_applied',v_lucky);
  end if;

  /* 没有使用其它单次道具时，低奖自动询问心跳翻倍。 */
  if v_modifier is null and v_prize1 in (10,20,30) then
    select quantity into v_heartbeat_qty from public.points_shop_inventory where item_code='heartbeat';
    if coalesce(v_heartbeat_qty,0)>0 then
      update public.points_wheel_state set spin_chances=v_chance-1,updated_at=v_now where id=1;
      insert into public.points_shop_pending_spin(id,pending_type,chance_before,initial_roll,initial_prize,lucky100_applied,created_at)
      values(1,'heartbeat',v_chance,v_roll1,v_prize1,v_lucky,v_now);
      return pg_catalog.jsonb_build_object('status','pending','pending_type','heartbeat','prize_amount',v_prize1,'visual_prize',v_prize1,'roll',v_roll1,
        'spin_chances',v_chance-1,'cash_balance',v_cash,'lucky100_applied',v_lucky);
    end if;
  end if;

  if v_modifier='double_pick' then
    v_roll2:=public.points_secure_roll_10000();
    v_prize2:=public.points_shop_prize_for_roll_v2(v_roll2,v_lucky,false);
    if v_prize2>v_prize1 then v_visual:=v_prize2;v_payout:=v_prize2; else v_visual:=v_prize1;v_payout:=v_prize1; end if;
  elsif v_modifier='shield30' then
    v_visual:=greatest(v_prize1,30);v_payout:=v_visual;
  elsif v_modifier='upgrade' then
    v_visual:=case v_prize1 when 10 then 20 when 20 then 30 when 30 then 50 else v_prize1 end;v_payout:=v_visual;
  elsif v_modifier='wish' then
    if v_param=v_prize1 then v_bonus:=v_prize1/2; end if;
    v_visual:=v_prize1;v_payout:=v_prize1+v_bonus;
  elsif v_modifier='return10' then
    v_refund:=v_prize1=10;
  end if;

  return public.points_shop_settle_spin_v2(
    v_chance,false,v_roll1,v_prize1,v_roll2,v_prize2,v_visual,v_payout,v_modifier,v_param,v_lucky,v_refund,null,null,v_modifier is not null
  );
end;
$function$;

ALTER FUNCTION "public"."points_shop_spin_wheel_v2"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_shop_state_json_v2()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
with active_member as (
  select m.score from public.members m where m.active=true order by m.id asc limit 1
), inv as (
  select coalesce(pg_catalog.jsonb_object_agg(i.item_code,i.quantity),'{}'::jsonb) data
  from public.points_shop_inventory i
), weekly as (
  select coalesce(pg_catalog.jsonb_object_agg(x.item_code,x.cnt),'{}'::jsonb) data
  from (
    select l.item_code, pg_catalog.count(*)::integer cnt
    from public.points_shop_purchase_logs l
    where l.week_start=public.points_shop_current_week_start()
    group by l.item_code
  ) x
), pending as (
  select pg_catalog.jsonb_build_object(
    'type',p.pending_type,
    'initial_prize',p.initial_prize,
    'initial_roll',p.initial_roll,
    'created_at',p.created_at
  ) data
  from public.points_shop_pending_spin p where p.id=1
), weekly_feature as (
  select pg_catalog.jsonb_build_object(
    'code',f.item_code,
    'week_start',f.week_start,
    'discount_claimed',(f.discount_claimed_at is not null),
    'original_price',2,
    'discount_price',0
  ) data
  from public.points_shop_weekly_feature f
  where f.week_start=public.points_shop_current_week_start()
)
select pg_catalog.jsonb_build_object(
  'score',coalesce((select score from active_member),0),
  'inventory',(select data from inv),
  'weekly_counts',(select data from weekly),
  'weekly_feature',(select data from weekly_feature),
  'equipped_one_shot',s.equipped_one_shot,
  'equipped_param',s.equipped_param,
  'lucky100_remaining',s.lucky100_remaining,
  'challenge_active',s.challenge_active,
  'challenge_spins_done',s.challenge_spins_done,
  'challenge_hits',s.challenge_hits,
  'pending_spin',(select data from pending)
)
from public.points_shop_state s where s.id=1;
$function$;

ALTER FUNCTION "public"."points_shop_state_json_v2"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_spin_wheel()
 RETURNS TABLE(spin_chances integer, cash_balance integer, prize_amount integer, roll integer, wheel_updated_at timestamp with time zone, wheel_log_id bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_chance_before integer;
  v_chance_after integer;
  v_cash_before integer;
  v_cash_after integer;
  v_roll integer;
  v_prize integer;
  v_now timestamptz := clock_timestamp();
  v_log_id bigint;
begin
  if auth.uid() is not null then
    raise exception 'Guest mode required' using errcode = '42501';
  end if;

  select w.spin_chances, w.cash_balance
    into v_chance_before, v_cash_before
  from public.points_wheel_state w
  where w.id = 1
  for update;

  if coalesce(v_chance_before, 0) <= 0 then
    raise exception 'No wheel chance available' using errcode = 'P0001';
  end if;

  v_roll := public.points_secure_roll_10000();
  v_prize := public.points_wheel_prize_for_roll(v_roll);
  v_chance_after := v_chance_before - 1;
  v_cash_after := v_cash_before + v_prize;

  update public.points_wheel_state
  set spin_chances = v_chance_after,
      cash_balance = v_cash_after,
      updated_at = v_now
  where id = 1;

  insert into public.points_wheel_logs (
    action, prize_amount, roll,
    chance_delta, chance_before, chance_after,
    cash_delta, cash_before, cash_after,
    reason, created_at, changed_by
  ) values (
    'spin_win', v_prize, v_roll,
    -1, v_chance_before, v_chance_after,
    v_prize, v_cash_before, v_cash_after,
    '正式转动大转盘', v_now, null
  ) returning id into v_log_id;

  return query
  select v_chance_after, v_cash_after, v_prize, v_roll, v_now, v_log_id;
end;
$function$;

ALTER FUNCTION "public"."points_spin_wheel"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.points_wheel_prize_for_roll(p_roll integer)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case
    when p_roll is null or p_roll < 0 or p_roll > 9999 then null
    when p_roll < c.p10 then 10
    when p_roll < c.p10 + c.p20 then 20
    when p_roll < c.p10 + c.p20 + c.p30 then 30
    when p_roll < c.p10 + c.p20 + c.p30 + c.p50 then 50
    when p_roll < c.p10 + c.p20 + c.p30 + c.p50 + c.p60 then 60
    when p_roll < c.p10 + c.p20 + c.p30 + c.p50 + c.p60 + c.p80 then 80
    else 100
  end
  from public.points_wheel_probability_v2 c
  where c.id = 1;
$function$;

ALTER FUNCTION "public"."points_wheel_prize_for_roll"(p_roll integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.reset_score(p_member_id bigint)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
    v_old_score integer;
    v_delta integer;
begin
    if auth.uid() is null or not public.is_admin() then
        raise exception 'Permission denied';
    end if;

    select score
    into v_old_score
    from public.members
    where id = p_member_id
      and active = true
    for update;

    if not found then
        raise exception 'Member not found or inactive';
    end if;

    v_delta := 5 - v_old_score;

    if v_delta = 0 then
        return 5;
    end if;

    update public.members
    set score = 5
    where id = p_member_id;

    insert into public.score_logs(
        member_id,
        delta,
        reason,
        operator_id
    ) values (
        p_member_id,
        v_delta,
        '重置到初始值 5',
        auth.uid()
    );

    return 5;
end;
$function$;

ALTER FUNCTION "public"."reset_score"(p_member_id bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.reset_score()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_member_id bigint;
  v_old_score integer;
  v_delta integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Permission denied';
  end if;

  select id, score
  into v_member_id, v_old_score
  from public.members
  where active = true
  order by id asc
  limit 1
  for update;

  if v_member_id is null then
    raise exception 'Score object not found';
  end if;

  v_delta := 5 - v_old_score;

  if v_delta = 0 then
    return 5;
  end if;

  update public.members
  set score = 5
  where id = v_member_id;

  insert into public.score_logs(member_id, delta, reason, operator_id)
  values (v_member_id, v_delta, '重置到初始值 5', auth.uid());

  return 5;
end;
$function$;

ALTER FUNCTION "public"."reset_score"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.set_member_active(p_member_id bigint, p_active boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin

    if auth.uid() is null or not public.is_admin() then
        raise exception 'Permission denied';
    end if;

    update public.members
    set active = p_active
    where id = p_member_id;

    if not found then
        raise exception 'Member not found';
    end if;

end;
$function$;

ALTER FUNCTION "public"."set_member_active"(p_member_id bigint, p_active boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.undo_score_log(p_log_id bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
    v_log public.score_logs%rowtype;
    v_new_log_id bigint;
begin

    if auth.uid() is null or not public.is_admin() then
        raise exception 'Permission denied';
    end if;

    select *
    into v_log
    from public.score_logs
    where id = p_log_id;

    if not found then
        raise exception 'Log not found';
    end if;

    -- 撤销记录自己不能再次撤销
    if v_log.reverts_log_id is not null then
        raise exception 'Cannot undo a revert record';
    end if;

    -- 防止同一流水撤销两次
    if exists (
        select 1
        from public.score_logs
        where reverts_log_id = p_log_id
    ) then
        raise exception 'Log already reverted';
    end if;

    update public.members
    set score = score - v_log.delta
    where id = v_log.member_id;

    if not found then
        raise exception 'Member not found';
    end if;

    insert into public.score_logs(
        member_id,
        delta,
        reason,
        operator_id,
        reverts_log_id
    )
    values (
        v_log.member_id,
        -v_log.delta,
        '撤销记录 #' || p_log_id,
        auth.uid(),
        p_log_id
    )
    returning id into v_new_log_id;

    return v_new_log_id;

end;
$function$;

ALTER FUNCTION "public"."undo_score_log"(p_log_id bigint) OWNER TO "postgres";

ALTER TABLE "points_access"."attempts" ADD CONSTRAINT "attempts_pkey" PRIMARY KEY (minute);

ALTER TABLE "points_access"."attempts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "points_access"."attempts" OWNER TO "postgres";

REVOKE ALL ON TABLE "points_access"."attempts" FROM PUBLIC, "postgres";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "points_access"."attempts" TO "postgres";

ALTER TABLE "points_access"."codes" ADD CONSTRAINT "codes_pkey" PRIMARY KEY (token_hash);

ALTER TABLE "points_access"."codes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "points_access"."codes" OWNER TO "postgres";

REVOKE ALL ON TABLE "points_access"."codes" FROM PUBLIC, "postgres";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "points_access"."codes" TO "postgres";

ALTER TABLE "points_access"."devices" ADD CONSTRAINT "devices_pkey" PRIMARY KEY (id);

ALTER TABLE "points_access"."devices" ADD CONSTRAINT "devices_token_hash_key" UNIQUE (token_hash);

CREATE TRIGGER points_notice_event AFTER INSERT OR UPDATE ON points_access.devices FOR EACH ROW EXECUTE FUNCTION points_notice.business_event();

ALTER TABLE "points_access"."devices" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "points_access"."devices" OWNER TO "postgres";

REVOKE ALL ON TABLE "points_access"."devices" FROM PUBLIC, "postgres";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "points_access"."devices" TO "postgres";

ALTER TABLE "points_kitchen_v2"."receipts" ADD CONSTRAINT "receipts_pkey" PRIMARY KEY (order_id, actor);

ALTER TABLE "points_kitchen_v2"."receipts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "points_kitchen_v2"."receipts" OWNER TO "postgres";

REVOKE ALL ON TABLE "points_kitchen_v2"."receipts" FROM PUBLIC, "postgres";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "points_kitchen_v2"."receipts" TO "postgres";

ALTER TABLE "points_notice"."batch_items" ADD CONSTRAINT "batch_items_pkey" PRIMARY KEY (batch_id, event_id);

ALTER TABLE "points_notice"."batch_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "points_notice"."batch_items" OWNER TO "postgres";

REVOKE ALL ON TABLE "points_notice"."batch_items" FROM PUBLIC, "postgres";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "points_notice"."batch_items" TO "postgres";

ALTER TABLE "points_notice"."batches" ADD CONSTRAINT "batches_pkey" PRIMARY KEY (id);

CREATE UNIQUE INDEX notice_one_pending_batch ON points_notice.batches USING btree (subscription_id, priority) WHERE (status = 'pending'::text);

ALTER TABLE "points_notice"."batches" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "points_notice"."batches" OWNER TO "postgres";

REVOKE ALL ON TABLE "points_notice"."batches" FROM PUBLIC, "postgres";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "points_notice"."batches" TO "postgres";

ALTER SEQUENCE "points_notice"."batches_id_seq" OWNER TO "postgres";

REVOKE ALL ON SEQUENCE "points_notice"."batches_id_seq" FROM PUBLIC, "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "points_notice"."batches_id_seq" TO "postgres";

ALTER TABLE "points_notice"."events" ADD CONSTRAINT "events_audience_check" CHECK (audience = ANY (ARRAY['admin'::text, 'guest'::text]));

ALTER TABLE "points_notice"."events" ADD CONSTRAINT "events_event_key_key" UNIQUE (event_key);

ALTER TABLE "points_notice"."events" ADD CONSTRAINT "events_pkey" PRIMARY KEY (id);

ALTER TABLE "points_notice"."events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "points_notice"."events" OWNER TO "postgres";

REVOKE ALL ON TABLE "points_notice"."events" FROM PUBLIC, "postgres";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "points_notice"."events" TO "postgres";

ALTER SEQUENCE "points_notice"."events_id_seq" OWNER TO "postgres";

REVOKE ALL ON SEQUENCE "points_notice"."events_id_seq" FROM PUBLIC, "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "points_notice"."events_id_seq" TO "postgres";

ALTER TABLE "points_notice"."preferences" ADD CONSTRAINT "preferences_pkey" PRIMARY KEY (actor);

ALTER TABLE "points_notice"."preferences" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "points_notice"."preferences" OWNER TO "postgres";

REVOKE ALL ON TABLE "points_notice"."preferences" FROM PUBLIC, "postgres";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "points_notice"."preferences" TO "postgres";

ALTER TABLE "points_notice"."receipts" ADD CONSTRAINT "receipts_pkey" PRIMARY KEY (actor, event_id);

ALTER TABLE "points_notice"."receipts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "points_notice"."receipts" OWNER TO "postgres";

REVOKE ALL ON TABLE "points_notice"."receipts" FROM PUBLIC, "postgres";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "points_notice"."receipts" TO "postgres";

ALTER TABLE "points_push"."config" ADD CONSTRAINT "config_id_check" CHECK (id);

ALTER TABLE "points_push"."config" ADD CONSTRAINT "config_pkey" PRIMARY KEY (id);

ALTER TABLE "points_push"."config" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "points_push"."config" OWNER TO "postgres";

REVOKE ALL ON TABLE "points_push"."config" FROM PUBLIC, "postgres";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "points_push"."config" TO "postgres";

ALTER TABLE "points_push"."jobs" ADD CONSTRAINT "jobs_pkey" PRIMARY KEY (id);

ALTER TABLE "points_push"."jobs" ADD CONSTRAINT "jobs_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'sending'::text, 'sent'::text, 'dead'::text]));

ALTER TABLE "points_push"."jobs" ADD CONSTRAINT "jobs_subscription_id_event_key_key" UNIQUE (subscription_id, event_key);

CREATE INDEX points_push_jobs_pending ON points_push.jobs USING btree (available_at) WHERE (status = ANY (ARRAY['pending'::text, 'sending'::text]));

ALTER TABLE "points_push"."jobs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "points_push"."jobs" OWNER TO "postgres";

REVOKE ALL ON TABLE "points_push"."jobs" FROM PUBLIC, "postgres";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "points_push"."jobs" TO "postgres";

ALTER SEQUENCE "points_push"."jobs_id_seq" OWNER TO "postgres";

REVOKE ALL ON SEQUENCE "points_push"."jobs_id_seq" FROM PUBLIC, "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "points_push"."jobs_id_seq" TO "postgres";

ALTER TABLE "points_push"."pairings" ADD CONSTRAINT "pairings_pkey" PRIMARY KEY (token_hash);

ALTER TABLE "points_push"."pairings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "points_push"."pairings" OWNER TO "postgres";

REVOKE ALL ON TABLE "points_push"."pairings" FROM PUBLIC, "postgres";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "points_push"."pairings" TO "postgres";

ALTER TABLE "points_push"."subscriptions" ADD CONSTRAINT "subscriptions_audience_check" CHECK (audience = ANY (ARRAY['admin'::text, 'guest'::text]));

ALTER TABLE "points_push"."subscriptions" ADD CONSTRAINT "subscriptions_check" CHECK (audience = 'admin'::text AND user_id IS NOT NULL OR audience = 'guest'::text AND user_id IS NULL);

ALTER TABLE "points_push"."subscriptions" ADD CONSTRAINT "subscriptions_endpoint_key" UNIQUE (endpoint);

ALTER TABLE "points_push"."subscriptions" ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY (id);

ALTER TABLE "points_push"."subscriptions" ADD CONSTRAINT "subscriptions_token_hash_key" UNIQUE (token_hash);

ALTER TABLE "points_push"."subscriptions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "points_push"."subscriptions" OWNER TO "postgres";

REVOKE ALL ON TABLE "points_push"."subscriptions" FROM PUBLIC, "postgres";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "points_push"."subscriptions" TO "postgres";

ALTER TABLE "public"."autosar_study_progress" ADD CONSTRAINT "autosar_study_progress_pkey" PRIMARY KEY (user_id, knowledge_id);

CREATE POLICY "autosar_progress_delete_own" ON "public"."autosar_study_progress" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "autosar_progress_insert_own" ON "public"."autosar_study_progress" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "autosar_progress_select_own" ON "public"."autosar_study_progress" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "autosar_progress_update_own" ON "public"."autosar_study_progress" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

ALTER TABLE "public"."autosar_study_progress" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."autosar_study_progress" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."autosar_study_progress" FROM PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."autosar_study_progress" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."autosar_study_progress" TO "anon";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."autosar_study_progress" TO "authenticated";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."autosar_study_progress" TO "service_role";

ALTER TABLE "public"."autosar_user_settings" ADD CONSTRAINT "autosar_user_settings_pkey" PRIMARY KEY (user_id);

CREATE POLICY "autosar_settings_delete_own" ON "public"."autosar_user_settings" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "autosar_settings_insert_own" ON "public"."autosar_user_settings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "autosar_settings_select_own" ON "public"."autosar_user_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "autosar_settings_update_own" ON "public"."autosar_user_settings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

ALTER TABLE "public"."autosar_user_settings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."autosar_user_settings" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."autosar_user_settings" FROM PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."autosar_user_settings" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."autosar_user_settings" TO "anon";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."autosar_user_settings" TO "authenticated";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."autosar_user_settings" TO "service_role";

ALTER TABLE "public"."members" ADD CONSTRAINT "members_name_check" CHECK (char_length(TRIM(BOTH FROM name)) >= 1 AND char_length(name) <= 30);

ALTER TABLE "public"."members" ADD CONSTRAINT "members_name_key" UNIQUE (name);

ALTER TABLE "public"."members" ADD CONSTRAINT "members_pkey" PRIMARY KEY (id);

CREATE UNIQUE INDEX members_single_active_idx ON public.members USING btree ((1)) WHERE (active = true);

ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."members" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."members" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."members" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."members" TO "service_role";

ALTER SEQUENCE "public"."members_id_seq" OWNER TO "postgres";

REVOKE ALL ON SEQUENCE "public"."members_id_seq" FROM PUBLIC, "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."members_id_seq" TO "postgres";

ALTER TABLE "public"."points_fat_records" ADD CONSTRAINT "points_fat_record_weight_check" CHECK (weight_jin > 0::numeric AND weight_jin < 10000::numeric);

ALTER TABLE "public"."points_fat_records" ADD CONSTRAINT "points_fat_records_bowel_status_check" CHECK (bowel_status = ANY (ARRAY['before'::text, 'after'::text]));

ALTER TABLE "public"."points_fat_records" ADD CONSTRAINT "points_fat_records_pkey" PRIMARY KEY (id);

CREATE INDEX points_fat_records_status_time_idx ON public.points_fat_records USING btree (bowel_status, created_at, id);

CREATE INDEX points_fat_records_time_idx ON public.points_fat_records USING btree (created_at DESC, id DESC);

ALTER TABLE "public"."points_fat_records" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_fat_records" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_fat_records" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_fat_records" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_fat_records" TO "service_role";

ALTER SEQUENCE "public"."points_fat_records_id_seq" OWNER TO "postgres";

REVOKE ALL ON SEQUENCE "public"."points_fat_records_id_seq" FROM PUBLIC, "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."points_fat_records_id_seq" TO "postgres";

ALTER TABLE "public"."points_fat_reward_operations" ADD CONSTRAINT "points_fat_reward_operations_kind_check" CHECK (kind = ANY (ARRAY['buy'::text, 'use'::text]));

ALTER TABLE "public"."points_fat_reward_operations" ADD CONSTRAINT "points_fat_reward_operations_pkey" PRIMARY KEY (operation_id);

ALTER TABLE "public"."points_fat_reward_operations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_fat_reward_operations" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_fat_reward_operations" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_fat_reward_operations" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_fat_reward_operations" TO "service_role";

ALTER TABLE "public"."points_fat_reward_requests" ADD CONSTRAINT "points_fat_reward_requests_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."points_fat_reward_requests" ADD CONSTRAINT "points_fat_reward_requests_status_check" CHECK (status = ANY (ARRAY['pending_service'::text, 'pending_confirmation'::text, 'completed'::text, 'returned'::text]));

CREATE INDEX points_fat_reward_requests_pending_idx ON public.points_fat_reward_requests USING btree (status, id DESC) WHERE (status = ANY (ARRAY['pending_service'::text, 'pending_confirmation'::text]));

CREATE TRIGGER points_notice_event AFTER INSERT OR UPDATE ON points_fat_reward_requests FOR EACH ROW EXECUTE FUNCTION points_notice.business_event();

ALTER TABLE "public"."points_fat_reward_requests" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_fat_reward_requests" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_fat_reward_requests" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_fat_reward_requests" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_fat_reward_requests" TO "service_role";

ALTER SEQUENCE "public"."points_fat_reward_requests_id_seq" OWNER TO "postgres";

REVOKE ALL ON SEQUENCE "public"."points_fat_reward_requests_id_seq" FROM PUBLIC, "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."points_fat_reward_requests_id_seq" TO "postgres";

ALTER TABLE "public"."points_fat_reward_state" ADD CONSTRAINT "points_fat_reward_state_backpack_check" CHECK (backpack >= 0);

ALTER TABLE "public"."points_fat_reward_state" ADD CONSTRAINT "points_fat_reward_state_diamonds_check" CHECK (diamonds >= 0);

ALTER TABLE "public"."points_fat_reward_state" ADD CONSTRAINT "points_fat_reward_state_id_check" CHECK (id = 1);

ALTER TABLE "public"."points_fat_reward_state" ADD CONSTRAINT "points_fat_reward_state_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."points_fat_reward_state" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_fat_reward_state" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_fat_reward_state" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_fat_reward_state" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_fat_reward_state" TO "service_role";

ALTER TABLE "public"."points_fat_reward_week_series" ADD CONSTRAINT "points_fat_reward_week_series_bowel_status_check" CHECK (bowel_status = ANY (ARRAY['before'::text, 'after'::text]));

ALTER TABLE "public"."points_fat_reward_week_series" ADD CONSTRAINT "points_fat_reward_week_series_pkey" PRIMARY KEY (week_start, bowel_status);

ALTER TABLE "public"."points_fat_reward_week_series" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_fat_reward_week_series" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_fat_reward_week_series" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_fat_reward_week_series" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_fat_reward_week_series" TO "service_role";

ALTER TABLE "public"."points_fat_reward_weeks" ADD CONSTRAINT "points_fat_reward_weeks_balance_after_check" CHECK (balance_after >= 0);

ALTER TABLE "public"."points_fat_reward_weeks" ADD CONSTRAINT "points_fat_reward_weeks_bowel_status_check" CHECK (bowel_status = ANY (ARRAY['before'::text, 'after'::text]));

ALTER TABLE "public"."points_fat_reward_weeks" ADD CONSTRAINT "points_fat_reward_weeks_comparison_basis_check" CHECK (comparison_basis = ANY (ARRAY['previous_week'::text, 'starting_weight'::text]));

ALTER TABLE "public"."points_fat_reward_weeks" ADD CONSTRAINT "points_fat_reward_weeks_pkey" PRIMARY KEY (week_start);

CREATE TRIGGER points_notice_event AFTER INSERT OR UPDATE ON points_fat_reward_weeks FOR EACH ROW EXECUTE FUNCTION points_notice.business_event();

ALTER TABLE "public"."points_fat_reward_weeks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_fat_reward_weeks" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_fat_reward_weeks" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_fat_reward_weeks" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_fat_reward_weeks" TO "service_role";

ALTER TABLE "public"."points_fat_settings" ADD CONSTRAINT "points_fat_settings_id_check" CHECK (id = 1);

ALTER TABLE "public"."points_fat_settings" ADD CONSTRAINT "points_fat_settings_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."points_fat_settings" ADD CONSTRAINT "points_fat_starting_weight_check" CHECK (starting_weight_jin IS NULL OR starting_weight_jin > 0::numeric AND starting_weight_jin < 10000::numeric);

ALTER TABLE "public"."points_fat_settings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_fat_settings" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_fat_settings" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_fat_settings" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_fat_settings" TO "service_role";

ALTER TABLE "public"."points_fat_status_migration" ADD CONSTRAINT "points_fat_status_migration_history_status_check" CHECK (history_status = ANY (ARRAY['before'::text, 'after'::text]));

ALTER TABLE "public"."points_fat_status_migration" ADD CONSTRAINT "points_fat_status_migration_id_check" CHECK (id = 1);

ALTER TABLE "public"."points_fat_status_migration" ADD CONSTRAINT "points_fat_status_migration_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."points_fat_status_migration" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_fat_status_migration" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_fat_status_migration" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_fat_status_migration" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_fat_status_migration" TO "service_role";

ALTER TABLE "public"."points_kitchen_dishes" ADD CONSTRAINT "points_kitchen_dishes_pkey" PRIMARY KEY (slug);

ALTER TABLE "public"."points_kitchen_dishes" ADD CONSTRAINT "points_kitchen_dishes_recipe_check" CHECK (jsonb_typeof(recipe) = 'object'::text);

ALTER TABLE "public"."points_kitchen_dishes" ADD CONSTRAINT "points_kitchen_dishes_slug_check" CHECK (slug ~ '^[a-z0-9-]{1,60}$'::text);

ALTER TABLE "public"."points_kitchen_dishes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_kitchen_dishes" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_kitchen_dishes" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_kitchen_dishes" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_kitchen_dishes" TO "service_role";

ALTER TABLE "public"."points_kitchen_drafts" ADD CONSTRAINT "points_kitchen_drafts_pkey" PRIMARY KEY (order_id, user_id);

ALTER TABLE "public"."points_kitchen_drafts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_kitchen_drafts" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_kitchen_drafts" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_kitchen_drafts" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_kitchen_drafts" TO "service_role";

ALTER TABLE "public"."points_kitchen_operations" ADD CONSTRAINT "points_kitchen_operations_pkey" PRIMARY KEY (operation_id);

ALTER TABLE "public"."points_kitchen_operations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_kitchen_operations" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_kitchen_operations" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_kitchen_operations" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_kitchen_operations" TO "service_role";

ALTER TABLE "public"."points_kitchen_orders" ADD CONSTRAINT "points_kitchen_orders_check" CHECK (acknowledged_version >= 0 AND acknowledged_version <= version AND seen_version >= 0 AND seen_version <= version);

ALTER TABLE "public"."points_kitchen_orders" ADD CONSTRAINT "points_kitchen_orders_items_check" CHECK (jsonb_typeof(items) = 'array'::text AND jsonb_array_length(items) >= 1 AND jsonb_array_length(items) <= 24);

ALTER TABLE "public"."points_kitchen_orders" ADD CONSTRAINT "points_kitchen_orders_meal_check" CHECK (meal = ANY (ARRAY['早饭'::text, '午饭'::text, '晚饭'::text]));

ALTER TABLE "public"."points_kitchen_orders" ADD CONSTRAINT "points_kitchen_orders_note_check" CHECK (char_length(note) <= 500);

ALTER TABLE "public"."points_kitchen_orders" ADD CONSTRAINT "points_kitchen_orders_origin_check" CHECK (origin = ANY (ARRAY['admin'::text, 'guest'::text]));

ALTER TABLE "public"."points_kitchen_orders" ADD CONSTRAINT "points_kitchen_orders_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."points_kitchen_orders" ADD CONSTRAINT "points_kitchen_orders_resolution_note_check" CHECK (char_length(resolution_note) <= 500);

ALTER TABLE "public"."points_kitchen_orders" ADD CONSTRAINT "points_kitchen_orders_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'settled'::text, 'rejected'::text, 'cancelled'::text]));

ALTER TABLE "public"."points_kitchen_orders" ADD CONSTRAINT "points_kitchen_orders_version_check" CHECK (version > 0);

CREATE UNIQUE INDEX points_kitchen_meal_slot ON public.points_kitchen_orders USING btree (member_id, meal_date, meal) WHERE (meal_mode AND (status <> ALL (ARRAY['cancelled'::text, 'rejected'::text])));

CREATE INDEX points_kitchen_orders_active ON public.points_kitchen_orders USING btree (status, id DESC);

CREATE INDEX points_kitchen_orders_date ON public.points_kitchen_orders USING btree (created_at);

CREATE TRIGGER points_notice_event AFTER INSERT OR UPDATE ON points_kitchen_orders FOR EACH ROW EXECUTE FUNCTION points_notice.business_event();

ALTER TABLE "public"."points_kitchen_orders" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_kitchen_orders" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_kitchen_orders" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_kitchen_orders" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_kitchen_orders" TO "service_role";

ALTER SEQUENCE "public"."points_kitchen_orders_id_seq" OWNER TO "postgres";

REVOKE ALL ON SEQUENCE "public"."points_kitchen_orders_id_seq" FROM PUBLIC, "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."points_kitchen_orders_id_seq" TO "postgres";

ALTER TABLE "public"."points_kitchen_reviews" ADD CONSTRAINT "points_kitchen_reviews_comment_check" CHECK (char_length(comment) <= 1000);

ALTER TABLE "public"."points_kitchen_reviews" ADD CONSTRAINT "points_kitchen_reviews_pkey" PRIMARY KEY (order_id, dish_slug);

ALTER TABLE "public"."points_kitchen_reviews" ADD CONSTRAINT "points_kitchen_reviews_stars_check" CHECK (stars >= 1 AND stars <= 5);

CREATE INDEX points_kitchen_reviews_dish ON public.points_kitchen_reviews USING btree (dish_slug, reviewed_at DESC, order_id DESC);

ALTER TABLE "public"."points_kitchen_reviews" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_kitchen_reviews" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_kitchen_reviews" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_kitchen_reviews" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_kitchen_reviews" TO "service_role";

ALTER TABLE "public"."points_kitchen_versions" ADD CONSTRAINT "points_kitchen_versions_pkey" PRIMARY KEY (order_id, version);

ALTER TABLE "public"."points_kitchen_versions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_kitchen_versions" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_kitchen_versions" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_kitchen_versions" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_kitchen_versions" TO "service_role";

ALTER TABLE "public"."points_shop_admin_inventory_logs" ADD CONSTRAINT "points_shop_admin_inventory_logs_code_check" CHECK (item_code = ANY (ARRAY['shield30'::text, 'upgrade'::text, 'double_pick'::text, 'lucky100'::text, 'restart'::text, 'wish'::text, 'triple_challenge'::text, 'no10'::text, 'return10'::text, 'heartbeat'::text, 'mystery_box'::text, 'free_mystery_box'::text]));

ALTER TABLE "public"."points_shop_admin_inventory_logs" ADD CONSTRAINT "points_shop_admin_inventory_logs_delta_check" CHECK (delta <> 0);

ALTER TABLE "public"."points_shop_admin_inventory_logs" ADD CONSTRAINT "points_shop_admin_inventory_logs_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."points_shop_admin_inventory_logs" ADD CONSTRAINT "points_shop_admin_inventory_logs_qty_check" CHECK (quantity_before >= 0 AND quantity_after >= 0 AND quantity_after = (quantity_before + delta));

CREATE INDEX points_shop_admin_inventory_logs_unseen_idx ON public.points_shop_admin_inventory_logs USING btree (guest_seen_at, created_at DESC, id DESC) WHERE (delta > 0);

CREATE TRIGGER points_notice_event AFTER INSERT OR UPDATE ON points_shop_admin_inventory_logs FOR EACH ROW EXECUTE FUNCTION points_notice.business_event();

ALTER TABLE "public"."points_shop_admin_inventory_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_shop_admin_inventory_logs" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_shop_admin_inventory_logs" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_shop_admin_inventory_logs" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_shop_admin_inventory_logs" TO "service_role";

ALTER SEQUENCE "public"."points_shop_admin_inventory_logs_id_seq" OWNER TO "postgres";

ALTER TABLE "public"."points_shop_inventory" ADD CONSTRAINT "points_shop_inventory_code_check" CHECK (item_code = ANY (ARRAY['shield30'::text, 'upgrade'::text, 'double_pick'::text, 'lucky100'::text, 'restart'::text, 'wish'::text, 'triple_challenge'::text, 'no10'::text, 'return10'::text, 'heartbeat'::text, 'mystery_box'::text, 'free_mystery_box'::text]));

ALTER TABLE "public"."points_shop_inventory" ADD CONSTRAINT "points_shop_inventory_pkey" PRIMARY KEY (item_code);

ALTER TABLE "public"."points_shop_inventory" ADD CONSTRAINT "points_shop_inventory_quantity_check" CHECK (quantity >= 0);

ALTER TABLE "public"."points_shop_inventory" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_shop_inventory" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_shop_inventory" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_shop_inventory" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_shop_inventory" TO "service_role";

ALTER TABLE "public"."points_shop_pending_spin" ADD CONSTRAINT "points_shop_pending_spin_chance_check" CHECK (chance_before > 0);

ALTER TABLE "public"."points_shop_pending_spin" ADD CONSTRAINT "points_shop_pending_spin_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."points_shop_pending_spin" ADD CONSTRAINT "points_shop_pending_spin_prize_check" CHECK (initial_prize = ANY (ARRAY[10, 20, 30]));

ALTER TABLE "public"."points_shop_pending_spin" ADD CONSTRAINT "points_shop_pending_spin_roll_check" CHECK (initial_roll >= 0 AND initial_roll <= 9999);

ALTER TABLE "public"."points_shop_pending_spin" ADD CONSTRAINT "points_shop_pending_spin_singleton_check" CHECK (id = 1);

ALTER TABLE "public"."points_shop_pending_spin" ADD CONSTRAINT "points_shop_pending_spin_type_check" CHECK (pending_type = ANY (ARRAY['restart'::text, 'heartbeat'::text]));

ALTER TABLE "public"."points_shop_pending_spin" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_shop_pending_spin" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_shop_pending_spin" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_shop_pending_spin" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_shop_pending_spin" TO "service_role";

ALTER TABLE "public"."points_shop_purchase_logs" ADD CONSTRAINT "points_shop_purchase_logs_code_check" CHECK (item_code = ANY (ARRAY['wheel_ticket'::text, 'cash_box'::text, 'shield30'::text, 'upgrade'::text, 'double_pick'::text, 'lucky100'::text, 'restart'::text, 'wish'::text, 'triple_challenge'::text, 'no10'::text, 'return10'::text, 'heartbeat'::text, 'mystery_box'::text]));

ALTER TABLE "public"."points_shop_purchase_logs" ADD CONSTRAINT "points_shop_purchase_logs_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."points_shop_purchase_logs" ADD CONSTRAINT "points_shop_purchase_logs_price_check" CHECK (price >= 0);

CREATE INDEX points_shop_purchase_logs_week_item_idx ON public.points_shop_purchase_logs USING btree (week_start, item_code, created_at DESC, id DESC);

ALTER TABLE "public"."points_shop_purchase_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_shop_purchase_logs" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_shop_purchase_logs" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_shop_purchase_logs" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_shop_purchase_logs" TO "service_role";

ALTER SEQUENCE "public"."points_shop_purchase_logs_id_seq" OWNER TO "postgres";

ALTER TABLE "public"."points_shop_spin_details" ADD CONSTRAINT "points_shop_spin_details_decision_check" CHECK (decision_type IS NULL AND decision_choice IS NULL OR decision_type = 'restart'::text AND (decision_choice = ANY (ARRAY['accept'::text, 'reroll'::text])) OR decision_type = 'heartbeat'::text AND (decision_choice = ANY (ARRAY['accept'::text, 'risk_win'::text, 'risk_lose'::text])));

ALTER TABLE "public"."points_shop_spin_details" ADD CONSTRAINT "points_shop_spin_details_first_roll_check" CHECK (first_roll >= 0 AND first_roll <= 9999);

ALTER TABLE "public"."points_shop_spin_details" ADD CONSTRAINT "points_shop_spin_details_modifier_check" CHECK (modifier IS NULL OR (modifier = ANY (ARRAY['shield30'::text, 'upgrade'::text, 'double_pick'::text, 'restart'::text, 'wish'::text, 'no10'::text, 'return10'::text, 'heartbeat'::text])));

ALTER TABLE "public"."points_shop_spin_details" ADD CONSTRAINT "points_shop_spin_details_payout_check" CHECK (payout_amount IS NULL OR payout_amount > 0 AND payout_amount <= 1000);

ALTER TABLE "public"."points_shop_spin_details" ADD CONSTRAINT "points_shop_spin_details_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."points_shop_spin_details" ADD CONSTRAINT "points_shop_spin_details_prize_check" CHECK ((first_prize = ANY (ARRAY[10, 20, 30, 50, 60, 80, 100])) AND (second_prize IS NULL OR (second_prize = ANY (ARRAY[10, 20, 30, 50, 60, 80, 100]))) AND (selected_prize = ANY (ARRAY[10, 20, 30, 50, 60, 80, 100])));

ALTER TABLE "public"."points_shop_spin_details" ADD CONSTRAINT "points_shop_spin_details_second_roll_check" CHECK (second_roll IS NULL OR second_roll >= 0 AND second_roll <= 9999);

ALTER TABLE "public"."points_shop_spin_details" ADD CONSTRAINT "points_shop_spin_details_wheel_log_id_key" UNIQUE (wheel_log_id);

ALTER TABLE "public"."points_shop_spin_details" ADD CONSTRAINT "points_shop_spin_details_wish_check" CHECK (wish_target IS NULL OR (wish_target = ANY (ARRAY[10, 20, 30, 50, 60, 80, 100])));

CREATE INDEX points_shop_spin_details_created_idx ON public.points_shop_spin_details USING btree (created_at DESC, id DESC);

ALTER TABLE "public"."points_shop_spin_details" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_shop_spin_details" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_shop_spin_details" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_shop_spin_details" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_shop_spin_details" TO "service_role";

ALTER SEQUENCE "public"."points_shop_spin_details_id_seq" OWNER TO "postgres";

ALTER TABLE "public"."points_shop_state" ADD CONSTRAINT "points_shop_state_challenge_progress_check" CHECK (challenge_spins_done >= 0 AND challenge_spins_done <= 2 AND challenge_hits >= 0 AND challenge_hits <= 2 AND challenge_hits <= challenge_spins_done);

ALTER TABLE "public"."points_shop_state" ADD CONSTRAINT "points_shop_state_equipped_check" CHECK (equipped_one_shot IS NULL OR (equipped_one_shot = ANY (ARRAY['shield30'::text, 'upgrade'::text, 'double_pick'::text, 'restart'::text, 'wish'::text, 'no10'::text, 'return10'::text])));

ALTER TABLE "public"."points_shop_state" ADD CONSTRAINT "points_shop_state_equipped_param_check" CHECK (equipped_one_shot = 'wish'::text AND (equipped_param = ANY (ARRAY[10, 20, 30, 50, 60, 80, 100])) OR equipped_one_shot IS DISTINCT FROM 'wish'::text AND equipped_param IS NULL);

ALTER TABLE "public"."points_shop_state" ADD CONSTRAINT "points_shop_state_lucky_check" CHECK (lucky100_remaining >= 0 AND lucky100_remaining <= 5);

ALTER TABLE "public"."points_shop_state" ADD CONSTRAINT "points_shop_state_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."points_shop_state" ADD CONSTRAINT "points_shop_state_singleton_check" CHECK (id = 1);

ALTER TABLE "public"."points_shop_state" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_shop_state" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_shop_state" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_shop_state" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_shop_state" TO "service_role";

ALTER TABLE "public"."points_shop_weekly_feature" ADD CONSTRAINT "points_shop_weekly_feature_code_check" CHECK (item_code = ANY (ARRAY['shield30'::text, 'upgrade'::text, 'double_pick'::text, 'lucky100'::text, 'restart'::text, 'wish'::text, 'triple_challenge'::text, 'no10'::text, 'return10'::text, 'heartbeat'::text, 'mystery_box'::text]));

ALTER TABLE "public"."points_shop_weekly_feature" ADD CONSTRAINT "points_shop_weekly_feature_pkey" PRIMARY KEY (week_start);

ALTER TABLE "public"."points_shop_weekly_feature" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_shop_weekly_feature" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_shop_weekly_feature" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_shop_weekly_feature" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_shop_weekly_feature" TO "service_role";

ALTER TABLE "public"."points_wheel_logs" ADD CONSTRAINT "points_wheel_logs_action_check" CHECK (action = ANY (ARRAY['chance_redeem'::text, 'cash_redeem'::text, 'spin_win'::text, 'legacy_chance_redeem'::text, 'legacy_balance_migration'::text, 'admin_chance_adjust'::text]));

ALTER TABLE "public"."points_wheel_logs" ADD CONSTRAINT "points_wheel_logs_cash_after_check" CHECK (cash_after >= 0);

ALTER TABLE "public"."points_wheel_logs" ADD CONSTRAINT "points_wheel_logs_cash_before_check" CHECK (cash_before >= 0);

ALTER TABLE "public"."points_wheel_logs" ADD CONSTRAINT "points_wheel_logs_chance_after_check" CHECK (chance_after >= 0);

ALTER TABLE "public"."points_wheel_logs" ADD CONSTRAINT "points_wheel_logs_chance_before_check" CHECK (chance_before >= 0);

ALTER TABLE "public"."points_wheel_logs" ADD CONSTRAINT "points_wheel_logs_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."points_wheel_logs" ADD CONSTRAINT "points_wheel_logs_prize_check" CHECK (prize_amount IS NULL OR (prize_amount = ANY (ARRAY[10, 20, 30, 50, 60, 80, 100])));

ALTER TABLE "public"."points_wheel_logs" ADD CONSTRAINT "points_wheel_logs_reason_check" CHECK (reason IS NULL OR char_length(reason) <= 500);

ALTER TABLE "public"."points_wheel_logs" ADD CONSTRAINT "points_wheel_logs_roll_check" CHECK (roll IS NULL OR roll >= 0 AND roll <= 9999);

CREATE INDEX points_wheel_logs_visible_created_idx ON public.points_wheel_logs USING btree (created_at DESC, id DESC) WHERE (hidden_at IS NULL);

CREATE TRIGGER points_notice_event AFTER INSERT OR UPDATE ON points_wheel_logs FOR EACH ROW EXECUTE FUNCTION points_notice.business_event();

ALTER TABLE "public"."points_wheel_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_wheel_logs" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_wheel_logs" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_wheel_logs" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_wheel_logs" TO "service_role";

ALTER SEQUENCE "public"."points_wheel_logs_id_seq" OWNER TO "postgres";

ALTER TABLE "public"."points_wheel_prizes" ADD CONSTRAINT "points_wheel_prizes_amount_check" CHECK (amount = ANY (ARRAY[10, 20, 30, 50, 60, 80, 100]));

ALTER TABLE "public"."points_wheel_prizes" ADD CONSTRAINT "points_wheel_prizes_order_check" CHECK (sort_order >= 1 AND sort_order <= 7);

ALTER TABLE "public"."points_wheel_prizes" ADD CONSTRAINT "points_wheel_prizes_pkey" PRIMARY KEY (amount);

ALTER TABLE "public"."points_wheel_prizes" ADD CONSTRAINT "points_wheel_prizes_probability_check" CHECK (probability_bp >= 0 AND probability_bp <= 10000);

ALTER TABLE "public"."points_wheel_prizes" ADD CONSTRAINT "points_wheel_prizes_sort_order_key" UNIQUE (sort_order);

ALTER TABLE "public"."points_wheel_prizes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_wheel_prizes" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_wheel_prizes" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_wheel_prizes" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_wheel_prizes" TO "service_role";

ALTER TABLE "public"."points_wheel_probability_logs" ADD CONSTRAINT "points_wheel_probability_logs_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."points_wheel_probability_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_wheel_probability_logs" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_wheel_probability_logs" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_wheel_probability_logs" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_wheel_probability_logs" TO "service_role";

ALTER SEQUENCE "public"."points_wheel_probability_logs_id_seq" OWNER TO "postgres";

ALTER TABLE "public"."points_wheel_probability_logs_v2" ADD CONSTRAINT "points_wheel_probability_logs_v2_after_check" CHECK (jsonb_typeof(after_config) = 'object'::text);

ALTER TABLE "public"."points_wheel_probability_logs_v2" ADD CONSTRAINT "points_wheel_probability_logs_v2_before_check" CHECK (jsonb_typeof(before_config) = 'object'::text);

ALTER TABLE "public"."points_wheel_probability_logs_v2" ADD CONSTRAINT "points_wheel_probability_logs_v2_pkey" PRIMARY KEY (id);

CREATE INDEX points_wheel_probability_logs_v2_created_idx ON public.points_wheel_probability_logs_v2 USING btree (created_at DESC, id DESC);

CREATE UNIQUE INDEX points_wheel_probability_logs_v2_legacy_idx ON public.points_wheel_probability_logs_v2 USING btree (legacy_source_id);

ALTER TABLE "public"."points_wheel_probability_logs_v2" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_wheel_probability_logs_v2" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_wheel_probability_logs_v2" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_wheel_probability_logs_v2" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_wheel_probability_logs_v2" TO "service_role";

ALTER SEQUENCE "public"."points_wheel_probability_logs_v2_id_seq" OWNER TO "postgres";

ALTER TABLE "public"."points_wheel_probability_v2" ADD CONSTRAINT "points_wheel_probability_v2_p100_check" CHECK (p100 >= 0 AND p100 <= 10000);

ALTER TABLE "public"."points_wheel_probability_v2" ADD CONSTRAINT "points_wheel_probability_v2_p10_check" CHECK (p10 >= 0 AND p10 <= 10000);

ALTER TABLE "public"."points_wheel_probability_v2" ADD CONSTRAINT "points_wheel_probability_v2_p20_check" CHECK (p20 >= 0 AND p20 <= 10000);

ALTER TABLE "public"."points_wheel_probability_v2" ADD CONSTRAINT "points_wheel_probability_v2_p30_check" CHECK (p30 >= 0 AND p30 <= 10000);

ALTER TABLE "public"."points_wheel_probability_v2" ADD CONSTRAINT "points_wheel_probability_v2_p50_check" CHECK (p50 >= 0 AND p50 <= 10000);

ALTER TABLE "public"."points_wheel_probability_v2" ADD CONSTRAINT "points_wheel_probability_v2_p60_check" CHECK (p60 >= 0 AND p60 <= 10000);

ALTER TABLE "public"."points_wheel_probability_v2" ADD CONSTRAINT "points_wheel_probability_v2_p80_check" CHECK (p80 >= 0 AND p80 <= 10000);

ALTER TABLE "public"."points_wheel_probability_v2" ADD CONSTRAINT "points_wheel_probability_v2_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."points_wheel_probability_v2" ADD CONSTRAINT "points_wheel_probability_v2_singleton_check" CHECK (id = 1);

ALTER TABLE "public"."points_wheel_probability_v2" ADD CONSTRAINT "points_wheel_probability_v2_sum_check" CHECK ((p10 + p20 + p30 + p50 + p60 + p80 + p100) = 10000);

ALTER TABLE "public"."points_wheel_probability_v2" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_wheel_probability_v2" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_wheel_probability_v2" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_wheel_probability_v2" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_wheel_probability_v2" TO "service_role";

ALTER TABLE "public"."points_wheel_state" ADD CONSTRAINT "points_wheel_state_cash_check" CHECK (cash_balance >= 0);

ALTER TABLE "public"."points_wheel_state" ADD CONSTRAINT "points_wheel_state_chances_check" CHECK (spin_chances >= 0);

ALTER TABLE "public"."points_wheel_state" ADD CONSTRAINT "points_wheel_state_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."points_wheel_state" ADD CONSTRAINT "points_wheel_state_singleton_check" CHECK (id = 1);

ALTER TABLE "public"."points_wheel_state" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_wheel_state" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_wheel_state" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_wheel_state" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_wheel_state" TO "service_role";

ALTER TABLE "public"."points_withdrawals" ADD CONSTRAINT "points_withdrawals_amount_check" CHECK (amount > 0);

ALTER TABLE "public"."points_withdrawals" ADD CONSTRAINT "points_withdrawals_cash_after_check" CHECK (cash_after >= 0);

ALTER TABLE "public"."points_withdrawals" ADD CONSTRAINT "points_withdrawals_cash_before_check" CHECK (cash_before >= 0);

ALTER TABLE "public"."points_withdrawals" ADD CONSTRAINT "points_withdrawals_cash_math_check" CHECK ((cash_before - amount) = cash_after);

ALTER TABLE "public"."points_withdrawals" ADD CONSTRAINT "points_withdrawals_legacy_wheel_log_id_key" UNIQUE (legacy_wheel_log_id);

ALTER TABLE "public"."points_withdrawals" ADD CONSTRAINT "points_withdrawals_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."points_withdrawals" ADD CONSTRAINT "points_withdrawals_settlement_check" CHECK (status = 'pending'::text AND settled_at IS NULL AND canceled_at IS NULL OR status = 'settled'::text AND settled_at IS NOT NULL AND canceled_at IS NULL OR status = 'canceled'::text AND settled_at IS NULL AND canceled_at IS NOT NULL);

ALTER TABLE "public"."points_withdrawals" ADD CONSTRAINT "points_withdrawals_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'settled'::text, 'canceled'::text]));

CREATE INDEX points_withdrawals_status_requested_idx ON public.points_withdrawals USING btree (status, requested_at DESC, id DESC);

CREATE INDEX points_withdrawals_visible_requested_idx ON public.points_withdrawals USING btree (requested_at DESC, id DESC) WHERE (hidden_at IS NULL);

CREATE TRIGGER points_notice_event AFTER INSERT OR UPDATE ON points_withdrawals FOR EACH ROW EXECUTE FUNCTION points_notice.business_event();

ALTER TABLE "public"."points_withdrawals" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."points_withdrawals" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."points_withdrawals" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_withdrawals" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."points_withdrawals" TO "service_role";

ALTER SEQUENCE "public"."points_withdrawals_id_seq" OWNER TO "postgres";

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (user_id);

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_role_check" CHECK (role = ANY (ARRAY['admin'::text, 'viewer'::text]));

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profiles" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."profiles" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."profiles" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."profiles" TO "service_role";

ALTER TABLE "public"."score_logs" ADD CONSTRAINT "score_logs_delta_check" CHECK (delta >= '-1000'::integer AND delta <= 1000 AND delta <> 0);

ALTER TABLE "public"."score_logs" ADD CONSTRAINT "score_logs_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."score_logs" ADD CONSTRAINT "score_logs_reason_check" CHECK (char_length(reason) <= 200);

CREATE INDEX score_logs_created_at_idx ON public.score_logs USING btree (created_at DESC);

CREATE INDEX score_logs_member_id_idx ON public.score_logs USING btree (member_id);

CREATE UNIQUE INDEX score_logs_unique_revert ON public.score_logs USING btree (reverts_log_id) WHERE (reverts_log_id IS NOT NULL);

CREATE TRIGGER points_notice_event AFTER INSERT OR UPDATE ON score_logs FOR EACH ROW EXECUTE FUNCTION points_notice.business_event();

ALTER TABLE "public"."score_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."score_logs" OWNER TO "postgres";

REVOKE ALL ON TABLE "public"."score_logs" FROM PUBLIC, "postgres", "service_role";

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."score_logs" TO "postgres";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE "public"."score_logs" TO "service_role";

ALTER SEQUENCE "public"."score_logs_id_seq" OWNER TO "postgres";

REVOKE ALL ON SEQUENCE "public"."score_logs_id_seq" FROM PUBLIC, "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."score_logs_id_seq" TO "postgres";

ALTER TABLE "points_kitchen_v2"."receipts" ADD CONSTRAINT "receipts_order_id_fkey" FOREIGN KEY (order_id) REFERENCES points_kitchen_orders(id);

ALTER TABLE "points_notice"."batch_items" ADD CONSTRAINT "batch_items_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES points_notice.batches(id);

ALTER TABLE "points_notice"."batch_items" ADD CONSTRAINT "batch_items_event_id_fkey" FOREIGN KEY (event_id) REFERENCES points_notice.events(id);

ALTER TABLE "points_notice"."batches" ADD CONSTRAINT "batches_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES points_push.subscriptions(id);

ALTER TABLE "points_notice"."receipts" ADD CONSTRAINT "receipts_event_id_fkey" FOREIGN KEY (event_id) REFERENCES points_notice.events(id);

ALTER TABLE "points_push"."jobs" ADD CONSTRAINT "jobs_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES points_push.subscriptions(id) ON DELETE CASCADE;

ALTER TABLE "points_push"."subscriptions" ADD CONSTRAINT "subscriptions_access_device_id_fkey" FOREIGN KEY (access_device_id) REFERENCES points_access.devices(id);

ALTER TABLE "public"."autosar_study_progress" ADD CONSTRAINT "autosar_study_progress_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."autosar_user_settings" ADD CONSTRAINT "autosar_user_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."points_fat_records" ADD CONSTRAINT "points_fat_records_recorded_by_fkey" FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."points_fat_reward_operations" ADD CONSTRAINT "points_fat_reward_operations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."points_fat_reward_operations" ADD CONSTRAINT "points_fat_reward_operations_request_id_fkey" FOREIGN KEY (request_id) REFERENCES points_fat_reward_requests(id);

ALTER TABLE "public"."points_fat_reward_requests" ADD CONSTRAINT "points_fat_reward_requests_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."points_fat_reward_week_series" ADD CONSTRAINT "points_fat_reward_week_series_week_start_fkey" FOREIGN KEY (week_start) REFERENCES points_fat_reward_weeks(week_start);

ALTER TABLE "public"."points_fat_settings" ADD CONSTRAINT "points_fat_settings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."points_kitchen_drafts" ADD CONSTRAINT "points_kitchen_drafts_order_id_fkey" FOREIGN KEY (order_id) REFERENCES points_kitchen_orders(id);

ALTER TABLE "public"."points_kitchen_drafts" ADD CONSTRAINT "points_kitchen_drafts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."points_kitchen_operations" ADD CONSTRAINT "points_kitchen_operations_order_id_fkey" FOREIGN KEY (order_id) REFERENCES points_kitchen_orders(id);

ALTER TABLE "public"."points_kitchen_orders" ADD CONSTRAINT "points_kitchen_orders_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE "public"."points_kitchen_orders" ADD CONSTRAINT "points_kitchen_orders_member_id_fkey" FOREIGN KEY (member_id) REFERENCES members(id);

ALTER TABLE "public"."points_kitchen_reviews" ADD CONSTRAINT "points_kitchen_reviews_order_id_fkey" FOREIGN KEY (order_id) REFERENCES points_kitchen_orders(id);

ALTER TABLE "public"."points_kitchen_reviews" ADD CONSTRAINT "points_kitchen_reviews_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);

ALTER TABLE "public"."points_kitchen_versions" ADD CONSTRAINT "points_kitchen_versions_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES auth.users(id);

ALTER TABLE "public"."points_kitchen_versions" ADD CONSTRAINT "points_kitchen_versions_order_id_fkey" FOREIGN KEY (order_id) REFERENCES points_kitchen_orders(id);

ALTER TABLE "public"."points_shop_admin_inventory_logs" ADD CONSTRAINT "points_shop_admin_inventory_logs_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."points_shop_spin_details" ADD CONSTRAINT "points_shop_spin_details_wheel_log_fkey" FOREIGN KEY (wheel_log_id) REFERENCES points_wheel_logs(id) ON DELETE CASCADE;

ALTER TABLE "public"."points_wheel_logs" ADD CONSTRAINT "points_wheel_logs_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."points_wheel_prizes" ADD CONSTRAINT "points_wheel_prizes_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."points_wheel_probability_logs" ADD CONSTRAINT "points_wheel_probability_logs_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."points_wheel_probability_logs_v2" ADD CONSTRAINT "points_wheel_probability_logs_v2_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."points_wheel_probability_v2" ADD CONSTRAINT "points_wheel_probability_v2_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."points_withdrawals" ADD CONSTRAINT "points_withdrawals_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."points_withdrawals" ADD CONSTRAINT "points_withdrawals_settled_by_fkey" FOREIGN KEY (settled_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."score_logs" ADD CONSTRAINT "score_logs_member_id_fkey" FOREIGN KEY (member_id) REFERENCES members(id);

ALTER TABLE "public"."score_logs" ADD CONSTRAINT "score_logs_operator_id_fkey" FOREIGN KEY (operator_id) REFERENCES auth.users(id);

ALTER TABLE "public"."score_logs" ADD CONSTRAINT "score_logs_reverts_log_id_fkey" FOREIGN KEY (reverts_log_id) REFERENCES score_logs(id);

REVOKE ALL ON FUNCTION "auth"."email"() FROM PUBLIC, "dashboard_user", "supabase_auth_admin";

GRANT EXECUTE ON FUNCTION "auth"."email"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "auth"."email"() TO "supabase_auth_admin";

GRANT EXECUTE ON FUNCTION "auth"."email"() TO "dashboard_user";

COMMENT ON FUNCTION "auth"."email"() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';

REVOKE ALL ON FUNCTION "auth"."role"() FROM PUBLIC, "dashboard_user", "supabase_auth_admin";

GRANT EXECUTE ON FUNCTION "auth"."role"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "auth"."role"() TO "supabase_auth_admin";

GRANT EXECUTE ON FUNCTION "auth"."role"() TO "dashboard_user";

COMMENT ON FUNCTION "auth"."role"() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';

REVOKE ALL ON FUNCTION "auth"."uid"() FROM PUBLIC, "dashboard_user", "supabase_auth_admin";

GRANT EXECUTE ON FUNCTION "auth"."uid"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "auth"."uid"() TO "supabase_auth_admin";

GRANT EXECUTE ON FUNCTION "auth"."uid"() TO "dashboard_user";

COMMENT ON FUNCTION "auth"."uid"() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';

REVOKE ALL ON FUNCTION "pgbouncer"."get_auth"(p_usename text) FROM PUBLIC, "pgbouncer", "supabase_admin";

GRANT EXECUTE ON FUNCTION "pgbouncer"."get_auth"(p_usename text) TO "supabase_admin";

GRANT EXECUTE ON FUNCTION "pgbouncer"."get_auth"(p_usename text) TO "pgbouncer";

REVOKE ALL ON FUNCTION "points_access"."hash"(p_value text) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "points_access"."hash"(p_value text) TO "postgres";

REVOKE ALL ON FUNCTION "points_access"."require_device"(p_lock boolean) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "points_access"."require_device"(p_lock boolean) TO "postgres";

REVOKE ALL ON FUNCTION "points_kitchen_v2"."ack"(p_versions jsonb) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "points_kitchen_v2"."ack"(p_versions jsonb) TO "postgres";

REVOKE ALL ON FUNCTION "points_kitchen_v2"."actor"() FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "points_kitchen_v2"."actor"() TO "postgres";

REVOKE ALL ON FUNCTION "points_kitchen_v2"."items"(p_items jsonb, p_custom boolean) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "points_kitchen_v2"."items"(p_items jsonb, p_custom boolean) TO "postgres";

REVOKE ALL ON FUNCTION "points_kitchen_v2"."legacy_write"(p_kind text, p_payload jsonb, p_operation_id uuid) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "points_kitchen_v2"."legacy_write"(p_kind text, p_payload jsonb, p_operation_id uuid) TO "postgres";

REVOKE ALL ON FUNCTION "points_kitchen_v2"."meal_write"(p_kind text, p_payload jsonb, p_operation_id uuid) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "points_kitchen_v2"."meal_write"(p_kind text, p_payload jsonb, p_operation_id uuid) TO "postgres";

REVOKE ALL ON FUNCTION "points_kitchen_v2"."snapshot"(p_id bigint) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "points_kitchen_v2"."snapshot"(p_id bigint) TO "postgres";

REVOKE ALL ON FUNCTION "points_kitchen_v2"."write"(p_kind text, p_payload jsonb, p_operation_id uuid) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "points_kitchen_v2"."write"(p_kind text, p_payload jsonb, p_operation_id uuid) TO "postgres";

REVOKE ALL ON FUNCTION "points_notice"."actor"() FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "points_notice"."actor"() TO "postgres";

REVOKE ALL ON FUNCTION "points_notice"."business_event"() FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "points_notice"."business_event"() TO "postgres";

REVOKE ALL ON FUNCTION "points_notice"."emit"(p_key text, p_audience text, p_category text, p_title text, p_body text, p_route text, p_group text, p_priority integer, p_push boolean, p_pending boolean) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "points_notice"."emit"(p_key text, p_audience text, p_category text, p_title text, p_body text, p_route text, p_group text, p_priority integer, p_push boolean, p_pending boolean) TO "postgres";

REVOKE ALL ON FUNCTION "points_notice"."tick"() FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "points_notice"."tick"() TO "postgres";

REVOKE ALL ON FUNCTION "points_notice"."wake"() FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "points_notice"."wake"() TO "postgres";

REVOKE ALL ON FUNCTION "points_push"."hash"(p_value text) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "points_push"."hash"(p_value text) TO "postgres";

REVOKE ALL ON FUNCTION "points_push"."kitchen_event"() FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "points_push"."kitchen_event"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."add_member"(p_name text) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."add_member"(p_name text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."change_score"(p_member_id bigint, p_delta integer, p_reason text) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."change_score"(p_member_id bigint, p_delta integer, p_reason text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."change_score_single"(p_delta integer, p_reason text) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."change_score_single"(p_delta integer, p_reason text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."change_score_single"(p_delta integer, p_reason text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."get_public_state"() FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_public_state"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_public_state"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."get_public_state"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_access_admin_code"() FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_access_admin_code"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_access_admin_code"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_access_admin_devices"() FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_access_admin_devices"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_access_admin_devices"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_access_admin_revoke"(p_device_id uuid) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_access_admin_revoke"(p_device_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_access_admin_revoke"(p_device_id uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_access_check_request"() FROM PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."points_access_check_request"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_access_check_request"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_access_check_request"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."points_access_check_request"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."points_access_get_device"() FROM PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."points_access_get_device"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_access_get_device"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_access_get_device"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."points_access_get_device"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."points_access_redeem"(p_code text, p_device_id uuid, p_device_token text, p_label text) FROM PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."points_access_redeem"(p_code text, p_device_id uuid, p_device_token text, p_label text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_access_redeem"(p_code text, p_device_id uuid, p_device_token text, p_label text) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_access_redeem"(p_code text, p_device_id uuid, p_device_token text, p_label text) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."points_access_redeem"(p_code text, p_device_id uuid, p_device_token text, p_label text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."points_admin_adjust_shop_inventory"(p_item_code text, p_delta integer) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_adjust_shop_inventory"(p_item_code text, p_delta integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_adjust_shop_inventory"(p_item_code text, p_delta integer) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_admin_adjust_wheel_chances"(p_delta integer) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_adjust_wheel_chances"(p_delta integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_adjust_wheel_chances"(p_delta integer) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_admin_get_shop_inventory"() FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_get_shop_inventory"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_get_shop_inventory"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_admin_get_wheel_probabilities"() FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_get_wheel_probabilities"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_get_wheel_probabilities"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_admin_get_wheel_probabilities_v2"() FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_get_wheel_probabilities_v2"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_get_wheel_probabilities_v2"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_admin_get_wheel_probability_logs"(p_limit integer) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_get_wheel_probability_logs"(p_limit integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_get_wheel_probability_logs"(p_limit integer) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_admin_get_wheel_probability_logs_v2"(p_limit integer) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_get_wheel_probability_logs_v2"(p_limit integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_get_wheel_probability_logs_v2"(p_limit integer) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_admin_manage_wheel_record"(p_record_type text, p_record_id bigint) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_manage_wheel_record"(p_record_type text, p_record_id bigint) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_manage_wheel_record"(p_record_type text, p_record_id bigint) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_admin_set_wheel_probabilities"(p_config jsonb) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_set_wheel_probabilities"(p_config jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_set_wheel_probabilities"(p_config jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_admin_set_wheel_probabilities_v2"(p_config jsonb) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_set_wheel_probabilities_v2"(p_config jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_set_wheel_probabilities_v2"(p_config jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_admin_settle_withdrawal"(p_withdrawal_id bigint) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_settle_withdrawal"(p_withdrawal_id bigint) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_admin_settle_withdrawal"(p_withdrawal_id bigint) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_change_score"(p_delta integer, p_reason text) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_change_score"(p_delta integer, p_reason text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_change_score"(p_delta integer, p_reason text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_fat_admin_delete_record"(p_record_id bigint) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_admin_delete_record"(p_record_id bigint) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_admin_delete_record"(p_record_id bigint) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_fat_admin_get_settings"() FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_admin_get_settings"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_admin_get_settings"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_fat_admin_record_weight"(p_weight_jin numeric) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_admin_record_weight"(p_weight_jin numeric) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_fat_admin_set_starting_weight"(p_weight_jin numeric) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_admin_set_starting_weight"(p_weight_jin numeric) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_admin_set_starting_weight"(p_weight_jin numeric) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_fat_get_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_get_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_get_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_fat_get_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_fat_get_state"() FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_get_state"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_get_state"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_fat_get_state"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_fat_reward_admin_exchange"(p_kind text, p_operation_id uuid) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_reward_admin_exchange"(p_kind text, p_operation_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_reward_admin_exchange"(p_kind text, p_operation_id uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_fat_reward_admin_resolve"(p_request_id bigint, p_confirm boolean) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_reward_admin_resolve"(p_request_id bigint, p_confirm boolean) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_reward_admin_resolve"(p_request_id bigint, p_confirm boolean) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_fat_reward_cutoff"(p_week date) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_reward_cutoff"(p_week date) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_fat_reward_delta"(p_change numeric, p_days integer, p_previous_days integer) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_reward_delta"(p_change numeric, p_days integer, p_previous_days integer) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_fat_reward_get_state"(p_before bigint) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_reward_get_state"(p_before bigint) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_reward_get_state"(p_before bigint) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_fat_reward_get_state"(p_before bigint) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_fat_reward_guest_serviced"(p_request_id bigint) FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_reward_guest_serviced"(p_request_id bigint) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_reward_guest_serviced"(p_request_id bigint) TO "anon";

REVOKE ALL ON FUNCTION "public"."points_fat_reward_reference"(p_week date) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_reward_reference"(p_week date) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_fat_reward_sample"(p_week date) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_reward_sample"(p_week date) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_fat_reward_settle_due"() FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_reward_settle_due"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_fat_reward_snapshot"(p_before bigint) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_reward_snapshot"(p_before bigint) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_fat_v2_admin_record_weight"(p_weight_jin numeric, p_bowel_status text) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_v2_admin_record_weight"(p_weight_jin numeric, p_bowel_status text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_v2_admin_record_weight"(p_weight_jin numeric, p_bowel_status text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_fat_v2_get_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_v2_get_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_v2_get_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_fat_v2_get_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_fat_v2_get_state"(p_bowel_status text) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_v2_get_state"(p_bowel_status text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_v2_get_state"(p_bowel_status text) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_fat_v2_get_state"(p_bowel_status text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_fat_v2_reward_analysis"(p_week date) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_v2_reward_analysis"(p_week date) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_fat_v2_reward_reference"(p_week date, p_status text) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_v2_reward_reference"(p_week date, p_status text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_fat_v2_reward_sample"(p_week date, p_status text) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_fat_v2_reward_sample"(p_week date, p_status text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_get_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_get_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_get_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_get_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_get_state"() FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_get_state"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_get_state"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_get_state"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_get_wheel_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_get_wheel_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_get_wheel_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_get_wheel_logs"(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_get_wheel_state"() FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_get_wheel_state"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_get_wheel_state"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_get_wheel_state"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_get_wheel_totals"() FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_get_wheel_totals"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_get_wheel_totals"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_get_wheel_totals"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_get_withdrawals"(p_limit integer) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_get_withdrawals"(p_limit integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_get_withdrawals"(p_limit integer) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_get_withdrawals"(p_limit integer) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_is_admin"() FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_is_admin"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_is_admin"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_kitchen_admin_draft"(p_order_id bigint, p_ratings jsonb) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_admin_draft"(p_order_id bigint, p_ratings jsonb) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_kitchen_admin_review"(p_order_id bigint, p_ratings jsonb, p_operation_id uuid) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_admin_review"(p_order_id bigint, p_ratings jsonb, p_operation_id uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_kitchen_admin_save"(p_items jsonb, p_note text, p_operation_id uuid, p_order_id bigint, p_version integer, p_cancel boolean) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_admin_save"(p_items jsonb, p_note text, p_operation_id uuid, p_order_id bigint, p_version integer, p_cancel boolean) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_kitchen_check"(p_admin boolean) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_check"(p_admin boolean) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_kitchen_get_order"(p_order_id bigint) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_get_order"(p_order_id bigint) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_get_order"(p_order_id bigint) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_get_order"(p_order_id bigint) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_kitchen_get_reviews"(p_slug text, p_before bigint) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_get_reviews"(p_slug text, p_before bigint) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_get_reviews"(p_slug text, p_before bigint) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_get_reviews"(p_slug text, p_before bigint) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_kitchen_get_state"(p_before bigint, p_month date) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_get_state"(p_before bigint, p_month date) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_get_state"(p_before bigint, p_month date) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_get_state"(p_before bigint, p_month date) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_kitchen_guest_ack"(p_versions jsonb) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_guest_ack"(p_versions jsonb) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_kitchen_guest_resolve"(p_order_id bigint, p_version integer, p_reject boolean, p_reason text, p_operation_id uuid) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_guest_resolve"(p_order_id bigint, p_version integer, p_reject boolean, p_reason text, p_operation_id uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_kitchen_guest_seen"(p_order_id bigint, p_version integer) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_guest_seen"(p_order_id bigint, p_version integer) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_kitchen_operation"(p_id uuid, p_kind text, p_args jsonb) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_operation"(p_id uuid, p_kind text, p_args jsonb) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_kitchen_order_json"(p_id bigint) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_order_json"(p_id bigint) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_kitchen_v2_admin_ack"(p_versions jsonb) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_admin_ack"(p_versions jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_admin_ack"(p_versions jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_kitchen_v2_admin_draft"(p_order_id bigint, p_version integer, p_ratings jsonb) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_admin_draft"(p_order_id bigint, p_version integer, p_ratings jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_admin_draft"(p_order_id bigint, p_version integer, p_ratings jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_kitchen_v2_admin_review"(p_order_id bigint, p_version integer, p_ratings jsonb, p_operation_id uuid) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_admin_review"(p_order_id bigint, p_version integer, p_ratings jsonb, p_operation_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_admin_review"(p_order_id bigint, p_version integer, p_ratings jsonb, p_operation_id uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_kitchen_v2_admin_save"(p_items jsonb, p_note text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_admin_save"(p_items jsonb, p_note text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_admin_save"(p_items jsonb, p_note text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_kitchen_v2_get_order"(p_order_id bigint) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_get_order"(p_order_id bigint) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_get_order"(p_order_id bigint) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_get_order"(p_order_id bigint) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_kitchen_v2_get_reviews"(p_slug text, p_before bigint) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_get_reviews"(p_slug text, p_before bigint) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_get_reviews"(p_slug text, p_before bigint) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_get_reviews"(p_slug text, p_before bigint) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_kitchen_v2_get_state"(p_before bigint, p_month date) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_get_state"(p_before bigint, p_month date) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_get_state"(p_before bigint, p_month date) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_get_state"(p_before bigint, p_month date) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_kitchen_v2_guest_ack"(p_versions jsonb) FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_guest_ack"(p_versions jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_guest_ack"(p_versions jsonb) TO "anon";

REVOKE ALL ON FUNCTION "public"."points_kitchen_v2_guest_resolve"(p_order_id bigint, p_version integer, p_reject boolean, p_reason text, p_operation_id uuid) FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_guest_resolve"(p_order_id bigint, p_version integer, p_reject boolean, p_reason text, p_operation_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_guest_resolve"(p_order_id bigint, p_version integer, p_reject boolean, p_reason text, p_operation_id uuid) TO "anon";

REVOKE ALL ON FUNCTION "public"."points_kitchen_v2_guest_save"(p_items jsonb, p_note text, p_meal_date date, p_meal text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid) FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_guest_save"(p_items jsonb, p_note text, p_meal_date date, p_meal text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_guest_save"(p_items jsonb, p_note text, p_meal_date date, p_meal text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid) TO "anon";

REVOKE ALL ON FUNCTION "public"."points_kitchen_v2_guest_seen"(p_order_id bigint, p_version integer) FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_guest_seen"(p_order_id bigint, p_version integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v2_guest_seen"(p_order_id bigint, p_version integer) TO "anon";

REVOKE ALL ON FUNCTION "public"."points_kitchen_v3_admin_review"(p_order_id bigint, p_version integer, p_ratings jsonb, p_operation_id uuid) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v3_admin_review"(p_order_id bigint, p_version integer, p_ratings jsonb, p_operation_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v3_admin_review"(p_order_id bigint, p_version integer, p_ratings jsonb, p_operation_id uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_kitchen_v3_admin_save"(p_items jsonb, p_note text, p_meal_date date, p_meal text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v3_admin_save"(p_items jsonb, p_note text, p_meal_date date, p_meal text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v3_admin_save"(p_items jsonb, p_note text, p_meal_date date, p_meal text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_kitchen_v3_get_meal"(p_meal_date date, p_meal text) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v3_get_meal"(p_meal_date date, p_meal text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v3_get_meal"(p_meal_date date, p_meal text) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v3_get_meal"(p_meal_date date, p_meal text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_kitchen_v3_get_order"(p_order_id bigint) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v3_get_order"(p_order_id bigint) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v3_get_order"(p_order_id bigint) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v3_get_order"(p_order_id bigint) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_kitchen_v3_get_state"(p_before bigint, p_month date) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v3_get_state"(p_before bigint, p_month date) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v3_get_state"(p_before bigint, p_month date) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v3_get_state"(p_before bigint, p_month date) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_kitchen_v3_guest_resolve"(p_order_id bigint, p_version integer, p_reject boolean, p_reason text, p_operation_id uuid) FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v3_guest_resolve"(p_order_id bigint, p_version integer, p_reject boolean, p_reason text, p_operation_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v3_guest_resolve"(p_order_id bigint, p_version integer, p_reject boolean, p_reason text, p_operation_id uuid) TO "anon";

REVOKE ALL ON FUNCTION "public"."points_kitchen_v3_guest_save"(p_items jsonb, p_note text, p_meal_date date, p_meal text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid) FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v3_guest_save"(p_items jsonb, p_note text, p_meal_date date, p_meal text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_v3_guest_save"(p_items jsonb, p_note text, p_meal_date date, p_meal text, p_order_id bigint, p_version integer, p_cancel boolean, p_operation_id uuid) TO "anon";

REVOKE ALL ON FUNCTION "public"."points_kitchen_validate_ratings"(p_items jsonb, p_ratings jsonb, p_complete boolean) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_kitchen_validate_ratings"(p_items jsonb, p_ratings jsonb, p_complete boolean) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_notice_worker_claim"() FROM PUBLIC, "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."points_notice_worker_claim"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_notice_worker_claim"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."points_notice_worker_finish"(p_id bigint, p_lease uuid, p_code integer) FROM PUBLIC, "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."points_notice_worker_finish"(p_id bigint, p_lease uuid, p_code integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_notice_worker_finish"(p_id bigint, p_lease uuid, p_code integer) TO "service_role";

REVOKE ALL ON FUNCTION "public"."points_notice_worker_validate"(p_id bigint, p_lease uuid) FROM PUBLIC, "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."points_notice_worker_validate"(p_id bigint, p_lease uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_notice_worker_validate"(p_id bigint, p_lease uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."points_notifications_ack"(p_ids bigint[], p_read boolean) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_notifications_ack"(p_ids bigint[], p_read boolean) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_notifications_ack"(p_ids bigint[], p_read boolean) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_notifications_ack"(p_ids bigint[], p_read boolean) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_notifications_get"(p_before bigint) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_notifications_get"(p_before bigint) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_notifications_get"(p_before bigint) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_notifications_get"(p_before bigint) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_notifications_preferences"(p_categories text[], p_quiet boolean, p_night_important boolean) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_notifications_preferences"(p_categories text[], p_quiet boolean, p_night_important boolean) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_notifications_preferences"(p_categories text[], p_quiet boolean, p_night_important boolean) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_notifications_preferences"(p_categories text[], p_quiet boolean, p_night_important boolean) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_preview_wheel"() FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_preview_wheel"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_preview_wheel"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_preview_wheel"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_push_admin_pairing"() FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_push_admin_pairing"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_push_get_subscription"(p_device_token text) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_push_get_subscription"(p_device_token text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_push_get_subscription"(p_device_token text) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_push_get_subscription"(p_device_token text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_push_register"(p_device_token text, p_subscription jsonb, p_public_key text, p_pairing_code text) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_push_register"(p_device_token text, p_subscription jsonb, p_public_key text, p_pairing_code text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_push_register"(p_device_token text, p_subscription jsonb, p_public_key text, p_pairing_code text) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_push_register"(p_device_token text, p_subscription jsonb, p_public_key text, p_pairing_code text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_push_remove"(p_device_token text) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_push_remove"(p_device_token text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_push_remove"(p_device_token text) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_push_remove"(p_device_token text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_push_test"(p_device_token text) FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_push_test"(p_device_token text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_push_test"(p_device_token text) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_push_test"(p_device_token text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_push_worker_claim"() FROM PUBLIC, "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."points_push_worker_claim"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_push_worker_claim"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."points_push_worker_config"() FROM PUBLIC, "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."points_push_worker_config"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_push_worker_config"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."points_push_worker_finish"(p_id bigint, p_lease uuid, p_code integer) FROM PUBLIC, "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."points_push_worker_finish"(p_id bigint, p_lease uuid, p_code integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_push_worker_finish"(p_id bigint, p_lease uuid, p_code integer) TO "service_role";

REVOKE ALL ON FUNCTION "public"."points_push_worker_initialize"(p_admin_id uuid, p_app_url text, p_backend_url text, p_public_key text, p_private_key text, p_subject text) FROM PUBLIC, "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."points_push_worker_initialize"(p_admin_id uuid, p_app_url text, p_backend_url text, p_public_key text, p_private_key text, p_subject text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_push_worker_initialize"(p_admin_id uuid, p_app_url text, p_backend_url text, p_public_key text, p_private_key text, p_subject text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."points_push_worker_settings"() FROM PUBLIC, "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."points_push_worker_settings"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_push_worker_settings"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."points_redeem_cash"() FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_redeem_cash"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_redeem_cash"() TO "anon";

REVOKE ALL ON FUNCTION "public"."points_redeem_wheel_chance"() FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_redeem_wheel_chance"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_redeem_wheel_chance"() TO "anon";

REVOKE ALL ON FUNCTION "public"."points_request_withdrawal"(p_amount integer) FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_request_withdrawal"(p_amount integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_request_withdrawal"(p_amount integer) TO "anon";

REVOKE ALL ON FUNCTION "public"."points_reset_score"(p_confirm_discard boolean) FROM PUBLIC, "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_reset_score"(p_confirm_discard boolean) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_reset_score"(p_confirm_discard boolean) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_secure_roll_10000"() FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_secure_roll_10000"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_shop_ack_admin_grants"() FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_ack_admin_grants"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_ack_admin_grants"() TO "anon";

REVOKE ALL ON FUNCTION "public"."points_shop_activate_challenge_v2"() FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_activate_challenge_v2"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_activate_challenge_v2"() TO "anon";

REVOKE ALL ON FUNCTION "public"."points_shop_activate_lucky100"() FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_activate_lucky100"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_activate_lucky100"() TO "anon";

REVOKE ALL ON FUNCTION "public"."points_shop_activate_lucky100_v2"() FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_activate_lucky100_v2"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_activate_lucky100_v2"() TO "anon";

REVOKE ALL ON FUNCTION "public"."points_shop_claim_weekly_mystery_box"() FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_claim_weekly_mystery_box"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_claim_weekly_mystery_box"() TO "anon";

REVOKE ALL ON FUNCTION "public"."points_shop_current_week_start"() FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_current_week_start"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_shop_ensure_weekly_feature_v3"() FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_ensure_weekly_feature_v3"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_shop_get_state"() FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_get_state"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_get_state"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_shop_get_state"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_shop_get_state_v2"() FROM PUBLIC, "anon", "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_get_state_v2"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_get_state_v2"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."points_shop_get_state_v2"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."points_shop_get_unseen_admin_grants"() FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_get_unseen_admin_grants"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_get_unseen_admin_grants"() TO "anon";

REVOKE ALL ON FUNCTION "public"."points_shop_grant_mystery_reward"(p_source text) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_grant_mystery_reward"(p_source text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_shop_open_free_mystery_box"() FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_open_free_mystery_box"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_open_free_mystery_box"() TO "anon";

REVOKE ALL ON FUNCTION "public"."points_shop_open_mystery_box"() FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_open_mystery_box"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_open_mystery_box"() TO "anon";

REVOKE ALL ON FUNCTION "public"."points_shop_prepare_spin_v2"(p_item_code text, p_param integer, p_activate_potion boolean, p_activate_challenge boolean) FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_prepare_spin_v2"(p_item_code text, p_param integer, p_activate_potion boolean, p_activate_challenge boolean) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_prepare_spin_v2"(p_item_code text, p_param integer, p_activate_potion boolean, p_activate_challenge boolean) TO "anon";

REVOKE ALL ON FUNCTION "public"."points_shop_prize_for_roll"(p_roll integer, p_lucky100 boolean) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_prize_for_roll"(p_roll integer, p_lucky100 boolean) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_shop_prize_for_roll_v2"(p_roll integer, p_lucky100 boolean, p_no10 boolean) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_prize_for_roll_v2"(p_roll integer, p_lucky100 boolean, p_no10 boolean) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_shop_purchase"(p_item_code text) FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_purchase"(p_item_code text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_purchase"(p_item_code text) TO "anon";

REVOKE ALL ON FUNCTION "public"."points_shop_purchase_v2"(p_item_code text) FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_purchase_v2"(p_item_code text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_purchase_v2"(p_item_code text) TO "anon";

REVOKE ALL ON FUNCTION "public"."points_shop_resolve_pending_spin_v2"(p_choice text) FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_resolve_pending_spin_v2"(p_choice text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_resolve_pending_spin_v2"(p_choice text) TO "anon";

REVOKE ALL ON FUNCTION "public"."points_shop_set_equipped"(p_item_code text) FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_set_equipped"(p_item_code text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_set_equipped"(p_item_code text) TO "anon";

REVOKE ALL ON FUNCTION "public"."points_shop_set_selection_v2"(p_item_code text, p_param integer) FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_set_selection_v2"(p_item_code text, p_param integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_set_selection_v2"(p_item_code text, p_param integer) TO "anon";

REVOKE ALL ON FUNCTION "public"."points_shop_settle_spin_v2"(p_chance_before integer, p_reserved boolean, p_roll1 integer, p_prize1 integer, p_roll2 integer, p_prize2 integer, p_visual_prize integer, p_payout integer, p_modifier text, p_wish_target integer, p_lucky_applied boolean, p_refund_chance boolean, p_decision_type text, p_decision_choice text, p_consume_modifier boolean) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_settle_spin_v2"(p_chance_before integer, p_reserved boolean, p_roll1 integer, p_prize1 integer, p_roll2 integer, p_prize2 integer, p_visual_prize integer, p_payout integer, p_modifier text, p_wish_target integer, p_lucky_applied boolean, p_refund_chance boolean, p_decision_type text, p_decision_choice text, p_consume_modifier boolean) TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_shop_spin_wheel"() FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_spin_wheel"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_spin_wheel"() TO "anon";

REVOKE ALL ON FUNCTION "public"."points_shop_spin_wheel_v2"() FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_spin_wheel_v2"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_spin_wheel_v2"() TO "anon";

REVOKE ALL ON FUNCTION "public"."points_shop_state_json_v2"() FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_shop_state_json_v2"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."points_spin_wheel"() FROM PUBLIC, "anon", "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_spin_wheel"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_spin_wheel"() TO "anon";

REVOKE ALL ON FUNCTION "public"."points_wheel_prize_for_roll"(p_roll integer) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."points_wheel_prize_for_roll"(p_roll integer) TO "postgres";

REVOKE ALL ON FUNCTION "public"."reset_score"(p_member_id bigint) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."reset_score"(p_member_id bigint) TO "postgres";

REVOKE ALL ON FUNCTION "public"."reset_score"() FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."reset_score"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."set_member_active"(p_member_id bigint, p_active boolean) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_member_active"(p_member_id bigint, p_active boolean) TO "postgres";

REVOKE ALL ON FUNCTION "public"."undo_score_log"(p_log_id bigint) FROM PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."undo_score_log"(p_log_id bigint) TO "postgres";

REVOKE ALL ON SCHEMA "points_access" FROM PUBLIC, "postgres";

GRANT USAGE, CREATE ON SCHEMA "points_access" TO "postgres";

REVOKE ALL ON SCHEMA "points_kitchen_v2" FROM PUBLIC, "postgres";

GRANT USAGE, CREATE ON SCHEMA "points_kitchen_v2" TO "postgres";

REVOKE ALL ON SCHEMA "points_notice" FROM PUBLIC, "postgres";

GRANT USAGE, CREATE ON SCHEMA "points_notice" TO "postgres";

REVOKE ALL ON SCHEMA "points_push" FROM PUBLIC, "postgres";

GRANT USAGE, CREATE ON SCHEMA "points_push" TO "postgres";

REVOKE ALL ON SCHEMA "public" FROM PUBLIC, "anon", "authenticated", "pg_database_owner", "postgres", "service_role";

GRANT USAGE, CREATE ON SCHEMA "public" TO "pg_database_owner";

GRANT USAGE ON SCHEMA "public" TO PUBLIC;

GRANT USAGE ON SCHEMA "public" TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "anon";

GRANT USAGE ON SCHEMA "public" TO "authenticated";

GRANT USAGE ON SCHEMA "public" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM PUBLIC, "anon", "authenticated", "postgres", "service_role", "supabase_admin";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" REVOKE ALL ON TABLES FROM PUBLIC, "anon", "authenticated", "postgres", "service_role", "supabase_admin";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM PUBLIC, "anon", "authenticated", "postgres", "service_role", "supabase_admin";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM PUBLIC, "anon", "authenticated", "postgres", "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM PUBLIC, "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM PUBLIC, "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "postgres";

SET check_function_bodies = true;
