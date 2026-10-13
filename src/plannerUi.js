import { PLAN_DAYS, savePlanVersion, saveBlockTask } from './plannerService.js';
import { studyPlanForDate } from './studentStudyPlan.js';

const esc=value=>String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const unavailable='<p class="callout">Timetable editing needs migration 009_student_workspace.sql. Existing progress logging remains available.</p>';
export function timetableEditorHtml(planner,today) {
  if(!planner?.available)return unavailable;
  const plan=studyPlanForDate(today);
  const rows=PLAN_DAYS.flatMap(day=>(day==='Saturday'||day==='Sunday'?plan?.weekends:plan?.weekdays)?.filter(r=>r[day]).map(r=>({day,from:r.from,to:r.to,activity:r[day]})) || []);
  return `<details class="plan-editor"><summary>Edit timetable</summary><form data-planner-form="version">
    <div class="form-grid"><label>Effective date<input type="date" name="effective_from" min="${today}" value="${today}" required></label>
    <label>Apply to<select name="scope"><option value="weekly">Weekly plan from this date</option><option value="day">This date only</option></select></label></div>
    <div class="plan-editor-rows">${rows.map(editorRow).join('')}</div>
    <button type="button" class="ghost" data-planner-add>Add block</button><button>Save new plan version</button><p class="form-status" role="status"></p>
  </form></details>`;
}
function editorRow(row={day:'Monday',from:'09:00',to:'10:00',activity:''}) {
  return `<div class="plan-editor-row"><label>Day<select data-field="day">${PLAN_DAYS.map(d=>`<option ${d===row.day?'selected':''}>${d}</option>`).join('')}</select></label><label>From<input data-field="from" type="time" value="${esc(row.from)}" required></label><label>To<input data-field="to" type="time" value="${esc(row.to)}" required></label><label>Activity<input data-field="activity" value="${esc(row.activity)}" required maxlength="100"></label><button type="button" class="ghost" data-planner-remove aria-label="Remove block">Remove</button></div>`;
}
export function blockTasksHtml(block,planner) {
  if(!planner?.available)return '';
  const rows=planner.tasks.filter(t=>t.block_date===block.date && t.start_time.slice(0,5)===block.from && t.end_time.slice(0,5)===block.to && t.activity===block.activity);
  const taskForm=(task={})=>`<form data-planner-form="task" data-task-id="${esc(task.id || '')}" data-block="${esc(JSON.stringify(block))}" class="block-task-form">
    <label>Task<input name="title" value="${esc(task.title)}" placeholder="What will you work on?" maxlength="250" required></label>
    <label>Status<select name="status">${['not_started','in_progress','completed','skipped'].map(s=>`<option value="${s}" ${s===(task.status || 'not_started')?'selected':''}>${s.replaceAll('_',' ')}</option>`).join('')}</select></label>
    <label>Notes<textarea name="notes">${esc(task.notes)}</textarea></label><button>${task.id?'Save task':'Add task'}</button><p class="form-status" role="status"></p></form>`;
  return `<section class="block-task-list"><h4>Tasks for this block</h4>${rows.map(t=>`<details><summary>${esc(t.title)} · ${esc(t.status.replaceAll('_',' '))}</summary>${taskForm(t)}</details>`).join('')}<details><summary>Add a task</summary>${taskForm()}</details></section>`;
}
export function installPlannerUi(root,getState,refresh) {
  root.addEventListener('click',event=>{
    const add=event.target.closest('[data-planner-add]'),remove=event.target.closest('[data-planner-remove]');
    if(add){add.closest('form').querySelector('.plan-editor-rows').insertAdjacentHTML('beforeend',editorRow());add.closest('form').dataset.unsaved='true';}
    if(remove){remove.closest('form').dataset.unsaved='true';remove.closest('.plan-editor-row').remove();}
  });
  root.addEventListener('input',event=>{const form=event.target.closest('[data-planner-form]');if(form)form.dataset.unsaved='true';});
  root.addEventListener('submit',async event=>{
    const form=event.target.closest('[data-planner-form]');if(!form)return;
    event.preventDefault();
    const status=form.querySelector('.form-status'),button=form.querySelector('button:not([type="button"])');
    button.disabled=true;status.textContent='Saving...';
    let saved=false;
    try {
      const values=Object.fromEntries(new FormData(form)),state=getState();
      if(form.dataset.plannerForm==='version'){
        const day=new Date(values.effective_from+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long'});
        let blocks=[...form.querySelectorAll('.plan-editor-row')].map(row=>Object.fromEntries([...row.querySelectorAll('[data-field]')].map(input=>[input.dataset.field,input.value])));
        if(values.scope==='day')blocks=blocks.filter(b=>b.day===day);
        if(!confirm(`Save ${values.scope==='day'?'a one-day exception':'a new weekly plan'} starting ${values.effective_from}? Previous records will be preserved.`)){status.textContent='Not saved.';return;}
        await savePlanVersion(state.user.id,{effective_from:values.effective_from,single_day:values.scope==='day',blocks});
      }else{
        const b=JSON.parse(form.dataset.block);
        await saveBlockTask(state.user.id,{...values,block_date:b.date,start_time:b.from,end_time:b.to,activity:b.activity},form.dataset.taskId);
      }
      saved=true;delete form.dataset.unsaved;
      await refresh();
    }catch(error){status.textContent=(saved?'Saved, but refresh failed. Refresh before editing again. ':'Could not save. ')+error.message;}
    finally{button.disabled=false;}
  });
}

