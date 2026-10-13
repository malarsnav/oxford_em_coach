const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(__dirname,'school-ui.cjs'),'utf8');
const prefix=source.slice(source.indexOf('const fixture ='),source.indexOf('(async()=>'));
const {fixture,names}=new Function('fs','path','root',prefix+';return {fixture,names};')(fs,path,root);
fixture.tara.recentTrend=[];
fixture.planner={available:true,versions:[],tasks:[]};
const mock=`const fixture=${JSON.stringify(fixture)};
export async function getSession(){return {user:{id:'test-user',email:'student@example.test'}};}
export async function bootstrap(){const d=structuredClone(fixture);d.planner.tasks=JSON.parse(localStorage.getItem('block-tasks') || '[]');d.studyPlanLogs=JSON.parse(localStorage.getItem('test-logs') || '[]');return d;}
export async function saveAttempt(user,set,responses){localStorage.setItem('saved-responses',JSON.stringify(responses));}
${names.filter(n=>!['getSession','bootstrap','saveAttempt'].includes(n)).map(n=>`export async function ${n}(){}`).join('\n')}`;
const plannerMock=`export const PLAN_DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export async function savePlanVersion(u,row){localStorage.setItem('plan-version',JSON.stringify(row));}
export async function saveBlockTask(u,row,id){const rows=JSON.parse(localStorage.getItem('block-tasks') || '[]');const i=rows.findIndex(r=>r.id===id);if(i<0)rows.push({...row,id:'task-1'});else rows[i]={...rows[i],...row};localStorage.setItem('block-tasks',JSON.stringify(rows));}`;
const questions=Array.from({length:5},(_,i)=>({id:'q'+i,paper_year:'2022',question_number:i+1,type:'Critical Thinking',sub_type:'Identifying the Main Conclusion',section:'Critical Thinking',question_text:'All cats are animals. Therefore this cat is an animal. What is the conclusion?',answer_options:{A:'This cat is an animal.',B:'All animals are cats.'},correct_answer:'A',methodology:[],explanation:'The final sentence is the conclusion.',relevant_question_highlights:['Therefore']}));
const server=http.createServer((req,res)=>{const file=path.join(root,req.url.split('?')[0].replace(/^\/oxford_em_coach\//,'') || 'index.html');try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},timezoneId:'Europe/London'});
  page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.route('**/src/dataService.js',r=>r.fulfill({contentType:'text/javascript',body:mock}));
  await page.route('**/src/plannerService.js',r=>r.fulfill({contentType:'text/javascript',body:plannerMock}));
  await page.route('**/src/supabaseClient.js',r=>r.fulfill({contentType:'text/javascript',body:'export const supabase={};'}));
  await page.route('**/src/questions.js',r=>r.fulfill({contentType:'text/javascript',body:'export const questions='+JSON.stringify(questions)}));
  await page.clock.setFixedTime(new Date('2026-10-13T12:00:00Z'));
  await page.goto(`http://127.0.0.1:${server.address().port}/oxford_em_coach/`);
  await page.getByRole('button',{name:'TARA',exact:true}).click();
  assert.equal(await page.locator('.tara-filters').getAttribute('open'),null);
  assert.equal(await page.locator('.tara-setup button:visible').count(),3);
  await page.screenshot({path:path.join(root,`../work/tara-setup-${width}.png`),fullPage:true});
  await page.locator('.tara-filters summary').click();
  await page.locator('[name=year]').selectOption('2022');
  await page.getByRole('button',{name:'Test',exact:true}).click();
  assert.equal(await page.locator('[name=year]').inputValue(),'2022');await page.getByRole('button',{name:'Start practice',exact:true}).click();
  await page.locator('[data-answer=A]').waitFor();
  for(let i=0;i<5;i++){await page.locator('[data-answer=A]').click();assert.equal(await page.locator('.instant-feedback').count(),0);assert.equal(await page.locator('.option.correct').count(),0);if(i<4)await page.getByRole('button',{name:'Next',exact:true}).click();}
  await page.getByRole('button',{name:'Submit set',exact:true}).click();
  await page.waitForFunction(()=>localStorage.getItem('saved-responses'));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('saved-responses')).length),5);
  await page.getByRole('button',{name:'Choose another practice mode',exact:true}).click();
  await page.getByRole('button',{name:'Learn',exact:true}).click();await page.getByRole('button',{name:'Start practice',exact:true}).click();
  await page.locator('[data-answer=B]').click();assert.equal(await page.locator('.instant-feedback').count(),1);
  await page.locator('[data-answer=A]').click();assert.equal(await page.locator('[data-answer=B]').getAttribute('class'),'option incorrect selected');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(root,`../work/workspace-tara-${width}.png`),fullPage:true});
  await page.close();
 }
 console.log('PASS compact TARA: collapsed filters, single start, retained filters, Test submission and Learn feedback at mobile/desktop widths');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
