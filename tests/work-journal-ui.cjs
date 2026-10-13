const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(__dirname,'school-ui.cjs'),'utf8');
const prefix=source.slice(source.indexOf('const fixture ='),source.indexOf('(async()=>'));
const {fixture,names}=new Function('fs','path','root',prefix+';return {fixture,names};')(fs,path,root);
fixture.planner={available:true,versions:[],tasks:[]};
const mock=`const fixture=${JSON.stringify(fixture)};
export async function getSession(){return {user:{id:'test-user',email:'student@example.test'}};}
export async function bootstrap(){const d=structuredClone(fixture);d.studyPlanLogs=JSON.parse(localStorage.getItem('logs')||'[]');d.subjects.forEach(s=>s.academic_results=JSON.parse(localStorage.getItem('exams')||'[]').filter(e=>e.subject_id===s.id));return d;}
export async function saveStudyPlanLog(u,row){const rows=JSON.parse(localStorage.getItem('logs')||'[]');const saved={...row,id:crypto.randomUUID()};rows.push(saved);localStorage.setItem('logs',JSON.stringify(rows));return saved;}
${names.filter(n=>!['getSession','bootstrap','saveStudyPlanLog'].includes(n)).map(n=>`export async function ${n}(){}`).join('\n')}`;
const schoolMock=`export async function saveSchoolTask(u,row){const rows=JSON.parse(localStorage.getItem('exams')||'[]');rows.push({...row,id:'exam'});localStorage.setItem('exams',JSON.stringify(rows));}export async function schoolAttachmentUrl(){}`;
const server=http.createServer((req,res)=>{const file=path.join(root,req.url.split('?')[0].replace(/^\/oxford_em_coach\//,'')||'index.html');try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},timezoneId:'Europe/London'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/dataService.js',r=>r.fulfill({contentType:'text/javascript',body:mock}));
  await page.route('**/src/schoolTaskService.js',r=>r.fulfill({contentType:'text/javascript',body:schoolMock}));
  await page.route('**/src/supabaseClient.js',r=>r.fulfill({contentType:'text/javascript',body:'export const supabase=null;'}));
  await page.clock.setFixedTime(new Date('2026-10-13T19:00:00Z'));
  await page.goto(`http://127.0.0.1:${server.address().port}/oxford_em_coach/`);
  let form=page.locator('[data-action=save-daily-work]');await form.locator('[name=start_time]').fill('17:15');await form.locator('[name=end_time]').fill('18:00');await form.locator('[name=topics]').fill('Quadratic equations');await form.locator('[name=mode]').selectOption('practise');await form.getByRole('button',{name:'Save work',exact:true}).click();
  await page.getByText('Work saved.',{exact:true}).waitFor();await page.reload();await page.getByText('Maths · 1 entries · 45 recorded minutes',{exact:true}).waitFor();
  await page.getByText('Add an exam',{exact:true}).click();form=page.locator('[data-action=save-upcoming-exam]');await form.locator('[name=assessment_name]').fill('Algebra paper');await form.locator('[name=assessment_date]').fill('2026-10-15');await form.getByRole('button',{name:'Save exam',exact:true}).click();await page.getByText('2 days left',{exact:true}).waitFor();
  await page.reload();await page.getByText('2 days left',{exact:true}).waitFor();
  await page.screenshot({path:path.join(root,`../work/work-journal-${width}.png`),fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByRole('button',{name:'Progress',exact:true}).click();await page.getByRole('button',{name:'Monthly',exact:true}).click();await page.getByText('2026-10-01 to 2026-10-31',{exact:true}).waitFor();await page.getByText('Maths · 1 entries · 45 recorded minutes',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByText('No work recorded for this period.',{exact:true}).waitFor();assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS Today work/exam saves, refresh persistence and monthly reporting at mobile/desktop widths (mock backend).');
}finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
