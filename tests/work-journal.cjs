const assert=require('node:assert/strict');
(async()=>{
 const {calendarDays,workPeriod,workSummary,dailyWorkPayload,todayWorkHtml}=await import('../src/workJournal.js');
 assert.equal(calendarDays('2026-10-24','2026-10-26'),2);
 assert.deepEqual(workPeriod('2028-02-14','month'),{from:'2028-02-01',to:'2028-02-29'});
 assert.deepEqual(workPeriod('2026-10-13','week'),{from:'2026-10-12',to:'2026-10-18'});
 const v={log_date:'2026-10-13',subject:'Maths',start_time:'17:15',end_time:'18:00',topics:'Quadratics',mode:'practise',score:'',max_score:'',reflection:'Try more examples',rag_status:'amber'};
 const payload=dailyWorkPayload(v,[],[{from:'17:15',to:'18:00',activity:'Maths tuition'}]);
 assert.equal(payload.planned_activity,'Maths tuition');assert.equal(payload.topics_practised,'Quadratics');
 assert.throws(()=>dailyWorkPayload(v,[payload],[{from:'17:15',to:'18:00',activity:'Maths tuition'}]),/already logged/);
 assert.throws(()=>dailyWorkPayload({...v,score:'12',max_score:'10'},[],[]),/valid score/);
 assert.equal(workSummary([payload],'2026-10-01','2026-10-31')[0].minutes,45);
 assert.equal(workSummary([payload],'2026-11-01','2026-11-30').length,0);
 const html=todayWorkHtml({subjects:[{id:'s',name:'Maths',academic_results:[{assessment_type:'assessment',status:'not_started',assessment_name:'Paper 1',assessment_date:'2026-10-15'}]}]},'2026-10-13','Maths','2026-10-13');
 assert.match(html,/2 days left/);assert.match(html,/save-daily-work/);
 console.log('Work journal: period boundaries, countdowns, payloads, duplicate guard and summaries passed.');
})().catch(e=>{console.error(e);process.exit(1);});
