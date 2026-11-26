import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
for(const width of [320,390,1280]){
 for(const enabled of [true,false]){
  const context=await browser.newContext({viewport:{width,height:844},javaScriptEnabled:enabled,permissions:['clipboard-read','clipboard-write']});
  const p=await context.newPage(), errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  const results=[];
  for(const ver of ['7.7','7.8']){
   await p.goto('http://127.0.0.1:8765/preview-'+ver+'/',{waitUntil:'load'});
   await p.locator('#audit-author').scrollIntoViewIfNeeded();
   const photos=p.locator('img[src^="author-"],img[src^="chapter-"],img[src^="gentleman-"]');
   const count=await photos.count();assert.equal(count,ver==='7.7'?8:1);
   for(const img of await photos.all()){await img.scrollIntoViewIfNeeded();await img.evaluate(async e=>{await e.decode();if(!e.naturalWidth)throw Error('image failed')})}
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+ver);
   if(ver==='7.8'){assert.equal(await p.locator('#audit-author img, img[src^="author-"], #author-gallery').count(),0);assert.ok(await p.locator('#audit-author').innerText().then(t=>t.includes('результаты проверок и скриншоты')));assert.equal((await context.request.get('http://127.0.0.1:8765/preview-7.8/author-real.webp')).status(),404)}
   if(enabled){
    await p.locator('#guided-reset').click();
    await p.locator('#guided-options').getByRole('button',{name:'Лиссабон',exact:true}).click();
    await p.locator('#guided-options').getByRole('button',{name:'Поиск и товары',exact:true}).click();
    assert.ok((await p.locator('#guided-content').innerText()).includes('21 результат'));
    await p.locator('#guided-options').getByRole('button',{name:'Обсудить этот приоритет'}).click();
    assert.equal(await p.locator('#growth-copy').isDisabled(),true);
    await p.locator('input[name="growth-goal"][value="Технические исправления"]').check();
    const brief=await p.locator('#growth-brief').inputValue();
    assert.ok(brief.includes('Лиссабон')&&brief.includes('Поиск и товары')&&brief.includes('Технические исправления'));
    await p.locator('#growth-copy').click();
    assert.equal(await p.evaluate(()=>navigator.clipboard.readText()),brief);
    await p.locator('#album-next').click();
    await p.waitForFunction(()=>/2\s*\/\s*6|2\s*из\s*6/.test(document.querySelector('#album-counter')?.textContent||''),null,{timeout:5000});
    assert.match(await p.locator('#album-counter').innerText(),/2\s*\/\s*6|2\s*из\s*6/);
   }else{assert.ok(await p.locator('#manual-brief').isVisible());assert.ok(await p.locator('.static-guided').isVisible())}
   await p.locator('#audit-author').scrollIntoViewIfNeeded();
   if(enabled)await p.screenshot({path:'author-'+ver+'-'+width+'.png'});
   results.push({version:ver,images:count,height:await p.evaluate(()=>document.documentElement.scrollHeight)});
  }
  assert.equal(errors.length,0,errors.join('\n'));console.log(JSON.stringify({width,enabled,results,pass:true}));
  await context.close();
 }
}
}finally{await browser.close()}
