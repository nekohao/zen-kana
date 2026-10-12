// Compare live UI with the original theme; disposable localhost only.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const {chromium}=await import(pathToFileURL(process.argv[2]));
const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
const baseline=execFileSync('git',['show','f8d3825:points/ui-theme.css'],{encoding:'utf8'});
const errors=[];let checks=0;
function check(a,b,label){assert.deepEqual(a,b,label);checks++;}
async function settle(p){await p.locator('#pointsApp').evaluate(el=>Promise.all(el.getAnimations({subtree:true}).filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));}
async function page(role,old){const p=await browser.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());if(old){await p.route('**/assets/ui-theme.*.css',r=>r.fulfill({contentType:'text/css',body:baseline}));await p.route('**/preview/index.html?*',async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text()).replace(/ integrity="[^"]+"/g,'')});});}await p.goto('http://127.0.0.1:4180/preview/index.html?role='+role+'&demo=1');await p.locator('.points-access-locked').waitFor({state:'detached'});return p;}
async function appearance(p){return p.evaluate(()=>{const selectors=['.home','#metricSwitch','.metric-switch-thumb','.score-lens-wrap','.score-lens','#wheelDisk','.score','.fat-value','#overviewBtn','.background'];return Object.fromEntries(selectors.map(selector=>{const e=document.querySelector(selector),s=getComputedStyle(e),r=e.getBoundingClientRect();return [selector,{width:Math.round(r.width),height:Math.round(r.height),radius:s.borderRadius,background:s.backgroundImage,color:s.color,font:s.fontSize,shadow:s.boxShadow}]}));});}
try{
 for(const role of ['admin','guest']){
  const p=await page(role,false),original=await page(role,true);
  for(const size of [{width:320,height:640},{width:390,height:844},{width:430,height:932}]){
   await p.setViewportSize(size);await original.setViewportSize(size);
   for(const metric of ['score','wheel','fat']){
    for(const x of [p,original]){await x.locator('[data-metric="'+metric+'"]').click();await x.locator('#pointsApp[data-ui-theme="'+metric+'"]').waitFor();await settle(x);}
    check(await appearance(p),await appearance(original),role+' '+size.width+' '+metric+' original geometry and theme');
    const circle=await p.locator(metric==='wheel'?'#wheelDisk':metric==='fat'?'#fatRefreshBtn':'#scoreRefreshBtn').evaluate(e=>{const r=e.getBoundingClientRect();return Math.abs(r.width-r.height)<1&&getComputedStyle(e).borderRadius==='50%';});
    check(circle,true,'circular visual');check(await p.locator('#pointsApp').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true,'no horizontal overflow');
   }
  }
  await p.setViewportSize({width:390,height:844});await original.setViewportSize({width:390,height:844});
  for(const metric of ['score','wheel','fat']){
   for(const x of [p,original]){await x.locator('[data-metric="'+metric+'"]').click();await x.locator('#overviewBtn').click();await settle(x);}
   check(await p.locator('.overview-shell').evaluate(e=>({background:getComputedStyle(e).backgroundImage,radius:getComputedStyle(e).borderRadius})),await original.locator('.overview-shell').evaluate(e=>({background:getComputedStyle(e).backgroundImage,radius:getComputedStyle(e).borderRadius})),'overview respects theme');
   for(const x of [p,original])await x.locator(metric==='fat'?'#fatOverviewCloseBtn':'#overview .surface-close').click();
  }
  await p.locator('.app-nav [data-value="kitchen"]').click();await p.locator('.family-task-card').first().waitFor();
  check(await p.locator('.family-task-card').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)','family card retained');
  await p.locator('.family-task-card').first().click();await p.getByRole('button',{name:'关闭家庭窗口',exact:true}).waitFor();
  check(await p.locator('#kitchenLayer .kitchen-panel').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(252, 251, 248)','family panel retained');
  await p.getByRole('button',{name:'关闭家庭窗口',exact:true}).click();await p.locator('.app-nav [data-value="world"]').click();
  await settle(p);check(await appearance(p),await appearance(original),'return from family restores world');
  await p.locator('#settingsBtn').click();await p.getByRole('button',{name:'关闭设置',exact:true}).click();check(await p.locator('#settingsLayer').getAttribute('aria-hidden'),'true','settings closes');
  await p.close();await original.close();
 }
 check(errors,[],'no client errors');console.log(checks+' original theme, circles, responsive geometry, overview, family isolation and navigation checks passed.');
}finally{await browser.close();}
