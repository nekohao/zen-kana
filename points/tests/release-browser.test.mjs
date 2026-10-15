// Real service workers in isolated Chrome contexts; only a disposable localhost server is used.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {bundle} from '../scripts/build.mjs';
const {chromium}=await import(pathToFileURL(process.argv[2]));
const moduleFiles=['app-runtime.js','vendor/supabase-2.117.2.js','home-gestures.js','kitchen-recipes.js','family.js','fat-loss.js','fat-rewards.js','device-access.js','web-push.js','notifications.js','app.js','ui-theme.js'];
const cssFiles=['fat-loss.css','fat-rewards.css','ui-theme.css','kitchen.css','web-push.css','device-access.css','notifications.css','kitchen-refined.css'];
const overrides=Object.fromEntries([...moduleFiles.map(f=>[f,'window.Loaded=(window.Loaded||0)+1;']),...cssFiles.map(f=>[f,'body{font-family:system-ui;}'])]);
overrides['app.js']='window.BusinessMarker="preserved";window.PointsStartup.ready(()=>{});';
overrides['index.source.html']='<!doctype html><html><head><meta charset="utf-8"/><meta content="__POINTS_BUILD__" name="points-build"/><style>body{margin:24px}</style><!-- POINTS_STYLES --></head><body><main id="pointsApp"><strong id="version">__POINTS_BUILD__</strong><p id="pointsUpdateStatus"></p><button id="pointsCheckUpdateBtn">检查更新</button></main><!-- POINTS_SCRIPTS --></body></html>';
const releases=[];
for(let i=0;i<4;i++)releases.push(await bundle({build:`20261011.${801+i}`,updatedAt:'2026-10-11T14:00:00Z',overrides:{...overrides,'kitchen.css':`body{background:rgb(${250-i},250,250);}`}}));
const files=new Map(releases.flatMap(r=>[...r.files]));
const fixture=await fs.readFile(new URL('./release-legacy-fixture.js',import.meta.url),'utf8');
const oldHtml=execFileSync('git',['show','aa73faf:points/index.html'],{encoding:'utf8'}).replace(/<script data-points-asset="sdk">[\s\S]*?<\/script>/,()=>`<script>${fixture.replace(/<\/script/gi,'<\\/script')}</script>`);
const oldWorker=execFileSync('git',['show','aa73faf:points/sw.js'],{encoding:'utf8'});
let serving=releases[0],legacy=false,blockNavigation=false,manifestFailures=0,brokenAsset=null,finishWrite=null;
const traffic=[];
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');const relative=url.pathname.replace(/^\/points\//,'');traffic.push(relative);
 res.setHeader('Cache-Control','no-store');
 if(relative==='business-write'){let body='';for await(const chunk of req)body+=chunk;finishWrite=()=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({body}));};return;}
 if(relative==='__demo/rpc'){for await(const _chunk of req){}res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:null,error:{code:'42501',message:'Isolated legacy test'}}));return;}
 if(relative==='seed'){res.setHeader('Content-Type','text/html');res.end('<script>navigator.serviceWorker.register("sw.js",{scope:"./"})</script>');return;}
 if(relative==='version.json'){if(manifestFailures-->0){res.writeHead(503);res.end();return;}res.setHeader('Content-Type','application/json');res.end(JSON.stringify(serving.release));return;}
 if(relative==='sw.js'){res.setHeader('Content-Type','application/javascript');res.end(legacy?oldWorker:serving.worker);return;}
 if(relative===''||relative==='index.html'){
  if(blockNavigation&&req.headers['sec-fetch-mode']==='navigate'){res.writeHead(503);res.end('Network navigation disabled');return;}
  res.setHeader('Content-Type','text/html');res.end(legacy?oldHtml:serving.html);return;
 }
 if(files.has(relative)){res.setHeader('Content-Type',relative.endsWith('.css')?'text/css':relative.endsWith('.js')?'application/javascript':'text/html');res.end(relative===brokenAsset?'wrong bytes':files.get(relative));return;}
 res.writeHead(404);res.end();
});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/points/`;
const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
let checks=0;const check=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const version=page=>page.locator('#version').innerText();
async function waitVersion(page,build){await page.waitForFunction(expected=>document.querySelector('meta[name="points-build"]')?.content===expected,build,{timeout:30000});await page.locator('#version').waitFor();}
async function settled(page,build){
 const until=Date.now()+30000;
 while(Date.now()<until){
  const value=await page.evaluate(async expected=>{const names=await caches.keys(),name=names.find(n=>n.startsWith('points-control-v2-'));if(!name)return false;const response=await(await caches.open(name)).match(new URL('__points_ready__',location.href).href);return !!response&&(await response.json()).build===expected;},build);
  if(value===true)return;await new Promise(resolve=>setTimeout(resolve,100));
 }
 throw Error('Release cache never became ready: '+build);
}
try{
 const context=await browser.newContext();await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.stack));
 await page.goto(base);await settled(page,releases[0].build);
 check(await version(page),releases[0].build,'cold initial release');
 check(await page.evaluate(()=>window.BusinessMarker),'preserved','modules execute correctly');
 traffic.length=0;serving=releases[1];blockNavigation=true;
 await page.getByRole('button',{name:'检查更新'}).click();await waitVersion(page,serving.build);await settled(page,serving.build);
 const changed=serving.release.assets.filter(f=>!releases[0].release.assets.some(x=>x.url===f.url));
 const payloadRequests=traffic.filter(p=>p.startsWith('assets/'));
 if(payloadRequests.some(p=>releases[0].release.assets.some(f=>f.url===p)))console.log('Unexpected assets',payloadRequests,traffic);
 check(payloadRequests.some(p=>releases[0].release.assets.some(f=>f.url===p)),false,'unchanged files downloaded zero times in real browser');
 check(payloadRequests.filter(p=>p===changed[0].url).length,1,'only changed CSS downloaded once');
 check(payloadRequests.filter(p=>p===serving.release.shell.url).length,1,'small shell downloaded once');
 check(traffic.includes('')||traffic.includes('index.html'),false,'no second network HTML navigation');
 check(await version(page),serving.build,'actual post-navigation version verified');
 serving=releases[2];manifestFailures=1;brokenAsset=serving.release.assets.find(f=>!releases[1].release.assets.some(x=>x.url===f.url)).url;
 await page.getByRole('button',{name:'检查更新'}).click();
 await page.waitForFunction(()=>document.getElementById('pointsUpdateStatus').textContent.includes('自动重试'));
 check(await version(page),releases[1].build,'manifest failure keeps usable app');
 await page.waitForFunction(()=>document.getElementById('pointsUpdateStatus').textContent.includes('已下载文件'),null,{timeout:15000});
 check(await version(page),releases[1].build,'corrupt asset never activates partial release');
 brokenAsset=null;await page.getByRole('button',{name:'检查更新'}).click();await waitVersion(page,serving.build);
 check(await version(page),serving.build,'retry reuses verified partial downloads');
 await page.evaluate(()=>{window.TestWrite=fetch('business-write',{method:'POST',body:'unchanged-input'});});
 await new Promise(resolve=>{const checkWrite=()=>finishWrite?resolve():setTimeout(checkWrite,20);checkWrite();});
 serving=releases[3];await page.getByRole('button',{name:'检查更新'}).click();
 await page.waitForFunction(()=>document.getElementById('pointsUpdateStatus').textContent.includes('等待当前请求'));
 check(await version(page),releases[2].build,'active request is not interrupted');
 finishWrite();await waitVersion(page,serving.build);
 check(await version(page),serving.build,'update resumes after business request');
 await context.setOffline(true);await page.reload();await waitVersion(page,serving.build);
 check(await version(page),serving.build,'prepared split release launches fully offline');
 await context.setOffline(false);const latest=serving;serving=releases[0];await page.getByRole('button',{name:'检查更新'}).click();
 await page.waitForFunction(()=>document.getElementById('pointsUpdateStatus').textContent.includes('尚未同步'));
 check(await version(page),latest.build,'stale CDN cannot downgrade running app');
 check(errors,[],'no bootstrap/module errors');await context.close();
 // First uncontrolled visit: CSS can fail before the body/startup script exists.
 const partialContext=await browser.newContext();await partialContext.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const partialPage=await partialContext.newPage();serving=releases[0];blockNavigation=false;brokenAsset=serving.release.assets[0].url;
 await partialPage.goto(base);
 check(await partialPage.evaluate(()=>window.PointsReleaseLoadFailed),true,'first stylesheet failure detected before startup');
 const repairedLoad=partialPage.waitForEvent('load',{timeout:30000});brokenAsset=null;blockNavigation=true;await repairedLoad;await settled(partialPage,serving.build);
 check(await partialPage.evaluate(()=>!!window.PointsReleaseLoadFailed),false,'same-version first visit repairs automatically after assets publish');
 await partialContext.close();
 // Seed the actual previous monolithic worker and cached HTML, then publish the split release.
 const oldContext=await browser.newContext();await oldContext.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const oldPage=await oldContext.newPage();legacy=true;blockNavigation=false;
 await oldPage.goto(base+'seed');await oldPage.waitForFunction(()=>!!navigator.serviceWorker.controller);
 legacy=false;serving=releases[0];blockNavigation=true;
 await oldPage.goto(base);await waitVersion(oldPage,serving.build);
 check(await version(oldPage),serving.build,'previous real PWA cache migrates to split release despite blocked HTML navigation');
 await oldContext.close();
 console.log(`${checks} real-browser incremental downloads, failed manifests/assets, offline launches, busy requests, target confirmation and legacy PWA migration checks passed.`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}


