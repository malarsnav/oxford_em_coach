const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {stripTypeScriptTypes}=require('node:module');
const root=path.resolve(__dirname,'..'),ctx=vm.createContext({Date,Intl,Set,Map});
for(const f of ['studentStudyPlan.js','preparationContext.js','preparationSignals.js'])vm.runInContext(fs.readFileSync(path.join(root,'src',f),'utf8').replace(/^import .*;$/gm,'').replaceAll('export ',''),ctx);
const run=s=>vm.runInContext(s,ctx);
assert.equal(run('currentTarget("Oxford Economics & Management")'),'Oxford Philosophy, Politics and Economics');
assert.equal(run('currentTarget("Another target")'),'Another target');
for(const [date,count] of [['2026-09-23T06:00:00Z',0],['2026-09-23T20:30:00Z',7],['2026-09-26T20:45:00Z',13],['2026-09-22T22:00:00Z',0]])assert.equal(run(`loggingEvidence([],new Date('${date}'),1).due`),count);
for(const [date,due] of [['2026-09-23T20:30:00Z',true],['2026-09-23T20:45:00Z',false],['2026-09-26T20:30:00Z',false],['2026-09-26T20:45:00Z',true],['2026-12-23T21:30:00Z',true],['2026-12-23T20:30:00Z',false]])assert.equal(run(`reminderDue(new Date('${date}'))`),due);
const one='{log_date:"2026-09-23",start_time:"07:00:00",end_time:"07:30:00",planned_activity:"Homework",details:{outcome:"skipped"}}';
assert.equal(run(`loggingEvidence([${one},${one}],new Date('2026-09-23T20:30:00Z')).recorded`),1);
assert.equal(run(`loggingEvidence([${one}],new Date('2026-09-23T20:30:00Z')).studied`),0);
assert.equal(run(`loggingEvidence([${one}],new Date('2026-09-23T20:30:00Z')).skipped`),1);
const full=run(`studyPlanForDate('2026-09-23').weekdays.filter(r=>!isNonStudyActivity(r.Wednesday)).map(r=>({log_date:'2026-09-23',start_time:r.from,end_time:r.to,planned_activity:r.Wednesday}))`);
ctx.full=full;
assert.equal(run("loggingEvidence(full,new Date('2026-09-23T20:30:00Z')).todayMissing"),0);

(async()=>{
  const source=stripTypeScriptTypes(fs.readFileSync(path.join(root,'supabase/functions/student-log-reminder/index.ts'),'utf8').replace(/^import .*;$/gm,''));
  let handler,sends=0,claimed=false,failLogs=false,providerFail=false,enabled=true,logs=[];
  const env={STUDENT_REMINDER_CRON_SECRET:'test-secret',BREVO_API_KEY:'test-key',REMINDER_FROM_EMAIL:'sender@example.test'};
  const fakeDb={auth:{admin:{getUserById:async()=>({data:{user:{email:'student@example.test',email_confirmed_at:'confirmed'}}})}},from(table){
    const q={select(){return q},eq(){return q},single:async()=>({data:{enabled}}),insert:async()=>{if(claimed)return {error:{code:'23505'}};claimed=true;return {};},update(){return q},then(resolve){return Promise.resolve(table==='student_reminder_preferences'?{data:[{user_id:'u1'}]}:table==='study_plan_logs'?(failLogs?{error:{message:'offline'}}:{data:logs}):{}).then(resolve);}};return q;
  }};
  const FixedDate=class extends Date{constructor(...args){super(...(args.length?args:['2026-09-23T20:30:00Z']));}};
  vm.runInContext(source,vm.createContext({Date:FixedDate,Response,Request,AbortSignal,JSON,Error,Deno:{env:{get:k=>env[k]},serve:fn=>handler=fn},createClient:()=>fakeDb,loggingEvidence:run('loggingEvidence'),londonClock:run('londonClock'),reminderDue:run('reminderDue'),studentReminderText:run('studentReminderText'),fetch:async(url,options)=>{assert.equal(url,'https://api.brevo.com/v3/smtp/email');assert.equal(JSON.parse(options.body).to[0].email,'student@example.test');sends++;return {ok:!providerFail};}}));
  const request=(secret='test-secret')=>new Request('https://example.test',{method:'POST',headers:{'x-cron-secret':secret}});
  assert.equal((await handler(request('wrong'))).status,401);assert.equal(sends,0);
  delete env.STUDENT_REMINDER_CRON_SECRET;assert.equal((await handler(request())).status,503);env.STUDENT_REMINDER_CRON_SECRET='test-secret';
  failLogs=true;await handler(request());assert.equal(sends,0);failLogs=false;
  logs=full;await handler(request());assert.equal(sends,0);logs=[];
  assert.equal((await (await handler(request())).json()).sent,1);
  await handler(request());assert.equal(sends,1);
  claimed=false;providerFail=true;assert.equal((await (await handler(request())).json()).failed,1);
  await handler(request());assert.equal(sends,2);
  claimed=false;enabled=false;await handler(request());assert.equal(sends,2);
  console.log('PPE context, logging evidence, UK scheduling and mocked email auth/deduplication checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
