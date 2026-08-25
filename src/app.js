import { bootstrap, getSession, signIn, signOut, saveAttempt, updateTask, createProgramme, addAcademicResult, addJournalEntry, addReasoningSession, saveWeeklyReview, addInterviewSession, updateProfile, saveTaraErrorAnalysis } from './dataService.js';
import { questions } from './questions.js';
import { questionBankManifest } from './questionBankManifest.generated.js';
import { methodologyFor } from './methodologies.js';
import { createProgrammeDraft } from './weeklyGeneratorService.js';

const app = document.querySelector('#app');
const state = {
  user: null,
  data: null,
  error: null,
  view: 'dashboard',
  practice: null,
  draft: null,
  reviewAttemptId: null,
  taraFilters: { year: 'all', family: 'all', type: 'all', pattern: 'all' },
  preferences: { minutes: 180, workload: 'standard', schoolWeek: 'normal', priority: 'none' }
};

init();

async function init() {
  try {
    const session = await getSession();
    state.user = session.user;
    if (state.user) state.data = await bootstrap(state.user);
    render();
  } catch (error) {
    state.error = error;
    renderError(error);
  }
}

function renderError(error) {
  app.innerHTML = `<main class="login"><section class="panel hero"><p class="eyebrow">Setup needed</p><h1>Supabase is connected, but the app could not load its tables.</h1><p>${escapeHtml(error.message || error)}</p><p class="callout">Run the SQL migration in Supabase SQL Editor, then refresh this page.</p><button onclick="location.reload()">Refresh</button></section></main>`;
}

function render() {
  if (!state.user) return renderLogin();
  app.innerHTML = `
    <aside class="sidebar">
      <div>
        <p class="eyebrow">Oxford E&M Coach</p>
        <h1>${state.data?.profile?.target_course || 'Oxford Economics & Management'}</h1>
        <p class="muted">${state.user.email}</p>
      </div>
      <nav>${navButton('dashboard','Dashboard')}${navButton('programme','Weekly Programme')}${navButton('tara','TARA Practice')}${navButton('analytics','TARA Analytics')}${navButton('academics','A-Level')}${navButton('journal','E&M Journal')}${navButton('reasoning','Oxford Reasoning')}${navButton('milestones','Milestones')}${navButton('interview','Interview Prep')}${navButton('review','Weekly Review')}${navButton('parent','Parent View')}${navButton('profile','Profile')}</nav>
      <button class="ghost" data-action="signout">Sign out</button>
    </aside>
    <main class="main">${viewHtml()}</main>`;
}

function renderLogin() {
  app.innerHTML = `
    <main class="login">
      <section class="panel hero">
        <p class="eyebrow">Oxford E&M Coach</p>
        <h1>Plan the week. Practise TARA. Build genuine E&M depth.</h1>
        <p>A mobile-first preparation coach for a 15-month Oxford Economics & Management journey.</p>
        <form data-action="login" class="stack">
          <input name="email" type="email" placeholder="Student email" required />
          <button>Send magic link</button>
        </form>
        <p class="muted">If Supabase is not configured yet, the app runs in local demo mode.</p>
      </section>
    </main>`;
}

function navButton(view, label) {
  return `<button class="${state.view === view ? 'active' : ''}" data-view="${view}" title="Open ${label}">${label}</button>`;
}

function viewHtml() {
  if (state.view === 'programme') return programmeHtml();
  if (state.view === 'tara') return taraHtml();
  if (state.view === 'analytics') return analyticsHtml();
  if (state.view === 'academics') return academicsHtml();
  if (state.view === 'journal') return journalHtml();
  if (state.view === 'reasoning') return reasoningHtml();
  if (state.view === 'milestones') return milestonesHtml();
  if (state.view === 'interview') return interviewHtml();
  if (state.view === 'review') return weeklyReviewHtml();
  if (state.view === 'parent') return parentHtml();
  if (state.view === 'profile') return profileHtml();
  return dashboardHtml();
}

function dashboardHtml() {
  const data = state.data;
  const tasks = data.tasks || [];
  const done = tasks.filter((t) => t.status === 'completed').length;
  const remaining = tasks.filter((t) => !['completed', 'skipped'].includes(t.status));
  return `
    <header class="top">
      <div><p class="eyebrow">Today / This Week</p><h2>What should I work on this week?</h2></div>
      <button data-view="programme">Open Weekly Programme</button>
    </header>
    <section class="grid six">
      ${card('This Week', `${percent(done, tasks.length)}% complete`, `${data.programme?.weekly_focus || 'No programme yet.'}<br>${remaining.slice(0,2).map((t) => `<b>${t.title}</b>`).join('<br>') || 'Generate a programme to begin.'}`)}
      ${card('TARA Mastery', `${data.tara.overallAccuracy}% accuracy`, `${questionBankManifest.totalQuestions} questions · ${questionBankManifest.visualQuestionCount} with visuals<br>Coverage: ${coveragePercent()}% of bank<br>Strongest: ${data.tara.strongestType?.name || 'Not enough data'}<br>Weakest: ${data.tara.weakestType?.name || 'Not enough data'}<br><button data-action="start-smart" title="Prioritise unseen questions, then weak questions">Smart coverage set</button>`)}
      ${card('A-Level Progress', `${data.subjects.length} subjects`, data.subjects.map((s) => `${s.name}: ${s.predicted_grade || 'Not set'}`).join('<br>'))}
      ${card('E&M Exploration', `${data.journal.length} entries`, data.journal[0]?.title || 'Add a structured journal entry.')}
      ${card('Oxford Readiness', '', Object.entries(data.readiness).map(([k,v]) => `${k}: <b>${v.label}</b>`).join('<br>'))}
      ${card('Upcoming Milestones', '', data.milestones.slice(0,3).map((m) => `${m.title}: ${m.target_date || 'date unset'}`).join('<br>'))}
    </section>
    <section class="panel"><h3>Adaptive recommendations</h3>${data.recommendations.length ? data.recommendations.map((r) => `<p class="callout">${r}</p>`).join('') : '<p class="muted">Complete sessions and tasks to build recommendations.</p>'}</section>`;
}

function programmeHtml() {
  const p = state.data.programme;
  if (!p) return generatorHtml('No programme has been created for this week yet.');
  const tasks = state.data.tasks;
  const total = tasks.reduce((s,t)=>s+(t.estimated_minutes||0),0);
  const completed = tasks.filter((t)=>t.status==='completed').reduce((s,t)=>s+(t.estimated_minutes||0),0);
  return `
    <header class="top"><div><p class="eyebrow">Weekly Programme</p><h2>${formatDate(p.week_start)} - ${formatDate(p.week_end)}</h2><p>${p.phase}: ${p.weekly_focus}</p></div><button data-action="show-generator">Generate Weekly Programme</button></header>
    <section class="panel"><h3>${percent(tasks.filter(t=>t.status==='completed').length,tasks.length)}% complete</h3><div class="bar"><span style="width:${percent(tasks.filter(t=>t.status==='completed').length,tasks.length)}%"></span></div><p>${completed}/${total} minutes completed. ${total-completed} minutes remaining.</p><p>${p.coach_summary || ''}</p></section>
    ${state.draft ? draftHtml() : ''}
    <section class="grid">${groupTasks(tasks)}</section>`;
}

function generatorHtml(message='Generate a personalised weekly programme') {
  return `<section class="panel"><h2>${message}</h2><form data-action="draft-programme" class="form-grid">
    <label>Available minutes<input name="minutes" type="number" value="${state.preferences.minutes}"></label>
    <label>Workload<select name="workload"><option value="light">Light</option><option value="standard" selected>Standard</option><option value="intensive">Intensive</option></select></label>
    <label>School week<select name="schoolWeek"><option value="normal">Normal</option><option value="exam">Exam-heavy</option><option value="holiday">Holiday</option></select></label>
    <label>Priority<select name="priority"><option value="none">No preference</option><option value="tara">More TARA</option><option value="economics">More Economics</option><option value="management">More Management</option><option value="a_level">More A-Level</option><option value="oxford_reasoning">More Oxford Reasoning</option><option value="application">More Application/Interview</option></select></label>
    <button>Generate draft</button>
  </form></section>${state.draft ? draftHtml() : ''}`;
}

function draftHtml() {
  return `<section class="panel draft"><h3>Draft programme review</h3><p>${state.draft.programme.weekly_focus}</p>${state.draft.tasks.map((t,i)=>`<article class="task"><input data-draft="${i}" data-field="title" value="${escapeAttr(t.title)}"><textarea data-draft="${i}" data-field="description">${t.description}</textarea><div class="row"><input data-draft="${i}" data-field="estimated_minutes" type="number" value="${t.estimated_minutes}"><select data-draft="${i}" data-field="priority"><option ${sel(t.priority,'high')}>high</option><option ${sel(t.priority,'medium')}>medium</option><option ${sel(t.priority,'low')}>low</option></select><button data-remove-draft="${i}" class="ghost">Remove</button></div></article>`).join('')}<div class="actions"><button data-action="accept-draft">Accept programme</button><button class="ghost" data-action="draft-programme">Regenerate</button></div></section>`;
}

function groupTasks(tasks) {
  return ['a_level','tara','economics','management','oxford_reasoning','application'].map((cat) => {
    const rows = tasks.filter((t) => t.category === cat);
    return `<section class="panel"><h3>${label(cat)} ${rows.filter(t=>t.status==='completed').length}/${rows.length}</h3>${rows.map(taskHtml).join('') || '<p class="muted">No task this week.</p>'}</section>`;
  }).join('');
}

function taskHtml(t) {
  return `<article class="task"><div><b>${t.title}</b><p>${t.description || ''}</p></div><div class="row"><span class="pill ${t.priority}">${t.priority}</span><span>${t.estimated_minutes || 0} min</span><select data-task-status="${t.id}" title="Update task status">${['not_started','in_progress','completed','skipped'].map((s)=>`<option value="${s}" ${sel(t.status,s)}>${s.replace('_',' ')}</option>`).join('')}</select></div><textarea data-task-field="${t.id}" data-field="completion_notes" placeholder="Completion notes">${t.completion_notes || ''}</textarea><textarea data-task-field="${t.id}" data-field="reflection" placeholder="Reflection">${t.reflection || ''}</textarea><input data-task-field="${t.id}" data-field="evidence_url" placeholder="Evidence URL" value="${escapeAttr(t.evidence_url || '')}"></article>`;
}

function taraHtml() {
  if (!state.practice) return `<header class="top"><div><p class="eyebrow">TARA Practice</p><h2>5-question methodology set</h2></div><div class="actions"><button data-action="start-smart" title="Prioritise unseen questions, then weak questions">Smart coverage set</button><button class="ghost" data-action="start-tara" title="Start a filtered 5-question practice set">Filtered random set</button></div></header>${taraFilterHtml()}<section class="grid">${card('Question bank coverage', `${coveragePercent()}%`, `${answeredQuestionKeys().size}/${questions.length} questions seen at least once`)}${card('Current filter match', `${filteredQuestions().length}`, 'Questions available for the selected filters')}</section><section class="panel"><h3>How smart coverage works</h3><p class="muted">Smart coverage chooses unseen questions first, then questions from weak types and patterns, then mastered questions only when needed.</p></section>`;
  if (state.practice.report) return reportHtml();
  const q = state.practice.set[state.practice.index];
  return `<section class="panel question"><p class="eyebrow">${q.paper_year} Q${q.question_number} · ${q.official_question_type} · ${q.reasoning_pattern}</p><h2>${highlight(q.question_text, q.relevant_question_highlights)}</h2>${visualHtml(q)}${Object.entries(q.answer_options).map(([k,v])=>`<button class="option ${state.practice.answers[q.id]===k?'selected':''}" data-answer="${k}"><b>${k}</b> ${v}</button>`).join('')}<div class="actions"><button class="ghost" data-action="prev-question">Previous</button><button class="ghost" data-action="next-question">Next</button><button data-action="submit-tara">Submit set</button></div></section>`;
}

function reportHtml() {
  const { set, answers } = state.practice;
  const score = set.filter((q)=>answers[q.id]===q.correct_answer).length;
  return `<header class="top"><div><p class="eyebrow">Coaching report</p><h2>Score ${score}/${set.length}</h2></div><button data-action="start-tara">New set</button></header>${set.map((q) => coachingHtml(q, answers[q.id])).join('')}`;
}

function coachingHtml(q, selected) {
  const correct = selected === q.correct_answer;
  return `<article class="panel coaching"><p class="eyebrow">Question ${q.question_number} · ${q.official_question_type} · ${q.reasoning_pattern}</p><h3>${correct ? 'Correct' : 'Incorrect'} · Your answer ${selected || 'blank'} · Official answer ${q.correct_answer}</h3><h4>A. Standard methodology</h4><ol>${methodologyFor(q.official_question_type).map((m)=>`<li>${m}</li>`).join('')}</ol><h4>B. Full original question</h4><p>${highlight(q.question_text, q.relevant_question_highlights)}</p>${visualHtml(q)}<h4>C. Highlight decisive wording</h4><p>${q.relevant_question_highlights.map((h)=>`<mark>${h}</mark>`).join(' ') || '<span class="muted">No extracted highlight yet. Use the question stem and numerical constraints as the first clues.</span>'}</p><h4>D. What the wording should trigger</h4><p>${triggerFor(q)}</p><h4>E. Apply the method</h4><p>${q.methodology} ${q.explanation}</p><h4>F. Trap to avoid</h4><p>Do not choose an option that sounds related but fails the exact task: ${q.official_question_type}.</p><h4>G. Method to carry forward</h4><p>Carry the pattern forward: ${q.reasoning_pattern} means you should slow down and name the logical job before calculating or choosing.</p></article>`;
}

function analyticsHtml() {
  const t = state.data.tara;
  return `<header class="top"><div><p class="eyebrow">TARA Analytics</p><h2>${t.overallAccuracy}% overall accuracy</h2></div></header><section class="grid">${card('Total attempts', t.totalAttempts, `${t.totalQuestions} questions answered`)}${card('Average set score', t.averageSetScore, 'Mini-sets are not official scaled scores.')}${card('Critical Thinking', `${t.criticalAccuracy}%`, '')}${card('Problem Solving', `${t.problemAccuracy}%`, '')}</section><section class="panel"><h3>Accuracy trend</h3>${trend(t.recentTrend)}</section><section class="panel"><h3>By official type</h3>${bars(t.byType)}</section><section class="panel"><h3>By reasoning pattern</h3>${bars(t.byPattern)}</section><section class="panel"><h3>Historical test sessions</h3>${sessionHistoryHtml()}</section>${state.reviewAttemptId ? reviewAttemptHtml(state.reviewAttemptId) : ''}`;
}

function academicsHtml() {
  return `<header class="top"><div><p class="eyebrow">A-Level Progress</p><h2>Protect academic strength</h2></div></header><section class="grid">${state.data.subjects.map((s)=>card(s.name, `Target ${s.target_grade || 'A*'}`, `Predicted: ${s.predicted_grade || 'Not set'}<br>Latest: ${s.academic_results?.[0]?.percentage || 'No result'}%`)).join('')}</section><section class="panel"><h3>Add assessment</h3><form data-action="add-result" class="form-grid">${subjectSelect()}<input name="assessment_name" placeholder="Assessment name"><input name="topic" placeholder="Topic"><input name="score" type="number" placeholder="Score"><input name="max_score" type="number" value="100"><input name="grade" placeholder="Grade"><button>Save result</button></form></section>`;
}

function journalHtml() {
  return `<header class="top"><div><p class="eyebrow">E&M Journal</p><h2>CLAIM · MECHANISM · EVIDENCE · OBJECTION · RESPONSE</h2></div></header><section class="panel"><form data-action="add-journal" class="stack"><input name="title" placeholder="Title" required><input name="topic_tags" placeholder="Economics, Strategy, Public Policy"><textarea name="main_claim" placeholder="Main claim"></textarea><textarea name="mechanism" placeholder="Mechanism"></textarea><textarea name="evidence" placeholder="Evidence"></textarea><textarea name="assumptions" placeholder="Assumptions"></textarea><textarea name="counterargument" placeholder="Counterargument"></textarea><textarea name="response" placeholder="Response"></textarea><textarea name="reflection" placeholder="Reflection"></textarea><button>Save journal entry</button></form></section><section class="grid">${state.data.journal.map((j)=>card(j.title,'',j.main_claim || j.reflection || '')).join('')}</section>`;
}

function reasoningHtml() {
  return `<header class="top"><div><p class="eyebrow">Oxford Reasoning</p><h2>Practise thinking aloud</h2></div></header><section class="panel"><form data-action="add-reasoning" class="stack"><textarea name="prompt" placeholder="Unfamiliar prompt" required></textarea><textarea name="assumptions" placeholder="Assumptions"></textarea><textarea name="initial_answer" placeholder="Initial answer"></textarea><textarea name="reasoning_steps" placeholder="Reasoning steps"></textarea><textarea name="revised_answer" placeholder="Revised answer after hint"></textarea><textarea name="reflection" placeholder="Reflection"></textarea><button>Save reasoning session</button></form></section>`;
}

function milestonesHtml() {
  return `<header class="top"><div><p class="eyebrow">Milestones</p><h2>Admissions timeline</h2></div></header><section class="grid">${state.data.milestones.map((m)=>card(m.title, m.target_date || 'Date unset', `${m.category} · ${m.status}`)).join('')}</section>`;
}

function weeklyReviewHtml() {
  return `<header class="top"><div><p class="eyebrow">Weekly Review</p><h2>What should change next week?</h2></div></header><section class="panel"><form data-action="save-review" class="stack">${['completed_summary','skipped_summary','hardest_area','biggest_improvement','biggest_weakness','most_valuable_task','student_reflection','next_week_focus'].map((name)=>`<textarea name="${name}" placeholder="${name.replaceAll('_',' ')}"></textarea>`).join('')}<button>Save review</button></form></section>`;
}

function interviewHtml() {
  return `<header class="top"><div><p class="eyebrow">Interview Prep</p><h2>Practise clarity, adaptability and quantitative thinking</h2></div></header><section class="panel"><form data-action="add-interview" class="stack"><input name="topic" placeholder="Topic"><input name="session_type" placeholder="Session type"><textarea name="questions" placeholder="Questions practised"></textarea><textarea name="reasoning_feedback" placeholder="Reasoning feedback"></textarea><textarea name="clarity_feedback" placeholder="Clarity feedback"></textarea><textarea name="adaptability_feedback" placeholder="Adaptability feedback"></textarea><textarea name="overall_feedback" placeholder="Overall feedback"></textarea><textarea name="next_steps" placeholder="Next steps"></textarea><button>Save interview session</button></form></section><section class="grid">${state.data.interviews.map((item)=>card(item.topic || 'Interview session', item.session_date || '', item.overall_feedback || item.next_steps || '')).join('')}</section>`;
}

function parentHtml() {
  const tasks = state.data.tasks || [];
  const t = state.data.tara;
  return `<header class="top"><div><p class="eyebrow">Parent / Coach View</p><h2>Progress summary without private reflections</h2></div></header><section class="grid six">${card('This week', `${percent(tasks.filter((task)=>task.status==='completed').length, tasks.length)}%`, `${tasks.filter((task)=>task.status !== 'completed').length} tasks still open`)}${card('TARA', `${t.overallAccuracy}%`, `Weakest: ${t.weakestType?.name || 'Not enough data'}<br>Questions: ${t.totalQuestions}`)}${card('A-Level', '', state.data.subjects.map((s)=>`${s.name}: ${s.predicted_grade || 'Not set'}`).join('<br>'))}${card('E&M consistency', `${state.data.journal.length} entries`, state.data.journal[0]?.title || 'No journal entries yet')}${card('Milestones', `${state.data.milestones.filter((m)=>m.status==='completed').length}/${state.data.milestones.length}`, 'Completed admissions milestones')}${card('Recommendations', '', state.data.recommendations.slice(0,2).join('<br>') || 'No recommendation yet')}</section><section class="panel"><h3>Privacy note</h3><p class="muted">This view deliberately summarises progress. Student reflections are not shown here by default.</p></section>`;
}

function profileHtml() {
  const p = state.data.profile || {};
  return `<header class="top"><div><p class="eyebrow">Profile</p><h2>Student setup</h2></div></header><section class="panel"><form data-action="save-profile" class="form-grid"><label>Display name<input name="display_name" value="${escapeAttr(p.display_name || '')}"></label><label>School<input name="school" value="${escapeAttr(p.school || '')}"></label><label>Student email<input value="${escapeAttr(state.user.email || '')}" disabled></label><label>Parent email<input name="parent_email" type="email" value="${escapeAttr(p.parent_email || '')}"></label><label>School year<input name="current_school_year" value="${escapeAttr(p.current_school_year || 'Year 12')}"></label><label>Application year<input name="application_year" type="number" value="${escapeAttr(p.application_year || '')}"></label><label>Target course<input name="target_course" value="${escapeAttr(p.target_course || 'Oxford Economics & Management')}"></label><label>Target university<input name="target_university" value="${escapeAttr(p.target_university || 'University of Oxford')}"></label><button>Save profile</button></form></section>`;
}

function taraFilterHtml() {
  const types = unique(questions.map((q) => q.official_question_type));
  const patterns = unique(questions.map((q) => q.reasoning_pattern));
  return `<section class="panel"><h3>Build a focused set</h3><form class="form-grid" data-action="tara-filters"><label>Paper year<select name="year"><option value="all">All years</option>${questionBankManifest.years.map((year)=>`<option value="${escapeAttr(year)}" ${sel(state.taraFilters.year,year)}>${year}</option>`).join('')}</select></label><label>Area<select name="family"><option value="all">All</option><option value="Critical Reasoning" ${sel(state.taraFilters.family,'Critical Reasoning')}>Critical Reasoning</option><option value="Problem Solving" ${sel(state.taraFilters.family,'Problem Solving')}>Problem Solving</option></select></label><label>Official type<select name="type"><option value="all">All types</option>${types.map((type)=>`<option value="${escapeAttr(type)}" ${sel(state.taraFilters.type,type)}>${type}</option>`).join('')}</select></label><label>Reasoning pattern<select name="pattern"><option value="all">All patterns</option>${patterns.map((pattern)=>`<option value="${escapeAttr(pattern)}" ${sel(state.taraFilters.pattern,pattern)}>${pattern}</option>`).join('')}</select></label><button>Apply filters</button></form></section>`;
}

function sessionHistoryHtml() {
  const attempts = state.data.tara.attempts;
  if (!attempts.length) return '<p class="muted">Complete a TARA set to see historical session details.</p>';
  return `<div class="session-list">${attempts.map((attempt)=>`<article class="session-row"><div><b>${formatDateTime(attempt.completed_at)}</b><p>${attempt.total} questions · score ${attempt.score}/${attempt.total}</p></div><button class="ghost" data-review-attempt="${attempt.id}" title="Review chosen answers and coaching">Review</button></article>`).join('')}</div>`;
}

function reviewAttemptHtml(attemptId) {
  const attempt = state.data.tara.attempts.find((item) => item.id === attemptId);
  const rows = state.data.tara.responses.filter((response) => response.attempt_id === attemptId);
  if (!attempt || !rows.length) return '';
  return `<section class="panel"><div class="top mini"><div><p class="eyebrow">Session review</p><h3>${formatDateTime(attempt.completed_at)} · ${attempt.score}/${attempt.total}</h3></div><button class="ghost" data-action="close-review">Close review</button></div>${rows.map(responseReviewHtml).join('')}</section>`;
}

function responseReviewHtml(response) {
  const q = questions.find((item) => item.paper_year === response.paper_year && item.question_number === response.question_number);
  const selected = response.selected_answer || 'blank';
  return `<article class="review-item ${response.is_correct ? 'correct' : 'incorrect'}"><p class="eyebrow">${response.paper_year} Q${response.question_number} · ${response.question_type} · ${response.reasoning_pattern}</p><h4>${response.is_correct ? 'Correct' : 'Incorrect'} · Your answer ${selected} · Official answer ${response.correct_answer}</h4>${q ? coachingHtml(q, selected) : '<p class="muted">Original question text is not available in the local static bank yet.</p>'}${!response.is_correct ? errorFormHtml(response) : ''}</article>`;
}

function errorFormHtml(response) {
  const existing = response.error_analysis || {};
  const categories = ['misunderstood_question','missed_constraint','calculation_error','logic_error','assumption_error','rushed','overthought','unfamiliar_question_type','misread_graph_or_table','time_pressure','guessed','other'];
  return `<form class="stack error-box" data-action="save-error"><input type="hidden" name="response_id" value="${response.id}"><label>Error category<select name="error_category">${categories.map((category)=>`<option value="${category}" ${sel(existing.error_category,category)}>${category.replaceAll('_',' ')}</option>`).join('')}</select></label><textarea name="why_wrong" placeholder="Why was my answer wrong?">${existing.why_wrong || ''}</textarea><textarea name="clue_missed" placeholder="What clue did I miss?">${existing.clue_missed || ''}</textarea><textarea name="better_approach" placeholder="Better approach next time">${existing.better_approach || ''}</textarea><button>Save error analysis</button></form>`;
}

function card(title, metric, body) {
  return `<article class="panel card"><h3>${title}</h3>${metric ? `<p class="metric">${metric}</p>` : ''}<div class="card-body">${body || ''}</div></article>`;
}

function bars(rows) {
  return rows.length ? rows.map((r)=>`<div class="bar-row"><span>${r.name}</span><b>${r.accuracy}%</b><div class="bar"><span style="width:${r.accuracy}%"></span></div></div>`).join('') : '<p class="muted">Complete practice to build this view.</p>';
}

function visualHtml(q) {
  if (!q.visuals?.length) return '';
  return `<div class="question-visuals">${q.visuals.map((visual)=>`<figure><img src="${visual.src}" alt="${escapeAttr(visual.alt)}" loading="lazy"><figcaption>${visual.alt}</figcaption></figure>`).join('')}</div>`;
}

function trend(rows) {
  return rows.length ? `<div class="trend">${rows.map((row)=>`<div><span style="height:${Math.max(8,row.value)}%"></span><small>${row.value}%</small></div>`).join('')}</div>` : '<p class="muted">Complete several sessions to see the trend.</p>';
}

function subjectSelect() {
  return `<select name="subject_id">${state.data.subjects.map((s)=>`<option value="${s.id}">${s.name}</option>`).join('')}</select>`;
}

function startTara() {
  const filtered = filteredQuestions();
  const pool = filtered.length >= 5 ? filtered : questions;
  state.practice = { set: [...pool].sort(()=>Math.random()-0.5).slice(0,5), index: 0, answers: {}, startedAt: new Date().toISOString(), report: false };
  state.view = 'tara';
}

function startSmartTara() {
  const pool = smartQuestionPool();
  state.practice = { set: pool.slice(0,5), index: 0, answers: {}, startedAt: new Date().toISOString(), report: false };
  state.view = 'tara';
}

function filteredQuestions() {
  return questions.filter((q) =>
    (state.taraFilters.year === 'all' || String(q.paper_year) === state.taraFilters.year) &&
    (state.taraFilters.family === 'all' || q.family === state.taraFilters.family) &&
    (state.taraFilters.type === 'all' || q.official_question_type === state.taraFilters.type) &&
    (state.taraFilters.pattern === 'all' || q.reasoning_pattern === state.taraFilters.pattern)
  );
}

function smartQuestionPool() {
  const answered = answeredQuestionKeys();
  const weakType = state.data.tara.weakestType?.name;
  const weakPattern = state.data.tara.byPattern?.[0]?.name;
  const filtered = filteredQuestions();
  const unseen = filtered.filter((q) => !answered.has(questionKey(q)));
  const weak = filtered.filter((q) => q.official_question_type === weakType || q.reasoning_pattern === weakPattern);
  const rest = filtered.filter((q) => !unseen.includes(q) && !weak.includes(q));
  return [...shuffle(unseen), ...shuffle(weak), ...shuffle(rest), ...shuffle(questions)].filter(uniqueQuestion);
}

async function submitTara() {
  const responses = state.practice.set.map((q) => ({
    paper_year: q.paper_year,
    question_number: q.question_number,
    section: q.section,
    question_type: q.official_question_type,
    reasoning_pattern: q.reasoning_pattern,
    selected_answer: state.practice.answers[q.id] || null,
    correct_answer: q.correct_answer,
    is_correct: state.practice.answers[q.id] === q.correct_answer
  }));
  await saveAttempt(state.user, state.practice.set, responses, state.practice.startedAt);
  state.practice.report = true;
  state.data = await bootstrap(state.user);
  state.view = 'tara';
  render();
}

app.addEventListener('click', async (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.view) { state.view = target.dataset.view; render(); return; }
  if (target.dataset.answer) { state.practice.answers[state.practice.set[state.practice.index].id] = target.dataset.answer; render(); return; }
  if (target.dataset.removeDraft) { state.draft.tasks.splice(Number(target.dataset.removeDraft), 1); render(); return; }
  if (target.dataset.reviewAttempt) { state.reviewAttemptId = target.dataset.reviewAttempt; state.view = 'analytics'; render(); return; }
  const action = target.dataset.action;
  if (action === 'signout') { await signOut(); location.reload(); }
  if (action === 'start-tara') { startTara(); render(); }
  if (action === 'start-smart') { startSmartTara(); render(); }
  if (action === 'prev-question') { state.practice.index = Math.max(0, state.practice.index - 1); render(); }
  if (action === 'next-question') { state.practice.index = Math.min(state.practice.set.length - 1, state.practice.index + 1); render(); }
  if (action === 'submit-tara') await submitTara();
  if (action === 'close-review') { state.reviewAttemptId = null; render(); }
  if (action === 'show-generator') { state.draft = null; state.view = 'programme'; app.querySelector('.main').insertAdjacentHTML('afterbegin', generatorHtml()); }
  if (action === 'accept-draft') {
    if (state.data.programme && !confirm('Archive the current active programme and replace it with this draft? Completed historical data will be preserved.')) return;
    await createProgramme(state.user, state.draft, Boolean(state.data.programme));
    state.draft = null;
    state.data = await bootstrap(state.user);
    render();
  }
});

app.addEventListener('change', async (event) => {
  if (event.target.dataset.taskStatus) {
    const task = state.data.tasks.find((t) => t.id === event.target.dataset.taskStatus);
    await updateTask(state.user, task, { status: event.target.value });
    state.data = await bootstrap(state.user);
    render();
  }
  if (event.target.dataset.draft) {
    state.draft.tasks[Number(event.target.dataset.draft)][event.target.dataset.field] = event.target.type === 'number' ? Number(event.target.value) : event.target.value;
  }
});

app.addEventListener('blur', async (event) => {
  if (!event.target.dataset.taskField) return;
  const task = state.data.tasks.find((t) => t.id === event.target.dataset.taskField);
  const field = event.target.dataset.field;
  await updateTask(state.user, task, { [field]: event.target.value });
  state.data = await bootstrap(state.user);
}, true);

app.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const values = Object.fromEntries(new FormData(form).entries());
  const action = form.dataset.action;
  if (action === 'login') { await signIn(values.email); app.querySelector('.hero').insertAdjacentHTML('beforeend', '<p class="callout">Check your email for the magic link.</p>'); return; }
  if (action === 'draft-programme') { state.preferences = values; state.draft = createProgrammeDraft(state.data, values); render(); return; }
  if (action === 'tara-filters') { state.taraFilters = values; render(); return; }
  if (action === 'add-result') await addAcademicResult(state.user, values);
  if (action === 'add-journal') await addJournalEntry(state.user, values);
  if (action === 'add-reasoning') await addReasoningSession(state.user, values);
  if (action === 'add-interview') await addInterviewSession(state.user, values);
  if (action === 'save-review') await saveWeeklyReview(state.user, values);
  if (action === 'save-profile') await updateProfile(state.user, values);
  if (action === 'save-error') await saveTaraErrorAnalysis(state.user, values);
  state.data = await bootstrap(state.user);
  form.reset();
  render();
});

function triggerFor(q) {
  if (q.question_text.includes('Therefore') || q.question_text.includes('therefore')) return 'Conclusion language means you must inspect the bridge between evidence and conclusion.';
  if (q.reasoning_pattern.includes('ratio')) return 'A ratio phrase should trigger parts-to-whole thinking before calculation.';
  if (q.reasoning_pattern.includes('table')) return 'A table cue should trigger row/column selection before arithmetic.';
  return 'The wording should trigger the named method before looking at attractive answer choices.';
}

function highlight(text, parts = []) {
  return parts.reduce((html, part) => html.replaceAll(part, `<mark>${part}</mark>`), text);
}

function percent(done, total) {
  return total ? Math.round((done / total) * 100) : 0;
}

function coveragePercent() {
  return percent(answeredQuestionKeys().size, questions.length);
}

function answeredQuestionKeys() {
  return new Set((state.data?.tara?.responses || []).map((response) => `${response.paper_year}-${response.question_number}`));
}

function questionKey(question) {
  return `${question.paper_year}-${question.question_number}`;
}

function label(category) {
  return category.split('_').map((x)=>x[0].toUpperCase()+x.slice(1)).join(' ');
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'Date unset';
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Date unset';
}

function sel(value, expected) {
  return value === expected ? 'selected' : '';
}

function escapeAttr(value) {
  return String(value).replaceAll('"', '&quot;');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function uniqueQuestion(question, index, list) {
  return list.findIndex((item) => questionKey(item) === questionKey(question)) === index;
}
