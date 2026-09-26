const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(__dirname, 'school-ui.cjs'), 'utf8');
// Reuse the existing authenticated dashboard fixture without running its suite.
const prefix = source.slice(source.indexOf('const fixture ='), source.indexOf('(async()=>'));
const fixtureData = new Function('fs', 'path', 'root', `${prefix};return {fixture,names};`)(fs,path,root);
const fixture = fixtureData.fixture;
fixture.tara.recentTrend = [];
fixture.tara.attempts = ['first','second','empty'].map(id=>({id,completed_at:'2026-09-25T08:18:00Z',score:2,total:5}));
fixture.tara.responses = ['first','second'].map(id=>({id:`response-${id}`,attempt_id:id,paper_year:1900,question_number:1,selected_answer:'D',correct_answer:'A',is_correct:false,question_type:'Flaw',reasoning_pattern:'Logic'}));
const mockData = `export async function getSession(){return {user:{id:'test-user'}};} export async function bootstrap(){return ${JSON.stringify(fixture)};} ${fixtureData.names.filter(n=>!['getSession','bootstrap'].includes(n)).map(n=>`export async function ${n}(){}`).join('\n')}`;
const server = http.createServer((req,res)=>{
  const file=path.join(root,req.url.split('?')[0].replace(/^\/oxford_em_coach\//,'') || 'index.html');
  try {res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;
  try {
    browser=await chromium.launch({channel:'msedge',headless:true});
    for(const width of [390,1440]){
      const page=await browser.newPage({viewport:{width,height:900}});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/src/dataService.js',r=>r.fulfill({contentType:'text/javascript',body:mockData}));
      await page.route('**/src/supabaseClient.js',r=>r.fulfill({contentType:'text/javascript',body:'export const supabase = {};'}));
      await page.goto(`http://127.0.0.1:${server.address().port}/oxford_em_coach/`);
      await page.locator('nav [data-view="analytics"]').click();
      const first=page.locator('[data-review-attempt="first"]');
      await first.click();
      await page.locator('#session-review-first .session-review').waitFor();
      assert.equal(await first.getAttribute('aria-expanded'),'true');
      assert.equal(await page.locator('.session-history-item').first().locator('.review-item').count(),1);
      assert.equal(await page.locator('.session-review').count(),1);
      await page.locator('[data-review-attempt="second"]').click();
      await page.locator('#session-review-second .session-review').waitFor();
      assert.equal(await first.getAttribute('aria-expanded'),'false');
      assert.equal(await page.locator('.session-review').count(),1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.join(root,`../work/session-review-${width}.png`),fullPage:true});
      await page.getByRole('button',{name:'Close review',exact:true}).click();
      assert.equal(await page.locator('.session-review').count(),0);
      assert.equal(await page.locator('[data-review-attempt="second"]').evaluate(e=>e===document.activeElement),true);
      await first.click();await page.locator('#session-review-first .session-review').waitFor();await first.click();
      assert.equal(await page.locator('.session-review').count(),0);
      await page.locator('[data-review-attempt="empty"]').click();
      await page.getByText('No saved question responses are available for this session.').waitFor();
      assert.deepEqual(errors,[]);
      await page.close();
    }
    console.log('PASS inline session review: mobile/desktop, switching, collapse, focus, empty state');
  }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
