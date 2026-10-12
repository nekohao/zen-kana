import fs from 'node:fs/promises';
import {createNotificationsDatabase} from './notifications-db.mjs';
export const demoToken='e'.repeat(64);
export async function createFamilyDatabase({beforeMigration}={}){
 const base=await createNotificationsDatabase();
 try {
  await base.db.exec(await fs.readFile(new URL('../kitchen-meals-increment-20261010.sql',import.meta.url),'utf8'));
  const code=await base.call('admin','points_access_admin_code');
  await base.call('guest','points_access_redeem',{p_code:code.code,p_device_id:'00000000-0000-0000-0000-000000000003',p_device_token:demoToken,p_label:'本地测试设备'});
  if(beforeMigration)await beforeMigration(base);
  const migration=await fs.readFile(new URL('../family-increment-20261012.sql',import.meta.url),'utf8');
  await base.context('service','points_family_get_state');await base.db.exec(migration);
  return {...base,rpc:(role,name,args={})=>base.call(role,name,args,role==='guest'?demoToken:null),reapply:()=>base.db.exec(migration)};
 }catch(error){await base.db.close();throw error;}
}
