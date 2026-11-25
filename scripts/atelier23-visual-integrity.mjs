import {chromium,firefox,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
const engine=process.env.AUDIT_BROWSER||'chromium';
const browser=await ({chromium,firefox,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{args:['--disable-dev-shm-usage']}: {})});
const out='artifacts/visual-integrity';await mkdir(out,{recursive:true});
const url=pathToFileURL(resolve('index.html')).href;
const lum=rgb=>rgb.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
const parse=s=>{const a=s.match(/[\d.]+/g).map(Number);assert.ok(a.length===3||a[3]===1,'expected opaque color '+s);return a.slice(0,3)};
const ratio=(a,b)=>{const x=lum(parse(a)),y=lum(parse(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const report=[];
const axeFailures=[];
// Use viewport-bounded captures to avoid Chromium allocating a raster of the long evidence document.
async function capture(page,locator,path){
 await locator.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await locator.locator('img').evaluateAll(async imgs=>{for(const i of imgs)await i.decode()});
 const b=await locator.boundingBox(),v=page.viewportSize();
 assert.ok(b&&b.x>=-1&&b.y>=-1&&b.x+b.width<=v.width+1&&b.y+b.height<=v.height+1,'capture must fit viewport '+JSON.stringify(b));
 const x=Math.max(0,Math.ceil(b.x)),y=Math.max(0,Math.ceil(b.y));
 const clip={x,y,width:Math.min(v.width,Math.floor(b.x+b.width))-x,height:Math.min(v.height,Math.floor(b.y+b.height))-y};
 return page.screenshot({clip,animations:'disabled',...(path?{path}:{})});
}
try{
for(const width of [320,390,1280]){
 const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'});
 await page.goto(url);await page.evaluate(()=>document.fonts.ready);
 const block=page.locator('.brand-reference');
 await block.scrollIntoViewIfNeeded();
 const metrics=()=>block.evaluate(el=>({background:getComputedStyle(el).backgroundColor,items:[...el.querySelectorAll('.ea-kicker,h3,p,a')].map(n=>({label:n.textContent.trim(),color:getComputedStyle(n).color,font:getComputedStyle(n).fontSize})),box:[el.offsetWidth,el.offsetHeight]}));
 const fixed=await metrics();const ratios=fixed.items.map(x=>({...x,ratio:ratio(x.color,fixed.background)}));
 for(const row of ratios)assert.ok(row.ratio>=4.5,JSON.stringify(row));
 await capture(page,block,out+'/'+engine+'-'+width+'-after.png');console.log('CAPTURE fixed '+width);
 const card=page.locator('.ea-card').first();const unaffected=await capture(page,card);console.log('CAPTURE control fixed '+width);
 await page.evaluate(()=>document.getElementById('visual-integrity-75').disabled=true);
 const before=await metrics();const previous=before.items.map(x=>({...x,ratio:ratio(x.color,before.background)}));
 assert.ok(previous.some(x=>x.ratio<4.5),'negative control must expose original contrast regression');
 await capture(page,block,out+'/'+engine+'-'+width+'-before.png');console.log('CAPTURE baseline '+width);
 assert.deepEqual(await capture(page,card),unaffected,'unaffected chapter visual regression');
 await page.evaluate(()=>document.getElementById('visual-integrity-75').disabled=false);
 for(const link of await block.locator('a').all()){
   await link.hover();const hovered=await link.evaluate(e=>getComputedStyle(e).color);assert.ok(ratio(hovered,fixed.background)>=4.5);
   await link.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
   const focus=await link.evaluate(e=>{const s=getComputedStyle(e);return {style:s.outlineStyle,color:s.outlineColor,width:parseFloat(s.outlineWidth),visible:e.matches(':focus-visible')}});
   assert.ok(focus.visible&&focus.style==='solid'&&focus.width>=2&&ratio(focus.color,fixed.background)>=3,JSON.stringify(focus));
 }
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const legend=await page.locator('.sharelegend > div:nth-child(2) > b').evaluate(el=>{let p=el;while(p&&getComputedStyle(p).backgroundColor==='rgba(0, 0, 0, 0)')p=p.parentElement;return {fg:getComputedStyle(el).color,bg:getComputedStyle(p).backgroundColor}});assert.ok(ratio(legend.fg,legend.bg)>=4.5,'metadata legend contrast');
 report.push({width,previous,ratios,legendRatio:ratio(legend.fg,legend.bg)});console.log('PASS Visual Integrity '+engine+' '+width+'px: min ratio '+Math.min(...ratios.map(r=>r.ratio)).toFixed(2)+', negative control, focus, unaffected chapter');
 await page.close();
}
const nojs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:850}});
await nojs.goto(url);const colors=await nojs.locator('.brand-reference').evaluate(el=>({background:getComputedStyle(el).backgroundColor,foreground:[...el.querySelectorAll('.ea-kicker,h3,p,a')].map(x=>getComputedStyle(x).color)}));
assert.ok(colors.foreground.every(x=>ratio(x,colors.background)>=4.5));await nojs.close();
await writeFile(out+'/'+engine+'-contrast.json',JSON.stringify(report,null,2));
if(engine==='chromium'){
 const p=await browser.newPage({viewport:{width:390,height:900}});await p.goto(url);
 await p.addScriptTag({path:resolve('node_modules/axe-core/axe.min.js')});
 const audit=async label=>{const r=await p.evaluate(async()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']},resultTypes:['violations','incomplete']}).then(r=>({violations:r.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>({target:n.target,failureSummary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,failureSummary:n.failureSummary}))})),passes:r.passes.map(v=>v.id)})));await writeFile(out+'/axe-'+label+'.json',JSON.stringify(r,null,2));axeFailures.push(...r.violations.map(v=>({label,id:v.id,nodes:v.nodes})));console.log('AXE '+label+' violations '+JSON.stringify(r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length}))));};
 await audit('initial');
 for(const s of await p.locator('details[data-ea] summary').all())await s.click();
 await audit('expanded');await p.close();assert.deepEqual(axeFailures,[],'automated WCAG violations');
}
}finally{await browser.close()}
