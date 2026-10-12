// Restore the complete exported application structure into disposable PostgreSQL.
import fs from './database-source.mjs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(process.env.TEMP+'/zen-kana-preview-runtime/node_modules/@electric-sql/pglite/dist/index.js'));
const db=new PGlite();
const schema=JSON.parse(await fs.readFile(new URL('../sql-backup/current-schema.json',import.meta.url),'utf8'));
const full=await fs.readFile(new URL('../schema-full.sql',import.meta.url),'utf8');
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE ROLE supabase_admin;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE SCHEMA extensions;`);
  const objects=[...schema.schemas,...schema.relations,...schema.functions,...schema.default_privileges];
  const roles=objects.flatMap(o=>[o.owner,...[...(o.acl||'').matchAll(/(?:\{|,)([^=]+)=/g)].map(m=>m[1])]);
  for(const owner of new Set(roles.filter(Boolean))) {
    if(!(await db.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[owner])).rows.length)await db.exec('CREATE ROLE "'+owner.replaceAll('"','""')+'";');
  }
  await db.exec(full);
  for(const rel of schema.relations) {
    const row=(await db.query('SELECT c.relkind,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=$2',[rel.schema,rel.name])).rows[0];
    assert.equal(row?.relkind,rel.kind,rel.name);
    assert.equal(row.relrowsecurity,rel.row_security,rel.name+' RLS');
    assert.equal(row.relforcerowsecurity,rel.force_row_security,rel.name+' forced RLS');
  }
  assert.equal((await db.query("SELECT count(*) AS n FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=ANY($1)",[schema.schemas.map(s=>s.name).concat('auth')])).rows[0].n,schema.functions.length);
  assert.equal((await db.query("SELECT has_function_privilege('anon','public.points_fat_reward_get_state(bigint)','EXECUTE') AS ok")).rows[0].ok,true);
  assert.equal((await db.query("SELECT has_function_privilege('anon','public.points_fat_reward_snapshot(bigint)','EXECUTE') AS ok")).rows[0].ok,false);
  assert.equal((await db.query("SELECT has_table_privilege('anon','public.points_fat_records','SELECT') AS ok")).rows[0].ok,false);
  console.log(`${schema.relations.length} relations / ${schema.functions.length} full definitions restored; RLS and guest grants verified.`);
}catch(error){console.error(error.message,error.code);process.exitCode=1;}finally{await db.close();}
