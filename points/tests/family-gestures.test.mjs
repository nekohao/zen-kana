// Real pointer and native touch gestures against an isolated, read-only demo.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.argv[2]));
const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
const origin='http://127.0.0.1:'+Number(process.env.POINTS_PREVIEW_PORT||4180);
let checks=0;const errors=[];
const check=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const ready=p=>p.locator('#kitchenContent[data-points-synced="true"][aria-busy="false"]').waitFor();
const date=p=>p.locator('#familyDayHeader').getAttribute('data-date');
const shifted=(day,n)=>new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
async function start(role,touch=false){
 const p=await browser.newPage({viewport:{width:390,height:844},isMobile:touch,hasTouch:touch});
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 await p.goto(origin+'/preview/index.html?role='+role+'&demo=1');
 await p.locator('.app-nav [data-value="kitchen"]').click();await ready(p);return p;
}
async function drag(p,dx,dy=0,{touch=false,cancel=false,selector='#familyCreateBtn'}={}){
 const b=await p.locator(selector).boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
 if(touch){
  const c=await p.context().newCDPSession(p);
  await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=8;i++)await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y:y+dy*i/8}]});
  await c.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});await c.detach();
 }else{
  await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+dx,y+dy,{steps:8});
  if(cancel)await p.locator(selector).evaluate(e=>e.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1,clientX:e.getBoundingClientRect().x,clientY:e.getBoundingClientRect().y,bubbles:true})));
  await p.mouse.up();
 }
 await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await ready(p);
}
async function noForm(p,label){check(await p.locator('#kitchenLayer.open').count(),0,label+' does not open create form');}
async function close(p){await p.getByRole('button',{name:'关闭家庭窗口',exact:true}).click();}
try{
 for(const role of ['admin','guest']){
  const p=await start(role),today=await date(p),button=p.locator('#familyCreateBtn');
  await button.click();check(await p.locator('#familyTitle').innerText(),role==='admin'?'发起一件家事':'记录做完的家事','tap keeps role action');await close(p);
  for(const [dx,offset] of [[100,-1],[100,-2],[-100,-1],[-100,0],[-100,0]]){
   await drag(p,dx);const day=shifted(today,offset);
   check(await date(p),day,'horizontal gesture selects exactly one day and stops at today');await noForm(p,'day swipe');
   check(await p.locator('[data-family-action="today"]').innerText(),offset?day.slice(5).replace('-','.'):'今天','center shows selected date');
  }
  for(const [dx,dy,options] of [[30,0,{}],[0,-100,{}],[100,-90,{}],[100,0,{cancel:true}]]){
   await drag(p,dx,dy,options);check(await date(p),today,'short, vertical, diagonal and cancelled drags preserve date');await noForm(p,'incomplete swipe');
  }
  await drag(p,100);await button.focus();await p.keyboard.press('Enter');
  check(await p.locator('#kitchenLayer.open').count(),1,'keyboard opens form immediately after swipe');await close(p);
  await drag(p,100);await button.click();check(await p.locator('#kitchenLayer.open').count(),1,'next intentional tap is not swallowed');await close(p);
  await p.getByRole('button',{name:'回到今天',exact:true}).click();await ready(p);
  check(await date(p),today,'center remains a return-to-today shortcut');check(await p.locator('[data-family-action="today"]').innerText(),'今天','shortcut restores today label');
  await drag(p,100,0,{selector:'#kitchenContent'});check(await date(p),today,'list horizontal movement does not switch day');
  // Date navigation during a held pointer invalidates that old gesture.
  const b=await button.boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();
  await p.mouse.move(b.x+b.width/2+90,b.y+b.height/2,{steps:5});
  await p.getByRole('button',{name:'前一天',exact:true}).evaluate(e=>e.click());await p.mouse.up();await ready(p);
  check(await date(p),shifted(today,-1),'stale gesture cannot switch a second date');await noForm(p,'invalidated swipe');
  // Hint and label must remain separate and readable at the narrowest supported width.
  for(const width of [320,390,430]){
   await p.setViewportSize({width,height:844});
   check(await button.evaluate(e=>{const a=e.querySelector('.family-action-label').getBoundingClientRect(),b=e.querySelector('.family-swipe-hint').getBoundingClientRect();return a.right+4<=b.left;}),true,'hint does not overlap action at '+width);
  }
  await p.close();
 }
 for(const role of ['admin','guest']){
  const p=await start(role,true),today=await date(p);
  await drag(p,100,0,{touch:true});check(await date(p),shifted(today,-1),'native touch right swipe selects previous day');await noForm(p,'native touch');
  await drag(p,-100,0,{touch:true});check(await date(p),today,'native touch left swipe selects next day');await noForm(p,'native touch');
  await drag(p,100,0,{touch:true,cancel:true});check(await date(p),today,'native touch cancellation preserves date');await noForm(p,'cancelled touch');
  await drag(p,0,-100,{touch:true});check(await date(p),today,'native vertical touch preserves date');await noForm(p,'vertical touch');
  await p.locator('#familyCreateBtn').tap();check(await p.locator('#kitchenLayer.open').count(),1,'native tap opens form after gestures');await close(p);
  await p.close();
 }
 check(errors,[],'no client errors');console.log(checks+' family pointer, touch, date label and accidental-click checks passed.');
}finally{await browser.close();}
