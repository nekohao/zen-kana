// Local preview with the actual kitchen migration in an in-memory PostgreSQL.
import http from 'node:http';
import fs from './database-source.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFamilyDatabase} from './family-db.mjs';
import {bundle} from '../scripts/build.mjs';
import {createFatDatabase} from './fat-db.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.POINTS_PREVIEW_PORT||4178);
const {db,call,context}=await createFamilyDatabase();const rpc=(role,name,args,token)=>call(role,name,args,token);let apiQueue=Promise.resolve();
// Disposable local meals exercise the real kitchen RPCs, never the production database.
const demoToken='e'.repeat(64),demoDevice='00000000-0000-0000-0000-000000000003';
// Demo scores exist only in this disposable preview.
await call('admin','points_family_write',{p_action:'price',p_payload:{type:'cooking',version:1,points:3},p_operation_id:crypto.randomUUID()});
await call('admin','points_family_write',{p_action:'create',p_payload:{type:'cooking',note:'少盐，今晚一起吃饭。',items:[{slug:'tomato-eggs',note:''},{slug:'cola-wings',note:''}]},p_operation_id:crypto.randomUUID()});
await call('guest','points_family_write',{p_action:'create',p_payload:{type:'dishes',note:'碗筷和锅都洗好了。'},p_operation_id:crypto.randomUUID()},demoToken);
// Daily browsing fixtures include an older task beyond the first legacy page.
const previousDayTask=await call('admin','points_family_write',{p_action:'create',p_payload:{type:'dishes',note:'昨天的家事演示'},p_operation_id:crypto.randomUUID()});
await db.query("UPDATE points_family_tasks SET status='cancelled',task_date=(clock_timestamp() AT TIME ZONE 'Asia/Shanghai')::date-1 WHERE id=$1",[previousDayTask.id]);
for(let i=0;i<31;i++){
 const fixture=await call('admin','points_family_write',{p_action:'create',p_payload:{type:'dishes',note:'本地日期分页演示 '+i},p_operation_id:crypto.randomUUID()});
 await db.query("UPDATE points_family_tasks SET status='cancelled' WHERE id=$1",[fixture.id]);
}
await db.exec(`INSERT INTO score_logs(member_id,delta,reason,operator_id)VALUES(1,5,'完成今日约定','00000000-0000-0000-0000-000000000001'),(1,-2,'积分调整','00000000-0000-0000-0000-000000000001');`);
await context('service','points_notice_worker_claim');
await db.query("SELECT points_notice.emit('preview:withdrawal','admin','withdrawal','宝宝发来了提现申请','申请 ¥30，请实际兑现后再标记完成。','withdrawals','preview-withdrawal',1,false,true)");
const fat=await createFatDatabase({seed:true});
await fat.db.exec(await fs.readFile(path.join(root,'fat-settlement-increment-20261011.sql'),'utf8'));
// Deterministic history: the UI regression must also run before Sunday's settlement.
await fat.db.exec(`INSERT INTO public.points_fat_reward_weeks(week_start,cutoff_at,current_days,previous_days,current_mean_jin,previous_mean_jin,change_jin,eligible,calculated_delta,applied_delta,balance_after)
 VALUES(date_trunc('week',clock_timestamp() AT TIME ZONE 'Asia/Shanghai')::date-7,clock_timestamp()-interval '1 day',4,3,157,160,-3,true,3,3,10) ON CONFLICT(week_start) DO NOTHING;`);
const release=JSON.parse(await fs.readFile(path.join(root,'version.json'),'utf8'));
const preview=await bundle({...release,sdkSource:await fs.readFile(path.join(root,'tests/fixtures/browser-sdk.js'),'utf8')});
preview.html=preview.html.replaceAll("SUPABASE_URL+'/functions/v1/points-web-push'","'/__demo/push-config'");
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    res.setHeader('Cache-Control','no-store');
    if(url.pathname==='/__demo/push-config'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({deployed:true,sqlReady:true,configured:false}));return;}
    const sdkRpc=url.pathname.startsWith('/__sdk/rest/v1/rpc/');
    if((url.pathname==='/__demo/rpc' || sdkRpc) && req.method==='POST'){
      let body='';for await(const chunk of req){body+=chunk;if(body.length>100000)throw Error('Request too large');}
      const parsed=JSON.parse(body);
      const {role,name,args,legacy}=sdkRpc?{role:'guest',name:url.pathname.split('/').at(-1),args:parsed,legacy:false}:parsed;
      if(legacy && (name.startsWith('points_kitchen_v2_') || name.startsWith('points_fat_v2_'))){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:null,error:{code:'PGRST202',message:'Could not find function'}}));return;}
      const run=apiQueue.catch(()=>{}).then(async()=>{
      const deviceToken=req.headers['x-client-info']?.match(/;points-device=([a-f0-9]{64})/)?.[1];
      await context(role==='admin'?'admin':'guest',name,deviceToken);
      await db.query('SELECT public.points_access_check_request()');let data;
      if(/^points_(access|push|notifications)_[a-z_]+$/.test(name)){
        const entries=Object.entries(args);if(entries.some(([key])=>!/^p_[a-z_]+$/.test(key)))throw Error('Invalid argument');
        const result=await db.query(`SELECT public.${name}(${entries.map(([key],i)=>`${key}=>$${i+1}`).join(',')}) AS result`,entries.map(([,value])=>value!==null&&typeof value==='object'&&!Array.isArray(value)?JSON.stringify(value):value));data=result.rows[0].result;
      }
      else if(name.startsWith('points_fat_'))data=await fat.rpc(role==='admin'?'admin':'guest',name,args);
      else if(name.startsWith('points_family_') || /^points_kitchen_v[23]_/.test(name) || ['points_kitchen_get_state','points_kitchen_get_order','points_kitchen_get_reviews'].includes(name))data=await rpc(role==='admin'?'admin':'guest',name,args,deviceToken);
      else if(name==='points_is_admin')data=role==='admin';
      else if(name==='points_get_state')data=(await db.query('SELECT score FROM members')).rows.map(row=>({...row,score:Number(row.score)}));
      else if(name==='points_get_wheel_state')data=[{spin_chances:0,cash_balance:0}];
      else if(name==='points_shop_get_state_v2')data={inventory:{},weekly_counts:{},weekly_feature:{code:'mystery_box',discount_claimed:false}};
      else if(name==='points_fat_get_state')data=[{configured:true,delta_jin:-3.2,recorded_at:new Date().toISOString(),record_count:10}];
      else if(name==='points_fat_get_logs')data=Array.from({length:10},(_,i)=>({id:String(i+1),delta_jin:-i*.3,created_at:new Date(Date.now()-(9-i)*86400000).toISOString()}));
      else if(name==='points_fat_reward_get_state')data={admin:role==='admin',diamonds:0,backpack:0,services:[],pending_service:0,pending_confirmation:0,weeks:[],preview:null};
      else if(name==='points_preview_wheel')data=[{prize_amount:30,roll:42}];
      else data=[];
      return data;});apiQueue=run;const data=await run;
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify(sdkRpc?data:{data,error:null}));return;
    }
    if(url.pathname==='/') {res.writeHead(302,{Location:'/preview/index.html?role=guest'});res.end();return;}
    if(!url.pathname.startsWith('/preview/')){res.writeHead(404);res.end('Not found');return;}
    const relative=decodeURIComponent(url.pathname.slice('/preview/'.length)) || 'index.html';
    const file=path.resolve(root,relative);
    if(!file.startsWith(root+path.sep) || file.endsWith('.sql') || file.endsWith('.mjs')){res.writeHead(404);res.end();return;}
    if(relative==='sw.js'){res.writeHead(404);res.end();return;}
    if(relative==='version.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(preview.release));return;}
    if(preview.files.has(relative)){res.setHeader('Content-Type',mime[path.extname(relative)]);res.end(preview.files.get(relative));return;}
    const sdk=relative==='vendor/supabase-2.117.2.js';
    // Geometry fixture only: Chromium cannot reproduce the iOS system status bar.
    const pwa=preview.html.replace('<html lang="zh-CN">','<html lang="zh-CN" class="ios-pwa">')
      .replaceAll('env(safe-area-inset-bottom,0px)','34px').replaceAll('env(safe-area-inset-bottom, 0px)','34px');
    const realSdkHtml=relative==='real-sdk.html'?(await fs.readFile(path.join(root,'index.html'),'utf8')).replaceAll('https://zrzplqwauuruyssgcwqt.supabase.co',`http://127.0.0.1:${port}/__sdk`):null;
    const bytes=realSdkHtml || (relative==='index.html'?preview.html:relative==='pwa.html'?pwa:await fs.readFile(sdk?path.join(root,'tests/fixtures/browser-sdk.js'):file));
    res.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream');res.end(bytes);
  }catch(e){
    if(req.url==='/__demo/rpc'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:null,error:{code:e.code || 'P0001',message:e.message}}));}
    else{res.writeHead(404);res.end('Not found');}
  }
});
server.listen(port,'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${port}/preview/index.html?role=guest`));
process.on('SIGINT',async()=>{server.close();await db.close();await fat.db.close();process.exit();});
