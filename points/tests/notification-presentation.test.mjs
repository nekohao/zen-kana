// Actual household events, queue payloads and service-worker links; no production requests.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createFamilyDatabase,demoToken} from './family-db.mjs';
const {db,rpc,call}=await createFamilyDatabase();let checks=0;
const check=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
const adminId='00000000-0000-0000-0000-000000000001',key='B'+'A'.repeat(86);
const subscription=n=>({endpoint:'https://web.push.apple.com/PRESENTATION'+n,keys:{p256dh:key,auth:'A'.repeat(22)}});
const write=(role,action,payload)=>rpc(role,'points_family_write',{p_action:action,p_payload:payload,p_operation_id:crypto.randomUUID()});
async function flush(){
 await db.exec("UPDATE points_notice.batches SET available_at=clock_timestamp()-interval '1 second';UPDATE points_push.subscriptions SET last_regular_at=NULL;");
 const jobs=await call('service','points_notice_worker_claim');
 for(const job of jobs)await call('service','points_notice_worker_finish',{p_id:job.id,p_lease:job.lease,p_code:201});
 return jobs;
}
const payload=(jobs,n)=>jobs.find(j=>j.subscription.endpoint.endsWith('PRESENTATION'+n))?.payload;
try{
 await call('service','points_push_worker_initialize',{p_admin_id:adminId,p_app_url:'https://example.test/points/',p_backend_url:'https://zrzplqwauuruyssgcwqt.supabase.co/functions/v1/points-web-push',p_public_key:key,p_private_key:'A'.repeat(43),p_subject:'mailto:test@example.test'});
 await call('guest','points_push_register',{p_device_token:'b'.repeat(64),p_subscription:subscription(1),p_public_key:key},demoToken);
 await call('admin','points_push_register',{p_device_token:'c'.repeat(64),p_subscription:subscription(2),p_public_key:key});
 await rpc('guest','points_notifications_preferences',{p_quiet:false});await call('admin','points_notifications_preferences',{p_quiet:false});
 await write('admin','price',{type:'dishes',version:1,points:0.5});
 let task=await write('admin','create',{type:'dishes'}),jobs=await flush(),p=payload(jobs,1);
 check(p.title,'哥哥','request sender');check(p.body,'请洗碗，完成后提交验收。','specific request');check(p.route,'kitchen');
 const tag='points-family-'+task.id;check(p.tag,tag,'stable task tag');
 task=await write('guest','submit',{id:task.id,version:task.version});p=payload(await flush(),2);
 check(p.title,'宝宝');check(p.body,'洗碗已完成，等你验收。');check(p.tag,tag);
 task=await write('admin','review',{id:task.id,version:task.version,qualified:false,comment:'需要擦干'});p=payload(await flush(),1);
 check(p.title,'哥哥');check(p.body,'洗碗需要返工，请查看评价。');check(p.tag,tag);
 task=await write('guest','submit',{id:task.id,version:task.version});await flush();
 task=await write('admin','review',{id:task.id,version:task.version,qualified:true});p=payload(await flush(),1);
 check(p.body,'洗碗已通过，积分 +0.5。');check(p.tag,tag);
 const balance=task.score_after;
 await write('admin','price',{type:'floor',version:1,points:0.5});await write('admin','price',{type:'cooking',version:1,points:1.5});
 for(const type of ['cooking','floor','dishes'])await write('guest','create',{type});
 p=payload(await flush(),2);check(p.title,'宝宝');check(p.body.includes('等 3 件家务待验收。'),true,'counted household summary');check(p.route,'kitchen');check(p.tag,'points-family-updates');
 check(Number((await db.query('SELECT score FROM members WHERE id=1')).rows[0].score),balance,'presentation never settles tasks');
 await db.query("INSERT INTO score_logs(member_id,delta,reason,operator_id)VALUES(1,1,'完成约定',$1)",[adminId]);p=payload(await flush(),1);
 check(p.body.includes('完成约定'),true,'ordinary payload retains useful body');check(p.body.includes('点开查看详情'),false);
 const handlers={},shown=[],opened=[],scope='https://example.test/points/';
 const self={registration:{scope,showNotification:async(title,options)=>shown.push({title,options})},addEventListener:(name,fn)=>handlers[name]=fn,clients:{matchAll:async()=>[],openWindow:async url=>opened.push(url)}};
 vm.runInNewContext(await fs.readFile(new URL('../src/sw.source.js',import.meta.url),'utf8'),{self,URL,Response,AbortController,setTimeout,clearTimeout});
 async function dispatch(name,event){let promise;handlers[name]({...event,waitUntil:p=>promise=p});await promise;}
 await dispatch('push',{data:{json:()=>({title:'宝宝',body:'洗碗已完成，等你验收。',tag,url:scope+'?open=kitchen'})}});
 check(shown[0].title,'宝宝');check(new URL(shown[0].options.data.url).searchParams.get('family_task'),task.id,'task link carried without backend changes');
 check(shown[0].options.tag,tag);
 await dispatch('notificationclick',{notification:{data:shown[0].options.data,close(){}}});check(opened[0],shown[0].options.data.url);
 await dispatch('push',{data:{json:()=>({tag:'points-family-updates',url:scope+'?open=kitchen'})}});check(new URL(shown[1].options.data.url).searchParams.has('family_task'),false,'summary opens list');
 await dispatch('push',{data:{json:()=>({tag,url:'https://evil.test/?open=kitchen'})}});check(shown[2].options.data.url,scope+'index.html?open=messages','scope protection retained');
 await dispatch('push',{data:{json:()=>({tag:'points-family-0',url:scope+'?open=kitchen'})}});check(new URL(shown[3].options.data.url).searchParams.has('family_task'),false,'invalid task rejected');
 console.log(checks+' concise content, half-point result, task grouping, summary and safe notification-link checks passed.');
}finally{await db.close();}
