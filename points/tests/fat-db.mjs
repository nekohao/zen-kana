// Test/preview only. This module never connects to Supabase.
import fs from './database-source.mjs';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(process.env.TEMP+'/zen-kana-preview-runtime/node_modules/@electric-sql/pglite/dist/index.js'));
export async function createFatDatabase({seed=false}={}) {
  const db=new PGlite();
  try {
    await db.exec(await fs.readFile(new URL('./fat-existing-schema.sql',import.meta.url),'utf8'));
    if(seed)await db.query('INSERT INTO public.points_fat_records(weight_jin) VALUES(160.5)');
    await db.exec(await fs.readFile(new URL('../fat-status-increment-20261009.sql',import.meta.url),'utf8'));
    if(seed)for(const [status,count,weight] of [['before',3,158],['after',4,157]]) {
      for(let i=0;i<count;i++)await db.query('INSERT INTO public.points_fat_records(weight_jin,bowel_status,created_at) VALUES($1,$2,$3)',[weight,status,new Date(Date.now()-i*86400000).toISOString()]);
    }
  } catch(error){await db.close();throw error;}
  const tableResults=new Set(['points_fat_v2_get_state','points_fat_v2_get_logs','points_fat_v2_admin_record_weight','points_fat_admin_get_settings','points_fat_get_state','points_fat_get_logs']);
  const allowed=new Set([...tableResults,'points_fat_admin_delete_record','points_fat_admin_set_starting_weight','points_fat_reward_get_state','points_fat_reward_admin_exchange','points_fat_reward_admin_resolve','points_fat_reward_guest_serviced']);
  async function rpc(role,name,args={}) {
    if(!allowed.has(name))throw Object.assign(Error('Unavailable preview RPC'),{code:'PGRST202'});
    const entries=Object.entries(args);if(entries.some(([key])=>!/^p_[a-z_]+$/.test(key)))throw Error('Invalid argument');
    return db.transaction(async tx=>{
      await tx.exec(`SET LOCAL ROLE ${role==='guest'?'anon':'authenticated'}`);
      await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[role==='guest'?'':role==='admin'?'00000000-0000-0000-0000-000000000001':'00000000-0000-0000-0000-000000000002']);
      const placeholders=entries.map(([key],i)=>`${key}=>$${i+1}`).join(',');
      const {rows}=await tx.query(`SELECT * FROM public.${name}(${placeholders})`,entries.map(([,value])=>value));
      return tableResults.has(name)?rows:Object.values(rows[0] || {})[0] ?? null;
    });
  }
  return {db,rpc};
}
