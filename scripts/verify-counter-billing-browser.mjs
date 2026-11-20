import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(process.env.PLAYWRIGHT_RUNTIME_ROOT ? path.resolve(process.env.PLAYWRIGHT_RUNTIME_ROOT, 'package.json') : import.meta.url);
const {chromium}=require('playwright');
const out=path.resolve(process.env.QA_OUTPUT || 'output/counter-billing');
const base=process.env.QA_URL || 'http://127.0.0.1:5183';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
const results=[];
try{
for(const width of [360,390,820,1440])for(const theme of ['light','dark'])for(const lang of ['en','hi','mr','gu']){
 const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/tests/browser/counter-billing.html?theme=${theme}&lang=${lang}`);
 await page.locator('tbody tr').last().waitFor();
 const rows=await page.locator('tbody tr').count();
 await page.locator('tbody tr').first().scrollIntoViewIfNeeded();
 const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth, clipped:[...document.querySelectorAll('.counter-quantity-control,.counter-price input')].filter(el=>{const r=el.getBoundingClientRect(),p=el.closest('td').getBoundingClientRect();return r.width>p.width+1}).length}));
 await page.screenshot({path:`${out}/table-${width}-${theme}-${lang}.png`});
 results.push({width,theme,lang,rows,...geometry,errors,pass:rows===120&&geometry.overflow<=1&&geometry.clipped===0&&errors.length===0});
 console.log(JSON.stringify(results.at(-1)));
 await page.close();
}
const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto(base+'/tests/browser/counter-billing.html');await page.locator('tbody tr').last().waitFor();
await page.locator('body').click({position:{x:2,y:2}});
for(let i=0;i<100;i++){await page.keyboard.type('8901234567890');await page.keyboard.press('Enter');}
const quantity=await page.locator('.counter-quantity input').first().inputValue();
results.push({scenario:'100 real browser HID keyboard bursts',quantity,pass:quantity==='101'});
await page.close();
}finally{await browser.close();await fs.writeFile(out+'/browser-report.json',JSON.stringify({scope:'Real counter-table and HID hook, isolated synthetic browser fixture; no API/financial writes',results,summary:{passed:results.filter(x=>x.pass).length,total:results.length}},null,2));}
if(results.some(x=>!x.pass))process.exitCode=1;
