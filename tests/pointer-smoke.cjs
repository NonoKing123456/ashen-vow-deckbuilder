const {chromium}=require('playwright-core');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 try{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('requestfailed',r=>errors.push(r.url()));
  await page.goto(pathToFileURL(path.resolve('index.html')).href);
  await page.waitForSelector('.hand-card');
  const first=page.locator('.hand-card').first(),box=await first.boundingBox();
  const startX=box.x+box.width/2,startY=box.y+35;
  await page.mouse.move(startX,startY);await page.mouse.down();await page.mouse.move(startX,startY-35,{steps:4});
  await page.mouse.move(830,230,{steps:10});await page.mouse.up();
  await page.waitForTimeout(450);
  let b=await page.evaluate(()=>Campaign.load().battle);
  assert.equal(b.energy,2);assert.equal(b.hand.length,4);assert.equal(b.enemy.hp,32);
  await page.locator('.hand-card').first().click({button:'right'});
  assert.equal(await page.locator('#modal-title').textContent(),'铁誓');await page.keyboard.press('Escape');
  await page.locator('[data-act="codex"]').click();
  assert.equal(await page.locator('.card-grid .playing-card').count(),44);
  const overflow=()=>page.locator('.card-grid .playing-card').evaluateAll(cards=>cards.filter(c=>c.querySelector('.card-desc').getBoundingClientRect().bottom>c.getBoundingClientRect().bottom-2).map(c=>c.dataset.card));
  assert.deepEqual(await overflow(),[]);
  await page.locator('[data-act="upgrade-view"]').click(); assert.deepEqual(await overflow(),[]);
  await page.keyboard.press('Escape');await page.locator('[data-act="title"]').click();
  await page.locator('.title-continue').click();
  for(const [width,height] of [[1920,1080],[1280,720],[1024,720],[390,844]]){
    await page.setViewportSize({width,height});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'horizontal overflow at '+width);
    assert.equal(await page.locator('.hand-card').count(),4);
  }
  assert.deepEqual(errors,[]);console.log('Layout and pointer checks passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
