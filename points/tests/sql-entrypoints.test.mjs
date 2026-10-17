// Upgrade the explicitly selected preceding release with only the current change.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {readIncrementBase} from './database-source.mjs';
const {PGlite}=await import(pathToFileURL(process.env.TEMP+'/zen-kana-preview-runtime/node_modules/@electric-sql/pglite/dist/index.js'));
const original=(await readIncrementBase()).schema;
const current=JSON.parse(await fs.readFile(new URL('../sql-backup/current-schema.json',import.meta.url),'utf8'));
const increment=await fs.readFile(new URL('../schema-increment.sql',import.meta.url),'utf8');
const baseline=execFileSync('python',['-X','utf8','-c',"import runpy,json,sys; renderer=runpy.run_path('points/scripts/build-sql-backup.py'); print(renderer['render'](json.load(sys.stdin)),end='')"],{input:JSON.stringify(original),encoding:'utf8',maxBuffer:4000000});
const db=new PGlite();let checks=0;const check=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
try{
 const changed=current.functions.filter(f=>JSON.stringify(f)!==JSON.stringify(original.functions.find(o=>o.schema===f.schema&&o.name===f.name&&o.identity_arguments===f.identity_arguments)));
 const definitions=[...increment.matchAll(/CREATE OR REPLACE FUNCTION\s+"?([\w]+)"?\."?([\w]+)"?\(/g)].map(m=>m[1]+'.'+m[2]).sort();
 check(definitions,changed.map(f=>f.schema+'.'+f.name).sort(),'increment includes exactly changed functions, no historical definitions');
 check(/CREATE TABLE|CREATE SCHEMA|points_fat_reward_snapshot/.test(increment),false,'recipe change does not replay historical setup or reward upgrades');
 await db.exec('CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE ROLE supabase_admin;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE SCHEMA extensions;');
 const objects=[...current.schemas,...current.relations,...current.functions,...current.default_privileges];
 const roles=objects.flatMap(o=>[o.owner,...[...(o.acl||'').matchAll(/(?:\{|,)([^=]+)=/g)].map(m=>m[1])]);
 for(const role of new Set(roles.filter(Boolean)))if(!(await db.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[role])).rows.length)await db.exec('CREATE ROLE "'+role.replaceAll('"','""')+'";');
 await db.exec(baseline);
 const snapshot=original.functions.find(f=>f.name==='points_family_snapshot');
 await db.exec(snapshot.definition.replace('AS $function$','AS $function$\n-- unexpected database change'));
 await assert.rejects(db.exec(increment),/Database baseline differs for points_family_snapshot/);checks++;
 await db.exec('ROLLBACK;');await db.exec(snapshot.definition);
 await db.exec(increment);
 for(const f of current.functions.filter(f=>f.name.startsWith('points_family_')||f.name==='points_notifications_get_todos'||f.name==='business_event'||f.name==='points_notice_worker_claim'||f.name==='points_fat_reward_snapshot'||/score|points_get_logs|points_get_state|points_redeem|points_shop_(get_state|purchase|activate_lucky100|set_equipped)|legacy_write|points_kitchen_admin_review/.test(f.name))){
  const actual=(await db.query('SELECT pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=$1 AND p.proname=$2 AND pg_get_function_identity_arguments(p.oid)=$3',[f.schema,f.name,f.identity_arguments])).rows[0].definition;
  check(actual.trim().replace(/;$/,'').replace(/\r\r\n|\r\n|\r/g,'\n'),f.definition.trim().replace(/;$/,'').replace(/\r\r\n|\r\n|\r/g,'\n'),f.name+' latest definition installed');
 }
 for(const rel of current.relations.filter(r=>r.name.startsWith('points_family_')&&r.kind==='r')){
  const actual=(await db.query('SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=$2',[rel.schema,rel.name])).rows[0];check(actual.relrowsecurity,true,rel.name+' RLS');
 }
 await db.exec(increment);check((await db.query('SELECT count(*)::integer n FROM points_family_types')).rows[0].n,6,'repeat does not duplicate types');
 check((await db.query("SELECT has_function_privilege('anon','public.points_kitchen_v3_guest_save(jsonb,text,date,text,bigint,integer,boolean,uuid)','EXECUTE') allowed")).rows[0].allowed,false,'old writer stays disabled');
 check((await db.query("SELECT has_function_privilege('anon','public.points_family_get_state(boolean,bigint)','EXECUTE') allowed")).rows[0].allowed,true,'current reader installed');
 const adminId='00000000-0000-0000-0000-000000000001';
 await db.query('INSERT INTO auth.users(id) VALUES($1)',[adminId]);
 await db.query("INSERT INTO public.profiles(user_id,role) VALUES($1,'admin')",[adminId]);
 await db.exec("INSERT INTO public.members(id,name,score) VALUES(1,'半分测试',10); INSERT INTO public.points_wheel_state(id) VALUES(1); INSERT INTO public.points_shop_inventory(item_code) VALUES('wish'); INSERT INTO public.points_shop_state(id) VALUES(1);");
 await db.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:adminId,role:'authenticated'})]);
 const family=async(action,payload,operation=crypto.randomUUID())=>(await db.query('SELECT public.points_family_write($1,$2::jsonb,$3::uuid) result',[action,JSON.stringify(payload),operation])).rows[0].result;
 await family('price',{type:'dishes',version:1,points:0.5});
 let task=await family('create',{type:'dishes'});
 await db.query("UPDATE public.points_family_tasks SET status='review',attempt=1 WHERE id=$1",[task.id]);
 task=await family('review',{id:task.id,version:task.version,qualified:true});check(task.score_after,10.5,'actual full-schema fractional settlement');
 check(Number((await db.query('SELECT score FROM public.points_get_state()')).rows[0].score),10.5,'fractional score reader');
 check(Number((await db.query("SELECT score FROM public.points_change_score(1,'整数加分')")).rows[0].score),11.5,'integer adjustment preserves half-point balance');
 const logs=(await db.query('SELECT * FROM public.points_get_logs()')).rows;
 check(Number(logs.find(l=>Number(l.delta)===0.5).score_after),10.5,'fractional log after');
 check(Number(logs.find(l=>Number(l.delta)===0.5).score_before),10,'fractional log before');
 await db.query("SELECT set_config('request.jwt.claims','{}',false)");
 check(Number((await db.query('SELECT score FROM public.points_redeem_wheel_chance()')).rows[0].score),1.5,'wheel redemption preserves remainder');
 check((await db.query("SELECT public.points_shop_purchase_v2('wish') result")).rows[0].result.score,0.5,'shop purchase preserves remainder');
 check(Number((await db.query('SELECT score FROM public.points_shop_get_state()')).rows[0].score),0.5,'shop reader preserves remainder');
 await db.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:adminId,role:'authenticated'})]);
 await db.exec('UPDATE public.members SET score=6.5 WHERE id=1;');
 check(Number((await db.query('SELECT score FROM public.points_reset_score(false)')).rows[0].score),5,'reset exact half-point delta');
 check(Number((await db.query("SELECT delta FROM public.score_logs WHERE reason='重置到初始值 5' ORDER BY id DESC LIMIT 1")).rows[0].delta),-1.5,'reset log does not round');
 await db.exec(increment);
 check(Number((await db.query("SELECT points FROM public.points_family_types WHERE code='dishes'")).rows[0].points),0.5,'rerun preserves configured half-point value');
 console.log(checks+' preceding-release-to-current delta, exact changed scope, definitions, repeatability and permissions checks passed.');
}finally{await db.close();}
