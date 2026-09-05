import { bootstrap, getSession, signIn, signOut, saveAttempt, updateTask, addAcademicResult, updateSubject, addAcademicTopic, updateAcademicTopic, addJournalEntry, addReasoningSession, updateMilestone, addMilestone, saveWeeklyReview, addInterviewSession, updateProfile, saveTaraErrorAnalysis, saveStudyPlanLog } from './dataService.js';
import { STUDY_AREAS, areaFor, displayActivity, availabilityHtml, richStudyFields, handleStudyInput, collectStudyDetails, customTopicsFor, topicHistoryHtml } from './planTracking.js';
import { saveSchoolTask, schoolAttachmentUrl } from './schoolTaskService.js';
import { questionBankManifest } from './questionBankManifest.generated.js';
import { methodologyFor } from './methodologies.js';
import { buildDailyDigest, previousLocalDate } from './dailyDigestService.js';
import { getAlevelTopicPlan } from './aLevelTopicPlan.js';
import { ALL_SUBTYPES, PROBLEM_SOLVING_TOPIC_TAGS, TOP_LEVEL_TYPES } from './tagTaxonomy.js';
import { READING_PLAN, WEEKDAY_TIMETABLE, WEEKEND_TIMETABLE, WEEKLY_TARGETS, taraHasNoScheduledTime, totalWeeklyTargetHours } from './studentStudyPlan.js';

const app = document.querySelector('#app');
let questions = [];
let questionBankLoadPromise = null;
const MAGIC_LINK_THROTTLE_MINUTES = 30;
const MAGIC_LINK_THROTTLE_MS = MAGIC_LINK_THROTTLE_MINUTES * 60 * 1000;
const magicLinkStorageKey = 'oxford-em-coach-magic-link-sends-v1';
const reasoningPrompts = [
  'If university education has both private and public benefits, who should pay for it and why?',
  'A supermarket sells milk below cost. Is this good or bad for consumers?',
  'If a country becomes more productive, can workers still become worse off?',
  'Should a firm always maximise profit in the short run?',
  'What assumptions would you need before deciding whether rent controls help tenants?'
];
const interviewPrompts = [
  'Explain a recent economic news story using incentives, constraints and unintended consequences.',
  'Why might two firms in the same industry choose very different pricing strategies?',
  'Is competition always good for consumers?',
  'How would you decide whether a merger should be allowed?',
  'Tell me about something you read that changed your mind about economics or management.'
];
const state = {
  user: null,
  data: null,
  error: null,
  view: 'dashboard',
  practice: null,
  notice: null,
  reviewAttemptId: null,
  academicTopicFilter: 'all',
  schoolSubject: 'all', schoolStatus: 'all',
  extraBlock: null,
  planMode: 'date', planDate: todayInput(), planSubject: 'Maths',
  planFrom: todayInput().slice(0,7) + '-01', planTo: todayInput(),
  journalMode: 'reading',
  questionBankLoaded: false,
  questionBankLoading: false,
  taraFilters: { year: 'all', family: 'all', type: 'all', topic: 'all', pattern: 'all' }
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
  app.className = 'auth-screen';
  app.innerHTML = `<main class="login"><section class="panel hero"><p class="eyebrow">Connection check</p><h1>The app opened, but Supabase did not respond.</h1><p>${escapeHtml(friendlyError(error))}</p><p class="callout">If your internet is fine, open the Supabase project once and confirm it is not paused. Then refresh this page.</p><button onclick="location.reload()">Refresh</button></section></main>`;
}

function render() {
  if (!state.user) return renderLogin();
  app.className = 'app-shell';
  app.innerHTML = `
    <aside class="sidebar">
      <div>
        <p class="eyebrow">Oxford E&M Coach</p>
        <h1>${state.data?.profile?.target_course || 'Oxford Economics & Management'}</h1>
        <p class="muted">${state.user.email}</p>
      </div>
      <nav>${navigationHtml()}</nav>
      <button class="ghost" data-action="signout">Sign out</button>
    </aside>
    <main class="main">${viewHtml()}</main>`;
}

function renderLogin() {
  app.className = 'auth-screen';
  app.innerHTML = `
    <main class="login">
      <section class="panel hero">
        <p class="eyebrow">Oxford E&M Coach</p>
        <h1>Track the indicators that matter for Oxford E&M.</h1>
        <p>Track homework, assessments, study progress and TARA practice.</p>
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

function navigationHtml() {
  return `
    ${navSection('Start', [['dashboard','Dashboard'], ['programme','Plan Tracker']])}
    ${navSection('Study', [['academics','A-Level Rigour'], ['tara','TARA Assessment']])}
    ${navSection('Analytics', [['readiness','Overall Analytics'], ['analytics','TARA Deep Dive']])}
    ${navSection('Journey', [['milestones','Milestones'], ['interview','Interview'], ['review','Weekly Review']])}
    ${navSection('Account', [['parent','Parent View'], ['profile','Profile']])}`;
}

function navSection(title, items) {
  return `<section class="nav-section"><p>${title}</p><div>${items.map(([view, labelText]) => navButton(view, labelText)).join('')}</div></section>`;
}

function viewHtml() {
  if (state.view === 'programme') return programmeHtml();
  if (state.view === 'tara') return taraHtml();
  if (state.view === 'analytics') return analyticsHtml();
  if (state.view === 'academics') return academicsHtml();

  if (state.view === 'readiness') return readinessHtml();
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
      <div><p class="eyebrow">Oxford E&M Coaching Dashboard</p><h2>What needs attention now?</h2><p class="muted">Track homework, assessments, your study plan and TARA practice.</p></div>
      <button data-view="programme">Open Plan Tracker</button>
    </header>
    <section class="panel focus-card">
      <div>
        <p class="eyebrow">This Week</p>
        <h3>${studyPlanTodayTitle()}</h3>
        <p class="muted">${studyPlanStats().logged}/${studyPlanStats().total} planned study blocks logged this week · ${studyPlanStats().red} red</p>
      </div>
      <div class="bar"><span style="width:${studyPlanStats().loggedPercent}%"></span></div>
      <div class="next-actions">${nextStudyBlocks().slice(0,2).map((block) => `<article><b>${escapeHtml(block.activity)}</b><small>${block.day} · ${block.from}-${block.to}</small></article>`).join('') || '<p class="muted">No remaining study blocks today.</p>'}</div>
    </section>
    ${dashboardSignalsHtml()}
    ${studyRhythmSummaryHtml()}
    <section class="pillar-grid">
      ${pillarCard('A-Level Rigour', 'Homework and assessments', aLevelPillarHtml(), 'academics')}
      ${pillarCard('TARA Assessment', 'Accuracy, coverage and methodology', taraPillarHtml(), 'tara')}

    </section>
    <section class="panel"><h3>School tasks remaining</h3>${schoolTasks().filter(t => (t.status || 'completed') !== 'completed').slice(0,3).map(t => `<p>${escapeHtml(t.subject_name)}: ${escapeHtml(t.assessment_name)}</p>`).join('') || '<p>No outstanding tasks.</p>'}</section>`;
}

function dashboardSignalsHtml() {
  const stats = studyPlanStats();
  const nextMilestone = nextOpenMilestone();
  const latestReview = recentRows(state.data.weeklyReviews || [], 'week_start')[0];
  const improving = latestReview?.biggest_improvement || (stats.green ? `${stats.green} study block${stats.green === 1 ? '' : 's'} marked green this week.` : 'Start with one logged study block this week.');
  return `<section class="signal-grid">
    <article class="panel signal-card"><p class="eyebrow">Slipping</p><h3>${stats.amber + stats.red}</h3><p>${stats.amber} amber · ${stats.red} red</p><small>${stats.red ? 'Review the red blocks and use spillover deliberately.' : 'No red blocks logged this week.'}</small></article>
    <article class="panel signal-card"><p class="eyebrow">Improving</p><h3>Latest signal</h3><p>${escapeHtml(improving)}</p><small>Use Weekly Review to make this more precise.</small></article>
    <article class="panel signal-card"><p class="eyebrow">Next Deadline</p><h3>${nextMilestone ? formatDate(nextMilestone.target_date) : 'Unset'}</h3><p>${nextMilestone ? escapeHtml(nextMilestone.title) : 'Add Oxford and school milestones.'}</p><small>${nextMilestone ? `${daysUntil(nextMilestone.target_date)} days to go` : 'Milestones keep the plan time-aware.'}</small></article>
  </section>`;
}

function pillarCard(title, subtitle, body, view) {
  return `<article class="panel pillar-card"><div><p class="eyebrow">${title}</p><h3>${subtitle}</h3></div><div class="pillar-body">${body}</div><button class="ghost" data-view="${view}" title="Open ${title}">Open</button></article>`;
}

function aLevelPillarHtml() {
  const tasks = schoolTasks();
  return `<p class="metric">${tasks.filter(t => (t.status || 'completed') !== 'completed').length}</p><p>outstanding tasks · ${tasks.filter(t => t.is_marked || t.score != null).length} marked</p>`;
}

function taraPillarHtml() {
  return `<p class="metric">${state.data.tara.overallAccuracy}%</p><p>${state.data.tara.totalQuestions} questions answered · ${coveragePercent()}% bank covered</p><small>${questionBankStatusText()} · weakest skill: ${escapeHtml(state.data.tara.weakestSubtype?.name || 'Not enough data')}</small>`;
}

function supercurricularPillarHtml() {
  const recent = state.data.journal.filter((entry) => daysSince(entry.date_completed || entry.created_at) <= 30);
  const depth = state.data.journal.length ? Math.round(state.data.journal.reduce((sum, entry) => sum + journalDepth(entry), 0) / state.data.journal.length) : 0;
  return `<p class="metric">${recent.length}</p><p>entries in the last 30 days · ${depth}% average depth</p><small>${escapeHtml(state.data.journal[0]?.title || 'Add a reading or thinking entry.')}</small>`;
}

function thinkingPillarHtml() {
  const reasoningScore = state.data.reasoning.length ? reasoningAverage(state.data.reasoning[0]) : 'not scored';
  const openMilestones = state.data.milestones.filter((m) => m.status !== 'completed').length;
  return `<p class="metric">${state.data.reasoning.length}</p><p>reasoning sessions · latest ${reasoningScore}</p><small>${openMilestones} milestone${openMilestones === 1 ? '' : 's'} still open</small>`;
}

function programmeHtml() {
  return `<header class="top"><div><p class="eyebrow">Plan Tracker</p><h2>Progress by subject or date</h2></div></header>${noticeHtml()}<details class="panel"><summary>View standing timetable</summary>${studyRhythmHtml()}</details>${studyPlanProgressHtml()}`;
}

function studyRhythmSummaryHtml() {
  const taraTarget = WEEKLY_TARGETS.find((target) => target.name === 'TARA');
  return `<section class="panel rhythm-summary"><div class="top mini"><div><p class="eyebrow">Personal Study Rhythm</p><h3>${totalWeeklyTargetHours()} hours planned each week</h3></div><button class="ghost" data-view="programme" title="Open the full weekly timetable">View timetable</button></div><div class="target-strip">${WEEKLY_TARGETS.slice(0, 6).map(targetChipHtml).join('')}</div>${taraTarget?.hours === 0 ? '<p class="callout">TARA is currently set to 0 hours in the standing plan. Keep it light for now, but protect at least one short practice block each week.</p>' : ''}</section>`;
}

function studyRhythmHtml() {
  return `<div class="study-rhythm"><h3>Weekday and weekend plan</h3><p class="callout">The supplied weekday plan overlaps study (18:15-19:15) and dinner (19:00-20:00) by 15 minutes. Times are retained as provided.</p>
    <details><summary>Weekdays</summary>${timetableHtml(WEEKDAY_TIMETABLE,['Monday','Tuesday','Wednesday','Thursday','Friday'])}</details>
    <details><summary>Weekends</summary>${timetableHtml(WEEKEND_TIMETABLE,['Saturday','Sunday'])}</details>
    <p>Super Curricular slots currently support Senior Maths Challenge preparation. Choose the activity in each block when the focus changes.</p></div>`;
}

function studyPlanProgressHtml() {
  const activities = [...STUDY_AREAS, 'Spillover'];
  const blocks = selectedPlanBlocks();
  return `<section class="panel"><form data-action="plan-filter" class="form-grid">
    <label>View<select name="mode"><option value="date" ${sel(state.planMode,'date')}>By date</option><option value="subject" ${sel(state.planMode,'subject')}>By subject</option></select></label>
    <label data-plan-date ${state.planMode === 'subject' ? 'hidden' : ''}>Date<input name="date" type="date" value="${state.planDate}" required></label>
    <label data-plan-subject ${state.planMode === 'date' ? 'hidden' : ''}>Subject / activity<select name="subject">${activities.map(a => `<option ${sel(a,state.planSubject)}>${escapeHtml(a)}</option>`).join('')}</select></label>
    <label data-plan-subject ${state.planMode === 'date' ? 'hidden' : ''}>From<input name="from" type="date" value="${state.planFrom}" required></label>
    <label data-plan-subject ${state.planMode === 'date' ? 'hidden' : ''}>To<input name="to" type="date" value="${state.planTo}" required></label><button>Show progress</button>
    </form>${availabilityHtml(state.planMode,state.planDate,state.planSubject)}</section>${extraStudyHtml()}${state.planMode==='subject'?topicHistoryHtml(state.data.studyPlanLogs || [],state.planSubject):''}<section class="panel plan-progress"><h3>${state.planMode === 'date' ? formatLongDate(state.planDate) : escapeHtml(state.planSubject)}</h3><p>${blocks.filter(findStudyPlanLog).length} of ${blocks.length} blocks logged</p>
    <div class="plan-log-list">${blocks.map(studyPlanLogHtml).join('') || '<p>No planned blocks for this selection.</p>'}</div></section>`;
}

function extraStudyHtml() {
  const x=state.extraBlock;
  const alreadyListed=x && selectedPlanBlocks().some(b => b.date===x.date && b.from===x.from && b.to===x.to && b.activity===x.activity);
  return `<details class="panel" ${x?'open':''}><summary>Log extra study</summary><form data-action="extra-block" class="form-grid">
    <label>Date<input name="date" type="date" value="${state.planDate}" required></label>
    <label>Area<select name="area">${STUDY_AREAS.map(a=>`<option ${sel(a,state.planSubject)}>${escapeHtml(a)}</option>`).join('')}</select></label>
    <label>From<input name="from" type="time" required></label><label>To<input name="to" type="time" required></label><button>Open study block</button>
    </form>${x ? alreadyListed ? '<p>This block is already listed below. Edit its existing entry.</p>' : studyPlanLogHtml(x) : ''}</details>`;
}

function selectedPlanBlocks() {
  const from = state.planMode === 'date' ? state.planDate : state.planFrom;
  const to = state.planMode === 'date' ? state.planDate : state.planTo;
  const blocks = [];
  for (let d = new Date(from+'T12:00:00'); dateInput(d) <= to; d.setDate(d.getDate()+1)) {
    const day = d.toLocaleDateString('en-GB',{weekday:'long'});
    for (const row of (['Saturday','Sunday'].includes(day) ? WEEKEND_TIMETABLE : WEEKDAY_TIMETABLE)) {
      if (!row[day] || isRestActivity(row[day]) || (state.planMode === 'subject' && areaFor(row[day]) !== state.planSubject)) continue;
      blocks.push({date:dateInput(d),day,from:row.from,to:row.to,activity:row[day]});
    }
  }
  for (const log of state.data.studyPlanLogs || []) {
    if (log.log_date < from || log.log_date > to || (state.planMode === 'subject' && areaFor(log.planned_activity) !== state.planSubject)) continue;
    if (!blocks.some(b => b.date === log.log_date && b.from === log.start_time.slice(0,5) && b.to === log.end_time.slice(0,5) && b.activity === log.planned_activity)) blocks.push({date:log.log_date,day:log.day_name,from:log.start_time.slice(0,5),to:log.end_time.slice(0,5),activity:log.planned_activity});
  }
  return blocks.sort((a,b) => (a.date+a.from).localeCompare(b.date+b.from));
}

function studyPlanLogHtml(block) {
  const log = findStudyPlanLog(block);
  const rag = log?.rag_status || '';
  return `<form class="study-log ${rag ? `rag-${rag}` : ''}" data-action="save-study-log">
    <input type="hidden" name="log_date" value="${block.date}">
    <input type="hidden" name="day_name" value="${block.day}">
    <input type="hidden" name="start_time" value="${block.from}">
    <input type="hidden" name="end_time" value="${block.to}">
    <input type="hidden" name="planned_activity" value="${escapeAttr(block.activity)}">
    <div class="log-head"><div><b>${escapeHtml(displayActivity(block.activity))}</b><p>${formatLongDate(block.date)} · ${block.from}-${block.to}</p></div><label>RAG<select name="rag_status"><option value="">Unset</option><option value="green" ${sel(rag,'green')}>Green</option><option value="amber" ${sel(rag,'amber')}>Amber</option><option value="red" ${sel(rag,'red')}>Red</option></select></label></div>
    ${richStudyFields(block.activity,log || {},state.data.tara.attempts,customTopicsFor(state.data.studyPlanLogs || [],areaFor(block.activity)))}
    <details class="block-notes"><summary>Block notes / previous entries</summary><label>Learn<textarea name="topics_covered" placeholder="Topics covered">${escapeHtml(log?.topics_covered || '')}</textarea></label>
    <label>Practise<textarea name="topics_practised" placeholder="Questions, exercises or practice done">${escapeHtml(log?.topics_practised || '')}</textarea></label>
    <label>Assess<textarea name="topics_assessed" placeholder="Score, test result, timed attempt or self-check">${escapeHtml(log?.topics_assessed || '')}</textarea></label>
    <label>Reflect<textarea name="reflection" placeholder="What felt secure, what needs another pass?">${escapeHtml(log?.reflection || '')}</textarea></label>
    </details><button>Save progress</button><p class="form-status" aria-live="polite"></p>
  </form>`;
}

function plannedStudyBlocksForWeek() {
  const week = currentWeek();
  const start = new Date(`${week.week_start}T12:00:00`);
  const blocks = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const day = date.toLocaleDateString(undefined, { weekday: 'long' });
    const rows = day === 'Saturday' || day === 'Sunday' ? WEEKEND_TIMETABLE : WEEKDAY_TIMETABLE;
    for (const row of rows) {
      const activity = row[day];
      if (!activity || isRestActivity(activity)) continue;
      blocks.push({ date: dateInput(date), day, from: row.from, to: row.to, activity });
    }
  }
  return blocks;
}

function findStudyPlanLog(block) {
  return (state.data.studyPlanLogs || []).find((log) =>
    log.log_date === block.date &&
    log.start_time.slice(0,5) === block.from &&
    log.end_time.slice(0,5) === block.to &&
    log.planned_activity === block.activity
  );
}

function studyPlanStats() {
  const blocks = plannedStudyBlocksForWeek();
  const logs = blocks.map(findStudyPlanLog).filter(Boolean);
  return {
    total: blocks.length,
    logged: logs.length,
    loggedPercent: percent(logs.length, blocks.length),
    green: logs.filter((log) => log.rag_status === 'green').length,
    amber: logs.filter((log) => log.rag_status === 'amber').length,
    red: logs.filter((log) => log.rag_status === 'red').length
  };
}

function nextStudyBlocks() {
  const today = todayInput();
  return plannedStudyBlocksForWeek().filter((block) => block.date === today && !findStudyPlanLog(block));
}

function studyPlanTodayTitle() {
  const remaining = nextStudyBlocks();
  if (!remaining.length) return 'Today is fully logged';
  return `${remaining.length} study block${remaining.length === 1 ? '' : 's'} to log today`;
}

function isRestActivity(value) {
  return ['break', 'breakfast', 'lunch', 'dinner'].includes(String(value || '').toLowerCase());
}

function legacyProgrammeHtml() {
  const tasks = state.data.tasks || [];
  if (!tasks.length) return '';
  return `<details class="panel legacy-programme"><summary>Older generated tasks</summary><p class="muted">This section is kept only so any previous task history remains visible. New planning should use the fixed plan tracker above.</p><div class="grid">${groupTasks(tasks)}</div></details>`;
}

function targetChipHtml(target) {
  return `<span class="target-chip" title="${escapeAttr(target.pillar)}">${escapeHtml(target.name)} <b>${target.hours}h</b></span>`;
}

function timetableHtml(rows, days) {
  return `<div class="timetable" style="--columns: 0.8fr repeat(${days.length}, minmax(112px, 1fr))"><div class="time-head">Time</div>${days.map((day) => `<div class="day-head">${day}</div>`).join('')}${rows.map((row) => `<div class="time-cell">${row.from}-${row.to}</div>${days.map((day) => `<div class="activity-cell ${activityClass(row[day])}"><span class="mobile-day">${day}</span>${escapeHtml(displayActivity(row[day] || ''))}</div>`).join('')}`).join('')}</div>`;
}

function activityClass(value) {
  const text = String(value || '').toLowerCase();
  if (['break', 'breakfast', 'lunch', 'dinner'].includes(text)) return 'rest';
  if (text.includes('math')) return 'maths';
  if (text.includes('economics')) return 'economics';
  if (text.includes('physics')) return 'physics';
  if (text.includes('history')) return 'history';
  if (text.includes('epq') || text.includes('book') || text.includes('smc')) return 'super';
  if (text.includes('spillover')) return 'spillover';
  return '';
}

function aLevelTopicPlanHtml() {
  const topics = getAlevelTopicPlan(state.data);
  return `<section class="panel topic-plan"><div class="top mini"><div><p class="eyebrow">A-Level Topics To Master</p><h3>This week's academic focus</h3></div><span class="pill high">${topics.length} topics</span></div><div class="topic-list">${topics.map((item) => `<article><b>${escapeHtml(item.subject)}</b><p>${escapeHtml(item.topic)}</p><small>${escapeHtml(item.reason)}</small></article>`).join('')}</div></section>`;
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
  if (!state.practice) return `<header class="top"><div><p class="eyebrow">TARA Assessment Practice</p><h2>5-question methodology set</h2><p class="muted">TARA/TSA-style practice is one of the four weekly indicators, alongside A-levels, super-curricular depth and reading/thinking readiness.</p></div><div class="actions"><button data-action="start-smart" title="Prioritise unseen questions, then weak questions">${state.questionBankLoading ? 'Loading question bank...' : 'Smart coverage set'}</button><button class="ghost" data-action="start-tara" title="Start a filtered practice set using the filters below">${state.questionBankLoading ? 'Loading...' : 'Start filtered set'}</button></div></header>${noticeHtml()}${taraFilterHtml()}<section class="grid">${card('Question bank coverage', `${coveragePercent()}%`, `${answeredQuestionKeys().size}/${questionBankManifest.totalQuestions} questions seen at least once`)}${card('Question bank', questionBankStatusText(), state.questionBankLoaded ? `${filteredQuestions().length} questions match current filters` : 'The full question bank loads only when TARA practice starts, making login and dashboard faster.')}</section><section class="panel"><h3>How smart coverage works</h3><p class="muted">Smart coverage chooses unseen questions first, then questions from weak types and patterns, then mastered questions only when needed.</p></section>`;
  if (state.practice.report) return reportHtml();
  const q = state.practice.set[state.practice.index];
  const selected = state.practice.answers[q.id];
  return `<section class="panel question"><p class="eyebrow">${q.paper_year} Q${q.question_number} · ${q.type} · ${q.sub_type}</p>${questionMetaHtml(q)}<h2>${highlight(q.question_text, q.relevant_question_highlights)}</h2>${visualHtml(q)}${Object.entries(q.answer_options).map(([k,v])=>`<button class="option ${optionClass(q, k, selected)}" data-answer="${k}"><b>${k}</b> ${v}</button>`).join('')}${instantFeedbackHtml(q, selected)}<div class="actions"><button class="ghost" data-action="prev-question">Previous</button><button class="ghost" data-action="next-question">Next</button><button data-action="submit-tara">Submit set</button></div></section>`;
}

function questionMetaHtml(q) {
  return `<div class="meta-strip"><span>${escapeHtml(q.topic_tag || 'No topic tag')}</span><span>${q.time_budget_seconds || 90}s target pace</span>${q.requires_spatial_processing ? '<span>Spatial processing</span>' : ''}</div>`;
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
  if (isNumericalQuestion(q)) {
    return numericalInstantFeedbackHtml(q, correct);
  }
  return `<aside class="instant-feedback ${correct ? 'correct' : 'incorrect'}"><h3>${correct ? 'Correct' : 'Not quite'} · Official answer ${q.correct_answer}</h3><p><b>Method trigger:</b> ${triggerFor(q)}</p><p><b>How to approach it:</b> ${methodologyFor(q.sub_type).slice(0, 3).join(' ')}</p><p><b>Common trap:</b> ${trapFor(q)}</p><p><b>Carry forward:</b> ${carryForwardFor(q)}</p></aside>`;
}

function numericalInstantFeedbackHtml(q, correct) {
  return `<aside class="instant-feedback ${correct ? 'correct' : 'incorrect'}">
    <h3>${correct ? 'Correct' : 'Not quite'} · Official answer ${q.correct_answer}</h3>
    <p><b>Target:</b> ${escapeHtml(finalQuestion(q.question_text))}</p>
    <p><b>Technique:</b> ${escapeHtml(numericalTechniqueName(q))}</p>
    <p><b>Next move:</b> ${escapeHtml(numericalCalculationSteps(q)[0])}</p>
    <p><b>Trap:</b> ${escapeHtml(trapFor(q))}</p>
  </aside>`;
}

function reportHtml() {
  const { set, answers } = state.practice;
  const score = set.filter((q)=>answers[q.id]===q.correct_answer).length;
  return `<header class="top"><div><p class="eyebrow">Coaching report</p><h2>Score ${score}/${set.length}</h2></div><button data-action="start-tara">New set</button></header>${set.map((q) => coachingHtml(q, answers[q.id])).join('')}`;
}

function coachingHtml(q, selected) {
  if (isNumericalQuestion(q)) return numericalCoachingHtml(q, selected);
  const correct = selected === q.correct_answer;
  return `<article class="panel coaching"><p class="eyebrow">Question ${q.question_number} · ${q.type} · ${q.sub_type}</p><h3>${correct ? 'Correct' : 'Incorrect'} · Your answer ${selected || 'blank'} · Official answer ${q.correct_answer}</h3>${questionMetaHtml(q)}<h4>A. Standard methodology</h4><ol>${methodologyFor(q.sub_type).map((m)=>`<li>${m}</li>`).join('')}</ol><h4>B. Full original question</h4><p>${highlight(q.question_text, q.relevant_question_highlights)}</p>${visualHtml(q)}<h4>C. Highlight decisive wording</h4><p>${q.relevant_question_highlights.map((h)=>`<mark>${h}</mark>`).join(' ') || '<span class="muted">No extracted highlight yet. Use the question stem and numerical constraints as the first clues.</span>'}</p><h4>D. What the wording should trigger</h4><p>${triggerFor(q)}</p><h4>E. Apply the method</h4><p>${coachingExplanation(q)}</p><h4>F. Trap to avoid</h4><p>${trapFor(q)}</p>${distractorAnalysisHtml(q)}<h4>G. Method to carry forward</h4><p>${carryForwardFor(q)}</p></article>`;
}

function numericalCoachingHtml(q, selected) {
  const correct = selected === q.correct_answer;
  return `<article class="panel coaching worked-solution">
    <p class="eyebrow">Question ${q.question_number} · ${q.type} · ${q.sub_type}</p>
    <h3>${correct ? 'Correct' : 'Incorrect'} · Your answer ${selected || 'blank'} · Official answer ${q.correct_answer}</h3>
    ${questionMetaHtml(q)}
    <h4>A. Standard Numerical Method</h4>
    <div class="method-card"><p><b>${escapeHtml(numericalTechniqueName(q))}</b></p><ol>${numericalMethodSteps(q).map((m)=>`<li>${escapeHtml(m)}</li>`).join('')}</ol></div>
    <h4>B. Full Original Question</h4>
    <p>${highlight(q.question_text, q.relevant_question_highlights)}</p>
    ${visualHtml(q)}
    <h4>C. Set Up the Problem</h4>
    <div class="solution-grid">
      <article><b>Target quantity</b><p>${escapeHtml(finalQuestion(q.question_text))}</p></article>
      <article><b>Known information</b>${factListHtml(numericalFacts(q))}</article>
      <article><b>Constraints to obey</b>${factListHtml(numericalConstraints(q))}</article>
      <article><b>Relevant visual/data source</b><p>${q.has_image ? 'Use the chart, table, diagram or timetable before calculating. Match labels and units carefully.' : 'The needed data is in the written stem and answer options.'}</p></article>
    </div>
    <h4>D. Calculation Path</h4>
    <ol class="calculation-steps">${numericalCalculationSteps(q).map((step)=>`<li>${escapeHtml(step)}</li>`).join('')}</ol>
    <div class="answer-box"><b>Official answer: ${q.correct_answer}</b><p>${escapeHtml(q.answer_options?.[q.correct_answer] || '')}</p></div>
    <h4>E. Option & Trap Check</h4>
    <p>${escapeHtml(trapFor(q))}</p>
    ${distractorAnalysisHtml(q)}
    <h4>F. Technique To Carry Forward</h4>
    <p>${escapeHtml(carryForwardFor(q))}</p>
  </article>`;
}

function distractorAnalysisHtml(q) {
  const rows = Object.entries(q.distractor_analysis || {});
  if (!rows.length) return '';
  return `<h4>Option-by-option distractor check</h4><div class="distractor-list">${rows.map(([option, reason]) => `<article><b>${option.replace('option_', '')}</b><p>${escapeHtml(reason)}</p></article>`).join('')}</div>`;
}

function isNumericalQuestion(q) {
  return q.type === 'Numerical Reasoning & Problem-Solving' || q.broad_type === 'Numerical Reasoning & Problem-Solving';
}

function numericalTechniqueName(q) {
  if (q.topic_tag?.includes('Cost') || q.topic_tag?.includes('Optimization') || q.topic_tag?.includes('Combinatorics')) return 'Bundle, constraint and minimum-cost comparison';
  if (q.topic_tag?.includes('Schedule') || q.topic_tag?.includes('Timetable')) return 'Timeline, interval and earliest/latest comparison';
  if (q.topic_tag?.includes('Rate') || q.topic_tag?.includes('Ratio') || q.topic_tag?.includes('Arithmetic')) return 'Rate, ratio and multi-step arithmetic setup';
  if (q.topic_tag?.includes('Data') || q.topic_tag?.includes('Table')) return 'Targeted data extraction before calculation';
  if (q.requires_spatial_processing || q.topic_tag?.includes('Spatial') || q.topic_tag?.includes('Net') || q.topic_tag?.includes('Pattern')) return 'Constraint tracking for spatial or pattern logic';
  if (q.sub_type === 'Relevant Selection') return 'Targeted data extraction before calculation';
  if (q.sub_type === 'Spatial Reasoning & Pattern Analysis') return 'Constraint tracking for spatial or pattern logic';
  return 'Choose the procedure before doing arithmetic';
}

function numericalMethodSteps(q) {
  const common = [
    'Read the final question first and write the exact quantity required.',
    'List the relevant values with units, separating them from distracting numbers.',
    'Write each condition as a constraint before calculating.',
    'Choose the procedure: equation, table extraction, bundle comparison, timeline, rate, ratio or case test.',
    'Calculate in labelled steps, then compare against the answer options.',
    'Check the chosen option obeys every condition, not just the arithmetic.'
  ];
  if (q.topic_tag?.includes('Cost') || q.topic_tag?.includes('Optimization') || q.topic_tag?.includes('Combinatorics')) {
    return [
      'Convert the people/items into categories first.',
      'List each ticket/package/choice and exactly what it covers.',
      'Check eligibility constraints before comparing prices.',
      'Test the largest valid bundles or most restrictive packages first.',
      'Calculate total cost for plausible combinations.',
      'Choose the cheapest valid combination, not the cheapest-looking single ticket.'
    ];
  }
  if (q.topic_tag?.includes('Schedule') || q.topic_tag?.includes('Timetable')) {
    return [
      'Convert the target journey or schedule into a start point and end point.',
      'Include walking, waiting, transfer or return-time constraints.',
      'Find the earliest/latest feasible times from the timetable.',
      'Calculate durations on one consistent timeline.',
      'Compare maximum and minimum feasible durations if asked.',
      'Check that every chosen time lies inside the allowed window.'
    ];
  }
  if (q.requires_spatial_processing || q.sub_type === 'Spatial Reasoning & Pattern Analysis') {
    return [
      'Turn the visual into explicit positions, adjacencies, movements or repeating states.',
      'Mark impossible cases first, such as faces that cannot touch or routes that cannot occur.',
      'Track one change at a time rather than relying on visual similarity.',
      'Use elimination against each option.',
      'Re-check orientation, order and labels before choosing.'
    ];
  }
  return common;
}

function numericalCalculationSteps(q) {
  if (q.topic_tag?.includes('Cost') || q.topic_tag?.includes('Optimization') || q.topic_tag?.includes('Combinatorics')) {
    return [
      'Create category counts, for example adults, children, items, groups or time blocks.',
      'Write a small table of available packages: what each package covers, its price and any eligibility rule.',
      'Test valid package combinations. Reject any combination that breaks a constraint even if the price looks low.',
      'Calculate the total for each remaining plausible combination.',
      `Select option ${q.correct_answer} because it is the official valid minimum/maximum after the constraints are applied.`
    ];
  }
  if (q.topic_tag?.includes('Schedule') || q.topic_tag?.includes('Timetable')) {
    return [
      'Mark the fixed start and finish limits.',
      'Add any access time such as walking or transfer time before reading the timetable.',
      'Find the earliest feasible outward journey and latest feasible return journey.',
      'For minimum/maximum questions, calculate both extremes in minutes.',
      `Compare the resulting difference with the answer options and choose ${q.correct_answer}.`
    ];
  }
  if (q.topic_tag?.includes('Data') || q.topic_tag?.includes('Table') || q.sub_type === 'Relevant Selection') {
    return [
      'Circle the final target quantity.',
      'Extract only the rows, columns, labels or chart values needed for that target.',
      'Write the calculation with units beside every number.',
      'Ignore unused data even if it appears in the same table or diagram.',
      `Match the final value to option ${q.correct_answer}.`
    ];
  }
  if (q.requires_spatial_processing || q.sub_type === 'Spatial Reasoning & Pattern Analysis') {
    return [
      'Label the starting position or arrangement.',
      'Apply each movement, fold, rotation or pattern rule in order.',
      'Use impossible adjacencies or impossible positions to remove wrong options.',
      'Check the final orientation or repeated state.',
      `Choose option ${q.correct_answer} after all spatial/pattern constraints are satisfied.`
    ];
  }
  return [
    'Translate the words into variables, quantities and units.',
    'Choose the mathematical operation before calculating.',
    'Carry out the arithmetic in short labelled lines.',
    'Check the answer against constraints and units.',
    `Choose option ${q.correct_answer} if it is the only value satisfying the setup.`
  ];
}

function numericalFacts(q) {
  const sentences = splitQuestionSentences(q.question_text);
  const facts = sentences.filter((sentence) => /(\d|[$£€%]|minute|hour|metre|km|mile|litre|kg|year|people|ticket|price|cost)/i.test(sentence));
  return facts.slice(0, 6);
}

function numericalConstraints(q) {
  const highlighted = q.relevant_question_highlights || [];
  const sentences = splitQuestionSentences(q.question_text);
  const constraints = sentences.filter((sentence) => /(must|least|at least|at most|up to|under|over|maximum|minimum|cheapest|least amount|total|each|every|including|only|exactly|between|difference)/i.test(sentence));
  return [...new Set([...highlighted, ...constraints])].slice(0, 6);
}

function splitQuestionSentences(text) {
  return (String(text || '').replace(/\s+/g, ' ').match(/[^.?]+[.?]?/g) || [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function finalQuestion(text) {
  const sentences = splitQuestionSentences(text);
  return [...sentences].reverse().find((sentence) => sentence.includes('?')) || sentences[sentences.length - 1] || 'Identify the exact quantity requested by the question.';
}

function factListHtml(items) {
  if (!items.length) return '<p class="muted">No clean extraction yet. Read the stem and write the relevant values manually before calculating.</p>';
  return `<ul>${items.map((item)=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
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
    'Relevant Selection': 'The trap is calculating with distraction data instead of first identifying the exact values and constraints needed.',
    'Finding Procedures': 'The trap is trying arithmetic immediately before choosing the right strategy or setting up the hidden constraint.',
    'Spatial Reasoning & Pattern Analysis': 'The trap is relying on visual similarity instead of tracking position, timing, adjacency or pattern rules.'
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
  return `<header class="top"><div><p class="eyebrow">TARA Assessment Analytics</p><h2>${t.overallAccuracy}% overall accuracy</h2><p class="muted">This page is the detailed admissions-test view. Use Overall Analytics for the full Oxford E&M preparation picture.</p></div><button data-action="start-recommended-tara">Practise recommended area</button></header>${taraRecommendationHtml(t)}<section class="grid">${card('Total attempts', t.totalAttempts, `${t.totalQuestions} questions answered`)}${card('Average set score', t.averageSetScore, 'Mini-sets are not official scaled scores.')}${card('Critical Thinking', `${t.criticalAccuracy}%`, '')}${card('Numerical Reasoning', `${t.problemAccuracy}%`, '')}</section><section class="panel"><h3>Accuracy trend</h3>${trend(t.recentTrend)}</section><section class="grid"><section class="panel"><h3>By type</h3>${bars(t.byType)}</section><section class="panel"><h3>By sub-type</h3>${bars(t.byPattern)}</section></section><section class="panel"><h3>Repeat mistake signals</h3>${repeatMistakesHtml(t)}</section><section class="panel"><h3>Historical test sessions</h3>${sessionHistoryHtml()}</section>${state.reviewAttemptId ? reviewAttemptHtml(state.reviewAttemptId) : ''}`;
}

function taraRecommendationHtml(t) {
  if (!t.totalQuestions) return `<section class="panel"><h3>What to practise next</h3><p class="muted">Complete one set first. The app will then recommend practice from the weakest type or sub-type.</p></section>`;
  const weak = t.weakestSubtype || t.weakestType;
  const reason = weak?.total ? `${weak.name} is currently ${weak.accuracy}% across ${weak.total} question${weak.total === 1 ? '' : 's'}.` : 'There is not enough detail yet, so use smart coverage to keep seeing unseen questions.';
  const missed = missedQuestionPool().length;
  return `<section class="panel recommendation"><div class="top mini"><div><h3>What to practise next</h3><p>${escapeHtml(reason)}</p></div><span class="pill high">${weak?.accuracy ?? t.overallAccuracy}%</span></div><p class="callout">Recommended action: ${weak?.name ? `start a focused 5-question set for ${escapeHtml(weak.name)}, then review every trap and carry-forward method.` : 'start a smart coverage set.'}</p>${missed ? `<button class="ghost" data-action="start-retry-tara" title="Practise questions previously answered incorrectly">Retry ${missed} missed question${missed === 1 ? '' : 's'}</button>` : ''}</section>`;
}

function repeatMistakesHtml(t) {
  if (!t.repeatErrors?.length) return '<p class="muted">No repeated mistake pattern yet. This will populate after incorrect responses are recorded.</p>';
  return `<div class="topic-list">${t.repeatErrors.map((row) => `<article><b>${escapeHtml(row.name)}</b><p>${row.total} incorrect response${row.total === 1 ? '' : 's'}</p><small>Use the coaching report to classify why the mistake happened.</small></article>`).join('')}</div>`;
}

function academicsHtml() {
  const tasks = schoolTasks().filter(t => (state.schoolSubject === 'all' || t.subject_id === state.schoolSubject) && (state.schoolStatus === 'all' || (t.status || 'completed') === state.schoolStatus));
  return `<header class="top"><div><p class="eyebrow">A-Level Rigour</p><h2>Homework & assessments</h2></div></header>
    <section class="panel"><form data-action="school-filter" class="form-grid"><label>Subject<select name="subject"><option value="all">All subjects</option>${state.data.subjects.map(s => `<option value="${s.id}" ${sel(s.id,state.schoolSubject)}>${escapeHtml(s.name)}</option>`).join('')}</select></label>
    <label>Status<select name="status">${['all','not_started','in_progress','completed'].map(s => `<option value="${s}" ${sel(s,state.schoolStatus)}>${label(s)}</option>`).join('')}</select></label><button>Filter tasks</button></form></section>
    <details class="panel"><summary>Add homework or assessment</summary>${schoolTaskForm()}</details>
    ${state.data.subjects.filter(s => state.schoolSubject === 'all' || s.id === state.schoolSubject).map(s => `<section class="school-subject"><h3>${escapeHtml(s.name)}</h3>${tasks.filter(t => t.subject_id === s.id).map(t => `<details class="panel"><summary>${escapeHtml(t.assessment_name)} · ${label(t.assessment_type || 'assessment')} · ${label(t.status || 'completed')}${t.score != null ? ` · ${t.score}/${t.max_score}` : t.is_marked ? ' · Marked' : ''}</summary>${schoolTaskForm(t)}</details>`).join('') || '<p class="muted">No tasks match this selection.</p>'}</section>`).join('')}`;
}

function schoolTasks() {
  return state.data.subjects.flatMap(s => (s.academic_results || []).map(t => ({...t,subject_name:s.name})));
}

function schoolTaskForm(task = {}) {
  const input = (name,caption,type='text') => `<label>${caption}<input name="${name}" type="${type}" value="${escapeAttr(task[name] ?? '')}" ${['score','max_score'].includes(name) ? 'min="0" step="any"' : ''}></label>`;
  return `<form data-action="save-school-task" class="school-task-form">
    <input type="hidden" name="task_id" value="${task.id || ''}"><div class="form-grid">
    <label>Subject<select name="subject_id" required>${state.data.subjects.map(s => `<option value="${s.id}" ${sel(s.id,task.subject_id || state.schoolSubject)}>${escapeHtml(s.name)}</option>`).join('')}</select></label>
    <label>Task type<select name="assessment_type"><option value="homework" ${sel(task.assessment_type,'homework')}>Homework</option><option value="assessment" ${task.assessment_type !== 'homework' ? 'selected' : ''}>Assessment</option></select></label>
    <label>Title<input name="assessment_name" value="${escapeAttr(task.assessment_name || '')}" required maxlength="250"></label>
    <label>Status<select name="status">${['not_started','in_progress','completed'].map(s => `<option value="${s}" ${sel(s,task.status || (task.id ? 'completed' : 'not_started'))}>${label(s)}</option>`).join('')}</select></label>
    ${input('due_date','Due date','date')}${input('assessment_date','Date completed / assessed','date')}</div>
    <label>Task details<textarea name="description">${escapeHtml(task.description || '')}</textarea></label>
    <label>Document (PDF, photo or Word; up to 10 MB)<input type="file" name="attachment" accept=".pdf,.jpg,.jpeg,.png,.docx"></label>
    ${task.attachment_path ? `<button type="button" class="ghost" data-school-file="${task.id}">Open ${escapeHtml(task.attachment_name || 'document')}</button>` : ''}
    <h4>Marks and feedback</h4><label><input name="is_marked" type="checkbox" ${task.is_marked || task.score != null ? 'checked' : ''}> Marked by teacher</label>
    <div class="form-grid">${input('score','Score','number')}${input('max_score','Total marks','number')}${input('grade','Grade (optional)')}</div>
    <label>Teacher feedback<textarea name="teacher_feedback">${escapeHtml(task.teacher_feedback || '')}</textarea></label>
    <label>Areas for improvement / next steps<textarea name="self_reflection">${escapeHtml(task.self_reflection || '')}</textarea></label>
    <button>Save task</button><p class="form-status" aria-live="polite"></p></form>`;
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
  return `<header class="top"><div><p class="eyebrow">Super-Curricular & Competitions</p><h2>Build genuine E&M depth</h2><p class="muted">Track readings, lectures, essays and competitions, then convert them into claim, mechanism, evidence, objection and response.</p></div></header><section class="panel compact-panel"><div class="segmented">${['reading','thinking'].map((mode) => `<button class="${state.journalMode === mode ? 'active' : ''}" data-journal-mode="${mode}" title="Open ${mode === 'reading' ? 'reading list tracker' : 'thinking journal'}">${mode === 'reading' ? 'Reading Pipeline' : 'Thinking Notes'}</button>`).join('')}</div></section>${state.journalMode === 'reading' ? readingListHtml() : thinkingJournalHtml()}`;
}

function readingListHtml() {
  const items = state.data.journal;
  const statuses = ['planned','reading','completed'];
  return `<section class="grid six">${statuses.map((status) => card(label(status), readingItems(status).length, statusHint(status))).join('')}</section><section class="panel"><h3>Add reading item</h3><form data-action="add-journal" class="form-grid"><input name="title" placeholder="Title" required><input name="author" placeholder="Author / speaker"><input name="source" placeholder="Book, article, lecture, podcast"><input name="url" type="url" placeholder="Link"><label>Type<select name="entry_type">${journalTypeOptions('article')}</select></label><label>Status<select name="reading_status"><option value="planned">Planned</option><option value="reading">Currently reading</option><option value="completed">Completed</option></select></label><input name="topic_tags" placeholder="Economics, Strategy, Public Policy"><textarea class="span-all" name="reflection" placeholder="Why this belongs on the E&M list"></textarea><button>Add to reading list</button></form></section><section class="grid">${items.length ? statuses.map(readingColumnHtml).join('') : '<section class="panel"><p class="muted">Add readings, lectures, podcasts or reports to start building a proper E&M reading pipeline.</p></section>'}</section>`;
}

function thinkingJournalHtml() {
  return `<section class="panel framework"><h3>CLAIM · MECHANISM · EVIDENCE · OBJECTION · RESPONSE</h3><p class="muted">A strong entry should explain not only what the source says, but how the mechanism works, what evidence supports it, and what could be wrong.</p></section><section class="panel"><form data-action="add-journal" class="stack"><input name="title" placeholder="Title" required><div class="form-grid"><input name="source" placeholder="Source"><input name="author" placeholder="Author"><input name="url" type="url" placeholder="Link"><label>Type<select name="entry_type">${journalTypeOptions('article')}</select></label><input name="date_completed" type="date" value="${todayInput()}"><input name="topic_tags" placeholder="Economics, Strategy, Public Policy"></div><textarea name="main_claim" placeholder="Main claim"></textarea><textarea name="mechanism" placeholder="Mechanism"></textarea><textarea name="evidence" placeholder="Evidence"></textarea><textarea name="assumptions" placeholder="Assumptions"></textarea><textarea name="counterargument" placeholder="Counterargument"></textarea><textarea name="response" placeholder="Response"></textarea><textarea name="what_changed_my_mind" placeholder="What changed my mind"></textarea><textarea name="how_it_links_to_economics" placeholder="How it links to Economics"></textarea><textarea name="how_it_links_to_management" placeholder="How it links to Management"></textarea><textarea name="interview_relevance" placeholder="Interview relevance"></textarea><textarea name="application_relevance" placeholder="Application relevance"></textarea><textarea name="reflection" placeholder="Reflection"></textarea><input type="hidden" name="reading_status" value="completed"><button>Save thinking entry</button></form></section><section class="grid">${state.data.journal.map(journalCardHtml).join('') || '<section class="panel"><p class="muted">No journal entries yet.</p></section>'}</section>`;
}

function readingColumnHtml(status) {
  const items = readingItems(status);
  return `<section class="panel"><h3>${label(status)}</h3>${items.map(readingItemHtml).join('') || '<p class="muted">No items here yet.</p>'}</section>`;
}

function readingItemHtml(item) {
  return `<article class="reading-item"><b>${escapeHtml(item.title)}</b><p>${escapeHtml(item.author || item.source || item.entry_type || 'Source not set')}</p><small>${journalTags(item).filter((tag) => !tag.startsWith('status:')).slice(0, 4).map(escapeHtml).join(' · ') || 'No topic tags yet'}</small>${item.url ? `<a href="${escapeAttr(item.url)}" target="_blank" rel="noreferrer">Open source</a>` : ''}</article>`;
}

function journalCardHtml(item) {
  const depth = journalDepth(item);
  return `<article class="panel card"><div class="top mini"><div><h3>${escapeHtml(item.title)}</h3><p class="muted">${escapeHtml(item.source || item.entry_type || 'Journal entry')}</p></div><span class="pill ${depth >= 70 ? 'success' : depth >= 40 ? 'medium' : 'low'}">${depth}% depth</span></div><p>${escapeHtml(item.main_claim || item.reflection || 'No claim recorded yet.')}</p><div class="mini-checks">${['main_claim','mechanism','evidence','counterargument','response'].map((field) => `<span class="${item[field] ? 'done' : ''}">${field.replaceAll('_',' ')}</span>`).join('')}</div></article>`;
}

function readingItems(status) {
  return state.data.journal.filter((item) => readingStatus(item) === status);
}

function readingStatus(item) {
  const statusTag = journalTags(item).find((tag) => tag.startsWith('status:'));
  if (statusTag) return statusTag.replace('status:', '');
  return item.date_completed ? 'completed' : 'planned';
}

function journalTags(item) {
  if (Array.isArray(item.topic_tags)) return item.topic_tags;
  return String(item.topic_tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);
}

function journalDepth(item) {
  const fields = ['main_claim','mechanism','evidence','assumptions','counterargument','response','how_it_links_to_economics','how_it_links_to_management','reflection'];
  return Math.round((fields.filter((field) => String(item[field] || '').trim()).length / fields.length) * 100);
}

function statusHint(status) {
  const hints = {
    planned: 'Ideas to read, watch or listen to next.',
    reading: 'Items currently in progress.',
    completed: 'Completed items ready for deeper reflection.'
  };
  return hints[status];
}

function journalTypeOptions(selected) {
  return ['book','article','lecture','podcast','essay','competition','research_project','debate','dataset','other'].map((type) => `<option value="${type}" ${sel(selected,type)}>${label(type)}</option>`).join('');
}

function reasoningHtml() {
  return `<header class="top"><div><p class="eyebrow">Reading / Thinking / Interview Readiness</p><h2>Practise thinking aloud</h2><p class="muted">The goal is not a perfect answer. It is to state assumptions, reason clearly, respond to hints and revise.</p></div></header>${promptBankHtml('Reasoning prompt bank', reasoningPrompts, 'reasoning-prompt')}<section class="panel"><form data-action="add-reasoning" class="stack reasoning-form"><textarea name="prompt" data-prompt-target="reasoning" placeholder="Unfamiliar prompt" required></textarea><textarea name="assumptions" placeholder="Assumptions I am making"></textarea><textarea name="initial_answer" placeholder="Initial answer"></textarea><textarea name="reasoning_steps" placeholder="Reasoning steps"></textarea><textarea name="hint_given" placeholder="Hint or challenge given"></textarea><textarea name="revised_answer" placeholder="Revised answer after hint"></textarea><textarea name="coach_feedback" placeholder="Coach feedback"></textarea><div class="score-grid">${scoreInput('score_reasoning','Logical reasoning')}${scoreInput('score_assumptions','Use of assumptions')}${scoreInput('score_adaptability','Adaptability')}${scoreInput('score_clarity','Clarity')}</div><textarea name="reflection" placeholder="Reflection: what changed and what should I practise next?"></textarea><button>Save reasoning session</button></form></section><section class="panel"><h3>Reasoning history</h3>${reasoningHistoryHtml()}</section>`;
}

function reasoningHistoryHtml() {
  const rows = recentRows(state.data.reasoning || [], 'date');
  if (!rows.length) return '<p class="muted">No reasoning sessions yet.</p>';
  return `<div class="session-list">${rows.slice(0, 8).map((item) => `<article class="session-row"><div><b>${escapeHtml(item.prompt || 'Reasoning session')}</b><p>${formatDate(item.date || item.created_at)} · ${reasoningAverage(item)} avg score</p><small>${escapeHtml(item.reflection || item.coach_feedback || item.revised_answer || 'No reflection recorded yet.')}</small></div></article>`).join('')}</div>`;
}

function readinessHtml() {
  const tasks = schoolTasks();
  const scored = tasks.filter(t => t.score != null && t.max_score > 0);
  return `<header class="top"><div><p class="eyebrow">Analytics</p><h2>School work and TARA progress</h2></div></header>
  <section class="grid">${card('School tasks',tasks.length,'Homework and assessments')}${card('Completed',tasks.filter(t => (t.status || 'completed') === 'completed').length,'Recorded as completed')}${card('Marked',tasks.filter(t => t.is_marked || t.score != null).length,'Teacher marks recorded')}</section>
  <section class="panel"><h3>Results by subject</h3>${state.data.subjects.map(s => {
    const rows = scored.filter(t => t.subject_id === s.id);
    return `<p><b>${escapeHtml(s.name)}</b> · ${rows.length ? Math.round(rows.reduce((sum,t) => sum+t.score/t.max_score*100,0)/rows.length)+'% average across '+rows.length+' scored tasks' : 'No scores yet'}</p>`;
  }).join('')}</section>
  <section class="panel"><h3>Areas for improvement</h3>${tasks.filter(t => t.self_reflection).map(t => `<p><b>${escapeHtml(t.subject_name)}: ${escapeHtml(t.assessment_name)}</b><br>${escapeHtml(t.self_reflection)}</p>`).join('') || '<p>No improvement notes recorded.</p>'}</section>
  <section class="panel"><h3>TARA</h3>${taraPillarHtml()}<button data-view="analytics">Review TARA analytics</button></section>`;
}

function overallAnalyticsSummaryHtml() {
  const stats = studyPlanStats();
  return `<section class="grid six">${card('Plan logging', `${stats.loggedPercent}%`, `${stats.logged}/${stats.total} standing timetable blocks captured`)}${card('RAG health', `${stats.green}/${stats.amber}/${stats.red}`, 'green / amber / red this week')}${card('Growth focus', '', state.data.recommendations.slice(0, 2).join('<br>') || 'Complete more activity to generate growth focus.')}${card('Historical signal', `${state.data.weeklyReviews.length}`, 'weekly review records saved')}</section>`;
}

function pillarAnalyticsHtml() {
  const rows = pillarLogRows();
  return `<section class="panel"><div class="top mini"><div><p class="eyebrow">Four-Pillar Evidence</p><h3>Standing plan completion evidence</h3></div><span class="pill medium">RAG tracked</span></div><div class="pillar-analytics">${rows.map((row) => `<article><div><b>${row.name}</b><small>${row.logged}/${row.total} logged · ${row.green} green · ${row.red} red</small></div><div class="bar"><span style="width:${row.percent}%"></span></div></article>`).join('')}</div></section>`;
}

function pillarLogRows() {
  const buckets = [
    { key: 'a_level', name: 'A-Level Rigour' },
    { key: 'tara', name: 'TARA Assessment' },
    { key: 'supercurricular', name: 'Super-Curricular' },
    { key: 'thinking', name: 'Reading / Thinking' }
  ];
  const blocks = plannedStudyBlocksForWeek();
  return buckets.map((bucket) => {
    const rows = blocks.filter((block) => pillarForActivity(block.activity) === bucket.key);
    const logs = rows.map(findStudyPlanLog).filter(Boolean);
    return {
      ...bucket,
      total: rows.length,
      logged: logs.length,
      green: logs.filter((log) => log.rag_status === 'green').length,
      red: logs.filter((log) => log.rag_status === 'red').length,
      percent: percent(logs.length, rows.length)
    };
  });
}

function pillarForActivity(activity) {
  const text = String(activity || '').toLowerCase();
  if (text.includes('tara')) return 'tara';
  if (text.includes('epq') || text.includes('smc')) return 'supercurricular';
  if (text.includes('book') || text.includes('spillover')) return 'thinking';
  return 'a_level';
}

function readinessCardHtml(name, value) {
  const advice = readinessAdvice(name, value);
  return `<article class="panel readiness-card"><div class="top mini"><div><h3>${escapeHtml(name)}</h3><p class="muted">${escapeHtml(advice.summary)}</p></div><span class="pill ${readinessClass(value.label)}">${escapeHtml(value.label)}</span></div><div class="readiness-meter"><span style="width:${Math.max(4, value.score || 0)}%"></span></div><p class="why"><b>Move this up:</b> ${escapeHtml(advice.next)}</p><small class="muted">${escapeHtml(advice.formula)}</small></article>`;
}

function readinessAdvice(name, value) {
  const map = {
    'Academic Strength': {
      summary: 'A-Level grades, recent assessment percentages and weak topic load.',
      next: 'Record recent assessments, then move weak/developing topics into weekly tasks until predicted grades and latest results are secure.',
      formula: 'Currently based on latest recorded assessment percentage across subjects.'
    },
    'TARA Assessment Readiness': {
      summary: 'TARA/TSA-style accuracy, consistency and weakness repair.',
      next: state.data.tara.weakestSubtype ? `Practise ${state.data.tara.weakestSubtype.name} and retry missed questions until accuracy is consistently above 70%.` : 'Complete several 5-question sets so the app can identify reliable weak areas.',
      formula: 'Currently based on overall recorded TARA Assessment question accuracy.'
    },
    'Supercurricular Depth': {
      summary: 'Quantity and depth of E&M journal entries.',
      next: 'Convert reading-list items into CLAIM-MECHANISM-EVIDENCE-OBJECTION-RESPONSE entries with economics and management links.',
      formula: 'Currently rises with substantive journal entries and is capped until deeper quality measures are added.'
    },
    'Reading / Thinking Readiness': {
      summary: 'Practice thinking aloud, stating assumptions, reading carefully and revising answers.',
      next: 'Save Reading / Thinking sessions with assumptions, initial answer, revised answer and reflection.',
      formula: 'Currently starts moving after recorded reasoning sessions.'
    },
    'Application Readiness': {
      summary: 'Weekly task completion and admissions milestone progress.',
      next: 'Set milestone dates, complete application tasks, and capture evidence from journal entries.',
      formula: 'Currently uses the stronger of weekly completion and milestone completion.'
    },
    'Interview Readiness': {
      summary: 'Interview-specific practice once the student enters the relevant phase.',
      next: 'Begin interview sessions after core reasoning habits are underway, then track clarity, adaptability and quantitative feedback.',
      formula: 'Currently stays low until reasoning practice and milestone progress exist.'
    }
  };
  return map[name] || { summary: value.label, next: 'Keep collecting evidence in the relevant modules.', formula: 'Transparent readiness dimension.' };
}

function readinessClass(labelText) {
  if (labelText === 'Very Strong' || labelText === 'Strong') return 'success';
  if (labelText === 'Developing') return 'medium';
  return 'low';
}

function allocationStripHtml(tasks) {
  const rows = pillarRows(tasks);
  return `<div class="allocation-strip">${rows.map((row) => `<article><span>${row.name}</span><b>${row.share}%</b><small>${row.minutes} min · ${row.completed}/${row.total} done</small></article>`).join('')}</div>`;
}

function pillarRows(tasks) {
  const buckets = [
    { key: 'a_level', name: 'A-Level Rigour', categories: ['a_level'], target: 50 },
    { key: 'tara', name: 'TARA Assessment', categories: ['tara'], target: 25 },
    { key: 'supercurricular', name: 'Super-Curricular', categories: ['economics', 'management'], target: 15 },
    { key: 'thinking', name: 'Reading / Thinking', categories: ['oxford_reasoning', 'application'], target: 10 }
  ];
  const totalMinutes = tasks.reduce((sum, task) => sum + Number(task.estimated_minutes || 0), 0);
  return buckets.map((bucket) => {
    const rows = tasks.filter((task) => bucket.categories.includes(task.category));
    const minutes = rows.reduce((sum, task) => sum + Number(task.estimated_minutes || 0), 0);
    return {
      ...bucket,
      total: rows.length,
      completed: rows.filter((task) => task.status === 'completed').length,
      minutes,
      share: percent(minutes, totalMinutes),
      percent: percent(rows.filter((task) => task.status === 'completed').length, rows.length)
    };
  });
}

function milestonesHtml() {
  const milestones = sortedMilestones();
  return `<header class="top"><div><p class="eyebrow">Milestones</p><h2>Admissions timeline</h2><p class="muted">Dates are editable because Oxford and school deadlines should be confirmed each year rather than hard-coded.</p></div></header>${milestoneSummaryHtml(milestones)}<section class="panel"><h3>Add milestone</h3><form data-action="add-milestone" class="form-grid"><input name="title" placeholder="Milestone title" required><label>Category<select name="category">${milestoneCategoryOptions('application')}</select></label><input name="target_date" type="date"><label>Status<select name="status">${statusOptions('not_started')}</select></label><input class="span-all" name="notes" placeholder="Notes"><button>Add milestone</button></form></section><section class="grid">${milestones.map(milestoneCardHtml).join('')}</section>`;
}

function milestoneSummaryHtml(milestones) {
  const open = milestones.filter((m) => m.status !== 'completed');
  const overdue = open.filter((m) => milestoneUrgency(m) === 'overdue');
  const due30 = open.filter((m) => {
    const days = daysUntil(m.target_date);
    return days !== null && days >= 0 && days <= 30;
  });
  const due90 = open.filter((m) => {
    const days = daysUntil(m.target_date);
    return days !== null && days > 30 && days <= 90;
  });
  return `<section class="grid six">${card('Next 30 days', due30.length, due30.slice(0, 3).map((m) => escapeHtml(m.title)).join('<br>') || 'No dated milestones.')}${card('Next 90 days', due90.length, due90.slice(0, 3).map((m) => escapeHtml(m.title)).join('<br>') || 'No later milestones.')}${card('Overdue', overdue.length, overdue.slice(0, 3).map((m) => escapeHtml(m.title)).join('<br>') || 'Nothing overdue.')}</section>`;
}

function milestoneCardHtml(milestone) {
  const urgency = milestoneUrgency(milestone);
  return `<article class="panel milestone ${urgency}"><form data-action="update-milestone" class="stack"><input type="hidden" name="milestone_id" value="${milestone.id}"><div class="top mini"><div><input name="title" value="${escapeAttr(milestone.title)}" required><p class="muted">${milestone.target_date ? `${formatDate(milestone.target_date)} · ${urgencyLabel(urgency, milestone)}` : 'Date unset'}</p></div><span class="pill ${urgency === 'overdue' ? 'high' : urgency === 'soon' ? 'medium' : 'low'}">${escapeHtml(urgencyLabel(urgency, milestone))}</span></div><div class="form-grid"><label>Category<select name="category">${milestoneCategoryOptions(milestone.category)}</select></label><label>Status<select name="status">${statusOptions(milestone.status)}</select></label><label>Target date<input name="target_date" type="date" value="${escapeAttr(milestone.target_date || '')}"></label></div><input name="notes" value="${escapeAttr(milestone.notes || '')}" placeholder="Notes"><button>Save milestone</button></form></article>`;
}

function sortedMilestones() {
  return [...state.data.milestones].sort((a, b) => {
    const ad = a.target_date || '9999-12-31';
    const bd = b.target_date || '9999-12-31';
    return ad.localeCompare(bd) || String(a.title).localeCompare(String(b.title));
  });
}

function nextOpenMilestone() {
  return sortedMilestones().find((milestone) => milestone.status !== 'completed' && milestone.target_date);
}

function milestoneUrgency(milestone) {
  if (milestone.status === 'completed') return 'done';
  const days = daysUntil(milestone.target_date);
  if (days === null) return 'undated';
  if (days < 0) return 'overdue';
  if (days <= 30) return 'soon';
  if (days <= 90) return 'upcoming';
  return 'later';
}

function urgencyLabel(urgency, milestone) {
  if (urgency === 'done') return 'Completed';
  if (urgency === 'undated') return 'Set date';
  const days = daysUntil(milestone.target_date);
  if (urgency === 'overdue') return `${Math.abs(days)}d overdue`;
  if (urgency === 'soon') return `${days}d left`;
  if (urgency === 'upcoming') return 'Next 90d';
  return 'Later';
}

function milestoneCategoryOptions(selected) {
  return ['school','tara','application','interview','supercurricular'].map((category) => `<option value="${category}" ${sel(selected,category)}>${label(category)}</option>`).join('');
}

function statusOptions(selected) {
  return ['not_started','in_progress','completed','skipped'].map((status) => `<option value="${status}" ${sel(selected,status)}>${label(status)}</option>`).join('');
}

function weeklyReviewHtml() {
  const draft = weeklyReviewDraft();
  return `<header class="top"><div><p class="eyebrow">Weekly Review</p><h2>What should change next week?</h2><p class="muted">The app pre-fills the measurable parts. The student adds judgement and reflection.</p></div></header><section class="grid six">${card('Tasks completed', draft.completedCount, `${draft.totalCount} total tasks`)}${card('Tasks skipped', draft.skippedCount, 'Skipped is tracked separately from completed.')}${card('TARA Assessment focus', draft.taraFocus, 'Based on latest weak sub-type.')}</section><section class="panel"><form data-action="save-review" class="stack">${weeklyReviewField('completed_summary', draft.completed_summary)}${weeklyReviewField('skipped_summary', draft.skipped_summary)}${weeklyReviewField('hardest_area', draft.hardest_area)}${weeklyReviewField('biggest_improvement', '')}${weeklyReviewField('biggest_weakness', draft.biggest_weakness)}${weeklyReviewField('most_valuable_task', '')}${weeklyReviewField('student_reflection', '')}${weeklyReviewField('next_week_focus', draft.next_week_focus)}<button>Save review</button></form></section>`;
}

function weeklyReviewDraft() {
  const tasks = state.data.tasks || [];
  const completed = tasks.filter((task) => task.status === 'completed');
  const skipped = tasks.filter((task) => task.status === 'skipped');
  const weakTopics = state.data.subjects.flatMap((subject) => (subject.academic_topics || [])
    .filter((topic) => ['weak', 'developing'].includes(topic.mastery_status))
    .map((topic) => `${subject.name}: ${topic.topic_name}`));
  const taraWeak = state.data.tara.weakestSubtype?.name || 'Not enough admissions-test data yet';
  return {
    completedCount: completed.length,
    skippedCount: skipped.length,
    totalCount: tasks.length,
    taraFocus: taraWeak,
    completed_summary: completed.map((task) => `${label(task.category)}: ${task.title}`).join('\n') || 'No tasks completed yet.',
    skipped_summary: skipped.map((task) => `${label(task.category)}: ${task.title}`).join('\n') || 'No tasks skipped.',
    hardest_area: weakTopics[0] || taraWeak,
    biggest_weakness: weakTopics.slice(0, 3).join('\n') || taraWeak,
    next_week_focus: state.data.recommendations[0] || 'Keep workload realistic and complete the highest-value weekly tasks first.'
  };
}

function weeklyReviewField(name, value) {
  return `<label>${label(name)}<textarea name="${name}" placeholder="${name.replaceAll('_',' ')}">${escapeHtml(value || '')}</textarea></label>`;
}

function interviewHtml() {
  return `<header class="top"><div><p class="eyebrow">Interview Prep</p><h2>Practise clarity, adaptability and quantitative thinking</h2><p class="muted">Record practice as evidence of how the student thinks, responds and improves, not just whether the first answer sounded polished.</p></div></header>${promptBankHtml('Oxford E&M interview prompt bank', interviewPrompts, 'interview-prompt')}<section class="panel"><form data-action="add-interview" class="stack interview-form"><div class="form-grid"><input name="topic" placeholder="Topic"><input name="session_type" placeholder="Session type, e.g. parent mock / school mock"><input name="session_date" type="date" value="${todayInput()}"></div><textarea name="questions" data-prompt-target="interview" placeholder="Questions practised, one per line"></textarea><textarea name="notes" placeholder="What happened in the session?"></textarea><textarea name="reasoning_feedback" placeholder="Reasoning feedback"></textarea><textarea name="clarity_feedback" placeholder="Clarity feedback"></textarea><textarea name="adaptability_feedback" placeholder="Adaptability feedback"></textarea><textarea name="quantitative_feedback" placeholder="Quantitative feedback"></textarea><textarea name="overall_feedback" placeholder="Overall feedback"></textarea><textarea name="next_steps" placeholder="Next steps"></textarea><button>Save interview session</button></form></section><section class="panel"><h3>Interview history</h3>${interviewHistoryHtml()}</section>`;
}

function interviewHistoryHtml() {
  const rows = recentRows(state.data.interviews || [], 'session_date');
  if (!rows.length) return '<p class="muted">No interview sessions yet.</p>';
  return `<div class="session-list">${rows.slice(0, 8).map((item) => `<article class="session-row"><div><b>${escapeHtml(item.topic || 'Interview session')}</b><p>${formatDate(item.session_date || item.created_at)} · ${escapeHtml(item.session_type || 'Practice')}</p><small>${escapeHtml(item.overall_feedback || item.next_steps || item.reasoning_feedback || 'No feedback recorded yet.')}</small></div></article>`).join('')}</div>`;
}

function promptBankHtml(title, prompts, target) {
  return `<section class="panel prompt-bank"><h3>${title}</h3><div class="prompt-list">${prompts.map((prompt) => `<button class="ghost" data-fill-prompt="${target}" data-prompt="${escapeAttr(prompt)}" title="Use this prompt">${escapeHtml(prompt)}</button>`).join('')}</div></section>`;
}

function scoreInput(name, labelText) {
  return `<label>${labelText}<input name="${name}" type="range" min="1" max="5" value="3"><small>1 developing · 5 strong</small></label>`;
}

function reasoningAverage(item) {
  const scores = ['score_reasoning','score_assumptions','score_adaptability','score_clarity'].map((key) => Number(item[key])).filter(Boolean);
  return scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1) : 'not scored';
}

function recentRows(rows, dateField) {
  return [...rows].sort((a, b) => String(b[dateField] || b.created_at || '').localeCompare(String(a[dateField] || a.created_at || '')));
}

function parentHtml() {
  if (state.data.parentStudents?.length) return parentLinkedStudentsHtml();
  const tasks = schoolTasks();
  return `<header class="top"><div><p class="eyebrow">Parent / Coach View</p><h2>Progress summary</h2></div></header>
    <section class="grid">${card('School tasks', tasks.filter(t => (t.status || 'completed') !== 'completed').length,'Still to complete')}${card('Completed',tasks.filter(t => (t.status || 'completed') === 'completed').length,'Homework and assessments')}${card('TARA',state.data.tara.overallAccuracy+'%',state.data.tara.totalQuestions+' questions answered')}</section>
    ${digestPreviewHtml()}<section class="panel"><h3>Privacy</h3><p>Private student reflections are excluded from this summary.</p></section>`;
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
  return `<section class="panel parent-student"><div class="top mini"><div><p class="eyebrow">${escapeHtml(student.profile?.display_name || 'Student')}</p><h3>${escapeHtml(student.profile?.target_course || 'Oxford Economics & Management')}</h3></div><span class="pill success">Read-only</span></div><section class="grid six">${card('This week', `${percent(completed.length, tasks.length)}%`, `${completed.length}/${tasks.length} tasks completed<br>${open.length} still open`)}${card('TARA Assessment', `${student.tara.overallAccuracy}%`, `${student.tara.totalQuestions} questions answered<br>Weakest: ${student.tara.weakestSubtype?.name || 'Not enough data'}`)}${card('A-Level', '', student.subjects.map((s)=>`${s.name}: ${s.predicted_grade || 'Not set'}`).join('<br>'))}${card('Weak topics', weakTopics.length, weakTopics.slice(0, 4).map(escapeHtml).join('<br>') || 'None recorded')}${card('Upcoming milestones', nextMilestones.length, nextMilestones.map((m)=>`${escapeHtml(m.title)} · ${formatDate(m.target_date)}`).join('<br>') || 'No open milestones')}${card('Current focus', '', student.programme?.weekly_focus || 'No active weekly programme')}</section></section>`;
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
    ${digestBlock('TARA Assessment', digest.tara.totalSets ? `${digest.tara.totalSets} set${digest.tara.totalSets === 1 ? '' : 's'} · ${digest.tara.correct}/${digest.tara.totalQuestions} correct · ${digest.tara.accuracy}%` : 'No TARA Assessment set completed.')}
    ${digestBlock('Weakest Sub-type', digest.tara.weakSubtypes[0] ? `${escapeHtml(digest.tara.weakSubtypes[0].name)} · ${digest.tara.weakSubtypes[0].accuracy}%` : 'No weak sub-type identified yesterday.')}
    ${digestBlock('Plan Tracker', `${digest.studyPlan.logs.length} blocks logged · ${digest.studyPlan.green}/${digest.studyPlan.amber}/${digest.studyPlan.red} green/amber/red`)}
    ${digestBlock('Academics', digest.academics.length ? digest.academics.map((item) => `${escapeHtml(item.subject_name)}: ${escapeHtml(item.assessment_name || item.topic || 'assessment')} ${item.score != null ? `${escapeHtml(item.score)}/${escapeHtml(item.max_score)}` : escapeHtml(label(item.status || 'completed'))}`).join('<br>') : 'No academic result added.')}

    ${digestBlock('Suggested Focus', digest.recommendations.map((item) => escapeHtml(item)).join('<br>') || 'Keep logging your study plan and school tasks.')}
  </div>`;
}

function digestBlock(title, body) {
  return `<article class="digest-block"><b>${title}</b><p>${body}</p></article>`;
}

function taraFilterHtml() {
  return `<section class="panel"><h3>Build a focused set</h3><form class="form-grid" data-action="tara-filters"><label>Paper year<select name="year"><option value="all">All years</option>${questionBankManifest.years.map((year)=>`<option value="${escapeAttr(year)}" ${sel(state.taraFilters.year,year)}>${year}</option>`).join('')}</select></label><label>Broad type<select name="family"><option value="all">All types</option>${TOP_LEVEL_TYPES.map((type)=>`<option value="${escapeAttr(type)}" ${sel(state.taraFilters.family,type)}>${type}</option>`).join('')}</select></label><label>Sub-type / cognitive mode<select name="type"><option value="all">All sub-types</option>${ALL_SUBTYPES.map((type)=>`<option value="${escapeAttr(type)}" ${sel(state.taraFilters.type,type)}>${type}</option>`).join('')}</select></label><label>Topic tag<select name="topic"><option value="all">All topic tags</option>${topicTagOptions().map((topic)=>`<option value="${escapeAttr(topic)}" ${sel(state.taraFilters.topic,topic)}>${topic}</option>`).join('')}</select></label><input type="hidden" name="pattern" value="all"><button>Apply filters</button></form></section>`;
}

function topicTagOptions() {
  return unique([...PROBLEM_SOLVING_TOPIC_TAGS, ...questionBankManifest.topicTags, ...questions.map((q) => q.topic_tag)]);
}

function sessionHistoryHtml() {
  const attempts = state.data.tara.attempts;
  if (!attempts.length) return '<p class="muted">Complete a TARA Assessment set to see historical session details.</p>';
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

async function ensureQuestionBankLoaded() {
  if (state.questionBankLoaded && questions.length) return questions;
  if (!questionBankLoadPromise) {
    state.questionBankLoading = true;
    render();
    questionBankLoadPromise = import('./questions.js')
      .then((module) => {
        questions = module.questions;
        state.questionBankLoaded = true;
        return questions;
      })
      .finally(() => {
        state.questionBankLoading = false;
      });
  }
  try {
    return await questionBankLoadPromise;
  } catch (error) {
    questionBankLoadPromise = null;
    state.notice = { type: 'error', message: `Could not load the TARA question bank. ${friendlyError(error)}` };
    throw error;
  }
}

function questionBankStatusText() {
  if (state.questionBankLoading) return 'Loading question bank';
  if (state.questionBankLoaded) return `${questions.length} questions loaded`;
  return `${questionBankManifest.totalQuestions} questions available`;
}

async function startTara() {
  await ensureQuestionBankLoaded();
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

async function startSmartTara() {
  await ensureQuestionBankLoaded();
  const pool = smartQuestionPool();
  state.practice = { set: pool.slice(0,5), index: 0, answers: {}, startedAt: new Date().toISOString(), report: false };
  state.view = 'tara';
}

async function startRecommendedTara() {
  const weakSubtype = state.data.tara.weakestSubtype?.name;
  if (weakSubtype) {
    state.taraFilters = { ...state.taraFilters, type: weakSubtype, topic: 'all' };
    state.notice = { type: 'info', message: `Starting a focused set for ${weakSubtype}.` };
  }
  await startTara();
}

async function startRetryTara() {
  await ensureQuestionBankLoaded();
  const pool = missedQuestionPool();
  if (!pool.length) {
    state.notice = { type: 'info', message: 'No missed questions are available for retry yet.' };
    state.view = 'tara';
    return;
  }
  state.practice = { set: shuffle(pool).slice(0, Math.min(5, pool.length)), index: 0, answers: {}, startedAt: new Date().toISOString(), report: false };
  state.notice = { type: 'success', message: `Retrying ${Math.min(5, pool.length)} previously missed question${Math.min(5, pool.length) === 1 ? '' : 's'}.` };
  state.view = 'tara';
}

function missedQuestionPool() {
  const missed = (state.data?.tara?.responses || []).filter((response) => !response.is_correct);
  return missed
    .map((response) => questions.find((question) => String(question.paper_year) === String(response.paper_year) && Number(question.question_number) === Number(response.question_number)))
    .filter(Boolean)
    .filter(uniqueQuestion);
}

function filteredQuestions() {
  if (!questions.length) return [];
  return questions.filter((q) =>
    (state.taraFilters.year === 'all' || String(q.paper_year) === state.taraFilters.year) &&
    (state.taraFilters.family === 'all' || q.type === state.taraFilters.family) &&
    (state.taraFilters.type === 'all' || q.sub_type === state.taraFilters.type) &&
    (state.taraFilters.topic === 'all' || q.topic_tag === state.taraFilters.topic)
  );
}

function syncTaraFiltersFromDom() {
  const form = app.querySelector('form[data-action="tara-filters"]');
  if (!form) return;
  state.taraFilters = Object.fromEntries(new FormData(form).entries());
}

function smartQuestionPool() {
  if (!questions.length) return [];
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

app.addEventListener('input', event => handleStudyInput(event,state.data?.studyPlanLogs || []));

app.addEventListener('click', async (event) => {
  if(event.target.closest('[data-add-custom], [data-remove-topic]')) {handleStudyInput(event,state.data?.studyPlanLogs || []);return;}
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.schoolFile) {
    try {
      const task = schoolTasks().find(t => t.id === target.dataset.schoolFile);
      const url = await schoolAttachmentUrl(task.attachment_path);
      const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener';link.textContent='Open document';
      target.replaceWith(link);link.click();
    } catch(error) {setFormStatus(target.closest('form'),friendlyError(error),'error');}
    return;
  }
  if (target.dataset.view) { state.view = target.dataset.view; render(); return; }
  if (target.dataset.answer) { state.practice.answers[state.practice.set[state.practice.index].id] = target.dataset.answer; render(); return; }
  if (target.dataset.topicFilter) { state.academicTopicFilter = target.dataset.topicFilter; render(); return; }
  if (target.dataset.journalMode) { state.journalMode = target.dataset.journalMode; render(); return; }
  if (target.dataset.fillPrompt) { fillPrompt(target.dataset.fillPrompt, target.dataset.prompt); return; }
  if (target.dataset.reviewAttempt) {
    try {
      await ensureQuestionBankLoaded();
      state.reviewAttemptId = target.dataset.reviewAttempt;
      state.view = 'analytics';
    } catch {
      state.view = 'analytics';
    }
    render();
    return;
  }
  const action = target.dataset.action;
  if (action === 'signout') { await signOut(); location.reload(); }
  if (action === 'start-tara') { try { await startTara(); } catch {} render(); }
  if (action === 'start-smart') { try { await startSmartTara(); } catch {} render(); }
  if (action === 'start-recommended-tara') { try { await startRecommendedTara(); } catch {} render(); }
  if (action === 'start-retry-tara') { try { await startRetryTara(); } catch {} render(); }
  if (action === 'prev-question') { state.practice.index = Math.max(0, state.practice.index - 1); render(); }
  if (action === 'next-question') { state.practice.index = Math.min(state.practice.set.length - 1, state.practice.index + 1); render(); }
  if (action === 'submit-tara') await submitTara();
  if (action === 'close-review') { state.reviewAttemptId = null; render(); }
});

app.addEventListener('change', async (event) => {
  handleStudyInput(event,state.data?.studyPlanLogs || []);
  if (event.target.name === 'mode' && event.target.form?.dataset.action === 'plan-filter') {
    const form = event.target.form;
    form.querySelector('[data-plan-date]').hidden = event.target.value === 'subject';
    form.querySelectorAll('[data-plan-subject]').forEach(label => label.hidden = event.target.value === 'date');
  }
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
    if (action === 'tara-filters') {
      state.taraFilters = values;
      state.notice = state.questionBankLoaded
        ? { type: 'success', message: `${filteredQuestions().length} questions match the selected filters.` }
        : { type: 'success', message: 'Filters saved. The full question bank will load when you start the set.' };
      render();
      return;
    }
    if (action === 'plan-filter') {
      if (values.from > values.to) throw new Error('End date must be after start date.');
      if ((new Date(values.to)-new Date(values.from))/86400000 > 366) throw new Error('Select up to one year at a time.');
      state.planMode=values.mode; state.planDate=values.date; state.planSubject=values.subject;
      state.planFrom=values.from; state.planTo=values.to; state.extraBlock=null; render(); return;
    }
    if (action === 'extra-block') {
      if(!values.date || values.from>=values.to)throw new Error('Choose a date and an end time after the start time.');
      state.extraBlock={date:values.date,day:new Date(values.date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long'}),from:values.from,to:values.to,activity:values.area};
      state.planMode='date';state.planDate=values.date;
      const same=selectedPlanBlocks().find(b=>b.date===values.date && b.from===values.from && b.to===values.to && areaFor(b.activity)===values.area);
      if(same)state.extraBlock=same;
      render();return;
    }
    if (action === 'school-filter') {state.schoolSubject=values.subject;state.schoolStatus=values.status;render();return;}
    if (button) button.disabled = true;
    if (action === 'save-school-task') {
      await saveSchoolTask(state.user,values,values.attachment,schoolTasks().find(t => t.id === values.task_id));
      state.data = await bootstrap(state.user); render();
      const saved = app.querySelector(`input[name="task_id"][value="${values.task_id}"]`);
      if (saved && values.task_id) {saved.closest('details').open=true;setFormStatus(saved.form,'Saved successfully.','success');}
      else {state.notice={type:'success',message:'Task added successfully.'};app.querySelector('main').insertAdjacentHTML('afterbegin',noticeHtml());}
      return;
    }
    if (action === 'update-subject') {
      const subject = findSubject(values.subject_id);
      await updateSubject(state.user, subject, values);
    }
    if (action === 'add-result') await addAcademicResult(state.user, values);
    if (action === 'add-topic') await addAcademicTopic(state.user, values);
    if (action === 'add-journal') await addJournalEntry(state.user, values);
    if (action === 'add-reasoning') await addReasoningSession(state.user, values);
    if (action === 'add-milestone') await addMilestone(state.user, values);
    if (action === 'update-milestone') {
      const milestone = findMilestone(values.milestone_id);
      await updateMilestone(state.user, milestone, values);
    }
    if (action === 'add-interview') await addInterviewSession(state.user, values);
    if (action === 'save-review') await saveWeeklyReview(state.user, values);
    if (action === 'save-profile') await updateProfile(state.user, normalizeProfilePayload(values));
    if (action === 'save-error') await saveTaraErrorAnalysis(state.user, values);
    if (action === 'save-study-log') {
      const details=collectStudyDetails(form);
      await saveStudyPlanLog(state.user,{...values, ...(details ? {details} : {})});
      state.data=await bootstrap(state.user);
      const saved=(state.data.studyPlanLogs || []).find(l => l.log_date===values.log_date && l.start_time.slice(0,5)===values.start_time && l.end_time.slice(0,5)===values.end_time && l.planned_activity===values.planned_activity);
      setFormStatus(form,'Progress saved.','success');
      // Refresh summaries without discarding other blocks that are being edited.
      const status=app.querySelector('.plan-progress > p');
      if(status){const blocks=selectedPlanBlocks();status.textContent=blocks.filter(findStudyPlanLog).length+' of '+blocks.length+' blocks logged';}
      if(saved)state.notice={type:'success',message:'Progress saved.'};
      return;
    }
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
  if (q.sub_type === 'Relevant Selection') return 'Dense data should trigger selection first: identify the target, then ignore irrelevant rows, columns or conditions.';
  if (q.sub_type === 'Finding Procedures') return 'No obvious method means you should choose the strategy before calculating: equation, ratio, optimisation, rate or case test.';
  if (q.sub_type === 'Spatial Reasoning & Pattern Analysis') return 'Visual, timetable or pattern wording should trigger constraint tracking rather than impression-based matching.';
  return 'The wording should trigger the named method before looking at attractive answer choices.';
}

function findAcademicTopic(id) {
  return state.data.subjects.flatMap((subject) => subject.academic_topics || []).find((topic) => topic.id === id);
}

function findSubject(id) {
  return state.data.subjects.find((subject) => subject.id === id);
}

function findMilestone(id) {
  return state.data.milestones.find((milestone) => milestone.id === id);
}

function fillPrompt(targetName, prompt) {
  const textarea = app.querySelector(`[data-prompt-target="${targetName.replace('-prompt', '')}"]`);
  if (!textarea) return;
  textarea.value = textarea.value ? `${textarea.value}\n${prompt}` : prompt;
  textarea.focus();
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

function dateInput(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function currentWeek() {
  const start = new Date(`${todayInput()}T12:00:00`);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { week_start: dateInput(start), week_end: dateInput(end) };
}

function weekStartDate() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function daysUntil(value) {
  if (!value) return null;
  const todayDate = new Date(`${todayInput()}T00:00:00`);
  const targetDate = new Date(`${value}T00:00:00`);
  return Math.ceil((targetDate.getTime() - todayDate.getTime()) / 86400000);
}

function daysSince(value) {
  if (!value) return 999;
  return Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
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
  if (message.includes('study_plan_logs') || message.toLowerCase().includes('could not find the table')) return 'The plan tracker needs the latest SQL migration. Run 005_study_plan_logs.sql in Supabase, then refresh.';
  if (message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('networkerror') || message.toLowerCase().includes('no such host')) return 'Could not reach Supabase. This can happen if the phone/browser network blocks Supabase, DNS is slow, the project is paused, or Supabase is temporarily unreachable. Check the project is awake in Supabase, then refresh on a stable network.';
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
