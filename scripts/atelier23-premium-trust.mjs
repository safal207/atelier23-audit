import {chromium,firefox,webkit} from "playwright";
import assert from "node:assert/strict";
import {pathToFileURL} from "node:url";
import {resolve} from "node:path";
import {mkdir} from "node:fs/promises";
const engine=process.env.AUDIT_BROWSER||"chromium";
const watchdog=setTimeout(()=>{console.error("FAIL Premium Trust: bounded 120s watchdog; last stage: "+stage);process.exit(1)},120000);watchdog.unref();
let stage="launch";const mark=(label)=>{stage=label;console.log("START Premium Trust "+engine+" "+label)};
const browser=await ({chromium,firefox,webkit}[engine]).launch({headless:true,timeout:20000});
const url=pathToFileURL(resolve("index.html")).href;
await mkdir("artifacts/audit-mobile",{recursive:true});
try {
for(const width of [390,1280]){
 mark(width+" JS context");
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:"reduce"});
 const page=await context.newPage();page.setDefaultTimeout(10000);
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 mark(width+" JS navigation");await page.goto(url,{waitUntil:"domcontentloaded",timeout:15000});
 const choose=label=>page.locator("#guided-audit").getByRole("button",{name:label,exact:true}).click();
 await choose("Лиссабон");await choose("Поиск и товары");await choose("Обсудить этот приоритет");
 assert.match(await page.locator("#pilot-context").innerText(),/Поиск и товары/);
 assert.ok(await page.locator("#growth-copy").isDisabled());
 await page.locator('input[name="growth-goal"][value="Технические исправления"]').check();
 const text=await page.locator("#growth-brief").inputValue();
 assert.match(text,/15 минут/);assert.match(text,/Лиссабон/);assert.match(text,/Поиск и товары/);assert.match(text,/Когда удобно созвониться/);
 assert.ok(await page.locator("#growth-copy").isEnabled());
 mark(width+" clipboard rejection");await page.evaluate(()=>{Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async()=>{throw Error("denied")}}})});
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
 mark(width+" close JS context");await context.close();
 mark(width+" no-JS context");
 const staticContext=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:900},reducedMotion:"reduce"});
 const p=await staticContext.newPage();p.setDefaultTimeout(10000);mark(width+" no-JS navigation");await p.goto(url,{waitUntil:"domcontentloaded",timeout:15000});
 mark(width+" native disclosures");
 for(const card of await p.locator("details[data-ea]").all()){await card.locator("summary").click();assert.ok(await card.locator(".ea-metric").isVisible());}
 assert.ok(await p.locator("#guided-reset").isHidden());assert.ok(await p.locator("#album-track").isHidden());
 mark(width+" static links");
 for(const details of await p.locator(".static-guided details").all()){await details.locator("summary").click();for(const a of await details.locator("a").all()){assert.ok(await a.isVisible());assert.equal(await p.locator(await a.getAttribute("href")).count(),1);}}
 mark(width+" static images");
 for(const img of await p.locator("#search .proof img,#video-proof .v6-evidence>img").all()){
   await img.scrollIntoViewIfNeeded();await p.waitForFunction(i=>i.complete&&i.naturalWidth>0,await img.elementHandle(),{timeout:10000});assert.ok(await img.evaluate(i=>i.naturalWidth>0));
 }
 assert.equal(await p.locator("#search .proof img,#video-proof .v6-evidence>img").count(),6);
 mark(width+" manual draft");
 assert.ok(await p.locator("#manual-brief").isEditable());await p.locator("#manual-brief").fill("Лиссабон. Поиск. Когда удобно созвониться?");
 assert.ok(await p.locator("#growth-copy").isHidden());
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 mark(width+" no-JS screenshot");await p.locator("#manual-brief").scrollIntoViewIfNeeded();await p.screenshot({path:`artifacts/audit-mobile/${engine}-${width}-no-js-pilot.png`,timeout:10000});
 await staticContext.close();
 console.log(`PASS Premium Trust ${engine} ${width}: context, CTA, clipboard denial, reset, six native images, no-JS navigation and manual draft`);
}
}finally{await browser.close();clearTimeout(watchdog);}
