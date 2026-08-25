import { bootstrap, getSession, signIn, signOut, saveAttempt, updateTask, createProgramme, addAcademicResult, updateSubject, addAcademicTopic, updateAcademicTopic, addJournalEntry, addReasoningSession, saveWeeklyReview, addInterviewSession, updateProfile, saveTaraErrorAnalysis } from './dataService.js';
import { questions } from './questions.js';
import { questionBankManifest } from './questionBankManifest.generated.js';
import { methodologyFor } from './methodologies.js';
import { createProgrammeDraft } from './weeklyGeneratorService.js';
import { buildDailyDigest, previousLocalDate } from './dailyDigestService.js';
import { getAlevelTopicPlan } from './aLevelTopicPlan.js';
import { ALL_SUBTYPES, TOP_LEVEL_TYPES } from './tagTaxonomy.js';

const app = document.querySelector('#app');
const MAGIC_LINK_THROTTLE_MINUTES = 30;
const MAGIC_LINK_THROTTLE_MS = MAGIC_LINK_THROTTLE_MINUTES * 60 * 1000;
const magicLinkStorageKey = 'oxford-em-coach-magic-link-sends-v1';
const state = {
  user: null,
  data: null,
  error: null,
  view: 'dashboard',
  practice: null,
  draft: null,
  notice: null,
  reviewAttemptId: null,
  academicTopicFilter: 'all',
  taraFilters: { year: 'all', family: 'all', type: 'all', pattern: 'all' },
  preferences: { minutes: 180, workload: 'standard', schoolWeek: 'normal', priority: 'none' }
};

init();

async function init() {
  try {
    const session = await getSession();
    state.user = session.user;
    if (state.user) {
      markMagicLinkUsed(state.user.email);
      state.data = await bootstrap(state.user);
    }
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
          <input name="email" type="email" placeholder="Student email" autocomplete="email" inputmode="email" required />
          <button type="submit">Send magic link</button>
          <p class="form-status" data-login-status aria-live="polite"></p>
        </form>
        <p class="muted">A secure sign-in link will be emailed to this address. To protect the Supabase email limit, this app sends only one magic link per email every ${MAGIC_LINK_THROTTLE_MINUTES} minutes on this device. If you already requested one, open the latest email from your inbox or spam/junk folder.</p>
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
      ${card('TARA Mastery', `${data.tara.overallAccuracy}% accuracy`, `${questionBankManifest.totalQuestions} questions · ${questionBankManifest.visualQuestionCount} with visuals<br>Coverage: ${coveragePercent()}% of bank<br>Strongest sub-type: ${data.tara.strongestSubtype?.name || 'Not enough data'}<br>Weakest sub-type: ${data.tara.weakestSubtype?.name || 'Not enough data'}<br><button data-action="start-smart" title="Prioritise unseen questions, then weak questions">Smart coverage set</button>`)}
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
    ${noticeHtml()}
    <section class="panel"><h3>${percent(tasks.filter(t=>t.status==='completed').length,tasks.length)}% complete</h3><div class="bar"><span style="width:${percent(tasks.filter(t=>t.status==='completed').length,tasks.length)}%"></span></div><p>${completed}/${total} minutes completed. ${total-completed} minutes remaining.</p><p>${p.coach_summary || ''}</p></section>
    ${aLevelTopicPlanHtml()}
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
  </form></section>${aLevelTopicPlanHtml()}${state.draft ? draftHtml() : ''}`;
}

function aLevelTopicPlanHtml() {
  const topics = getAlevelTopicPlan(state.data);
  return `<section class="panel topic-plan"><div class="top mini"><div><p class="eyebrow">A-Level Topics To Master</p><h3>This week's academic focus</h3></div><span class="pill high">${topics.length} topics</span></div><div class="topic-list">${topics.map((item) => `<article><b>${escapeHtml(item.subject)}</b><p>${escapeHtml(item.topic)}</p><small>${escapeHtml(item.reason)}</small></article>`).join('')}</div></section>`;
}

function draftHtml() {
  const minutes = state.draft.tasks.reduce((sum, task) => sum + Number(task.estimated_minutes || 0), 0);
  return `<section class="panel draft"><div class="top mini"><div><h3>Draft programme review</h3><p>${state.draft.programme.weekly_focus}</p></div><span class="pill success">${minutes} min</span></div>${state.draft.tasks.map((t,i)=>`<article class="task"><input data-draft="${i}" data-field="title" value="${escapeAttr(t.title)}"><textarea data-draft="${i}" data-field="description">${t.description}</textarea>${t.recommendation_reason ? `<p class="why"><b>Why this task:</b> ${escapeHtml(t.recommendation_reason)}</p>` : ''}<div class="row"><input data-draft="${i}" data-field="estimated_minutes" type="number" value="${t.estimated_minutes}"><select data-draft="${i}" data-field="priority"><option ${sel(t.priority,'high')}>high</option><option ${sel(t.priority,'medium')}>medium</option><option ${sel(t.priority,'low')}>low</option></select><button data-remove-draft="${i}" class="ghost">Remove</button></div></article>`).join('')}<div class="actions"><button data-action="accept-draft">Accept programme</button><button class="ghost" data-action="draft-programme">Regenerate</button></div></section>`;
}

function noticeHtml() {
  if (!state.notice) return '';
  return `<p class="form-status ${state.notice.type || 'success'} programme-notice">${escapeHtml(state.notice.message)}</p>`;
}

function groupTasks(tasks) {
  return ['a_level','tara','economics','management','oxford_reasoning','application'].map((cat) => {
    const rows = tasks.filter((t) => t.category === cat);
    return `<section class="panel"><h3>${label(cat)} ${rows.filter(t=>t.status==='completed').length}/${rows.length}</h3>${rows.map(taskHtml).join('') || '<p class="muted">No task this week.</p>'}</section>`;
  }).join('');
}

function taskHtml(t) {
  return `<article class="task"><div><b>${t.title}</b><p>${t.description || ''}</p>${t.recommendation_reason ? `<p class="why"><b>Why this task:</b> ${escapeHtml(t.recommendation_reason)}</p>` : ''}</div><div class="row"><span class="pill ${t.priority}">${t.priority}</span><span>${t.estimated_minutes || 0} min</span><select data-task-status="${t.id}" title="Update task status">${['not_started','in_progress','completed','skipped'].map((s)=>`<option value="${s}" ${sel(t.status,s)}>${s.replace('_',' ')}</option>`).join('')}</select></div><textarea data-task-field="${t.id}" data-field="completion_notes" placeholder="Completion notes">${t.completion_notes || ''}</textarea><textarea data-task-field="${t.id}" data-field="reflection" placeholder="Reflection">${t.reflection || ''}</textarea><input data-task-field="${t.id}" data-field="evidence_url" placeholder="Evidence URL" value="${escapeAttr(t.evidence_url || '')}"></article>`;
}

function taraHtml() {
  if (!state.practice) return `<header class="top"><div><p class="eyebrow">TARA Practice</p><h2>5-question methodology set</h2></div><div class="actions"><button data-action="start-smart" title="Prioritise unseen questions, then weak questions">Smart coverage set</button><button class="ghost" data-action="start-tara" title="Start a filtered practice set using the filters below">Start filtered set</button></div></header>${noticeHtml()}${taraFilterHtml()}<section class="grid">${card('Question bank coverage', `${coveragePercent()}%`, `${answeredQuestionKeys().size}/${questions.length} questions seen at least once`)}${card('Current filter match', `${filteredQuestions().length}`, 'Questions available for the selected filters')}</section><section class="panel"><h3>How smart coverage works</h3><p class="muted">Smart coverage chooses unseen questions first, then questions from weak types and patterns, then mastered questions only when needed.</p></section>`;
  if (state.practice.report) return reportHtml();
  const q = state.practice.set[state.practice.index];
  const selected = state.practice.answers[q.id];
  return `<section class="panel question"><p class="eyebrow">${q.paper_year} Q${q.question_number} · ${q.type} · ${q.sub_type}</p><h2>${highlight(q.question_text, q.relevant_question_highlights)}</h2>${visualHtml(q)}${Object.entries(q.answer_options).map(([k,v])=>`<button class="option ${optionClass(q, k, selected)}" data-answer="${k}"><b>${k}</b> ${v}</button>`).join('')}${instantFeedbackHtml(q, selected)}<div class="actions"><button class="ghost" data-action="prev-question">Previous</button><button class="ghost" data-action="next-question">Next</button><button data-action="submit-tara">Submit set</button></div></section>`;
}

function optionClass(q, key, selected) {
  if (!selected) return '';
  if (key === q.correct_answer) return 'correct';
  if (key === selected) return 'incorrect selected';
  return '';
}

function instantFeedbackHtml(q, selected) {
  if (!selected) return '<p class="muted instant-hint">Choose an answer to see instant marking and coaching before moving on.</p>';
  const correct = selected === q.correct_answer;
  return `<aside class="instant-feedback ${correct ? 'correct' : 'incorrect'}"><h3>${correct ? 'Correct' : 'Not quite'} · Official answer ${q.correct_answer}</h3><p><b>Method trigger:</b> ${triggerFor(q)}</p><p><b>How to approach it:</b> ${methodologyFor(q.sub_type).slice(0, 3).join(' ')}</p><p><b>Common trap:</b> ${trapFor(q)}</p><p><b>Carry forward:</b> ${carryForwardFor(q)}</p></aside>`;
}

function reportHtml() {
  const { set, answers } = state.practice;
  const score = set.filter((q)=>answers[q.id]===q.correct_answer).length;
  return `<header class="top"><div><p class="eyebrow">Coaching report</p><h2>Score ${score}/${set.length}</h2></div><button data-action="start-tara">New set</button></header>${set.map((q) => coachingHtml(q, answers[q.id])).join('')}`;
}

function coachingHtml(q, selected) {
  const correct = selected === q.correct_answer;
  return `<article class="panel coaching"><p class="eyebrow">Question ${q.question_number} · ${q.type} · ${q.sub_type}</p><h3>${correct ? 'Correct' : 'Incorrect'} · Your answer ${selected || 'blank'} · Official answer ${q.correct_answer}</h3><h4>A. Standard methodology</h4><ol>${methodologyFor(q.sub_type).map((m)=>`<li>${m}</li>`).join('')}</ol><h4>B. Full original question</h4><p>${highlight(q.question_text, q.relevant_question_highlights)}</p>${visualHtml(q)}<h4>C. Highlight decisive wording</h4><p>${q.relevant_question_highlights.map((h)=>`<mark>${h}</mark>`).join(' ') || '<span class="muted">No extracted highlight yet. Use the question stem and numerical constraints as the first clues.</span>'}</p><h4>D. What the wording should trigger</h4><p>${triggerFor(q)}</p><h4>E. Apply the method</h4><p>${coachingExplanation(q)}</p><h4>F. Trap to avoid</h4><p>${trapFor(q)}</p><h4>G. Method to carry forward</h4><p>${carryForwardFor(q)}</p></article>`;
}

function coachingExplanation(q) {
  return `This is a ${q.type} question, sub-type ${q.sub_type}. Start by applying the standard methodology above, then use the highlighted wording to identify exactly what the question asks. The official answer is ${q.correct_answer}; treat it as the option that satisfies the task with the fewest extra assumptions.`;
}

function trapFor(q) {
  const traps = {
    'Identifying the Main Conclusion': 'A tempting option may be true or mentioned, but it is wrong if it is only evidence, background or an example rather than the author’s main claim.',
    'Drawing a Conclusion': 'Avoid answers that go beyond what must follow. The correct answer is usually narrower than the most interesting-sounding option.',
    'Identifying Assumptions': 'Do not choose a statement that merely helps the argument. The assumption must be something the argument depends on.',
    'Detecting Reasoning Errors (Flaws)': 'A vague criticism is not enough. The right option attacks the exact move from evidence to conclusion.',
    'Assessing Additional Evidence': 'Do not pick evidence that is just related to the topic. It must strengthen or weaken the argument’s conclusion.',
    'Applying Principles': 'Avoid matching surface details. Extract the rule first, then test which option follows that rule.',
    'Matching Arguments (Parallel Reasoning)': 'Ignore topic similarity. Match the logical structure, including whether the original reasoning is flawed.',
    'Basic Arithmetic Operations': 'The common slip is doing the right arithmetic on the wrong quantity. Label each number before calculating.',
    'Percentages and Ratios': 'The trap is using the wrong base or confusing part-to-part with part-to-whole.',
    'Real-Life Measurements': 'The trap is mixing units or missing a fixed charge, boundary condition or conversion step.',
    'Data Interpretation': 'The trap is reading the wrong row, column, chart label or timetable direction.',
    'Spatial and Logical Problem-Solving': 'The trap is trusting a visual impression instead of checking every constraint.'
  };
  return traps[q.sub_type] || 'Do not choose an option that sounds related but fails the exact task.';
}

function carryForwardFor(q) {
  const lessons = {
    'Critical Thinking': 'For future critical thinking questions, always name the conclusion, evidence and required logical move before looking at options.',
    'Numerical Reasoning & Problem-Solving': 'For future numerical questions, write the target quantity, relevant data and units before doing arithmetic.'
  };
  return lessons[q.type] || `${q.sub_type} questions reward naming the required thinking move before choosing.`;
}

function analyticsHtml() {
  const t = state.data.tara;
  return `<header class="top"><div><p class="eyebrow">TARA Analytics</p><h2>${t.overallAccuracy}% overall accuracy</h2></div><button data-action="start-recommended-tara">Practise recommended area</button></header>${taraRecommendationHtml(t)}<section class="grid">${card('Total attempts', t.totalAttempts, `${t.totalQuestions} questions answered`)}${card('Average set score', t.averageSetScore, 'Mini-sets are not official scaled scores.')}${card('Critical Thinking', `${t.criticalAccuracy}%`, '')}${card('Numerical Reasoning', `${t.problemAccuracy}%`, '')}</section><section class="panel"><h3>Accuracy trend</h3>${trend(t.recentTrend)}</section><section class="grid"><section class="panel"><h3>By type</h3>${bars(t.byType)}</section><section class="panel"><h3>By sub-type</h3>${bars(t.byPattern)}</section></section><section class="panel"><h3>Repeat mistake signals</h3>${repeatMistakesHtml(t)}</section><section class="panel"><h3>Historical test sessions</h3>${sessionHistoryHtml()}</section>${state.reviewAttemptId ? reviewAttemptHtml(state.reviewAttemptId) : ''}`;
}

function taraRecommendationHtml(t) {
  if (!t.totalQuestions) return `<section class="panel"><h3>What to practise next</h3><p class="muted">Complete one set first. The app will then recommend practice from the weakest type or sub-type.</p></section>`;
  const weak = t.weakestSubtype || t.weakestType;
  const reason = weak?.total ? `${weak.name} is currently ${weak.accuracy}% across ${weak.total} question${weak.total === 1 ? '' : 's'}.` : 'There is not enough detail yet, so use smart coverage to keep seeing unseen questions.';
  return `<section class="panel recommendation"><div class="top mini"><div><h3>What to practise next</h3><p>${escapeHtml(reason)}</p></div><span class="pill high">${weak?.accuracy ?? t.overallAccuracy}%</span></div><p class="callout">Recommended action: ${weak?.name ? `start a focused 5-question set for ${escapeHtml(weak.name)}, then review every trap and carry-forward method.` : 'start a smart coverage set.'}</p></section>`;
}

function repeatMistakesHtml(t) {
  if (!t.repeatErrors?.length) return '<p class="muted">No repeated mistake pattern yet. This will populate after incorrect responses are recorded.</p>';
  return `<div class="topic-list">${t.repeatErrors.map((row) => `<article><b>${escapeHtml(row.name)}</b><p>${row.total} incorrect response${row.total === 1 ? '' : 's'}</p><small>Use the coaching report to classify why the mistake happened.</small></article>`).join('')}</div>`;
}

function academicsHtml() {
  return `<header class="top"><div><p class="eyebrow">A-Level Progress</p><h2>Protect academic strength</h2><p class="muted">Track grades, assessments and weekly mastery topics. Weak or developing topics are fed into the Weekly Programme generator.</p></div></header>${needsAttentionHtml()}${masteredThisWeekHtml()}${topicFilterHtml()}<section class="grid">${state.data.subjects.map(subjectCardHtml).join('')}</section><section class="panel"><h3>Add topic to track</h3><form data-action="add-topic" class="form-grid">${subjectSelect()}<input name="topic_name" placeholder="Topic, e.g. Integration by substitution" required><label>Mastery<select name="mastery_status">${masteryOptions('developing')}</select></label><label>Confidence 1-5<input name="confidence" type="number" min="1" max="5" value="3"></label><input name="notes" placeholder="Notes or next action"><button>Save topic</button></form></section><section class="panel"><h3>Add assessment</h3><form data-action="add-result" class="form-grid">${subjectSelect()}<input name="assessment_name" placeholder="Assessment name" required><input name="topic" placeholder="Topic"><input name="assessment_date" type="date" value="${todayInput()}"><input name="score" type="number" placeholder="Score"><input name="max_score" type="number" value="100"><input name="grade" placeholder="Grade"><input name="teacher_feedback" placeholder="Teacher feedback"><button>Save result</button></form></section>`;
}

function topicFilterHtml() {
  const filters = ['all','weak','developing','secure','strong'];
  return `<section class="panel compact-panel"><h3>Topic filter</h3><div class="segmented">${filters.map((filter) => `<button class="${state.academicTopicFilter === filter ? 'active' : ''}" data-topic-filter="${filter}" title="Show ${filter === 'all' ? 'all' : filter} A-Level topics">${label(filter)}</button>`).join('')}</div></section>`;
}

function needsAttentionHtml() {
  const topics = state.data.subjects.flatMap((subject) =>
    (subject.academic_topics || [])
      .filter((topic) => ['weak', 'developing'].includes(topic.mastery_status))
      .map((topic) => ({ ...topic, subject_name: subject.name }))
  );
  if (!topics.length) return `<section class="panel"><h3>Needs Attention</h3><p class="muted">No weak or developing A-Level topics recorded yet. Add topics below so the weekly programme can target them.</p></section>`;
  return `<section class="panel"><h3>Needs Attention</h3><div class="topic-list">${topics.map((topic) => `<article><b>${escapeHtml(topic.subject_name)}</b><p>${escapeHtml(topic.topic_name)}</p><small>${label(topic.mastery_status)} · confidence ${topic.confidence || 3}/5</small></article>`).join('')}</div></section>`;
}

function subjectCardHtml(subject) {
  const results = sortedResults(subject.academic_results || []);
  const latest = results[0];
  const topics = filteredAcademicTopics(subject.academic_topics || []);
  const allTopics = subject.academic_topics || [];
  const weakCount = allTopics.filter((topic) => ['weak', 'developing'].includes(topic.mastery_status)).length;
  return `<section class="panel subject-card"><div class="top mini"><div><h3>${escapeHtml(subject.name)}</h3><p class="muted">${weakCount} topic${weakCount === 1 ? '' : 's'} need attention</p></div><p class="metric">${escapeHtml(subject.predicted_grade || 'Not set')}</p></div><form data-action="update-subject" class="subject-form"><input type="hidden" name="subject_id" value="${subject.id}"><label>Target<input name="target_grade" value="${escapeAttr(subject.target_grade || '')}" placeholder="A*"></label><label>Current<input name="current_estimated_grade" value="${escapeAttr(subject.current_estimated_grade || '')}" placeholder="Current grade"></label><label>Predicted<input name="predicted_grade" value="${escapeAttr(subject.predicted_grade || '')}" placeholder="Predicted grade"></label><label class="span-all">Subject notes<textarea name="notes" placeholder="Teacher advice, exam-board notes, or next revision action">${escapeHtml(subject.notes || '')}</textarea></label><button>Save subject</button></form>${latest ? `<p class="callout">Latest: ${escapeHtml(latest.assessment_name || latest.topic || 'Assessment')} · ${latest.percentage ?? 0}%${latest.grade ? ` · ${escapeHtml(latest.grade)}` : ''}</p>` : '<p class="muted">No assessment recorded yet.</p>'}${results.length ? `<div class="assessment-history"><b>Recent assessments</b>${results.slice(0, 3).map(assessmentRowHtml).join('')}</div>` : ''}${topics.length ? `<div class="topic-stack">${topics.map(topicRowHtml).join('')}</div>` : '<p class="muted">No tracked topics yet.</p>'}</section>`;
}

function assessmentRowHtml(result) {
  return `<article><span>${escapeHtml(result.assessment_name || result.topic || 'Assessment')}</span><b>${result.percentage ?? 0}%</b><small>${formatDate(result.assessment_date || result.created_at)}${result.grade ? ` · ${escapeHtml(result.grade)}` : ''}</small></article>`;
}

function sortedResults(results) {
  return [...results].sort((a, b) => String(b.assessment_date || b.created_at || '').localeCompare(String(a.assessment_date || a.created_at || '')));
}

function masteredThisWeekHtml() {
  const since = weekStartDate();
  const topics = state.data.subjects.flatMap((subject) =>
    (subject.academic_topics || [])
      .filter((topic) => topic.mastery_status === 'strong' && String(topic.last_assessed_at || '') >= since)
      .map((topic) => `${subject.name}: ${topic.topic_name}`)
  );
  return `<section class="panel"><h3>Mastered this week</h3>${topics.length ? `<ul class="compact-list">${topics.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p class="muted">When a topic is moved to Strong this week, it will appear here.</p>'}</section>`;
}

function topicRowHtml(topic) {
  return `<article class="topic-row"><div><b>${escapeHtml(topic.topic_name)}</b><small>${label(topic.mastery_status)} · confidence ${topic.confidence || 3}/5</small></div><div class="row"><select data-topic-status="${topic.id}" title="Update mastery">${['weak','developing','secure','strong'].map((status) => `<option value="${status}" ${sel(topic.mastery_status,status)}>${label(status)}</option>`).join('')}</select><select data-topic-confidence="${topic.id}" title="Update confidence">${[1,2,3,4,5].map((score) => `<option value="${score}" ${sel(String(topic.confidence || 3),String(score))}>${score}/5</option>`).join('')}</select></div><textarea data-topic-notes="${topic.id}" placeholder="Notes or next action">${topic.notes || ''}</textarea></article>`;
}

function filteredAcademicTopics(topics) {
  if (state.academicTopicFilter === 'all') return topics;
  return topics.filter((topic) => topic.mastery_status === state.academicTopicFilter);
}

function masteryOptions(selected) {
  return ['weak','developing','secure','strong'].map((status) => `<option value="${status}" ${sel(selected,status)}>${label(status)}</option>`).join('');
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
  if (state.data.parentStudents?.length) return parentLinkedStudentsHtml();
  const tasks = state.data.tasks || [];
  const t = state.data.tara;
  return `<header class="top"><div><p class="eyebrow">Parent / Coach View</p><h2>Progress summary without private reflections</h2></div></header><section class="grid six">${card('This week', `${percent(tasks.filter((task)=>task.status==='completed').length, tasks.length)}%`, `${tasks.filter((task)=>task.status !== 'completed').length} tasks still open`)}${card('TARA', `${t.overallAccuracy}%`, `Weakest sub-type: ${t.weakestSubtype?.name || 'Not enough data'}<br>Questions: ${t.totalQuestions}`)}${card('A-Level', '', state.data.subjects.map((s)=>`${s.name}: ${s.predicted_grade || 'Not set'}`).join('<br>'))}${card('E&M consistency', `${state.data.journal.length} entries`, state.data.journal[0]?.title || 'No journal entries yet')}${card('Milestones', `${state.data.milestones.filter((m)=>m.status==='completed').length}/${state.data.milestones.length}`, 'Completed admissions milestones')}${card('Recommendations', '', state.data.recommendations.slice(0,2).join('<br>') || 'No recommendation yet')}</section>${digestPreviewHtml()}<section class="panel"><h3>Privacy note</h3><p class="muted">This view deliberately summarises progress. Student reflections are not shown here by default.</p></section>`;
}

function parentLinkedStudentsHtml() {
  return `<header class="top"><div><p class="eyebrow">Parent / Coach View</p><h2>Linked student summaries</h2><p class="muted">Read-only progress. Journal reflections and Oxford reasoning responses are not shown.</p></div></header>${state.data.parentStudents.map(parentStudentCardHtml).join('')}<section class="panel"><h3>Privacy note</h3><p class="muted">Parents see performance summaries, weekly tasks, academic grades and milestones. Private student reflections stay out of this view.</p></section>`;
}

function parentStudentCardHtml(student) {
  const tasks = student.tasks || [];
  const completed = tasks.filter((task) => task.status === 'completed');
  const open = tasks.filter((task) => !['completed', 'skipped'].includes(task.status));
  const weakTopics = student.subjects.flatMap((subject) => (subject.academic_topics || [])
    .filter((topic) => ['weak', 'developing'].includes(topic.mastery_status))
    .map((topic) => `${subject.name}: ${topic.topic_name}`));
  const nextMilestones = (student.milestones || []).filter((m) => m.status !== 'completed').slice(0, 3);
  return `<section class="panel parent-student"><div class="top mini"><div><p class="eyebrow">${escapeHtml(student.profile?.display_name || 'Student')}</p><h3>${escapeHtml(student.profile?.target_course || 'Oxford Economics & Management')}</h3></div><span class="pill success">Read-only</span></div><section class="grid six">${card('This week', `${percent(completed.length, tasks.length)}%`, `${completed.length}/${tasks.length} tasks completed<br>${open.length} still open`)}${card('TARA', `${student.tara.overallAccuracy}%`, `${student.tara.totalQuestions} questions answered<br>Weakest: ${student.tara.weakestSubtype?.name || 'Not enough data'}`)}${card('A-Level', '', student.subjects.map((s)=>`${s.name}: ${s.predicted_grade || 'Not set'}`).join('<br>'))}${card('Weak topics', weakTopics.length, weakTopics.slice(0, 4).map(escapeHtml).join('<br>') || 'None recorded')}${card('Upcoming milestones', nextMilestones.length, nextMilestones.map((m)=>`${escapeHtml(m.title)} · ${formatDate(m.target_date)}`).join('<br>') || 'No open milestones')}${card('Current focus', '', student.programme?.weekly_focus || 'No active weekly programme')}</section></section>`;
}

function profileHtml() {
  const p = state.data.profile || {};
  return `<header class="top"><div><p class="eyebrow">Profile</p><h2>Student setup</h2></div></header><section class="panel"><form data-action="save-profile" class="form-grid"><label>Display name<input name="display_name" value="${escapeAttr(p.display_name || '')}"></label><label>School<input name="school" value="${escapeAttr(p.school || '')}"></label><label>Student email<input value="${escapeAttr(state.user.email || '')}" disabled></label><label>Parent email<input name="parent_email" type="email" value="${escapeAttr(p.parent_email || '')}" placeholder="parent@example.com"></label><label>School year<input name="current_school_year" value="${escapeAttr(p.current_school_year || 'Year 12')}"></label><label>Application year<input name="application_year" type="number" value="${escapeAttr(p.application_year || '')}"></label><label>Target course<input name="target_course" value="${escapeAttr(p.target_course || 'Oxford Economics & Management')}"></label><label>Target university<input name="target_university" value="${escapeAttr(p.target_university || 'University of Oxford')}"></label><label>Daily parent digest time<input name="parent_digest_time" type="time" value="${escapeAttr(formatTime(p.parent_digest_time || '06:00'))}"></label><label class="checkline"><input name="parent_digest_enabled" type="checkbox" value="true" ${p.parent_digest_enabled ? 'checked' : ''}> Send daily parent digest</label><p class="muted span-all">The digest summarises the previous calendar day. Scheduled email delivery needs the later Supabase Edge Function/email-provider step; the preview below is available now.</p><button>Save profile</button></form></section>${digestPreviewHtml()}`;
}

function digestPreviewHtml() {
  const p = state.data.profile || {};
  const digest = buildDailyDigest(state.data, previousLocalDate());
  return `<section class="panel digest-preview"><div class="top mini"><div><p class="eyebrow">Parent Daily Digest Preview</p><h3>${formatLongDate(digest.date)} summary</h3></div><span class="pill ${p.parent_digest_enabled ? 'success' : 'low'}">${p.parent_digest_enabled ? 'Enabled' : 'Off'}</span></div><p class="muted">${p.parent_email ? `Would be sent to ${escapeHtml(p.parent_email)} around ${escapeHtml(formatTime(p.parent_digest_time || '06:00'))}.` : 'Add a parent email in Profile before scheduled digest emails can be sent.'}</p>${digest.hasActivity ? digestSummaryHtml(digest) : '<p class="callout">No activity was recorded for the previous day, so the production digest would normally send nothing.</p>'}</section>`;
}

function digestSummaryHtml(digest) {
  return `<div class="digest-grid">
    ${digestBlock('TARA', digest.tara.totalSets ? `${digest.tara.totalSets} set${digest.tara.totalSets === 1 ? '' : 's'} · ${digest.tara.correct}/${digest.tara.totalQuestions} correct · ${digest.tara.accuracy}%` : 'No TARA set completed.')}
    ${digestBlock('Weakest Sub-type', digest.tara.weakSubtypes[0] ? `${escapeHtml(digest.tara.weakSubtypes[0].name)} · ${digest.tara.weakSubtypes[0].accuracy}%` : 'No weak sub-type identified yesterday.')}
    ${digestBlock('Weekly Programme', `${digest.weeklyProgramme.completedTasks.length} completed · ${digest.weeklyProgramme.skippedTasks.length} skipped · ${digest.weeklyProgramme.completedMinutes} minutes`)}
    ${digestBlock('Academics', digest.academics.length ? digest.academics.map((item) => `${escapeHtml(item.subject_name)}: ${escapeHtml(item.assessment_name || item.topic || 'assessment')} ${escapeHtml(item.percentage || '')}%`).join('<br>') : 'No academic result added.')}
    ${digestBlock('E&M / Reasoning', `${digest.journal.length} journal entr${digest.journal.length === 1 ? 'y' : 'ies'} · ${digest.reasoning.length} reasoning session${digest.reasoning.length === 1 ? '' : 's'}`)}
    ${digestBlock('Suggested Focus', digest.recommendations.map((item) => escapeHtml(item)).join('<br>') || 'Keep the current weekly programme moving.')}
  </div>`;
}

function digestBlock(title, body) {
  return `<article class="digest-block"><b>${title}</b><p>${body}</p></article>`;
}

function taraFilterHtml() {
  return `<section class="panel"><h3>Build a focused set</h3><form class="form-grid" data-action="tara-filters"><label>Paper year<select name="year"><option value="all">All years</option>${questionBankManifest.years.map((year)=>`<option value="${escapeAttr(year)}" ${sel(state.taraFilters.year,year)}>${year}</option>`).join('')}</select></label><label>Type<select name="family"><option value="all">All types</option>${TOP_LEVEL_TYPES.map((type)=>`<option value="${escapeAttr(type)}" ${sel(state.taraFilters.family,type)}>${type}</option>`).join('')}</select></label><label>Sub-type<select name="type"><option value="all">All sub-types</option>${ALL_SUBTYPES.map((type)=>`<option value="${escapeAttr(type)}" ${sel(state.taraFilters.type,type)}>${type}</option>`).join('')}</select></label><input type="hidden" name="pattern" value="all"><button>Apply filters</button></form></section>`;
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
  syncTaraFiltersFromDom();
  const filtered = filteredQuestions();
  if (!filtered.length) {
    state.notice = { type: 'error', message: 'No questions match those filters. Loosen one filter and try again.' };
    state.practice = null;
    state.view = 'tara';
    return;
  }
  const set = shuffle(filtered).slice(0, Math.min(5, filtered.length));
  state.notice = filtered.length < 5
    ? { type: 'info', message: `Only ${filtered.length} question${filtered.length === 1 ? '' : 's'} matched those filters, so this set is shorter than 5.` }
    : { type: 'success', message: `Started a filtered set from ${filtered.length} matching questions.` };
  state.practice = { set, index: 0, answers: {}, startedAt: new Date().toISOString(), report: false };
  state.view = 'tara';
}

function startSmartTara() {
  const pool = smartQuestionPool();
  state.practice = { set: pool.slice(0,5), index: 0, answers: {}, startedAt: new Date().toISOString(), report: false };
  state.view = 'tara';
}

function startRecommendedTara() {
  const weakSubtype = state.data.tara.weakestSubtype?.name;
  if (weakSubtype) {
    state.taraFilters = { ...state.taraFilters, type: weakSubtype };
    state.notice = { type: 'info', message: `Starting a focused set for ${weakSubtype}.` };
  }
  startTara();
}

function filteredQuestions() {
  return questions.filter((q) =>
    (state.taraFilters.year === 'all' || String(q.paper_year) === state.taraFilters.year) &&
    (state.taraFilters.family === 'all' || q.type === state.taraFilters.family) &&
    (state.taraFilters.type === 'all' || q.sub_type === state.taraFilters.type)
  );
}

function syncTaraFiltersFromDom() {
  const form = app.querySelector('form[data-action="tara-filters"]');
  if (!form) return;
  state.taraFilters = Object.fromEntries(new FormData(form).entries());
}

function smartQuestionPool() {
  const answered = answeredQuestionKeys();
  const weakType = state.data.tara.weakestType?.name;
  const weakPattern = state.data.tara.weakestSubtype?.name;
  const filtered = filteredQuestions();
  const unseen = filtered.filter((q) => !answered.has(questionKey(q)));
  const weak = filtered.filter((q) => q.type === weakType || q.sub_type === weakPattern);
  const rest = filtered.filter((q) => !unseen.includes(q) && !weak.includes(q));
  return [...shuffle(unseen), ...shuffle(weak), ...shuffle(rest), ...shuffle(questions)].filter(uniqueQuestion);
}

async function submitTara() {
  const responses = state.practice.set.map((q) => ({
    paper_year: q.paper_year,
    question_number: q.question_number,
    section: q.section,
    question_type: q.type,
    reasoning_pattern: q.sub_type,
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
  if (target.dataset.topicFilter) { state.academicTopicFilter = target.dataset.topicFilter; render(); return; }
  if (target.dataset.removeDraft) { state.draft.tasks.splice(Number(target.dataset.removeDraft), 1); render(); return; }
  if (target.dataset.reviewAttempt) { state.reviewAttemptId = target.dataset.reviewAttempt; state.view = 'analytics'; render(); return; }
  const action = target.dataset.action;
  if (action === 'signout') { await signOut(); location.reload(); }
  if (action === 'start-tara') { startTara(); render(); }
  if (action === 'start-smart') { startSmartTara(); render(); }
  if (action === 'start-recommended-tara') { startRecommendedTara(); render(); }
  if (action === 'prev-question') { state.practice.index = Math.max(0, state.practice.index - 1); render(); }
  if (action === 'next-question') { state.practice.index = Math.min(state.practice.set.length - 1, state.practice.index + 1); render(); }
  if (action === 'submit-tara') await submitTara();
  if (action === 'close-review') { state.reviewAttemptId = null; render(); }
  if (action === 'show-generator') { state.draft = null; state.view = 'programme'; app.querySelector('.main').insertAdjacentHTML('afterbegin', generatorHtml()); }
  if (action === 'accept-draft') {
    if (state.data.programme && !confirm('Archive the current active programme and replace it with this draft? Completed historical data will be preserved.')) return;
    target.disabled = true;
    target.textContent = 'Saving programme...';
    try {
      await createProgramme(state.user, state.draft, Boolean(state.data.programme));
      state.draft = null;
      state.data = await bootstrap(state.user);
      state.notice = { type: 'success', message: 'Programme saved. Your active weekly programme has been updated with the new tasks.' };
      render();
    } catch (error) {
      state.notice = { type: 'error', message: friendlyError(error) };
      render();
    }
  }
});

app.addEventListener('change', async (event) => {
  if (event.target.dataset.taskStatus) {
    const task = state.data.tasks.find((t) => t.id === event.target.dataset.taskStatus);
    await updateTask(state.user, task, { status: event.target.value });
    state.data = await bootstrap(state.user);
    render();
  }
  if (event.target.dataset.topicStatus) {
    const topic = findAcademicTopic(event.target.dataset.topicStatus);
    await updateAcademicTopic(state.user, topic, { mastery_status: event.target.value });
    state.data = await bootstrap(state.user);
    render();
  }
  if (event.target.dataset.topicConfidence) {
    const topic = findAcademicTopic(event.target.dataset.topicConfidence);
    await updateAcademicTopic(state.user, topic, { confidence: event.target.value });
    state.data = await bootstrap(state.user);
    render();
  }
  if (event.target.dataset.draft) {
    state.draft.tasks[Number(event.target.dataset.draft)][event.target.dataset.field] = event.target.type === 'number' ? Number(event.target.value) : event.target.value;
  }
});

app.addEventListener('blur', async (event) => {
  if (event.target.dataset.topicNotes) {
    const topic = findAcademicTopic(event.target.dataset.topicNotes);
    await updateAcademicTopic(state.user, topic, { notes: event.target.value });
    state.data = await bootstrap(state.user);
    return;
  }
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
  const button = form.querySelector('button[type="submit"], button:not([type])');
  try {
    if (action === 'login') {
      const email = normalizeEmail(values.email);
      const throttle = magicLinkThrottleStatus(email);
      if (throttle.blocked) {
        setFormStatus(form, throttle.message, 'info');
        return;
      }
      setFormStatus(form, 'Sending magic link...', 'info');
      if (button) button.disabled = true;
      await signIn(email);
      recordMagicLinkSent(email);
      setFormStatus(form, `Magic link sent to ${email}. Check inbox and spam/junk.`, 'success');
      return;
    }
    if (action === 'draft-programme') { state.preferences = values; state.draft = createProgrammeDraft(state.data, values); state.notice = null; render(); return; }
    if (action === 'tara-filters') { state.taraFilters = values; state.notice = { type: 'success', message: `${filteredQuestions().length} questions match the selected filters.` }; render(); return; }
    if (button) button.disabled = true;
    if (action === 'update-subject') {
      const subject = findSubject(values.subject_id);
      await updateSubject(state.user, subject, values);
    }
    if (action === 'add-result') await addAcademicResult(state.user, values);
    if (action === 'add-topic') await addAcademicTopic(state.user, values);
    if (action === 'add-journal') await addJournalEntry(state.user, values);
    if (action === 'add-reasoning') await addReasoningSession(state.user, values);
    if (action === 'add-interview') await addInterviewSession(state.user, values);
    if (action === 'save-review') await saveWeeklyReview(state.user, values);
    if (action === 'save-profile') await updateProfile(state.user, normalizeProfilePayload(values));
    if (action === 'save-error') await saveTaraErrorAnalysis(state.user, values);
    state.data = await bootstrap(state.user);
    form.reset();
    render();
  } catch (error) {
    setFormStatus(form, friendlyError(error), 'error');
  } finally {
    if (button) button.disabled = false;
  }
});

function triggerFor(q) {
  if (q.question_text.includes('Therefore') || q.question_text.includes('therefore')) return 'Conclusion language means you must inspect the bridge between evidence and conclusion.';
  if (q.sub_type === 'Percentages and Ratios') return 'Ratio or percentage wording should trigger parts-to-whole thinking before calculation.';
  if (q.sub_type === 'Data Interpretation') return 'A table, chart or schedule cue should trigger row/column selection before arithmetic.';
  if (q.sub_type === 'Real-Life Measurements') return 'Measurement wording should trigger unit conversion before calculation.';
  if (q.sub_type === 'Spatial and Logical Problem-Solving') return 'Diagram or pattern wording should trigger constraint tracking and elimination.';
  return 'The wording should trigger the named method before looking at attractive answer choices.';
}

function findAcademicTopic(id) {
  return state.data.subjects.flatMap((subject) => subject.academic_topics || []).find((topic) => topic.id === id);
}

function findSubject(id) {
  return state.data.subjects.find((subject) => subject.id === id);
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

function formatLongDate(value) {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Date unset';
}

function formatTime(value) {
  return String(value || '06:00').slice(0, 5);
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function weekStartDate() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date.toISOString().slice(0, 10);
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

function setFormStatus(form, message, type = 'info') {
  const status = form.querySelector('[data-login-status], [data-form-status]') || form.querySelector('.form-status');
  if (!status) {
    form.insertAdjacentHTML('beforeend', `<p class="form-status ${type}">${escapeHtml(message)}</p>`);
    return;
  }
  status.className = `form-status ${type}`;
  status.textContent = message;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function magicLinkThrottleStatus(email) {
  const record = readMagicLinkRecords()[email];
  if (!record?.sentAt) return { blocked: false };

  const elapsed = Date.now() - Number(record.sentAt);
  if (elapsed >= MAGIC_LINK_THROTTLE_MS) return { blocked: false };

  const remaining = Math.max(1, Math.ceil((MAGIC_LINK_THROTTLE_MS - elapsed) / 60000));
  if (record.usedAt) {
    return {
      blocked: true,
      message: `A magic link for ${email} was already used recently. To protect the Supabase email limit, wait ${remaining} more minute${remaining === 1 ? '' : 's'} before requesting another one.`
    };
  }

  return {
    blocked: true,
    message: `A magic link was already sent to ${email}. Please find that email in your inbox or spam/junk folder and open the latest link. You can request another link in ${remaining} minute${remaining === 1 ? '' : 's'}.`
  };
}

function recordMagicLinkSent(email) {
  const records = readMagicLinkRecords();
  records[email] = { sentAt: Date.now(), usedAt: null };
  writeMagicLinkRecords(records);
}

function markMagicLinkUsed(email) {
  const normalized = normalizeEmail(email);
  const records = readMagicLinkRecords();
  const record = records[normalized];
  if (!record?.sentAt || record.usedAt) return;
  if (Date.now() - Number(record.sentAt) > MAGIC_LINK_THROTTLE_MS) return;
  records[normalized] = { ...record, usedAt: Date.now() };
  writeMagicLinkRecords(records);
}

function readMagicLinkRecords() {
  try {
    const records = JSON.parse(localStorage.getItem(magicLinkStorageKey) || '{}');
    const cutoff = Date.now() - MAGIC_LINK_THROTTLE_MS;
    return Object.fromEntries(Object.entries(records).filter(([, record]) => Number(record.sentAt) >= cutoff));
  } catch {
    return {};
  }
}

function writeMagicLinkRecords(records) {
  try {
    localStorage.setItem(magicLinkStorageKey, JSON.stringify(records));
  } catch {
    // If localStorage is unavailable, Supabase still enforces its own server-side limits.
  }
}

function normalizeProfilePayload(values) {
  return {
    ...values,
    parent_email: normalizeEmail(values.parent_email),
    parent_digest_enabled: values.parent_digest_enabled === 'true',
    application_year: values.application_year ? Number(values.application_year) : null
  };
}

function friendlyError(error) {
  const message = error?.message || String(error);
  if (message.toLowerCase().includes('rate limit')) return `Supabase email limit reached. Wait about 1 hour before trying again, or configure custom SMTP. The app now also avoids repeat magic-link requests inside ${MAGIC_LINK_THROTTLE_MINUTES} minutes on the same device.`;
  if (message.toLowerCase().includes('failed to fetch')) return 'Could not reach Supabase. Check internet connection and try again.';
  if (message.toLowerCase().includes('redirect')) return 'Sign-in redirect is not allowed yet. Check Supabase Authentication URL Configuration.';
  if (message.toLowerCase().includes('email')) return message;
  return `Something went wrong: ${message}`;
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
