import fs from './database-source.mjs';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(process.env.TEMP+'/zen-kana-preview-runtime/node_modules/@electric-sql/pglite/dist/index.js'));
export async function createNotificationsDatabase(){
  const db=new PGlite();
  await db.exec(await fs.readFile(new URL('notifications-existing-schema.sql',import.meta.url),'utf8'));
  // Test doubles for hosted extensions; never used in the deployed SQL.
  await db.exec(`CREATE SCHEMA vault;CREATE SCHEMA net;CREATE SCHEMA cron;
    CREATE TABLE vault.decrypted_secrets(id uuid PRIMARY KEY,decrypted_secret text,name text);
    REVOKE ALL ON vault.decrypted_secrets FROM PUBLIC,anon,authenticated;
    CREATE FUNCTION vault.create_secret(text,text DEFAULT NULL,text DEFAULT NULL,uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql AS $$ DECLARE id uuid:=gen_random_uuid();BEGIN INSERT INTO vault.decrypted_secrets VALUES(id,$1,$2);RETURN id;END $$;
    CREATE TABLE cron.job(jobid bigint GENERATED ALWAYS AS IDENTITY,jobname text,schedule text,command text);
    CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE plpgsql AS $$ DECLARE id bigint;BEGIN INSERT INTO cron.job(jobname,schedule,command)VALUES($1,$2,$3)RETURNING jobid INTO id;RETURN id;END $$;
    CREATE FUNCTION cron.unschedule(bigint) RETURNS boolean LANGUAGE sql AS $$ DELETE FROM cron.job WHERE jobid=$1 RETURNING true $$;
    CREATE FUNCTION net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;`);
  await db.exec(await fs.readFile(new URL('../kitchen-increment-20261008.sql',import.meta.url),'utf8'));
  const source=await fs.readFile(new URL('../notifications-setup-20261009.sql',import.meta.url),'utf8');
  const sql=source.replace(/^CREATE EXTENSION .*;$/gm,'');
  await db.exec(sql);
  async function context(role,name,token=null){
    await db.query("SELECT set_config('test.role',$1,false),set_config('request.path',$2,false),set_config('request.headers',$3,false),set_config('request.jwt.claims',$4,false)",
      [role,'rpc/'+name,JSON.stringify({'x-client-info':'test'+(token?';points-device='+token:'')}),JSON.stringify({role:role==='service'?'service_role':role==='admin'?'authenticated':'anon'})]);
  }
  async function call(role,name,args={},token=null){
    await context(role,name,token);await db.query('SELECT public.points_access_check_request()');
    const entries=Object.entries(args);if(!/^points_[a-z0-9_]+$/.test(name) || entries.some(([k])=>!/^p_[a-z_]+$/.test(k)))throw Error('Invalid test RPC');
    const values=entries.map(([key],i)=>`${key}=>$${i+1}`).join(',');
    const result=await db.query(`SELECT public.${name}(${values}) AS result`,entries.map(([,v])=>v!==null && typeof v==='object' && !Array.isArray(v)?JSON.stringify(v):v));return result.rows[0].result;
  }
  return {db,call,context,reapply:()=>db.exec(sql)};
}


