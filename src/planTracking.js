import { WEEKDAY_TIMETABLE, WEEKEND_TIMETABLE } from './studentStudyPlan.js';
import { syllabusFor, SYLLABUS_ITEMS } from './studySyllabuses.js';

export const STUDY_AREAS = ['Maths','Physics','Economics','History','AS-Further Maths','EPQ','Super Curricular','Book','TARA','Magazine'];
const academic = ['Maths','Physics','Economics','History','AS-Further Maths'];
const modes = ['learn','practise','assess','reflect'];
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const areaFor = activity => activity === 'AS Maths' ? 'AS-Further Maths' : activity === 'Maths tuition' ? 'Maths' : ['SMC','Super-Curricular'].includes(activity) ? 'Super Curricular' : activity;
export const displayActivity = activity => activity === 'AS Maths' ? 'AS-Further Maths' : activity === 'SMC' ? 'Super Curricular' : activity;
export const logArea = log => log.details?.outcome==='skipped' ? null : areaFor(log.details?.actual_activity || log.planned_activity);

export function deviationFields(block, log) {
  const d=log?.details || {}, outcome=d.outcome || 'followed';
  return `<label>What happened?<select data-plan-outcome name="plan_outcome">${[['followed','Followed plan'],['changed','Did something else'],['skipped','Skipped']].map(([v,l])=>`<option value="${v}" ${outcome===v?'selected':''}>${l}</option>`).join('')}</select></label>
    <div data-actual-fields ${outcome!=='changed'?'hidden':''}><label>Actual subject / activity<select data-actual-area name="actual_activity">${[...STUDY_AREAS,'Spillover'].map(a=>`<option ${a===areaFor(d.actual_activity || block.activity)?'selected':''}>${a}</option>`).join('')}</select></label><div class="form-grid"><label>Actual start<input type="time" name="actual_from" value="${esc(d.actual_from || block.from)}"></label><label>Actual end<input type="time" name="actual_to" value="${esc(d.actual_to || block.to)}"></label></div></div>
    <label data-change-reason ${outcome==='followed'?'hidden':''}>Reason (optional)<input name="change_reason" value="${esc(d.change_reason)}"></label>`;
}

export function handleDeviation(event, logs, attempts, schoolYear) {
  const t=event.target;
  if(!t.matches('[data-plan-outcome], [data-actual-area]'))return;
  const form=t.form, outcome=form.elements.plan_outcome.value, host=form.querySelector('[data-actual-content]');
  form.querySelector('[data-actual-fields]').hidden=outcome!=='changed';
  form.querySelector('[data-change-reason]').hidden=outcome==='followed';
  host.hidden=outcome==='skipped';
  if(outcome==='skipped')return;
  const area=outcome==='changed'?form.elements.actual_activity.value:areaFor(form.elements.planned_activity.value);
  const previous=host.dataset.area;
  if(previous===area)return;
  // Retain unsaved fields when switching between subjects inside the same block.
  form.studyDrafts ||= new Map();
  const fragment=document.createDocumentFragment();
  while(host.firstChild)fragment.appendChild(host.firstChild);
  form.studyDrafts.set(previous,fragment);
  if(form.studyDrafts.has(area))host.appendChild(form.studyDrafts.get(area));
  else host.innerHTML=richStudyFields(area,{},attempts,customTopicsFor(logs,area),schoolYear);
  host.dataset.area=area;
}

export function collectDeviation(form) {
  const outcome=form.elements.plan_outcome.value;
  const details=outcome==='skipped'?JSON.parse(form.querySelector('[data-actual-content]').dataset.originalDetails || '{}'):(collectStudyDetails(form)||{});
  const actual=outcome==='changed'?form.elements.actual_activity.value:form.elements.planned_activity.value;
  const from=outcome==='changed'?form.elements.actual_from.value:form.elements.start_time.value;
  const to=outcome==='changed'?form.elements.actual_to.value:form.elements.end_time.value;
  if(outcome!=='skipped'&&(!/^\d{2}:\d{2}$/.test(from)||!/^\d{2}:\d{2}$/.test(to)||to<=from))throw new Error('Actual end time must be after the start time.');
  return {...details,outcome,actual_activity:outcome==='skipped'?null:actual,actual_from:outcome==='skipped'?null:from,actual_to:outcome==='skipped'?null:to,change_reason:outcome==='followed'?'':form.elements.change_reason.value};
}
export function scheduledAreas(day) {
  const rows = day ? (['Saturday','Sunday'].includes(day) ? WEEKEND_TIMETABLE : WEEKDAY_TIMETABLE) : [...WEEKDAY_TIMETABLE,...WEEKEND_TIMETABLE];
  return new Set(rows.flatMap(row=> day ? [areaFor(row[day])] : Object.entries(row).filter(([k])=>!['from','to'].includes(k)).map(([,v])=>areaFor(v))));
}
export function availabilityHtml(mode,date,subject) {
  const all = scheduledAreas();
  const day = new Date(date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long'});
  const today = scheduledAreas(day);
  const areas = mode === 'subject' ? [subject] : STUDY_AREAS;
  const missing=areas.filter(a=>!all.has(a));
  return `${missing.length?`<p class="callout"><b>${missing.map(esc).join(', ')}</b>: <strong>No standing timetable slot</strong></p>`:''}<details class="plan-availability"><summary>Timetable coverage by area</summary><ul>${areas.map(a=>`<li><b>${esc(a)}</b>: ${!all.has(a) ? 'No standing timetable slot' : mode === 'date' && !today.has(a) ? 'Not scheduled today' : 'Scheduled'}</li>`).join('')}</ul></details>`;
}
const input = (name,label,value='',type='text') => `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${type==='number'?'min="0" step="1"':''}></label>`;
const textarea = (name,label,value='') => `<label>${label}<textarea name="${name}">${esc(value)}</textarea></label>`;

export function evidenceRowHtml(entry) {
  return `<details class="topic-evidence" data-topic-id="${esc(entry.id)}" data-topic-name="${esc(entry.topic)}" data-subtopic-name="${esc(entry.label || '')}">
    <summary>${esc(entry.topic)}${entry.label ? ' · '+esc(entry.label) : ''}</summary>
    <p class="muted">Optional detail</p>
    ${input('focus','Specific skill / sub-topic (optional)',entry.focus)}
    <div class="mode-checks">${modes.map(mode=>`<label><input type="checkbox" name="mode" value="${mode}" ${(entry.modes||[]).includes(mode)?'checked':''}>${mode[0].toUpperCase()+mode.slice(1)}</label>`).join('')}</div>
    <div class="form-grid">${input('attempted','Questions attempted',entry.attempted,'number')}${input('correct','Correct answers',entry.correct,'number')}${input('score','Assessment marks',entry.score,'number')}${input('total','Total marks',entry.total,'number')}</div>
    ${textarea('notes','Evidence / reflection / next step',entry.notes)}
    <label>Topic RAG<select name="rag"><option value="">Unset</option>${['green','amber','red'].map(c=>`<option ${entry.rag===c?'selected':''}>${c}</option>`).join('')}</select></label>
    <button class="ghost" type="button" data-remove-topic>Remove topic</button>
  </details>`;
}

function syllabusPickerHtml(area, scope, selected, paper = 'Core Pure') {
  const syllabus = syllabusFor(area, scope);
  if (!syllabus) return '';
  return `<p>${esc(syllabus.label)}${scope === 'as' ? ' · Year 12 / AS content' : area === 'Physics' ? ' · AS content supplied' : ' · Full supplied content'}</p>
    ${area==='AS-Further Maths'?`<label>Paper<select data-further-paper>${[...new Set(syllabus.topics.map(g=>g.section))].map(p=>`<option ${p===paper?'selected':''}>${esc(p)}</option>`).join('')}</select></label>`:''}
    <label>Find a topic<input type="search" data-topic-search placeholder="Search topic or reference"></label>
    ${syllabus.topics.map(g=>`<details data-topic-group data-paper="${esc(g.section)}" ${area==='AS-Further Maths'&&g.section!==paper?'hidden':''}><summary>${esc(g.topic)}${g.level==='a_level'?' (A-level only)':''}</summary>${[syllabus.items.find(i=>i.id===g.id+':general'),...g.items].map(i=>`<label class="topic-choice" data-search-text="${esc((i.section+' '+i.topic+' '+i.ref+' '+i.label).toLowerCase())}"><input type="checkbox" data-pick-topic="${esc(i.id)}" ${selected.has(i.id)?'checked':''}>${i.id.endsWith(':general')?'Whole topic / no specific sub-topic':esc(i.label)}</label>`).join('')}</details>`).join('')}`;
}

export function richStudyFields(activity, log = {}, attempts = [], customTopics = [], schoolYear = 'Year 12') {
  const area = areaFor(activity), d=log.details || {};
  if (academic.includes(area)) {
    const selected = new Set((d.entries||[]).map(e=>e.id));
    const scope = d.syllabus_scope || (d.spec === 'edexcel-9ma0-issue4' || /13/.test(schoolYear) ? 'full' : 'as');
    return `<div class="rich-study" data-rich-area="${esc(area)}">
      <details class="topic-picker" open><summary>Which topics did you cover?</summary>
        <details><summary>Change syllabus scope</summary><label>Content scope<select data-syllabus-scope><option value="as" ${scope==='as'?'selected':''}>Year 12 / AS</option><option value="full" ${scope==='full'?'selected':''}>All supplied content (including later A-level)</option></select></label></details>
        <div data-syllabus-picker>${syllabusPickerHtml(area,scope,selected,d.further_paper || 'Core Pure')}</div>
      </details>
      <details><summary>Other / custom topic</summary>${input('custom_topic','Topic')}${input('custom_subtopic','Sub-topic (optional)')}<button type="button" class="ghost" data-add-custom>Add topic</button>
      ${customTopics.length ? `<label>Previously used<select data-reuse-topic><option value="">Choose a saved custom topic</option>${customTopics.map(e=>`<option value="${esc(e.id)}">${esc(e.topic)}${e.label?' / '+esc(e.label):''}</option>`).join('')}</select></label>`:''}</details>
      <details class="selected-topic-details"><summary>Selected topics / optional detail</summary><div data-topic-evidence>${(d.entries||[]).map(evidenceRowHtml).join('')}</div></details>
      ${textarea('study_notes','Notes (optional)',d.study_notes)}
    </div>`;
  }
  if (area==='Super Curricular') return `<div class="rich-study" data-rich-area="${area}">
    <label>Activity<select name="activity_kind" data-super-kind>${['SMC','Competition','Other'].map(k=>`<option ${(d.activity_kind||'SMC')===k?'selected':''}>${k}</option>`).join('')}</select></label>
    ${input('activity_name','Activity / competition name',d.activity_name || (activity==='SMC'?'Senior Maths Challenge preparation':''))}
    <div data-smc-fields ${(d.activity_kind||'SMC')!=='SMC'?'hidden':''}>${input('paper_year','SMC past-paper year',d.paper_year,'number')}${input('question_numbers','Question numbers (e.g. 1-10, 15)',d.question_numbers)}</div>
    <div class="mode-checks">${modes.map(m=>`<label><input name="activity_mode" type="checkbox" value="${m}" ${(d.modes||[]).includes(m)?'checked':''}>${m}</label>`).join('')}</div>
    <div class="form-grid">${input('questions_completed','Questions completed',d.questions_completed,'number')}${input('activity_score','Score (optional)',d.activity_score,'number')}${input('activity_total','Total marks',d.activity_total,'number')}</div>
    ${textarea('work_done','Work completed / outcome',d.work_done)}${textarea('next_action','Mistakes to revisit / next action',d.next_action)}</div>`;
  if (area==='EPQ') return `<div class="rich-study" data-rich-area="EPQ">${input('project_title','Project title',d.project_title)}
    <label>Project stage<select name="project_stage">${['Planning','Research','Analysis','Drafting','Referencing','Presentation','Review','Other'].map(k=>`<option ${d.project_stage===k?'selected':''}>${k}</option>`).join('')}</select></label>
    ${textarea('work_done','Task worked on and progress',d.work_done)}${textarea('next_action','Next action',d.next_action)}</div>`;
  if (['Book','Magazine'].includes(area)) return `<div class="rich-study" data-rich-area="${area}">${input('title',area==='Book'?'Book title':'Publication / article title',d.title)}${input('section','Chapter / pages / article topic',d.section)}${textarea('key_idea','Key idea / takeaway',d.key_idea)}</div>`;
  if (area==='TARA') return `<div class="rich-study" data-rich-area="TARA"><label>App practice session (optional)<select name="tara_attempt_id"><option value="">External practice / no linked session</option>${attempts.map(a=>`<option value="${esc(a.id)}" ${d.tara_attempt_id===a.id?'selected':''}>${esc(a.completed_at?.slice(0,10))} · ${a.score}/${a.total}</option>`).join('')}</select></label>${textarea('work_done','External practice / methodology reviewed',d.work_done)}</div>`;
  return '';
}

export function customTopicsFor(logs, area) {
  return [...new Map(logs.filter(l=>logArea(l)===area).flatMap(l=>l.details?.entries||[]).filter(e=>e.id.startsWith('custom:')).map(e=>[e.id,e])).values()];
}

export function handleStudyInput(event, logs) {
  const t=event.target, form=t.closest('form');
  if (!form) return;
  const area=form.querySelector('[data-rich-area]')?.dataset.richArea;
  const append = entry => {
    if (![...form.querySelectorAll('[data-topic-id]')].some(r=>r.dataset.topicId===entry.id)) form.querySelector('[data-topic-evidence]').insertAdjacentHTML('beforeend',evidenceRowHtml(entry));
  };
  if (t.matches('[data-pick-topic]')) {
    if (t.checked) append(SYLLABUS_ITEMS.find(i=>i.id===t.dataset.pickTopic));
    else [...form.querySelectorAll('[data-topic-id]')].find(r=>r.dataset.topicId===t.dataset.pickTopic)?.remove();
  }
  if (t.matches('[data-syllabus-scope]')) {
    const selected = new Set([...form.querySelectorAll('[data-topic-id]')].map(r=>r.dataset.topicId));
    form.querySelector('[data-syllabus-picker]').innerHTML=syllabusPickerHtml(area,t.value,selected);
  }
  if (t.matches('[data-topic-search], [data-further-paper]')) {
    const query=form.querySelector('[data-topic-search]').value.toLowerCase().trim();
    const paper=form.querySelector('[data-further-paper]')?.value;
    form.querySelectorAll('[data-topic-group]').forEach(g=>{
      g.querySelectorAll('[data-search-text]').forEach(label=>label.hidden=!label.dataset.searchText.includes(query));
      g.hidden=(paper && g.dataset.paper!==paper)||![...g.querySelectorAll('[data-search-text]')].some(label=>!label.hidden);
      if(query)g.open=!g.hidden;
    });
  }
  if (t.matches('[data-super-kind]')) form.querySelector('[data-smc-fields]').hidden=t.value!=='SMC';
  if (t.matches('[data-reuse-topic]') && t.value) {
    const e=customTopicsFor(logs,area).find(e=>e.id===t.value);
    if(e)append({id:e.id,topic:e.topic,label:e.label});
    t.value='';
  }
  if (t.closest('[data-remove-topic]')) {
    const row=t.closest('[data-topic-id]');
    form.querySelectorAll('[data-pick-topic]').forEach(c=>{if(c.dataset.pickTopic===row.dataset.topicId)c.checked=false;});row.remove();
  }
  if (t.closest('[data-add-custom]')) {
    const topic=form.elements.custom_topic.value.trim(), sub=form.elements.custom_subtopic.value.trim();
    form.elements.custom_topic.setCustomValidity(topic?'':'Enter a topic.');
    if(!topic){form.elements.custom_topic.reportValidity();return;}
    append({id:'custom:'+encodeURIComponent((topic+'|'+sub).toLowerCase()),topic,label:sub});
    form.elements.custom_topic.value='';form.elements.custom_subtopic.value='';
  }
  if(t.name==='custom_topic')t.setCustomValidity('');
}

export function collectStudyDetails(form) {
  const container=form.querySelector('[data-rich-area]');
  if(!container)return undefined;
  const area=container.dataset.richArea;
  const get=(root,name)=>root.querySelector(`[name="${name}"]`)?.value ?? '';
  const number=(root,name)=>{
    const value=get(root,name); if(value==='')return null;
    const n=Number(value);if(!Number.isFinite(n)||n<0||!Number.isInteger(n))throw new Error('Counts and marks must be whole numbers of zero or more.');return n;
  };
  const validateScore=(score,total)=>{if(score!==null&&(total===null||total<=0||score>total))throw new Error('Provide total marks greater than zero, with score no higher than the total.');};
  if(academic.includes(area))return {version:1,area,further_paper:container.querySelector('[data-further-paper]')?.value || null,study_notes:get(container,'study_notes'),syllabus_scope:container.querySelector('[data-syllabus-scope]')?.value || 'as',spec:syllabusFor(area,container.querySelector('[data-syllabus-scope]')?.value)?.id || null,entries:[...container.querySelectorAll('[data-topic-id]')].map(row=>{
    const item=SYLLABUS_ITEMS.find(i=>i.id===row.dataset.topicId);
    const attempted=number(row,'attempted'),correct=number(row,'correct'),score=number(row,'score'),total=number(row,'total');
    if(correct!==null&&(attempted===null||correct>attempted))throw new Error('Correct answers cannot exceed questions attempted.');validateScore(score,total);
    const selected=[...row.querySelectorAll('[name="mode"]:checked')].map(c=>c.value);
    return {id:row.dataset.topicId,topic:row.dataset.topicName,label:row.dataset.subtopicName,ref:item?.ref||'',section:item?.section||'',spec:item?.spec || (item ? 'edexcel-9ma0-issue4' : null),focus:get(row,'focus'),modes:selected,attempted,correct,score,total,notes:get(row,'notes'),rag:get(row,'rag')};
  })};
  const d={version:1,area};
  const fields = area==='Super Curricular'?['activity_kind','activity_name','paper_year','question_numbers','questions_completed','activity_score','activity_total','work_done','next_action']:area==='EPQ'?['project_title','project_stage','work_done','next_action']:area==='TARA'?['tara_attempt_id','work_done']:['title','section','key_idea'];
  for(const key of fields)d[key]=get(container,key);
  if(area==='Super Curricular'){
    d.modes=[...container.querySelectorAll('[name="activity_mode"]:checked')].map(c=>c.value);
    for(const key of ['questions_completed','activity_score','activity_total'])d[key]=number(container,key);
    validateScore(d.activity_score,d.activity_total);
    if(d.activity_kind==='SMC' && d.paper_year && (!/^\d{4}$/.test(d.paper_year)||Number(d.paper_year)>new Date().getFullYear()))throw new Error('Enter a valid past-paper year.');
    if(d.activity_kind!=='SMC'){delete d.paper_year;delete d.question_numbers;}
  }
  return d;
}

export function topicHistoryHtml(logs,area) {
  const rows=logs.filter(l=>logArea(l)===area).flatMap(l=>(l.details?.entries||[]).map(e=>({...e,date:l.log_date})));
  if(!academic.includes(area))return '';
  const unique=new Set(rows.map(e=>e.id));
  return `<details class="topic-history"><summary>Topic history (${unique.size} topics / sub-topics recorded)</summary><p>Coverage records activity, not mastery. One block is counted once, even when it covers several topics.</p>${rows.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100).map(e=>`<article><b>${esc(e.topic)} · ${esc(e.ref||e.label)}</b><p>${esc(e.date)} · ${esc((e.modes||[]).join(', '))}${e.score!=null?' · '+e.score+'/'+e.total:''}${e.correct!=null?' · '+e.correct+'/'+e.attempted+' correct':''}${e.rag?' · '+esc(e.rag):''}</p><p>${esc(e.notes)}</p></article>`).join('')||'<p>No structured topic entries yet.</p>'}</details>`;
}
