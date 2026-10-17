// Local UI uses real todo/household/withdrawal RPCs; external requests blocked.
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
const {chromium}=await import(pathToFileURL(process.argv[2]));
const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});let checks=0;const errors=[];
const check=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
async function page(role){const p=await browser.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.goto(`http://127.0.0.1:${Number(process.env.POINTS_PREVIEW_PORT||4178)}/preview/index.html?role=${role}&demo=1`);await p.locator('.points-access-locked').waitFor({state:'detached'});return p;}
async function open(p){if(await p.locator('#overview.open').count())await p.keyboard.press('Escape');await p.locator('[data-todo-action="open"]:visible').click();await p.locator('#pointsTodoTotal').filter({hasText:'项待办'}).waitFor();await p.locator('#pointsMessagesLayer').evaluate(el=>Promise.all(el.getAnimations({subtree:true}).filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));}
async function rpc(p,name,args={}){return p.evaluate(async({name,args})=>{const token=window.PointsDeviceAccess.credential();const r=await fetch('/__demo/rpc',{method:'POST',headers:{'Content-Type':'application/json','x-client-info':'test'+(token?';points-device='+token:'')},body:JSON.stringify({role:new URLSearchParams(location.search).get('role'),name,args})});const x=await r.json();if(x.error)throw Error(x.error.message);return x.data;},{name,args});}
try{
 const admin=await page('admin'),guest=await page('guest');
 check(await admin.locator('[data-todo-action="open"]').count(),2,'world and family entry');
 check(await admin.locator('#settingsLayer [data-todo-action="open"]').count(),0,'entry beside settings');
 await open(admin);check(await admin.locator('#pointsMessagesLayer').getByRole('tab').count(),0,'no historical inbox');
 for(const size of [{width:320,height:640},{width:390,height:844},{width:430,height:932},{width:1200,height:900}]){
  await admin.setViewportSize(size);
  check(await admin.locator('.points-todo-panel').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1&&e.scrollWidth<=e.clientWidth+1;}),true,'popup fits '+size.width);
 }
 await admin.setViewportSize({width:390,height:844});
 if(process.env.POINTS_QA_DIR)await admin.screenshot({path:process.env.POINTS_QA_DIR+'/notification-center.png'});
 const familyId=await admin.locator('[data-todo-id^="family:"]').first().getAttribute('data-todo-id');
 await admin.locator('[data-todo-id="'+familyId+'"]').click();await admin.getByText('宝宝已提交完成，等待哥哥验收',{exact:true}).waitFor();checks++;
 await admin.getByRole('button',{name:'关闭家庭窗口'}).click();await open(admin);
 check(await admin.locator('[data-todo-id="'+familyId+'"]').count(),1,'reading retains pending task');
 await admin.locator('[data-todo-id^="withdrawal:"]').click();await admin.locator('#settleWithdrawalLayer.open').waitFor();
 check(await admin.locator('#settleWithdrawalMessage').innerText().then(t=>t.includes('¥30')),true,'opens selected withdrawal');
 await admin.locator('#settleWithdrawalConfirmBtn').click();await admin.locator('#settleWithdrawalLayer').waitFor({state:'hidden'});await open(admin);
 check(await admin.locator('[data-todo-id^="withdrawal:"]').count(),0,'handled withdrawal disappears');
 await admin.locator('[data-todo-id^="service:"]').click();await admin.locator('#fatRewardLayer.open').waitFor();
 await admin.getByRole('button',{name:'返回服务列表',exact:true}).waitFor();
 check(await admin.locator('.fat-reward-service-card').count(),1,'specific service only');
 await admin.getByRole('button',{name:'确认完成',exact:true}).click();
 await admin.locator('[data-fat-reward-action="submit"]').click();
 await admin.locator('.fat-reward-status').filter({hasText:'已完成'}).waitFor();
 await admin.getByRole('button',{name:'关闭钻石窗口',exact:true}).click();await open(admin);
 check(await admin.locator('[data-todo-id^="service:"]').count(),0,'handled service disappears');
 await admin.locator('[data-todo-action="close"]').click();
 await guest.locator('.app-nav [data-value="kitchen"]').click();await guest.locator('.family-task-card').first().waitFor();
 check(await guest.getByRole('button',{name:'原餐次记录',exact:true}).count(),0,'old history entry removed');
 const before=(await rpc(guest,'points_get_state'))[0].score,note='撤回 UI '+Date.now();
 await guest.locator('[data-family-action="create"]').click();await guest.locator('#familyNote').fill(note);await guest.locator('[data-family-action="save-create"]').click();
 await guest.getByText('宝宝已提交完成，等待哥哥验收',{exact:true}).waitFor();
 await guest.getByRole('button',{name:'撤回登记',exact:true}).click();await guest.locator('[data-family-action="confirm"]').click();
 await guest.locator('#kitchenLayer').waitFor({state:'hidden'});
 await guest.locator('#kitchenContent[data-points-synced="true"]').waitFor();
 check(await guest.locator('.family-task-card').filter({hasText:note}).count(),0,'withdrawn absent from list');
 check((await rpc(guest,'points_get_state'))[0].score,before,'score unchanged');
 await open(guest);await guest.locator('[data-todo-id^="service:"]').click();await guest.getByRole('button',{name:'已进行服务',exact:true}).waitFor();checks++;
 await guest.getByRole('button',{name:'关闭钻石窗口',exact:true}).click();
 // Distinguish installation/network failures from a truly empty inbox.
 await admin.route('**/__demo/rpc',r=>r.request().postDataJSON().name==='points_notifications_get_todos'?r.fulfill({json:{data:{admin:true,items:[],total:0,more:false,cursor:null},error:null}}):r.continue());
 await open(admin);await admin.getByText('暂时没有需要处理的事情',{exact:true}).waitFor();checks++;
 await admin.unroute('**/__demo/rpc');
 await admin.route('**/__demo/rpc',r=>r.request().postDataJSON().name==='points_notifications_get_todos'?r.fulfill({json:{data:null,error:{code:'PGRST202'}}}):r.continue());
 await admin.locator('[data-todo-action="refresh"]').click();await admin.locator('.points-todo-error').filter({hasText:'配套 SQL'}).waitFor();checks++;
 check(errors,[],'no client exceptions');console.log(checks+' todo entry, mobile layout, targeted routing, live completion and withdrawal UI checks passed.');
}finally{await browser.close();}
