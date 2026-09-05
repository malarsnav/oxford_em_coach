const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req,res) => {
  const relative = decodeURIComponent(req.url.split('?')[0]).replace(/^\/oxford_em_coach\//,'');
  const file = path.resolve(root,relative || 'index.html');
  if (!file.startsWith(root + path.sep)) {res.writeHead(403).end();return;}
  try {res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}
  catch {res.writeHead(404).end();}
});
const fixture = {
  profile:{target_course:'Oxford Economics & Management'},subjects:['Mathematics','Economics','Physics','History'].map((name,i)=>({id:String(i+1),name,academic_results:[],academic_topics:[]})),
  tasks:[],journal:[],reasoning:[],milestones:[],weeklyReviews:[],interviews:[],studyPlanLogs:[],parentStudents:[],readiness:{},recommendations:[],
  tara:{overallAccuracy:0,totalQuestions:0,totalAttempts:0,attempts:[],responses:[],byType:[],byPattern:[]}
};
const mockSdk = `export const supabase = {storage:{from:()=>({upload:async()=>({error:null}),remove:async()=>({error:null}),createSignedUrl:async()=>({data:{signedUrl:'about:blank'}})})},from:()=>{
  let row;let id;let updating=false;
  const q={update:r=>{row=r;updating=true;return q},insert:r=>{row=r;return q},eq:(key,v)=>{if(key==='id')id=v;return q},select:()=>q,single:async()=>{
    const rows=JSON.parse(localStorage.getItem('test-tasks')||'[]');
    if(updating){const index=rows.findIndex(r=>r.id===id);rows[index]={...rows[index],...row};}
    else rows.push(row);
    localStorage.setItem('test-tasks',JSON.stringify(rows));return {data:{id:id||row.id},error:null};}};return q;}};`;
const dataSource = fs.readFileSync(path.join(root,'src/dataService.js'),'utf8');
const names = [...dataSource.matchAll(/export (?:async )?function (\w+)/g)].map(m=>m[1]);
const mockData = `const fixture=${JSON.stringify(fixture)};
 export async function getSession(){return {user:{id:'test-user',email:'student@example.test'}};}
 export async function bootstrap(){const data=structuredClone(fixture);const rows=JSON.parse(localStorage.getItem('test-tasks')||'[]');data.subjects.forEach(s=>s.academic_results=rows.filter(r=>r.subject_id===s.id));data.studyPlanLogs=JSON.parse(localStorage.getItem('test-logs')||'[]');return data;}
 export async function saveStudyPlanLog(user,row){const logs=JSON.parse(localStorage.getItem('test-logs')||'[]');logs.push(row);localStorage.setItem('test-logs',JSON.stringify(logs));}
 ${names.filter(n=>!['getSession','bootstrap','saveStudyPlanLog'].includes(n)).map(n=>`export async function ${n}(){}`).join('\n')}`;
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await chromium.launch({channel:'msedge',headless:true});
    for (const width of [390,1440]) {
      const page=await browser.newPage({viewport:{width,height:900}});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/src/dataService.js',r=>r.fulfill({contentType:'text/javascript',body:mockData}));
      await page.route('**/src/supabaseClient.js',r=>r.fulfill({contentType:'text/javascript',body:mockSdk}));
      await page.goto(`http://127.0.0.1:${server.address().port}/oxford_em_coach/`);
      await page.getByRole('button',{name:'A-Level Rigour',exact:true}).click();
      assert.equal(await page.locator('nav').getByText('Super-Curricular').count(),0);
      await page.getByText('Add homework or assessment',{exact:true}).click();
      let form=page.locator('form[data-action="save-school-task"]').first();
      await form.locator('[name=assessment_type]').selectOption('homework');
      await form.locator('[name=assessment_name]').fill('Algebra exercise');
      await form.locator('[name=attachment]').setInputFiles({name:'exercise.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 test fixture')});
      await form.getByRole('button',{name:'Save task',exact:true}).click();
      await page.getByText(/Algebra exercise.*Homework/).click();
      form=page.locator('form[data-action="save-school-task"]').last();
      await form.locator('[name=status]').selectOption('completed');
      await form.locator('[name=score]').fill('16');await form.locator('[name=max_score]').fill('20');
      await form.locator('[name=self_reflection]').fill('Check signs when expanding brackets.');
      await form.getByRole('button',{name:'Save task',exact:true}).click();
      await page.getByText('Saved successfully.',{exact:true}).waitFor();
      await page.reload();await page.getByRole('button',{name:'A-Level Rigour',exact:true}).click();
      await page.getByText(/Algebra exercise.*16\/20/).waitFor();
      await page.getByText(/Algebra exercise.*16\/20/).click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.screenshot({path:path.join(root,`../work/academics-${width}.png`),fullPage:false});
      await page.getByRole('button',{name:'Plan Tracker',exact:true}).click();
      let filter=page.locator('[data-action="plan-filter"]');
      await filter.locator('[name=date]').fill('2026-09-05');await filter.getByRole('button').click();
      assert.ok(await page.locator('[data-action="save-study-log"]').count()>0);
      const log=page.locator('[data-action="save-study-log"]').first();await log.locator('[name=topics_covered]').fill('Quadratics');await log.getByRole('button').click();
      filter=page.locator('[data-action="plan-filter"]');await filter.locator('[name=mode]').selectOption('subject');await filter.locator('[name=subject]').selectOption('Maths');await filter.locator('[name=from]').fill('2026-09-01');await filter.locator('[name=to]').fill('2026-09-30');await filter.getByRole('button').click();
      assert.ok(await page.locator('[data-action="save-study-log"]').count()>4);
      assert.equal(await page.locator('[name=topics_covered]').first().inputValue(),'');
      assert.equal(await page.locator('[name=topics_covered]').evaluateAll(nodes=>nodes.some(n=>n.value==='Quadratics')),true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.screenshot({path:path.join(root,`../work/school-${width}.png`),fullPage:false});
      assert.deepEqual(errors,[]);
      await page.close();console.log(`School task save, upload, marking, refresh, date/subject tracker and layout passed at ${width}px (mock backend).`);
    }
  } finally {if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
