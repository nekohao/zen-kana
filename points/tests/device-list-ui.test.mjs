// Real browser regression: measure every frame, including a deliberately delayed device read.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.argv[2]));
const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
const origin='http://127.0.0.1:'+Number(process.env.POINTS_PREVIEW_PORT||4180);
let checks=0;
const check=(value,expected,label)=>{assert.deepEqual(value,expected,label);checks++;};
const frames=p=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const settle=p=>p.locator('#settingsSheet').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished.catch(()=>{}))));
async function start(p){
 await p.locator('#pointsAccessDevices').scrollIntoViewIfNeeded();await frames(p);
 await p.evaluate(()=>{
  const sheet=document.getElementById('settingsSheet'),row=document.getElementById('pointsAccessDevices');
  window.deviceTrace=[];window.deviceTraceActive=true;
  const sample=()=>{
   const r=sheet.getBoundingClientRect();
   window.deviceTrace.push({scroll:sheet.scrollTop,top:r.top,height:r.height,row:row.getBoundingClientRect().top,page:scrollY});
   if(window.deviceTraceActive)requestAnimationFrame(sample);
  };sample();
 });
}
async function stable(p,label){
 await frames(p);
 const trace=await p.evaluate(()=>{window.deviceTraceActive=false;return window.deviceTrace;});
 for(const key of ['scroll','top','height','row','page']){
  const values=trace.map(row=>row[key]),drift=Math.max(...values)-Math.min(...values);
  check(drift<=1,true,label+' '+key+' drift '+drift+'px');
 }
}
try{
 const p=await browser.newPage();const errors=[];p.on('pageerror',error=>errors.push(error.message));
 await p.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 let nextRead,release,requested;
 await p.route(origin+'/__demo/rpc',async route=>{
  if(route.request().postDataJSON().name!=='points_access_admin_devices')return route.continue();
  requested?.();const response=await new Promise(resolve=>release=resolve);
  await route.fulfill({contentType:'application/json',body:JSON.stringify(response)});
 });
 await p.goto(origin+'/preview/index.html?role=admin&demo=1');
 await p.locator('.points-access-locked').waitFor({state:'detached'});
 const devices=p.locator('#pointsAccessDevices'),list=p.locator('#pointsAccessDeviceList');
 const rows=Array.from({length:12},(_,i)=>({label:'本地设备 '+i,verifiedAt:'2026-10-17T06:30:00Z',revoked:false}));
 for(const size of [{width:320,height:640},{width:390,height:844},{width:430,height:932},{width:844,height:390},{width:1200,height:900}]){
  await p.setViewportSize(size);
  await p.locator('header [aria-label="设置"]:visible').click();await settle(p);await frames(p);
  for(const count of [1,12,0]){
   nextRead=new Promise(resolve=>requested=resolve);
   await start(p);await devices.click();await nextRead;await frames(p);
   check(await list.isVisible(),true,'loading visible');
   release({data:rows.slice(0,count),error:null});
   if(count)await list.locator('time').first().waitFor();
   else await list.getByText('还没有已验证的游客设备。',{exact:true}).waitFor();
   await frames(p);await stable(p,size.width+' expand '+count+' devices');
   await start(p);await devices.click();await stable(p,size.width+' collapse '+count+' devices');
   check(await list.isVisible(),false,'collapsed');
  }
  nextRead=new Promise(resolve=>requested=resolve);
  await start(p);await devices.click();await nextRead;await frames(p);
  await devices.click();release({data:rows,error:null});await frames(p);await frames(p);
  await stable(p,size.width+' close before response');
  check(await list.isVisible(),false,'late response cannot reopen list');
  nextRead=new Promise(resolve=>requested=resolve);
  await start(p);await devices.click();await nextRead;
  release({data:null,error:{code:'08006',message:'Local test failure'}});
  await list.getByText('设备读取失败，请收起后重新展开重试。',{exact:true}).waitFor();
  await stable(p,size.width+' failed read');await devices.click();
  // A real viewport event with unchanged dimensions must not reset the scroller either.
  await start(p);await p.evaluate(()=>dispatchEvent(new Event('resize')));await frames(p);
  await stable(p,size.width+' resize with scrolled settings');
  nextRead=new Promise(resolve=>requested=resolve);
  await devices.click();await nextRead;
  await p.getByRole('button',{name:'关闭设置',exact:true}).click();
  release({data:rows,error:null});await frames(p);
  await p.locator('header [aria-label="设置"]:visible').click();await settle(p);
  check(await list.isVisible(),false,'settings reopening keeps list closed');
  await p.getByRole('button',{name:'关闭设置',exact:true}).click();
 }
 check(errors,[],'no client errors');await p.close();
 console.log(checks+' frame-by-frame device expansion, collapse, loading, failures, late responses and viewport stability checks passed.');
}finally{await browser.close();}
