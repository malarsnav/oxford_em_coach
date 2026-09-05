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
 export async function bootstrap(){if(localStorage.getItem('test-offline'))throw new Error('Network unavailable');const data=structuredClone(fixture);const rows=JSON.parse(localStorage.getItem('test-tasks')||'[]');data.subjects.forEach(s=>s.academic_results=rows.filter(r=>r.subject_id===s.id));data.studyPlanLogs=JSON.parse(localStorage.getItem('test-logs')||'[]');return data;}
 export async function saveStudyPlanLog(user,row){const logs=JSON.parse(localStorage.getItem('test-logs')||'[]');const i=logs.findIndex(l=>l.log_date===row.log_date && l.start_time===row.start_time && l.end_time===row.end_time && l.planned_activity===row.planned_activity);if(i<0)logs.push(row);else logs[i]=row;localStorage.setItem('test-logs',JSON.stringify(logs));}
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
      await page.clock.setFixedTime(new Date(2026,8,5,12));
      await page.goto(`http://127.0.0.1:${server.address().port}/oxford_em_coach/`);
      await page.getByText('0/8 planned study blocks logged today',{exact:true}).waitFor();
      assert.equal(await page.locator('nav').getByText('Journey',{exact:true}).count(),0);
      assert.equal(await page.locator('nav [data-view="milestones"], nav [data-view="interview"]').count(),0);
      assert.equal(await page.locator('.nav-section').filter({has:page.locator('[data-view="dashboard"]')}).locator('[data-view="review"]').count(),1);
      assert.equal(await page.locator('.daily-block').last().getByText('Buffer',{exact:true}).count(),1);
      assert.equal(await page.locator('.daily-current').count(),1);
      assert.equal(await page.locator('.daily-unlogged').count(),2);
      assert.equal(await page.locator('.daily-upcoming').count(),5);
      await page.locator('.daily-next').getByRole('button',{name:'Log progress',exact:true}).click();
      assert.equal(await page.locator('form[data-action="save-study-log"]:focus [name=start_time]').inputValue(),'11:30');
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
      const log=page.locator('[data-action="save-study-log"]').first();
      await log.locator('.block-notes summary').click();await log.locator('[name=topics_covered]').fill('Quadratics');
      await log.locator('[data-topic-search]').fill('2.3');
      await log.locator('[data-pick-topic="edexcel-8ma0-issue3:Pure:2.3"]').check();
      const evidence=log.locator('[data-topic-id]').first();
      await log.locator('.selected-topic-details > summary').click();
      await evidence.locator('summary').click();
      await evidence.locator('[name=mode][value=practise]').check();
      await evidence.locator('[name=attempted]').fill('8');await evidence.locator('[name=correct]').fill('6');
      await log.locator('[data-topic-search]').fill('7.3');
      await log.locator('[data-pick-topic="edexcel-8ma0-issue3:Pure:7.3"]').check();
      // The second topic deliberately has no mode or extra fields: selection is enough.
      await log.getByText('Change syllabus scope',{exact:true}).click();
      await log.locator('[data-syllabus-scope]').selectOption('full');
      assert.equal(await evidence.locator('[name=correct]').inputValue(),'6');
      await log.locator('[data-syllabus-scope]').selectOption('as');
      assert.equal(await log.locator('[data-pick-topic="edexcel-8ma0-issue3:Pure:2.3"]').isChecked(),true);
      await evidence.scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.screenshot({path:path.join(root,`../work/topic-evidence-${width}.png`),fullPage:false});
      await log.getByRole('button',{name:'Save progress',exact:true}).click();
      await log.getByText('Progress saved.',{exact:true}).waitFor();
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('test-logs'))[0].details.entries.length),2);
      filter=page.locator('[data-action="plan-filter"]');await filter.locator('[name=mode]').selectOption('subject');await filter.locator('[name=subject]').selectOption('Maths');await filter.locator('[name=from]').fill('2026-09-01');await filter.locator('[name=to]').fill('2026-09-30');await filter.getByRole('button').click();
      assert.ok(await page.locator('[data-action="save-study-log"]').count()>4);
      assert.equal(await page.locator('[name=topics_covered]').first().inputValue(),'');
      assert.equal(await page.locator('[name=topics_covered]').evaluateAll(nodes=>nodes.some(n=>n.value==='Quadratics')),true);
      assert.equal(await page.locator('[data-topic-id]').count(),2);
      const history=page.locator('.topic-history');await history.locator('summary').click();await history.getByText(/6\/8 correct/).waitFor();
      filter=page.locator('[data-action="plan-filter"]');await filter.locator('[name=subject]').selectOption('Super Curricular');await filter.getByRole('button').click();
      const smc=page.locator('[data-action="save-study-log"]').first();
      await smc.locator('[name=paper_year]').fill('2024');await smc.locator('[name=questions_completed]').fill('12');
      await smc.getByRole('button',{name:'Save progress',exact:true}).click();await smc.getByText('Progress saved.',{exact:true}).waitFor();
      await smc.locator('[name=activity_kind]').selectOption('Competition');await smc.locator('[name=activity_name]').fill('Essay competition');
      await smc.getByRole('button',{name:'Save progress',exact:true}).click();
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('test-logs')).find(l=>l.planned_activity==='SMC').details.paper_year),undefined);
      filter=page.locator('[data-action="plan-filter"]');await filter.locator('[name=subject]').selectOption('Magazine');await filter.getByRole('button').click();
      await page.getByText('No standing timetable slot',{exact:true}).waitFor();
      await page.getByText('Log extra study',{exact:true}).click();
      const extra=page.locator('[data-action="extra-block"]');await extra.locator('[name=from]').fill('15:30');await extra.locator('[name=to]').fill('15:45');await extra.getByRole('button').click();
      const magazine=page.locator('[data-action="save-study-log"]').filter({has:page.locator('[data-rich-area="Magazine"]')});
      await magazine.locator('[name=title]').fill('Economics article');await magazine.locator('[name=key_idea]').fill('Opportunity cost');await magazine.getByRole('button',{name:'Save progress',exact:true}).click();
      await magazine.getByText('Progress saved.',{exact:true}).waitFor();
      await page.reload();await page.getByRole('button',{name:'Plan Tracker',exact:true}).click();
      filter=page.locator('[data-action="plan-filter"]');await filter.locator('[name=date]').fill('2026-09-05');await filter.getByRole('button').click();
      assert.equal(await page.locator('[data-rich-area="Magazine"] [name=title]').inputValue(),'Economics article');
      assert.equal(await page.locator('[data-topic-id]').count(),2);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      for (const [subject,query,fragment] of [['Physics','4.5.2','4.5.2'],['Economics','1.2.3','1.2.3'],['History','Henry VII','1C-H7.1'],['AS-Further Maths','Complex arithmetic','2.2']]) {
        filter=page.locator('[data-action="plan-filter"]');
        await filter.locator('[name=mode]').selectOption('subject');
        await filter.locator('[name=from]').fill('2026-09-05');await filter.locator('[name=to]').fill('2026-09-05');
        await filter.locator('[name=subject]').selectOption(subject);await filter.getByRole('button').click();
        const block=page.locator('[data-action="save-study-log"]').first();
        await block.locator('[data-topic-search]').fill(query);
        await block.locator(`[data-pick-topic$=":${fragment}"]`).first().check();
        if(subject==='AS-Further Maths') {
          await block.locator('[data-further-paper]').selectOption('Further Mechanics 1 (optional)');
          await block.locator('[data-topic-search]').fill('impulse');
          await block.locator('[data-pick-topic="edexcel-8fm0-issue5:Further Mechanics 1 (optional):1.1"]').check();
        }
        await block.locator('[name=study_notes]').fill('Covered today without per-topic forms.');
        if(subject==='History') {
          await block.locator('[data-topic-search]').fill('Great Turn');
          await block.locator('[data-pick-topic$=":2N-RISE.3"]').check();
          assert.equal(await block.locator('[data-pick-topic$=":2N-CONTROL.2"]').count(),0);
          await block.getByText('Change syllabus scope',{exact:true}).click();
          await block.locator('[data-syllabus-scope]').selectOption('full');
          await block.locator('[data-topic-search]').fill('Yezhovshchina');
          await block.locator('[data-pick-topic$=":2N-CONTROL.2"]').check();
          await block.locator('[data-syllabus-scope]').selectOption('as');
          assert.equal(await block.locator('[data-topic-id]').count(),3);
          await block.locator('[data-topic-search]').fill('');
          await block.locator('.topic-picker').scrollIntoViewIfNeeded();
          await page.screenshot({path:path.join(root,`../work/history-syllabus-${width}.png`),fullPage:false});
        }
        await block.getByRole('button',{name:'Save progress',exact:true}).click();
        await block.getByText('Progress saved.',{exact:true}).waitFor();
        await filter.getByRole('button').click();
        assert.ok(await page.locator(`[data-topic-id$=":${fragment}"]`).count()>0);
        assert.equal(await page.locator('[data-action="save-study-log"]').first().locator('[name=study_notes]').inputValue(),'Covered today without per-topic forms.');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      }
      await page.getByRole('button',{name:'Dashboard',exact:true}).click();
      await page.getByText('6/8 planned study blocks logged today',{exact:true}).waitFor();
      await page.getByText('Extra study today (1)',{exact:true}).waitFor();
      await page.getByRole('button',{name:"Update today's progress",exact:true}).click();
      assert.equal(await page.locator('[data-action="plan-filter"] [name=mode]').inputValue(),'date');
      assert.equal(await page.locator('[data-action="plan-filter"] [name=date]').inputValue(),'2026-09-05');
      await page.getByRole('button',{name:'Dashboard',exact:true}).click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.evaluate(()=>{
        const logs=JSON.parse(localStorage.getItem('test-logs'));
        logs.filter(l=>l.log_date==='2026-09-05'&&l.planned_activity!=='Magazine').slice(0,3).forEach((l,i)=>l.rag_status=['green','amber','red'][i]);
        localStorage.setItem('test-logs',JSON.stringify(logs));
      });
      await page.reload();
      await page.getByText('6/8 planned study blocks logged today',{exact:true}).waitFor();
      for(const tone of ['green','amber','red','logged'])assert.ok(await page.locator('.daily-'+tone).count()>0);
      assert.equal(await page.locator('.daily-block > details[open]').count(),0);
      await page.locator('.daily-block').first().getByRole('button',{name:'Edit log',exact:true}).click();
      assert.equal(await page.locator('form[data-action="save-study-log"]:focus [name=start_time]').inputValue(),'09:00');
      await page.getByRole('button',{name:'Dashboard',exact:true}).click();
      await page.locator('.daily-block').first().getByRole('button',{name:'Edit log',exact:true}).click();
      const changed=page.locator('[data-action="save-study-log"]').first();
      await changed.locator('[data-plan-outcome]').selectOption('changed');
      await changed.locator('[data-actual-area]').selectOption('Physics');
      await changed.locator('[data-topic-search]').fill('4.5.1');
      await changed.locator('[data-pick-topic$=":4.5.1"]').check();
      await changed.locator('[data-plan-outcome]').selectOption('followed');
      assert.ok(await changed.locator('[data-topic-id$=":2.3"]').count()>0);
      await changed.locator('[data-plan-outcome]').selectOption('changed');
      assert.equal(await changed.locator('[data-pick-topic$=":4.5.1"]').isChecked(),true);
      await changed.locator('[name=actual_from]').fill('09:15');await changed.locator('[name=actual_to]').fill('10:00');
      await changed.getByRole('button',{name:'Save progress',exact:true}).click();
      await changed.getByText('Progress saved.',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Dashboard',exact:true}).click();
      await page.locator('.daily-block').first().getByText(/Actual:/).waitFor();
      await page.reload();await page.locator('.daily-block').first().getByText(/Actual:/).waitFor();
      assert.ok((await page.locator('.daily-block').first().textContent()).includes('09:15-10:00'));
      await page.getByRole('button',{name:'Yesterday',exact:true}).click();
      await page.getByText(/0\/5 planned study blocks logged on/).waitFor();
      assert.equal(await page.locator('.daily-upcoming').count(),0);
      await page.getByRole('button',{name:'Today',exact:true}).click();
      await page.evaluate(()=>localStorage.setItem('test-offline','1'));
      await page.getByRole('button',{name:'Refresh',exact:true}).click();
      await page.getByText(/Refresh failed. Showing the previous report/).waitFor();
      await page.getByText('6/8 planned study blocks logged today',{exact:true}).waitFor();
      await page.evaluate(()=>localStorage.removeItem('test-offline'));
      await page.getByRole('button',{name:'Retry refresh',exact:true}).click();
      await page.getByRole('button',{name:'Refresh',exact:true}).waitFor();
      await page.getByText(/Last refreshed/).waitFor();
      await page.locator('.daily-block').nth(1).getByRole('button',{name:'Edit log',exact:true}).click();
      const skipped=page.locator('[data-action="save-study-log"]').nth(1);
      await skipped.locator('[data-plan-outcome]').selectOption('skipped');
      await skipped.getByRole('button',{name:'Save progress',exact:true}).click();
      await skipped.getByText('Progress saved.',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Dashboard',exact:true}).click();
      await page.getByText('4 followed plan · 1 changed · 1 skipped',{exact:true}).waitFor();
      assert.equal(await page.locator('.daily-block').nth(1).locator('.daily-topic-preview').count(),0);
      await page.locator('[data-report-date]').fill('2026-09-04');
      await page.getByText(/0\/5 planned study blocks logged on/).waitFor();
      await page.getByRole('button',{name:'Today',exact:true}).click();
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.locator('.daily-block').last().getByRole('button',{name:'Log progress',exact:true}).click();
      const buffer=page.locator('[data-action="save-study-log"]').last();
      await buffer.locator('[data-rich-area="Buffer"] [name=work_done]').fill('Catch up on any unfinished work.');
      await buffer.getByRole('button',{name:'Save progress',exact:true}).click();
      await buffer.getByText('Progress saved.',{exact:true}).waitFor();
      await page.reload();
      await page.locator('.daily-block').last().getByRole('button',{name:'Edit log',exact:true}).click();
      assert.equal(await page.locator('[data-rich-area="Buffer"] [name=work_done]').inputValue(),'Catch up on any unfinished work.');
      await page.getByRole('button',{name:'Dashboard',exact:true}).click();
      await page.screenshot({path:path.join(root,`../work/school-${width}.png`),fullPage:false});
      assert.deepEqual(errors,[]);
      await page.close();console.log(`School task save, upload, marking, refresh, date/subject tracker and layout passed at ${width}px (mock backend).`);
    }
  } finally {if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
