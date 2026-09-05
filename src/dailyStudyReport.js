import { WEEKDAY_TIMETABLE, WEEKEND_TIMETABLE } from './studentStudyPlan.js';
import { areaFor, logArea } from './planTracking.js';

export function weeklyStudyReport(logs = [], now = new Date(), selectedDate) {
  const anchor = selectedDate ? new Date(selectedDate+'T12:00:00') : new Date(now);
  anchor.setDate(anchor.getDate() - (anchor.getDay()+6)%7);
  const days = Array.from({length:7}, (_,i) => {
    const date = new Date(anchor); date.setDate(anchor.getDate()+i);
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    return dailyStudyReport(logs,now,key);
  });
  const sum = field => days.reduce((total,day)=>total+day[field],0);
  const subjects = new Map();
  const subject = name => {
    if(!subjects.has(name)) subjects.set(name,{name,planned:0,logged:0,actual:0,missed:0});
    return subjects.get(name);
  };
  days.forEach(day=>{
    day.blocks.forEach(block=>{
      const row=subject(areaFor(block.activity)); row.planned++;
      if(block.log) row.logged++;
      if(block.status==='Not logged') row.missed++;
    });
    [...day.blocks.map(b=>b.log).filter(Boolean),...day.extra].forEach(log=>{
      const name=logArea(log); if(name) subject(name).actual++;
    });
  });
  const total=sum('total'),logged=sum('logged');
  return {start:days[0].date,end:days[6].date,days,subjects:[...subjects.values()],total,logged,
    percent:total?Math.round(100*logged/total):0,missed:sum('overdue'),upcoming:sum('upcoming'),
    followed:sum('followed'),changed:sum('changed'),skipped:sum('skipped'),
    green:sum('green'),amber:sum('amber'),red:sum('red'),extra:days.reduce((n,d)=>n+d.extra.length,0)};
}

export function dailyStudyReport(logs = [], now = new Date(), selectedDate) {
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const date=selectedDate || today;
  const day = new Date(date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long'});
  const minutes = value => Number(value.slice(0,2))*60+Number(value.slice(3,5));
  const clock = date<today?1440:date>today?-1:now.getHours()*60+now.getMinutes();
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
    loggedMinutes:blocks.filter(b=>b.log && b.log.details?.outcome!=='skipped').reduce((sum,b)=>sum+b.minutes,0),
    followed:blocks.filter(b=>b.log && (!b.log.details?.outcome || b.log.details.outcome==='followed')).length,
    changed:blocks.filter(b=>b.log?.details?.outcome==='changed').length,
    skipped:blocks.filter(b=>b.log?.details?.outcome==='skipped').length,
    green:todayLogs.filter(l=>l.details?.outcome!=='skipped'&&l.rag_status==='green').length,
    amber:todayLogs.filter(l=>l.details?.outcome!=='skipped'&&l.rag_status==='amber').length,
    red:todayLogs.filter(l=>l.details?.outcome!=='skipped'&&l.rag_status==='red').length};
}
