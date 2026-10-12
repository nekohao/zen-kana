// Upgrade the original structural reference with the actual current increment.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(process.env.TEMP+'/zen-kana-preview-runtime/node_modules/@electric-sql/pglite/dist/index.js'));
const original=JSON.parse(await fs.readFile(new URL('../sql-backup/online-confirmed.json',import.meta.url),'utf8'));
const current=JSON.parse(await fs.readFile(new URL('../sql-backup/current-schema.json',import.meta.url),'utf8'));
const increment=await fs.readFile(new URL('../schema-increment.sql',import.meta.url),'utf8');
const baseline=execFileSync('python',['-c',"import runpy,json,sys; renderer=runpy.run_path('points/build-sql-backup.py'); print(renderer['render'](json.load(sys.stdin)),end='')"],{input:JSON.stringify(original),encoding:'utf8',maxBuffer:4000000});
const db=new PGlite();let checks=0;const check=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
try{
 await db.exec('CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE ROLE supabase_admin;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE SCHEMA extensions;');
 const objects=[...current.schemas,...current.relations,...current.functions,...current.default_privileges];
 const roles=objects.flatMap(o=>[o.owner,...[...(o.acl||'').matchAll(/(?:\{|,)([^=]+)=/g)].map(m=>m[1])]);
 for(const role of new Set(roles.filter(Boolean)))if(!(await db.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[role])).rows.length)await db.exec('CREATE ROLE "'+role.replaceAll('"','""')+'";');
 await db.exec(baseline);await db.exec(increment);
 for(const f of current.functions.filter(f=>f.name.startsWith('points_family_')||f.name==='business_event'||f.name==='points_fat_reward_snapshot')){
  const actual=(await db.query('SELECT pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=$1 AND p.proname=$2 AND pg_get_function_identity_arguments(p.oid)=$3',[f.schema,f.name,f.identity_arguments])).rows[0].definition;
  check(actual.trim().replace(/;$/,'').replace(/\r\n/g,'\n'),f.definition.trim().replace(/;$/,'').replace(/\r\n/g,'\n'),f.name+' latest definition installed');
 }
 for(const rel of current.relations.filter(r=>r.name.startsWith('points_family_')&&r.kind==='r')){
  const actual=(await db.query('SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=$2',[rel.schema,rel.name])).rows[0];check(actual.relrowsecurity,true,rel.name+' RLS');
 }
 await db.exec(increment);check((await db.query('SELECT count(*)::integer n FROM points_family_types')).rows[0].n,6,'repeat does not duplicate types');
 check((await db.query("SELECT has_function_privilege('anon','public.points_kitchen_v3_guest_save(jsonb,text,date,text,bigint,integer,boolean,uuid)','EXECUTE') allowed")).rows[0].allowed,false,'old writer stays disabled');
 check((await db.query("SELECT has_function_privilege('anon','public.points_family_get_state(boolean,bigint)','EXECUTE') allowed")).rows[0].allowed,true,'current reader installed');
 console.log(checks+' original-to-current increment, exact function definitions, repeatability and permissions checks passed.');
}finally{await db.close();}
