import assert from 'node:assert/strict';
import {createFamilyDatabase,demoToken} from './family-db.mjs';
let oldPending,oldComplete,balanceBefore,logsBefore;
const {db,rpc,reapply}=await createFamilyDatabase({beforeMigration:async base=>{
 const today=(await base.db.query("SELECT (clock_timestamp() AT TIME ZONE 'Asia/Shanghai')::date::text AS meal_day")).rows[0].meal_day;
 const args={p_items:[{slug:'tomato-eggs',note:'少盐'}],p_note:'迁移保留',p_meal_date:today,p_meal:'早饭',p_order_id:null,p_version:null,p_cancel:false,p_operation_id:crypto.randomUUID()};
 oldPending=await base.call('admin','points_kitchen_v3_admin_save',args);
 oldComplete=await base.call('guest','points_kitchen_v3_guest_save',{...args,p_meal:'午饭',p_operation_id:crypto.randomUUID()},demoToken);
 const settled=await base.call('guest','points_kitchen_v3_guest_save',{...args,p_meal:'晚饭',p_operation_id:crypto.randomUUID()},demoToken);
 await base.call('admin','points_kitchen_v3_admin_review',{p_order_id:settled.id,p_version:settled.version,p_ratings:[{slug:'tomato-eggs',stars:5,comment:'历史评价'}],p_operation_id:crypto.randomUUID()});
 balanceBefore=Number((await base.db.query('SELECT score FROM members WHERE id=1')).rows[0].score);
 logsBefore=(await base.db.query('SELECT * FROM score_logs ORDER BY id')).rows.map(l=>({...l,delta:Number(l.delta)}));
}});
let checks=0;const check=(a,b)=>{assert.deepEqual(a,b);checks++;};
try{
 const rows=(await db.query('SELECT * FROM points_family_tasks ORDER BY id')).rows;
 check(rows.length,2);check(rows.map(t=>t.status),['pending','review']);check(rows.map(t=>t.points),[null,null]);
 check(rows[0].items[0].name,'番茄炒蛋');check(rows[0].note,'迁移保留');
 check(rows.map(t=>t.legacy_order_id),[null,null]);
 check((await db.query('SELECT count(*)::integer n FROM points_kitchen_orders')).rows[0].n,0);
 for(const table of ['points_kitchen_reviews','points_kitchen_drafts','points_kitchen_versions','points_kitchen_operations','points_kitchen_v2.receipts'])check((await db.query('SELECT count(*)::integer n FROM '+table)).rows[0].n,0);
 check(Number((await db.query('SELECT score FROM members WHERE id=1')).rows[0].score),balanceBefore);
 check((await db.query('SELECT * FROM score_logs ORDER BY id')).rows.map(l=>({...l,delta:Number(l.delta)})),logsBefore);
 check((await db.query("SELECT count(*)::integer n FROM points_notice.events WHERE group_key LIKE 'kitchen:%'")).rows[0].n,0);
 check((await db.query("SELECT count(*)::integer n FROM points_family_events WHERE action='imported'")).rows[0].n,2);
 check((await db.query("SELECT has_function_privilege('anon','public.points_kitchen_v3_guest_save(jsonb,text,date,text,bigint,integer,boolean,uuid)','EXECUTE') permitted")).rows[0].permitted,false);
 await rpc('admin','points_family_write',{p_action:'price',p_payload:{type:'cooking',points:4,version:1},p_operation_id:crypto.randomUUID()});
 check((await db.query('SELECT points FROM points_family_tasks ORDER BY id')).rows.map(t=>Number(t.points)),[4,4]);
 await reapply();check((await db.query('SELECT count(*)::integer n FROM points_family_tasks')).rows[0].n,2);
 check((await db.query('SELECT * FROM score_logs ORDER BY id')).rows.map(l=>({...l,delta:Number(l.delta)})),logsBefore);
 console.log(checks+' legacy migration, recipe preservation, fixed-score configuration and old writer protection checks passed.');
}finally{await db.close();}
