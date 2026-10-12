import assert from 'node:assert/strict';
import {createFamilyDatabase,demoToken} from './family-db.mjs';
let oldPending,oldComplete;
const {db,rpc,reapply}=await createFamilyDatabase({beforeMigration:async base=>{
 const today=(await base.db.query("SELECT (clock_timestamp() AT TIME ZONE 'Asia/Shanghai')::date::text AS meal_day")).rows[0].meal_day;
 const args={p_items:[{slug:'tomato-eggs',note:'少盐'}],p_note:'迁移保留',p_meal_date:today,p_meal:'早饭',p_order_id:null,p_version:null,p_cancel:false,p_operation_id:crypto.randomUUID()};
 oldPending=await base.call('admin','points_kitchen_v3_admin_save',args);
 oldComplete=await base.call('guest','points_kitchen_v3_guest_save',{...args,p_meal:'午饭',p_operation_id:crypto.randomUUID()},demoToken);
}});
let checks=0;const check=(a,b)=>{assert.deepEqual(a,b);checks++;};
try{
 const rows=(await db.query('SELECT * FROM points_family_tasks ORDER BY id')).rows;
 check(rows.length,2);check(rows.map(t=>t.status),['pending','review']);check(rows.map(t=>t.points),[null,null]);
 check(rows[0].items[0].name,'番茄炒蛋');check(rows[0].note,'迁移保留');
 check(rows.map(t=>String(t.legacy_order_id)),[String(oldPending.id),String(oldComplete.id)]);
 await assert.rejects(()=>db.query("UPDATE points_kitchen_orders SET status='rated' WHERE id=$1",[oldComplete.id]),e=>e.code==='40001');checks++;
 check((await db.query("SELECT has_function_privilege('anon','public.points_kitchen_v3_guest_save(jsonb,text,date,text,bigint,integer,boolean,uuid)','EXECUTE') permitted")).rows[0].permitted,false);
 await rpc('admin','points_family_write',{p_action:'price',p_payload:{type:'cooking',points:4,version:1},p_operation_id:crypto.randomUUID()});
 check((await db.query('SELECT points FROM points_family_tasks ORDER BY id')).rows.map(t=>Number(t.points)),[4,4]);
 await reapply();check((await db.query('SELECT count(*)::integer n FROM points_family_tasks')).rows[0].n,2);
 console.log(checks+' legacy migration, recipe preservation, fixed-score configuration and old writer protection checks passed.');
}finally{await db.close();}
