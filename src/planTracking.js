import { WEEKDAY_TIMETABLE, WEEKEND_TIMETABLE } from './studentStudyPlan.js';
import { syllabusFor, SYLLABUS_ITEMS } from './studySyllabuses.js';

export const STUDY_AREAS = ['Maths','Physics','Economics','History','AS Maths','EPQ','Super Curricular','Book','TARA','Magazine'];
const academic = ['Maths','Physics','Economics','History','AS Maths'];
const modes = ['learn','practise','assess','reflect'];
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const areaFor = activity => activity === 'Maths tuition' ? 'Maths' : ['SMC','Super-Curricular'].includes(activity) ? 'Super Curricular' : activity;
export const displayActivity = activity => activity === 'SMC' ? 'Super Curricular' : activity;
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
  return `<fieldset class="topic-evidence" data-topic-id="${esc(entry.id)}" data-topic-name="${esc(entry.topic)}" data-subtopic-name="${esc(entry.label || '')}">
    <legend>${esc(entry.topic)}${entry.ref ? ' · '+esc(entry.ref) : ''}</legend>
    <p>${esc(entry.label || '')}</p>
    ${input('focus','Specific skill / sub-topic (optional)',entry.focus)}
    <div class="mode-checks">${modes.map(mode=>`<label><input type="checkbox" name="mode" value="${mode}" ${(entry.modes||[]).includes(mode)?'checked':''}>${mode[0].toUpperCase()+mode.slice(1)}</label>`).join('')}</div>
    <div class="form-grid">${input('attempted','Questions attempted',entry.attempted,'number')}${input('correct','Correct answers',entry.correct,'number')}${input('score','Assessment marks',entry.score,'number')}${input('total','Total marks',entry.total,'number')}</div>
    ${textarea('notes','Evidence / reflection / next step',entry.notes)}
    <label>Topic RAG<select name="rag"><option value="">Unset</option>${['green','amber','red'].map(c=>`<option ${entry.rag===c?'selected':''}>${c}</option>`).join('')}</select></label>
    <button class="ghost" type="button" data-remove-topic>Remove topic</button>
  </fieldset>`;
}

function syllabusPickerHtml(area, scope, selected) {
  const syllabus = syllabusFor(area, scope);
  if (!syllabus) return '';
  return `<p>${esc(syllabus.label)}${scope === 'as' ? ' · Year 12 / AS content' : area === 'Physics' ? ' · AS content supplied' : ' · Full supplied content'}</p>
    <label>Find a topic<input type="search" data-topic-search placeholder="Search topic or reference"></label>
    ${syllabus.topics.map(g=>`<details data-topic-group><summary>${esc(g.section)} · ${esc(g.topic)}${g.level==='a_level'?' (A-level only)':''}</summary>${[syllabus.items.find(i=>i.id===g.id+':general'),...g.items].map(i=>`<label class="topic-choice" data-search-text="${esc((i.section+' '+i.topic+' '+i.ref+' '+i.label).toLowerCase())}"><input type="checkbox" data-pick-topic="${esc(i.id)}" ${selected.has(i.id)?'checked':''}>${esc(i.ref)} ${esc(i.label)}</label>`).join('')}</details>`).join('')}`;
}

export function richStudyFields(activity, log = {}, attempts = [], customTopics = [], schoolYear = 'Year 12') {
  const area = areaFor(activity), d=log.details || {};
  if (academic.includes(area)) {
    const selected = new Set((d.entries||[]).map(e=>e.id));
    const scope = d.syllabus_scope || (d.spec === 'edexcel-9ma0-issue4' || /13/.test(schoolYear) ? 'full' : 'as');
    return `<div class="rich-study" data-rich-area="${esc(area)}">
      <details class="topic-picker"><summary>Choose syllabus topics / sub-topics</summary>
        <label>Content scope<select data-syllabus-scope><option value="as" ${scope==='as'?'selected':''}>Year 12 / AS</option><option value="full" ${scope==='full'?'selected':''}>All supplied content (including later A-level)</option></select></label>
        <div data-syllabus-picker>${syllabusPickerHtml(area,scope,selected)}</div>
      </details>
      <details><summary>Other / custom topic</summary>${input('custom_topic','Topic')}${input('custom_subtopic','Sub-topic (optional)')}<button type="button" class="ghost" data-add-custom>Add topic</button>
      ${customTopics.length ? `<label>Previously used<select data-reuse-topic><option value="">Choose a saved custom topic</option>${customTopics.map(e=>`<option value="${esc(e.id)}">${esc(e.topic)}${e.label?' / '+esc(e.label):''}</option>`).join('')}</select></label>`:''}</details>
      <div data-topic-evidence>${(d.entries||[]).map(evidenceRowHtml).join('')}</div>
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
  return [...new Map(logs.filter(l=>areaFor(l.planned_activity)===area).flatMap(l=>l.details?.entries||[]).filter(e=>e.id.startsWith('custom:')).map(e=>[e.id,e])).values()];
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
  if (t.matches('[data-topic-search]')) {
    const query=t.value.toLowerCase().trim();
    form.querySelectorAll('[data-topic-group]').forEach(g=>{
      g.querySelectorAll('[data-search-text]').forEach(label=>label.hidden=!label.dataset.searchText.includes(query));
      g.hidden=![...g.querySelectorAll('[data-search-text]')].some(label=>!label.hidden);
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
  if(academic.includes(area))return {version:1,area,syllabus_scope:container.querySelector('[data-syllabus-scope]')?.value || 'as',spec:syllabusFor(area,container.querySelector('[data-syllabus-scope]')?.value)?.id || null,entries:[...container.querySelectorAll('[data-topic-id]')].map(row=>{
    const item=SYLLABUS_ITEMS.find(i=>i.id===row.dataset.topicId);
    const attempted=number(row,'attempted'),correct=number(row,'correct'),score=number(row,'score'),total=number(row,'total');
    if(correct!==null&&(attempted===null||correct>attempted))throw new Error('Correct answers cannot exceed questions attempted.');validateScore(score,total);
    const selected=[...row.querySelectorAll('[name="mode"]:checked')].map(c=>c.value);
    if(!selected.length)throw new Error('Choose Learn, Practise, Assess or Reflect for each selected topic.');
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
  const rows=logs.filter(l=>areaFor(l.planned_activity)===area).flatMap(l=>(l.details?.entries||[]).map(e=>({...e,date:l.log_date})));
  if(!academic.includes(area))return '';
  const unique=new Set(rows.map(e=>e.id));
  return `<details class="topic-history"><summary>Topic history (${unique.size} topics / sub-topics recorded)</summary><p>Coverage records activity, not mastery. One block is counted once, even when it covers several topics.</p>${rows.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100).map(e=>`<article><b>${esc(e.topic)} · ${esc(e.ref||e.label)}</b><p>${esc(e.date)} · ${esc((e.modes||[]).join(', '))}${e.score!=null?' · '+e.score+'/'+e.total:''}${e.correct!=null?' · '+e.correct+'/'+e.attempted+' correct':''}${e.rag?' · '+esc(e.rag):''}</p><p>${esc(e.notes)}</p></article>`).join('')||'<p>No structured topic entries yet.</p>'}</details>`;
}
