// Shared app chrome across pages, roles and metric themes; localhost only.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const {chromium}=await import(pathToFileURL(process.argv[2]));
const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
const origin='http://127.0.0.1:'+Number(process.env.POINTS_PREVIEW_PORT||4180);
const errors=[];let checks=0;
const check=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
async function settle(p){await p.locator('#pointsApp').evaluate(el=>Promise.all(el.getAnimations({subtree:true}).filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));}
async function page(role){
 const p=await browser.newPage({viewport:{width:390,height:844}});
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 await p.goto(origin+'/preview/index.html?role='+role+'&demo=1');
 await p.locator('.points-access-locked').waitFor({state:'detached'});return p;
}
async function header(p){return p.locator('#pointsApp').evaluate(app=>{
 const h=app.querySelector(app.dataset.page==='kitchen'?'.kitchen-header':'.topbar');
 return [...h.querySelectorAll('.app-brand-title,.app-brand-icon,.points-top-actions button')].map(e=>{
  const r=e.getBoundingClientRect(),s=getComputedStyle(e);
  return {x:Math.round(r.x),y:Math.round(r.y),w:e.classList.contains('app-brand-title')?null:Math.round(r.width),h:Math.round(r.height),color:s.color,background:s.backgroundColor,radius:s.borderRadius,font:s.fontSize};
 });
});}
async function navigation(p){return p.locator('.app-nav').evaluate(el=>{
 const s=getComputedStyle(el),r=el.getBoundingClientRect();
 return {y:r.y,height:r.height,background:s.backgroundColor,border:s.borderTop,icons:[...el.querySelectorAll('svg')].map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height,getComputedStyle(e).strokeWidth];})};
});}
async function switches(p){return p.locator('#pointsApp').evaluate(app=>{
 const e=app.querySelector('#metricSwitch');
 const r=e.getBoundingClientRect();
 return {x:r.x,y:r.y,width:r.width,height:r.height,buttons:[...new Set([...e.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return JSON.stringify({y:r.y,height:r.height});}))]};
});}
async function common(p,id){
 await p.locator('#'+id+'[data-ui-theme="shared"]').waitFor();await settle(p);
 return p.locator('#'+id).evaluate(layer=>{
  const panel=layer.querySelector('[role="dialog"],[role="alertdialog"]');
  const r=panel.getBoundingClientRect();
  const selectors=layer.id==='settingsLayer'?['.settings-sheet','.sheet-title','.settings-group','.settings-row','.settings-label']:['.points-todo-panel','.points-todo-panel h2','.points-todo-panel>header','.points-todo-panel>footer'];
  return {theme:layer.dataset.uiTheme,box:[r.x,r.y,r.width,r.height].map(Math.round),styles:selectors.map(selector=>{
   const e=layer.querySelector(selector),s=getComputedStyle(e);
   return {background:s.backgroundImage,fill:s.backgroundColor,color:s.color,font:s.fontSize,weight:s.fontWeight,radius:s.borderRadius,line:s.lineHeight,minHeight:s.minHeight};
  })};
 });
}
async function windows(p){
 await p.locator('header [aria-label="设置"]:visible').click();
 const settings=await common(p,'settingsLayer');
 await p.getByRole('button',{name:'关闭设置',exact:true}).click();
 await p.locator('#settingsLayer').waitFor({state:'hidden'});
 await p.locator('[data-todo-action="open"]:visible').click();
 await p.locator('#pointsTodoTotal').filter({hasText:'项待办'}).waitFor();
 const notices=await common(p,'pointsMessagesLayer');
 await p.locator('[data-todo-action="close"]').click();
 await p.locator('#pointsMessagesLayer').waitFor({state:'hidden'});
 return {settings,notices};
}
try{
 for(const role of ['admin','guest']){
  const p=await page(role);
  check(await p.locator('script[data-points-asset="kitchen"],script[data-points-asset="kitchen-api"]').count(),0,'retired scripts absent');
  check(await p.locator('#settingsLayer').count(),1,'one settings instance');
  check(await p.locator('#pointsMessagesLayer').count(),1,'one notification center');
  for(const size of [{width:320,height:640},{width:390,height:844},{width:430,height:932},{width:1200,height:900}]){
   await p.setViewportSize(size);let reference=null,top=null,nav=null,tabs=null;
   for(const metric of ['score','wheel','fat']){
    await p.locator('[data-metric="'+metric+'"]').click();
    await p.locator('#pointsApp[data-ui-theme="'+metric+'"]').waitFor();await settle(p);
    const current=await windows(p);reference??=current;
    check(current,reference,role+' '+size.width+' '+metric+' shared windows');
    const h=await header(p);top??=h;check(h,top,'metric does not restyle app controls');
    nav??=await navigation(p);check(await navigation(p),nav,'metric does not restyle navigation');
    tabs??=await switches(p);check(await switches(p),tabs,'metric switches stay anchored');
   }
   await p.locator('.app-nav [data-value="kitchen"]').click();await settle(p);
   check(await header(p),top,role+' '+size.width+' aligned header');
   check(await navigation(p),nav,'same navigation in family');
   check(await p.locator('#kitchenPage .kitchen-tabs,[data-kitchen-action="tab"]').count(),0,'household has no module switcher');
   check(await windows(p),reference,'same windows in family');
   check(await p.locator('#pointsApp').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true,'no page overflow');
   if(process.env.POINTS_QA_DIR&&role==='guest'&&size.width===390){
    await p.screenshot({path:path.join(process.env.POINTS_QA_DIR,'family-shared-frame.png')});
    await p.locator('header [aria-label="设置"]:visible').click();await settle(p);
    await p.screenshot({path:path.join(process.env.POINTS_QA_DIR,'shared-settings.png')});
    await p.getByRole('button',{name:'关闭设置',exact:true}).click();
   }
   await p.locator('.app-nav [data-value="world"]').click();await settle(p);
   check(await header(p),top,'return preserves header');
  }
  await p.setViewportSize({width:390,height:844});
  await p.locator('.app-nav [data-value="kitchen"]').click();
  await p.locator('[data-family-action="create"]').click();
  await p.locator('#familyNote').fill('切换后继续的本地草稿');
  await p.getByRole('button',{name:'关闭家庭窗口',exact:true}).click();
  await p.locator('.app-nav [data-value="world"]').click();
  await p.locator('.app-nav [data-value="kitchen"]').click();
  await p.locator('[data-family-action="create"]').click();
  check(await p.locator('#familyNote').inputValue(),'切换后继续的本地草稿','draft survives page switch');
  await p.getByRole('button',{name:'关闭家庭窗口',exact:true}).click();
  await p.emulateMedia({reducedMotion:'reduce'});
  await p.locator('.app-nav [data-value="world"]').click();
  check(await p.locator('.home').evaluate(e=>getComputedStyle(e).animationName),'none','reduced motion');
  for(let i=0;i<5;i++){
   await p.locator('.app-nav [data-value="kitchen"]').click();
   await p.locator('.app-nav [data-value="world"]').click();
  }
  check(await p.locator('.app-nav').count(),1,'repeated switches do not duplicate navigation');
  check(await p.locator('[data-todo-action="open"]:visible').count(),1,'one active notification entry');
  if(role==='admin'){
   await p.locator('header [aria-label="设置"]:visible').click();
   const devices=p.locator('#pointsAccessDevices'),list=p.locator('#pointsAccessDeviceList');
   check(await devices.getAttribute('aria-expanded'),'false','devices initially collapsed');
   await devices.click();await list.locator('time').waitFor();
   check(await devices.getAttribute('aria-expanded'),'true','devices expanded');
   check(await list.locator('.points-module-updates,button').count(),0,'device list has no activity or actions');
   check((await list.locator('time').innerText()).includes('接入'),true,'device entry includes access time');
   await devices.click();check(await list.isVisible(),false,'second click collapses devices');
   await devices.click();await list.locator('time').waitFor();
   await p.getByRole('button',{name:'关闭设置',exact:true}).click();
   await p.locator('header [aria-label="设置"]:visible').click();
   check(await list.isVisible(),false,'settings reopening collapses devices');
   await p.getByRole('button',{name:'关闭设置',exact:true}).click();
  }
  await p.close();
 }
 const failed=await browser.newPage({viewport:{width:390,height:844}});
 failed.on('pageerror',e=>errors.push(e.message));
 await failed.route('**/*',r=>new URL(r.request().url()).origin===origin&&!/\/assets\/family\.[a-f0-9]+\.js$/.test(new URL(r.request().url()).pathname)?r.continue():r.abort());
 await failed.goto(origin+'/preview/index.html?role=admin&demo=1');
 await failed.locator('.points-access-locked').waitFor({state:'detached'});
 check(await failed.locator('#kitchenPage').count(),0,'missing family never initializes retired workflow');
 await failed.locator('#settingsBtn').click();
 check(await failed.locator('#settingsLayer.open').isVisible(),true,'family load failure preserves settings');
 check(await failed.locator('#appRecovery').innerText().then(t=>t.includes('小家庭模块加载失败')),true,'family failure recovery');
 await failed.close();
 check(errors,[],'no client exceptions');
 console.log(checks+' shared headers, settings, notifications, navigation, responsive layout, drafts and failure recovery checks passed.');
}finally{await browser.close();}
