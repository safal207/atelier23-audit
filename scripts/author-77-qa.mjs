import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const b=await chromium.launch({headless:true});
try {
 for(const width of [320,390,1280]){
  for(const javaScriptEnabled of [true,false]){
   const p=await b.newPage({viewport:{width,height:844},javaScriptEnabled});
   const errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto('http://127.0.0.1:8765/',{waitUntil:'load'});
   await p.locator('#audit-author').scrollIntoViewIfNeeded();
   assert.equal(await p.locator('#audit-author h2').innerText(),'Алексей.\nQA-инженер · BitOS');
   for(const id of ['audit-author','author-method','author-gallery']){
    const sec=p.locator('#'+id);await sec.scrollIntoViewIfNeeded();
    for(const img of await sec.locator('img').all()){
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(async e=>{await e.decode();if(!e.naturalWidth)throw Error('Image missing')});
    }
   }
   assert.equal(await p.locator('img[src^="author-"]').count(),4);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow');
   assert.equal(await p.locator('#guided-audit').count(),1);
   assert.equal(await p.locator('#next-step').count(),1);
   assert.equal(errors.length,0,errors.join('\n'));
   if(javaScriptEnabled){await p.locator('#audit-author').scrollIntoViewIfNeeded();await p.screenshot({path:'author-'+width+'.png'});}
   await p.close();
   console.log(width,javaScriptEnabled,'PASS');
  }
 }
}finally{await b.close()}
