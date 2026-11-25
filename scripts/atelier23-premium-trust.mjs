import {chromium,firefox,webkit} from "playwright";
import assert from "node:assert/strict";
import {pathToFileURL} from "node:url";
import {resolve} from "node:path";
import {mkdir} from "node:fs/promises";
const engine=process.env.AUDIT_BROWSER||"chromium";
const browser=await ({chromium,firefox,webkit}[engine]).launch({headless:true});
const url=pathToFileURL(resolve("index.html")).href;
await mkdir("artifacts/audit-mobile",{recursive:true});
try {
for(const width of [390,1280]){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:"reduce"});
 const page=await context.newPage();
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(url);
 const choose=label=>page.locator("#guided-audit").getByRole("button",{name:label,exact:true}).click();
 await choose("Лиссабон");await choose("Поиск и товары");await choose("Обсудить этот приоритет");
 assert.match(await page.locator("#pilot-context").innerText(),/Поиск и товары/);
 assert.ok(await page.locator("#growth-copy").isDisabled());
 await page.locator('input[name="growth-goal"][value="Технические исправления"]').check();
 const text=await page.locator("#growth-brief").inputValue();
 assert.match(text,/15 минут/);assert.match(text,/Лиссабон/);assert.match(text,/Поиск и товары/);assert.match(text,/Когда удобно созвониться/);
 assert.ok(await page.locator("#growth-copy").isEnabled());
 await page.evaluate(()=>{Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async()=>{throw Error("denied")}}})});
 await page.locator("#growth-copy").click();
 await page.waitForFunction(()=>document.getElementById("growth-status").textContent.includes("вручную"));
 assert.equal(await page.locator("#growth-brief").evaluate(e=>e.selectionEnd-e.selectionStart),text.length);
 await page.locator('input[name="growth-market"][value="Москва"]').check();
 assert.ok(await page.locator("#pilot-context").isHidden());
 assert.ok(await page.locator("#growth-copy").isDisabled());
 await page.locator("#guided-reset").click();
 assert.ok(await page.locator("#pilot-context").isHidden());
 assert.equal(await page.locator("#growth-brief").inputValue(),"Выберите рынок и направление.");
 assert.equal(await page.locator(".brand-reference-links a").count(),3);
 assert.equal(await page.locator("#search img").count(),8);
 assert.deepEqual(errors,[]);
 await context.close();
 const staticContext=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:900},reducedMotion:"reduce"});
 const p=await staticContext.newPage();await p.goto(url);
 for(const card of await p.locator("details[data-ea]").all()){await card.locator("summary").click();assert.ok(await card.locator(".ea-metric").isVisible());}
 assert.ok(await p.locator("#guided-reset").isHidden());assert.ok(await p.locator("#album-track").isHidden());
 for(const details of await p.locator(".static-guided details").all()){await details.locator("summary").click();for(const a of await details.locator("a").all()){assert.ok(await a.isVisible());assert.equal(await p.locator(await a.getAttribute("href")).count(),1);}}
 for(const img of await p.locator("#search .proof img,#video-proof .v6-evidence>img").all()){
   await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());assert.ok(await img.evaluate(i=>i.naturalWidth>0));
 }
 assert.equal(await p.locator("#search .proof img,#video-proof .v6-evidence>img").count(),6);
 assert.ok(await p.locator("#manual-brief").isEditable());await p.locator("#manual-brief").fill("Лиссабон. Поиск. Когда удобно созвониться?");
 assert.ok(await p.locator("#growth-copy").isHidden());
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await p.locator("#manual-brief").scrollIntoViewIfNeeded();await p.screenshot({path:`artifacts/audit-mobile/${engine}-${width}-no-js-pilot.png`});
 await staticContext.close();
 console.log(`PASS Premium Trust ${engine} ${width}: context, CTA, clipboard denial, reset, six native images, no-JS navigation and manual draft`);
}
}finally{await browser.close();}
