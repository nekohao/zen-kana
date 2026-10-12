// Real UI + disposable localhost PostgreSQL. All external requests are blocked.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.argv[2]));
const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});let checks=0;
const check=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
async function page(role){const p=await browser.newPage({viewport:{width:390,height:844}});await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.goto(`http://127.0.0.1:4178/preview/index.html?role=${role}&demo=1`);await p.locator('.app-nav [data-value="kitchen"]').click();await p.locator('.family-task-card').first().waitFor();return p;}
async function fresh(p){await p.locator('[data-family-action="refresh"]').click();await p.locator('#kitchenContent[data-points-synced="true"]').waitFor();}
const unique='UI自主登记 '+Date.now();
try{
 const admin=await page('admin'),guest=await page('guest'),errors=[];
 admin.on('pageerror',e=>errors.push(e.message));guest.on('pageerror',e=>errors.push(e.message));
 check(await admin.locator('[role="tab"]').filter({hasText:'做饭'}).count(),0,'no cooking/chore split');
 check(await admin.locator('.family-task-card').filter({hasText:'做饭'}).count()>0,true,'cooking shares list');
 await guest.locator('[data-family-action="create"]').click();
 await guest.locator('#familyNote').fill(unique);await guest.locator('[data-family-action="save-create"]').click();
 await guest.getByText('宝宝已提交完成，等待哥哥验收',{exact:true}).waitFor();checks++;
 await guest.getByRole('button',{name:'关闭家庭窗口'}).click();await fresh(admin);
 var taskId=await admin.locator('.family-task-card').filter({hasText:unique}).getAttribute('data-value');await admin.locator('.family-task-card[data-value="'+taskId+'"]').click();await admin.getByRole('button',{name:'验收与评价',exact:true}).click();
 check(await admin.locator('[data-family-action="save-review"]').isDisabled(),true,'verdict must be chosen');
 await admin.locator('[data-family-action="verdict"][data-value="no"]').click();await admin.locator('#familyComment').fill('请擦干水渍');
 await admin.locator('[data-family-action="save-review"]').click();await admin.getByText('验收未通过，请返工后再次提交',{exact:true}).waitFor();checks++;
 await admin.getByRole('button',{name:'关闭家庭窗口'}).click();await fresh(guest);
 await guest.locator('.family-task-card[data-value="'+taskId+'"]').click();check(await guest.getByText('请擦干水渍',{exact:true}).count(),1);
 await guest.getByRole('button',{name:'返工已完成',exact:true}).click();await guest.getByRole('button',{name:'确认已完成',exact:true}).click();
 await guest.getByText('宝宝已提交完成，等待哥哥验收',{exact:true}).waitFor();checks++;
 await guest.getByRole('button',{name:'关闭家庭窗口'}).click();await fresh(admin);
 await admin.locator('.family-task-card').filter({hasText:unique}).click();await admin.getByRole('button',{name:'验收与评价',exact:true}).click();
 check((await admin.locator('.family-detail-head').innerText()).includes('第 2 次提交'),true,'second attempt visible');
 await admin.locator('[data-family-action="verdict"][data-value="yes"]').click();await admin.locator('#familyComment').fill('合格');
 await admin.locator('[data-family-action="save-review"]').click();await admin.getByText('积分已到账',{exact:true}).waitFor();checks++;
 check(await admin.getByRole('button',{name:'验收与评价',exact:true}).count(),0,'settled task cannot re-award');
 await admin.getByRole('button',{name:'关闭家庭窗口'}).click();
 await guest.locator('[data-family-action="types"]').click();check(await guest.locator('[data-family-action="price"]').count(),0,'guest price table read-only');
 check((await guest.locator('.family-price-list').innerText()).includes('洗碗'),true);await guest.getByRole('button',{name:'关闭家庭窗口'}).click();
 await admin.locator('[data-family-action="types"]').click();await admin.locator('[data-family-action="price"][data-value="dishes"]').click();
 await admin.locator('#familyPriceInput').fill('0');await admin.locator('[data-family-action="save-price"]').click();
 check(await admin.getByText('请输入 1 至 1000 的整数分值。',{exact:true}).count(),1,'invalid price remains inline');
 await admin.locator('#familyPriceInput').fill('2');await admin.locator('[data-family-action="save-price"]').click();
 check((await admin.locator('.family-price-row').filter({hasText:'洗碗'}).innerText()).includes('2 分'),true,'editable score');
 await admin.getByRole('button',{name:'关闭家庭窗口'}).click();
 await guest.locator('[data-family-action="types"]').click();await guest.locator('.family-price-row').filter({hasText:'洗碗'}).filter({hasText:'2 分'}).waitFor();check((await guest.locator('.family-price-row').filter({hasText:'洗碗'}).innerText()).includes('2 分'),true,'guest sees latest score');
 await guest.getByRole('button',{name:'关闭家庭窗口'}).click();
 await admin.locator('[data-family-action="create"]').click();await admin.locator('[data-family-action="choose-type"][data-value="cooking"]').click();
 await admin.locator('.family-dish-picker summary').click();await admin.locator('[data-family-action="pick"][data-value="tomato-eggs"]').click();
 await admin.locator('#familyNote').fill('UI做饭请求');await admin.locator('[data-family-action="save-create"]').click();await admin.getByText('这次的饭菜',{exact:true}).waitFor();checks++;
 check(await admin.getByRole('button',{name:'番茄炒蛋 查看菜谱'}).count(),1,'recipe choice retained');
 await admin.getByRole('button',{name:'关闭家庭窗口'}).click();
 await admin.locator('[data-kitchen-action="tab"][data-value="catalog"]').click();check(await admin.locator('.kitchen-dish-card').count(),21,'recipe catalogue retained');
 await admin.locator('#kitchenContent [data-family-action="recipe"][data-value="tomato-eggs"]').click();check(await admin.getByText('食材与调料',{exact:true}).count(),1);
 await admin.getByRole('button',{name:'关闭家庭窗口'}).click();
 for(const p of [admin,guest])for(const size of [{width:320,height:640},{width:430,height:932}]){await p.setViewportSize(size);check(await p.locator('#kitchenPage').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true,'family page fits');}
 check(errors,[],'no client exceptions');console.log(`${checks} unified family UI, self-registration, rework, settlement, score editing and responsive checks passed.`);
}finally{await browser.close();}
