import { studyPlanForDate, isNonStudyActivity, STUDY_PLAN_VERSIONS } from './studentStudyPlan.js';

export function londonClock(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
  return {date:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`};
}

export function loggingEvidence(logs = [], now = new Date(), days = 7) {
  const clock = londonClock(now), anchor = new Date(clock.date+'T12:00:00Z');
  const start = STUDY_PLAN_VERSIONS.at(-1).effectiveFrom;
  const result = {due:0,recorded:0,unlogged:0,studied:0,skipped:0,changed:0,days:0,todayMissing:0,date:clock.date,from:clock.date};
  for (let offset = Math.max(1,Math.min(30,days))-1; offset>=0; offset--) {
    const d = new Date(anchor); d.setUTCDate(d.getUTCDate()-offset);
    const date = d.toISOString().slice(0,10);
    if(date<start)continue;
    const plan = studyPlanForDate(date);
    if(!plan)continue;
    result.days++; if(date<result.from)result.from=date;
    const day = new Intl.DateTimeFormat('en-GB',{weekday:'long',timeZone:'UTC'}).format(d);
    const rows = ['Saturday','Sunday'].includes(day)?plan.weekends:plan.weekdays;
    for(const row of rows) {
      if(!row[day] || isNonStudyActivity(row[day]) || (date===clock.date && row.to>clock.time))continue;
      result.due++;
      // Match the saved slot, not its actual subject; duplicate rows never inflate coverage.
      const log = [...logs].reverse().find(l=>l.log_date===date && l.start_time?.slice(0,5)===row.from && l.end_time?.slice(0,5)===row.to && l.planned_activity===row[day]);
      if(!log){result.unlogged++;if(date===clock.date)result.todayMissing++;continue;}
      result.recorded++;
      if(log.details?.outcome==='skipped')result.skipped++;
      else {result.studied++;if(log.details?.outcome==='changed')result.changed++;}
    }
  }
  result.coverage = result.due ? Math.round(result.recorded/result.due*100) : null;
  result.status = !result.due ? 'No blocks due yet' : result.unlogged ? 'Records incomplete' : 'Records up to date';
  return result;
}

export function reminderDue(now = new Date()) {
  const clock=londonClock(now);
  const day=new Date(clock.date+'T12:00:00Z').getUTCDay();
  const target=day===0 || day===6 ? 21*60+45 : 21*60+30;
  const [h,m]=clock.time.split(':').map(Number);
  return h*60+m>=target && h*60+m<target+15;
}

export function studentReminderText(evidence) {
  return `Your Oxford PPE preparation check-in for ${evidence.date}\n\n${evidence.todayMissing} planned study block(s) still need a log today. Please record what you actually did, or mark a block as skipped or changed.\n\nKeeping an honest record helps you spot gaps, review mistakes and adjust preparation for your university goals. Missing logs make that harder, but do not prove you missed the work or predict your admissions outcome.\n\nTake two minutes to update your topics, progress and next step:\nhttps://malarsnav.github.io/oxford_em_coach/\n\nYou can turn off these reminders in Profile. No need to add extra study tonight just to fill the log.`;
}
