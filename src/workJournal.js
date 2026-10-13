import { areaFor, logArea, STUDY_AREAS } from './planTracking.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function calendarDays(from,to) { return Math.round((Date.parse(to+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))/86400000); }
export function workPeriod(date,mode) {
  const d=new Date(date+'T12:00:00');
  const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  if(mode==='month')return {from:date.slice(0,7)+'-01',to:key(new Date(d.getFullYear(),d.getMonth()+1,0,12))};
  if(mode==='week'){d.setDate(d.getDate()-(d.getDay()+6)%7);const from=key(d);d.setDate(d.getDate()+6);return {from,to:key(d)};}
  return {from:date,to:date};
}
export function workSummary(logs,from,to) {
  const rows=logs.filter(l=>l.log_date>=from&&l.log_date<=to&&logArea(l));
  return [...new Set(rows.map(logArea))].map(subject=>{
    const entries=rows.filter(l=>logArea(l)===subject);
    const minutes=entries.reduce((n,l)=>{const d=l.details||{};const time=t=>Number(t.slice(0,2))*60+Number(t.slice(3,5));return n+Math.max(0,time(d.actual_to||l.end_time)-time(d.actual_from||l.start_time));},0);
    return {subject,entries,minutes};
  });
}
export function workSummaryHtml(logs,date,mode) {
  const {from,to}=workPeriod(date,mode),groups=workSummary(logs,from,to);
  return `<section class="work-summary"><h3>Work by subject</h3><p>${esc(from)} to ${esc(to)}</p>${groups.length?groups.map(g=>`<details><summary>${esc(g.subject)} · ${g.entries.length} entries · ${g.minutes} recorded minutes</summary>${g.entries.map(l=>`<article><b>${esc(l.log_date)} · ${esc(l.start_time.slice(0,5))}–${esc(l.end_time.slice(0,5))}</b><p>${esc(l.topics_covered||l.topics_practised||l.topics_assessed||'')}</p>${l.rag_status?`<p>${esc(l.rag_status)}</p>`:''}${l.reflection?`<p>${esc(l.reflection)}</p>`:''}</article>`).join('')}</details>`).join(''):'<p>No work recorded for this period.</p>'}<p class="muted">Recorded duration is self-reported, not measured study time.</p></section>`;
}
export function todayWorkHtml(data,date,subject,today) {
  const subjects=[...new Set([...STUDY_AREAS,...data.subjects.map(s=>s.name==='Mathematics'?'Maths':areaFor(s.name))])];
  const exams=data.subjects.flatMap(s=>(s.academic_results||[]).filter(t=>t.assessment_type==='assessment'&&t.status!=='completed'&&t.assessment_date).map(t=>({...t,subject:s.name})) ).sort((a,b)=>a.assessment_date.localeCompare(b.assessment_date));
  return `<header class="top"><h2>Log my work</h2></header>
    <form data-action="save-daily-work" class="work-entry stack">
      <div class="form-grid"><label>Date<input type="date" name="log_date" value="${date}" max="${today}" required></label><label>Subject<select name="subject">${subjects.map(s=>`<option ${s===subject?'selected':''}>${esc(s)}</option>`).join('')}</select></label>
      <label>From<input type="time" name="start_time" required></label><label>To<input type="time" name="end_time" required></label></div>
      <label>Topics / sub-topics covered<textarea name="topics" required maxlength="4000"></textarea></label>
      <label>Work type<select name="mode"><option value="learn">Learn</option><option value="practise">Practise</option><option value="assess">Assess</option><option value="reflect">Reflect</option></select></label>
      <details><summary>Record a score (optional)</summary><div class="form-grid"><label>Score<input type="number" name="score" min="0" step="any"></label><label>Out of<input type="number" name="max_score" min="0.01" step="any"></label></div></details>
      <label>How did it go?<select name="rag_status"><option value="">Not rated</option><option value="green">Green · confident</option><option value="amber">Amber · needs practice</option><option value="red">Red · needs help</option></select></label>
      <label>Notes / next steps<textarea name="reflection" maxlength="4000"></textarea></label><button>Save work</button><p class="form-status" role="status"></p>
    </form>
    <section class="work-exams"><h3>Upcoming exams</h3>${exams.length?exams.map(e=>{const days=calendarDays(today,e.assessment_date);return `<article><b>${esc(e.subject)} · ${esc(e.assessment_name)}</b><p>${esc(e.assessment_date)} · <strong>${days===0?'Today':days>0?`${days} days left`:`${-days} days ago · awaiting result`}</strong></p></article>`;}).join(''):'<p>No exam dates recorded.</p>'}
    <details><summary>Add an exam</summary><form data-action="save-upcoming-exam" class="stack"><label>Subject<select name="subject_id">${data.subjects.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select></label><label>Exam / paper<input name="assessment_name" required maxlength="250"></label><label>Exam date<input name="assessment_date" type="date" required min="${today}"></label><label>Topics / notes<textarea name="description"></textarea></label><button>Save exam</button><p class="form-status" role="status"></p></form></details></section>
    ${workSummaryHtml(data.studyPlanLogs||[],date,'day')}`;
}
export function dailyWorkPayload(values,logs,blocks) {
  if(!values.topics.trim())throw new Error('Enter the topics or work completed.');
  const score=values.score===''?null:Number(values.score),max=values.max_score===''?null:Number(values.max_score);
  if((score!==null&&(!Number.isFinite(score)||score<0||max===null||score>max))||(max!==null&&(!Number.isFinite(max)||max<=0)))throw new Error('Enter a valid score and total marks.');
  const candidates=blocks.filter(b=>b.from===values.start_time&&b.to===values.end_time&&areaFor(b.activity)===values.subject);
  const activity=candidates[0]?.activity||values.subject;
  if(logs.some(l=>l.log_date===values.log_date&&l.start_time.slice(0,5)===values.start_time&&l.end_time.slice(0,5)===values.end_time&&l.planned_activity===activity))throw new Error('This work block is already logged. Edit it in Plan to avoid replacing your existing entry.');
  return {log_date:values.log_date,day_name:new Date(values.log_date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long'}),start_time:values.start_time,end_time:values.end_time,planned_activity:activity,
    topics_covered:values.mode==='learn'?values.topics:null,topics_practised:values.mode==='practise'?values.topics:null,topics_assessed:values.mode==='assess'?values.topics+(score!==null?` (${score}/${max})`:''):null,
    reflection:values.mode==='reflect'?values.topics+'\n'+values.reflection:values.reflection,rag_status:values.rag_status,
    details:{outcome:'followed',actual_activity:values.subject,actual_from:values.start_time,actual_to:values.end_time,work_type:values.mode,score,max_score:max}};
}
