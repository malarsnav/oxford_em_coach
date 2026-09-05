import { WEEKDAY_TIMETABLE, WEEKEND_TIMETABLE } from './studentStudyPlan.js';

export function dailyStudyReport(logs = [], now = new Date()) {
  const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const day = now.toLocaleDateString('en-GB',{weekday:'long'});
  const minutes = value => Number(value.slice(0,2))*60+Number(value.slice(3,5));
  const clock = now.getHours()*60+now.getMinutes();
  const key = (from,to,activity) => JSON.stringify([from.slice(0,5),to.slice(0,5),activity]);
  const todayLogs = [...new Map(logs.filter(l=>l.log_date===date).map(l=>[key(l.start_time,l.end_time,l.planned_activity),l])).values()];
  const rows = ['Saturday','Sunday'].includes(day)?WEEKEND_TIMETABLE:WEEKDAY_TIMETABLE;
  const blocks = rows.filter(r=>r[day]&&!['break','breakfast','lunch','dinner'].includes(r[day].toLowerCase())).map(r=>{
    const log=todayLogs.find(l=>key(l.start_time,l.end_time,l.planned_activity)===key(r.from,r.to,r[day]));
    return {date,activity:r[day],from:r.from,to:r.to,log,minutes:minutes(r.to)-minutes(r.from),
      status:log?'Logged':clock>=minutes(r.to)?'Not logged':clock>=minutes(r.from)?'Current block':'Upcoming'};
  });
  const extra=todayLogs.filter(l=>!blocks.some(b=>key(b.from,b.to,b.activity)===key(l.start_time,l.end_time,l.planned_activity)));
  const logged=blocks.filter(b=>b.log).length;
  return {date,blocks,extra,logged,total:blocks.length,percent:blocks.length?Math.round(100*logged/blocks.length):0,
    overdue:blocks.filter(b=>b.status==='Not logged').length,
    upcoming:blocks.filter(b=>b.status==='Upcoming').length,
    plannedMinutes:blocks.reduce((sum,b)=>sum+b.minutes,0),
    loggedMinutes:blocks.filter(b=>b.log).reduce((sum,b)=>sum+b.minutes,0),
    green:todayLogs.filter(l=>l.rag_status==='green').length,
    amber:todayLogs.filter(l=>l.rag_status==='amber').length,
    red:todayLogs.filter(l=>l.rag_status==='red').length};
}
