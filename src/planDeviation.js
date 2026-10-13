import { studyPlanForDate, isNonStudyActivity } from './studentStudyPlan.js';
import { areaFor, logArea } from './planTracking.js';
import { workPeriod } from './workJournal.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mins=t=>Number(t.slice(0,2))*60+Number(t.slice(3,5));
const subject=s=>s==='Mathematics'?'Maths':areaFor(s);
const union=spans=>{let end=-1,total=0;for(const [a,b] of spans.sort((a,b)=>a[0]-b[0])){total+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}return total;};
export function planDeviation(logs,date,now=new Date()) {
  const plan=studyPlanForDate(date),day=new Date(date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long'});
  const blocks=(plan?(['Saturday','Sunday'].includes(day)?plan.weekends:plan.weekdays):[]).filter(b=>b[day]&&!isNonStudyActivity(b[day])).map(b=>({from:b.from,to:b.to,activity:b[day],start:mins(b.from),end:mins(b.to)}));
  const actual=logs.filter(l=>l.log_date===date&&logArea(l)).map(l=>({subject:subject(logArea(l)),from:(l.details?.actual_from||l.start_time).slice(0,5),to:(l.details?.actual_to||l.end_time).slice(0,5),start:mins(l.details?.actual_from||l.start_time),end:mins(l.details?.actual_to||l.end_time)})).filter(l=>l.end>l.start);
  const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const clock=date<today?1440:date>today?-1:now.getHours()*60+now.getMinutes();
  const rows=blocks.map(b=>{
    const matches=actual.filter(l=>l.start<b.end&&l.end>b.start);
    const spans=items=>items.map(l=>[Math.max(b.start,l.start),Math.min(b.end,l.end)]);
    const covered=union(spans(matches)),same=union(spans(matches.filter(l=>l.subject===subject(b.activity))));
    const different=union(spans(matches.filter(l=>l.subject!==subject(b.activity))));
    const skipped=logs.some(l=>l.log_date===date&&l.details?.outcome==='skipped'&&l.start_time.slice(0,5)===b.from&&l.end_time.slice(0,5)===b.to&&l.planned_activity===b.activity);
    const conflict=matches.some((a,i)=>matches.slice(i+1).some(c=>Math.max(a.start,c.start,b.start)<Math.min(a.end,c.end,b.end)));
    const status=conflict?'Overlapping logs':different?'Different subject logged':covered===b.end-b.start?'As planned':covered?'Partly covered':skipped?'Recorded as skipped':clock>=b.end?'No work logged':clock>=b.start?'In progress · no log yet':'Upcoming';
    return {...b,matches,covered,same,different,unlogged:b.end-b.start-covered,status};
  });
  const outside=actual.map(l=>({...l,minutes:l.end-l.start-union(blocks.filter(b=>l.start<b.end&&l.end>b.start).map(b=>[Math.max(l.start,b.start),Math.min(l.end,b.end)]))})).filter(l=>l.minutes>0);
  return {date,rows,outside};
}
export function deviationHtml(logs,date,mode='day') {
  const {from,to}=workPeriod(date,mode),days=[];
  for(let d=new Date(from+'T12:00:00');;d.setDate(d.getDate()+1)){
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if(key>to)break;days.push(planDeviation(logs,key));
  }
  return `<section class="plan-comparison"><h3>Planned vs actual</h3><p class="muted">Unlogged time is unknown, not proof of missed study. Times are self-reported. Overlapping logs need checking.</p>${days.map(d=>`<${mode==='day'?'section':'details'} class="deviation-day">${mode==='day'?`<h4>${d.date}</h4>`:`<summary>${d.date} · ${d.rows.filter(r=>r.covered).length}/${d.rows.length} study slots with logged work</summary>`}${d.rows.map(r=>`<article class="deviation-row"><div><b>${esc(r.activity)}</b><p>${r.from}–${r.to}</p></div><div><strong>${r.status}</strong>${r.matches.map(l=>`<p>${esc(l.subject)} · ${l.from}–${l.to}</p>`).join('')}<p>${r.same} min planned subject · ${r.different} min other subjects · ${r.unlogged} min without a log</p></div></article>`).join('')||'<p>No study slots planned.</p>'}${d.outside.length?`<h4>Outside planned study slots</h4>${d.outside.map(l=>`<p>${esc(l.subject)} · ${l.from}–${l.to} · ${l.minutes} min outside study slots</p>`).join('')}`:''}</${mode==='day'?'section':'details'}>`).join('')}</section>`;
}
