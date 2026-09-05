import { supabase } from './supabaseClient.js';
import { normalizeResponseTags } from './tagTaxonomy.js';

const localKey = 'oxford-em-coach-demo';

export async function getSession() {
  if (!supabase) return { user: demoUser(), demo: true };
  const { data } = await supabase.auth.getSession();
  return { user: data.session?.user || null, demo: false };
}

export async function signIn(email) {
  if (!supabase) return { demo: true };
  const redirectTo = `${location.origin}${location.pathname}`;
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
  if (error) throw error;
  return { demo: false };
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

export async function bootstrap(user) {
  if (!supabase) return localBootstrap();
  await claimParentLinks();
  await ensureProfile(user);
  await seedSubjects(user.id);
  await seedMilestones(user.id);
  const [profile, tara, programme, subjects, journal, reasoning, milestones, weeklyReviews, interviews, studyPlanLogs, parentStudents] = await Promise.all([
    single('user_profiles', 'user_id', user.id),
    getTaraAnalytics(user.id),
    getCurrentProgramme(user.id),
    getSubjects(user.id),
    list('journal_entries', user.id, 'date_completed', false),
    list('oxford_reasoning_sessions', user.id, 'date', false),
    list('milestones', user.id, 'target_date', true),
    list('weekly_reviews', user.id, 'week_start', false),
    list('interview_sessions', user.id, 'session_date', false),
    optionalList('study_plan_logs', user.id, 'log_date', true),
    getParentStudentSummaries(user.id)
  ]);
  return buildState({ profile, tara, programme, subjects, journal, reasoning, milestones, weeklyReviews, interviews, studyPlanLogs, parentStudents });
}

export async function saveAttempt(user, set, responses, startedAt) {
  const score = responses.filter((r) => r.is_correct).length;
  if (!supabase) {
    const db = readLocal();
    const attempt = {
      id: crypto.randomUUID(),
      user_id: user.id,
      set_name: '5-question set',
      score,
      total: set.length,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      duration_seconds: Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)
    };
    db.attempts.push(attempt);
    db.responses.push(...responses.map((r) => ({ ...r, id: crypto.randomUUID(), attempt_id: attempt.id, user_id: user.id, created_at: attempt.completed_at })));
    writeLocal(db);
    return attempt;
  }
  const { data: attempt, error } = await supabase.from('attempts').insert({
    user_id: user.id,
    set_name: '5-question set',
    score,
    total: set.length,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    duration_seconds: Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)
  }).select().single();
  if (error) throw error;
  const { error: responseError } = await supabase.from('responses').insert(responses.map((r) => ({ ...r, attempt_id: attempt.id, user_id: user.id })));
  if (responseError) throw responseError;
  return attempt;
}

export async function updateTask(user, task, patch) {
  const completedAt = patch.status === 'completed' ? new Date().toISOString() : patch.status ? null : task.completed_at;
  const updatedAt = new Date().toISOString();
  if (!supabase) {
    const db = readLocal();
    db.weekly_tasks = db.weekly_tasks.map((item) => item.id === task.id ? { ...item, ...patch, completed_at: completedAt, updated_at: updatedAt } : item);
    writeLocal(db);
    return;
  }
  const { error } = await supabase.from('weekly_tasks').update({ ...patch, completed_at: completedAt }).eq('id', task.id).eq('user_id', user.id);
  if (error) throw error;
}

export async function updateProfile(user, patch) {
  const row = { ...patch, user_id: user.id };
  if (!supabase) {
    const db = readLocal();
    db.user_profiles = [{ ...(db.user_profiles?.[0] || {}), ...row, id: db.user_profiles?.[0]?.id || crypto.randomUUID() }];
    writeLocal(db);
    return;
  }
  const { error } = await supabase.from('user_profiles').upsert(row, { onConflict: 'user_id' });
  if (isMissingDigestColumn(error)) {
    const { error: retryError } = await supabase.from('user_profiles').upsert(stripDigestColumns(row), { onConflict: 'user_id' });
    if (retryError) throw retryError;
    await upsertParentLink(user.id, row.parent_email);
    return;
  }
  if (error) throw error;
  await upsertParentLink(user.id, row.parent_email);
}

export async function createProgramme(user, draft, replaceCurrent = false) {
  if (!supabase) {
    const db = readLocal();
    if (replaceCurrent) db.weekly_programmes = db.weekly_programmes.map((p) => p.is_active ? { ...p, is_active: false, archived_at: new Date().toISOString() } : p);
    const programme = { ...draft.programme, id: crypto.randomUUID(), user_id: user.id, is_active: true, version: nextLocalProgrammeVersion(db, user.id, draft.programme.week_start) };
    db.weekly_programmes.push(programme);
    db.weekly_tasks.push(...draft.tasks.map((task) => ({ ...taskForSave(task), id: crypto.randomUUID(), programme_id: programme.id, user_id: user.id, status: 'not_started' })));
    writeLocal(db);
    return programme;
  }
  const version = await nextRemoteProgrammeVersion(user.id, draft.programme.week_start);
  if (replaceCurrent) {
    await supabase.from('weekly_programmes').update({ is_active: false, archived_at: new Date().toISOString() }).eq('user_id', user.id).eq('is_active', true);
  }
  const { data: programme, error } = await supabase.from('weekly_programmes').insert({ ...draft.programme, version, user_id: user.id, is_active: true }).select().single();
  if (error) throw error;
  const { error: taskError } = await supabase.from('weekly_tasks').insert(draft.tasks.map((task) => ({ ...taskForSave(task), programme_id: programme.id, user_id: user.id, status: 'not_started' })));
  if (taskError) throw taskError;
  return programme;
}

function nextLocalProgrammeVersion(db, userId, weekStart) {
  const versions = db.weekly_programmes
    .filter((programme) => programme.user_id === userId && programme.week_start === weekStart)
    .map((programme) => Number(programme.version || 1));
  return versions.length ? Math.max(...versions) + 1 : 1;
}

async function nextRemoteProgrammeVersion(userId, weekStart) {
  const { data, error } = await supabase
    .from('weekly_programmes')
    .select('version')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .order('version', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0]?.version ? Number(data[0].version) + 1 : 1;
}

function taskForSave(task) {
  const { recommendation_reason, ...row } = task;
  return row;
}

export async function addAcademicResult(user, payload) {
  const score = Number(payload.score || 0);
  const maxScore = Number(payload.max_score || 100);
  const row = { ...payload, user_id: user.id, percentage: maxScore ? Math.round((score / maxScore) * 100) : 0 };
  if (!supabase) {
    const db = readLocal();
    db.academic_results.push({ ...row, id: crypto.randomUUID() });
    writeLocal(db);
    return;
  }
  const { error } = await supabase.from('academic_results').insert(row);
  if (error) throw error;
}

export async function updateSubject(user, subject, patch) {
  const row = {
    target_grade: patch.target_grade || null,
    current_estimated_grade: patch.current_estimated_grade || null,
    predicted_grade: patch.predicted_grade || null,
    notes: patch.notes || null
  };
  if (!supabase) {
    const db = readLocal();
    db.subjects = db.subjects.map((item) => item.id === subject.id ? { ...item, ...row, updated_at: new Date().toISOString() } : item);
    writeLocal(db);
    return;
  }
  const { error } = await supabase.from('subjects').update(row).eq('id', subject.id).eq('user_id', user.id);
  if (error) throw error;
}

export async function addAcademicTopic(user, payload) {
  const row = {
    user_id: user.id,
    subject_id: payload.subject_id,
    topic_name: payload.topic_name,
    mastery_status: payload.mastery_status || 'developing',
    confidence: Number(payload.confidence || 3),
    notes: payload.notes || null,
    last_assessed_at: payload.last_assessed_at || today()
  };
  if (!supabase) {
    const db = readLocal();
    db.academic_topics.push({ ...row, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    writeLocal(db);
    return;
  }
  const { error } = await supabase.from('academic_topics').insert(row);
  if (error) throw error;
}

export async function updateAcademicTopic(user, topic, patch) {
  const row = {
    ...patch,
    confidence: patch.confidence ? Number(patch.confidence) : topic.confidence,
    last_assessed_at: patch.mastery_status || patch.confidence ? today() : topic.last_assessed_at
  };
  if (!supabase) {
    const db = readLocal();
    db.academic_topics = db.academic_topics.map((item) => item.id === topic.id ? { ...item, ...row, updated_at: new Date().toISOString() } : item);
    writeLocal(db);
    return;
  }
  const { error } = await supabase.from('academic_topics').update(row).eq('id', topic.id).eq('user_id', user.id);
  if (error) throw error;
}

export async function addJournalEntry(user, payload) {
  const tags = splitTags(payload.topic_tags);
  if (payload.reading_status) tags.push(`status:${payload.reading_status}`);
  const { reading_status, ...cleanPayload } = payload;
  const row = {
    ...cleanPayload,
    user_id: user.id,
    topic_tags: [...new Set(tags)],
    date_completed: cleanPayload.date_completed || (payload.reading_status === 'completed' ? today() : null)
  };
  if (!supabase) {
    const db = readLocal();
    db.journal_entries.push({ ...row, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    writeLocal(db);
    return;
  }
  const { error } = await supabase.from('journal_entries').insert(row);
  if (error) throw error;
}

export async function addReasoningSession(user, payload) {
  const row = {
    ...payload,
    user_id: user.id,
    date: today(),
    score_reasoning: toOptionalNumber(payload.score_reasoning),
    score_adaptability: toOptionalNumber(payload.score_adaptability),
    score_clarity: toOptionalNumber(payload.score_clarity),
    score_assumptions: toOptionalNumber(payload.score_assumptions)
  };
  if (!supabase) {
    const db = readLocal();
    db.oxford_reasoning_sessions.push({ ...row, id: crypto.randomUUID() });
    writeLocal(db);
    return;
  }
  const { error } = await supabase.from('oxford_reasoning_sessions').insert(row);
  if (error) throw error;
}

export async function updateMilestone(user, milestone, patch) {
  const row = {
    title: patch.title || milestone.title,
    category: patch.category || milestone.category,
    target_date: patch.target_date || null,
    status: patch.status || milestone.status,
    notes: patch.notes || null
  };
  if (!supabase) {
    const db = readLocal();
    db.milestones = db.milestones.map((item) => item.id === milestone.id ? { ...item, ...row, updated_at: new Date().toISOString() } : item);
    writeLocal(db);
    return;
  }
  const { error } = await supabase.from('milestones').update(row).eq('id', milestone.id).eq('user_id', user.id);
  if (error) throw error;
}

export async function addMilestone(user, payload) {
  const row = {
    user_id: user.id,
    title: payload.title,
    category: payload.category || 'application',
    target_date: payload.target_date || null,
    status: payload.status || 'not_started',
    notes: payload.notes || null
  };
  if (!supabase) {
    const db = readLocal();
    db.milestones.push({ ...row, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    writeLocal(db);
    return;
  }
  const { error } = await supabase.from('milestones').insert(row);
  if (error) throw error;
}

export async function saveWeeklyReview(user, payload) {
  const row = { ...payload, user_id: user.id, week_start: currentWeek().week_start };
  if (!supabase) {
    const db = readLocal();
    db.weekly_reviews.push({ ...row, id: crypto.randomUUID() });
    writeLocal(db);
    return;
  }
  const { error } = await supabase.from('weekly_reviews').upsert(row, { onConflict: 'user_id,week_start' });
  if (error) throw error;
}

export async function addInterviewSession(user, payload) {
  const row = { ...payload, user_id: user.id, session_date: payload.session_date || today(), questions: splitLines(payload.questions) };
  if (!supabase) {
    const db = readLocal();
    db.interview_sessions.push({ ...row, id: crypto.randomUUID() });
    writeLocal(db);
    return;
  }
  const { error } = await supabase.from('interview_sessions').insert(row);
  if (error) throw error;
}

export async function saveTaraErrorAnalysis(user, payload) {
  const row = { ...payload, user_id: user.id };
  if (!supabase) {
    const db = readLocal();
    const existing = db.tara_error_analysis.find((item) => item.response_id === payload.response_id);
    if (existing) Object.assign(existing, row, { updated_at: new Date().toISOString() });
    else db.tara_error_analysis.push({ ...row, id: crypto.randomUUID(), created_at: new Date().toISOString() });
    writeLocal(db);
    return;
  }
  const { error } = await supabase.from('tara_error_analysis').upsert(row, { onConflict: 'response_id' });
  if (error) throw error;
}

async function getCurrentProgramme(userId) {
  const todayValue = today();
  const { data, error } = await supabase
    .from('weekly_programmes')
    .select('*, weekly_tasks(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .lte('week_start', todayValue)
    .gte('week_end', todayValue)
    .order('version', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

async function getSubjects(userId) {
  const { data, error } = await supabase.from('subjects').select('*, academic_results(*), academic_topics(*)').eq('user_id', userId).order('name');
  if (error) throw error;
  return data || [];
}

async function getTaraAnalytics(userId) {
  const [{ data: attempts }, { data: responses }, { data: errors }] = await Promise.all([
    supabase.from('attempts').select('*').eq('user_id', userId).order('completed_at', { ascending: false }),
    supabase.from('responses').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('tara_error_analysis').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  ]);
  return summarizeTara(attempts || [], responses || [], errors || []);
}

export async function saveStudyPlanLog(user, payload) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.log_date) || !/^\d{2}:\d{2}$/.test(payload.start_time) || !/^\d{2}:\d{2}$/.test(payload.end_time) || payload.start_time >= payload.end_time) throw new Error('Choose valid study block dates and times.');
  const row = {
    user_id: user.id,
    log_date: payload.log_date,
    day_name: payload.day_name,
    start_time: payload.start_time,
    end_time: payload.end_time,
    planned_activity: payload.planned_activity,
    topics_covered: payload.topics_covered || null,
    topics_practised: payload.topics_practised || null,
    topics_assessed: payload.topics_assessed || null,
    rag_status: payload.rag_status || null,
    reflection: payload.reflection || null,
    ...(payload.details ? { details: payload.details } : {})
  };
  if (!supabase) {
    const db = readLocal();
    const key = studyPlanLogKey(row);
    const existingIndex = db.study_plan_logs.findIndex((item) => studyPlanLogKey(item) === key);
    const saved = { ...row, id: db.study_plan_logs[existingIndex]?.id || crypto.randomUUID(), updated_at: new Date().toISOString() };
    if (existingIndex === -1) db.study_plan_logs.push({ ...saved, created_at: new Date().toISOString() });
    else db.study_plan_logs[existingIndex] = { ...db.study_plan_logs[existingIndex], ...saved };
    writeLocal(db);
    return saved;
  }
  const { data, error } = await supabase
    .from('study_plan_logs')
    .upsert(row, { onConflict: 'user_id,log_date,start_time,end_time,planned_activity' })
    .select()
    .single();
  if (error) {
    if (['PGRST204','42703'].includes(error.code)) throw new Error('Structured study logs need the database update 007_study_block_details.sql. Your entry has not been saved; keep this form open until the update is run.');
    throw error;
  }
  return data;
}

function studyPlanLogKey(row) {
  return [row.user_id, row.log_date, row.start_time, row.end_time, row.planned_activity].join('|');
}

async function claimParentLinks() {
  if (!supabase) return;
  const { error } = await supabase.rpc('claim_parent_links');
  if (error && !/claim_parent_links|schema cache|function/i.test(error.message || '')) throw error;
}

async function upsertParentLink(studentUserId, parentEmail) {
  const email = String(parentEmail || '').trim().toLowerCase();
  if (!supabase || !email) return;
  const { error } = await supabase.from('student_parent_links').upsert({
    student_user_id: studentUserId,
    parent_email: email,
    status: 'invited'
  }, { onConflict: 'student_user_id,parent_email', ignoreDuplicates: true });
  if (error && !/student_parent_links|schema cache|relation/i.test(error.message || '')) throw error;
}

async function getParentStudentSummaries(parentUserId) {
  const { data: links, error } = await supabase
    .from('student_parent_links')
    .select('*')
    .eq('parent_user_id', parentUserId)
    .eq('status', 'active');
  if (error) {
    if (/student_parent_links|schema cache|relation/i.test(error.message || '')) return [];
    throw error;
  }
  return Promise.all((links || []).map(async (link) => {
    const userId = link.student_user_id;
    const [profile, tara, programme, subjects, milestones] = await Promise.all([
      single('user_profiles', 'user_id', userId),
      getTaraAnalytics(userId),
      getCurrentProgramme(userId),
      getSubjects(userId),
      list('milestones', userId, 'target_date', true)
    ]);
    const tasks = programme?.weekly_tasks || [];
    return { link, profile, tara, programme, tasks, subjects, milestones };
  }));
}

async function ensureProfile(user) {
  const existing = await single('user_profiles', 'user_id', user.id);
  if (existing) return;
  const row = {
    user_id: user.id,
    display_name: user.email?.split('@')[0],
    target_course: 'Oxford Economics & Management',
    target_university: 'University of Oxford',
    current_school_year: 'Year 12',
    parent_digest_enabled: false,
    parent_digest_time: '06:00'
  };
  const { error } = await supabase.from('user_profiles').insert(row);
  if (isMissingDigestColumn(error)) {
    const { error: retryError } = await supabase.from('user_profiles').insert(stripDigestColumns(row));
    if (retryError) throw retryError;
    return;
  }
  if (error) throw error;
}

async function seedSubjects(userId) {
  for (const subject of ['Mathematics', 'Economics', 'Physics', 'History']) {
    await supabase.from('subjects').upsert({ user_id: userId, name: subject, target_grade: subject === 'Mathematics' || subject === 'Economics' ? 'A*' : 'A', current_estimated_grade: 'Not set', predicted_grade: 'Not set' }, { onConflict: 'user_id,name' });
  }
}

async function seedMilestones(userId) {
  const { count } = await supabase.from('milestones').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  if (count) return;
  const titles = [
    ['Year 12 school assessments', 'school'],
    ['Predicted grades review', 'school'],
    ['Summer preparation plan', 'supercurricular'],
    ['Admissions test registration (TARA)', 'tara'],
    ['Admissions test date (TARA)', 'tara'],
    ['UCAS preparation', 'application'],
    ['Oxford application deadline', 'application'],
    ['Shortlist period', 'interview'],
    ['Interview preparation', 'interview'],
    ['Interview period', 'interview']
  ];
  await supabase.from('milestones').insert(titles.map(([title, category]) => ({ user_id: userId, title, category, status: 'not_started', notes: 'Set the date when confirmed.' })));
}

async function single(table, key, value) {
  const { data, error } = await supabase.from(table).select('*').eq(key, value).maybeSingle();
  if (error) throw error;
  return data;
}

async function list(table, userId, order, nullsFirst = false) {
  const { data, error } = await supabase.from(table).select('*').eq('user_id', userId).order(order, { ascending: !nullsFirst });
  if (error) throw error;
  return data || [];
}

async function optionalList(table, userId, order, nullsFirst = false) {
  const { data, error } = await supabase.from(table).select('*').eq('user_id', userId).order(order, { ascending: !nullsFirst });
  if (error) {
    if (isMissingOptionalTable(error, table)) return [];
    throw error;
  }
  return data || [];
}

function isMissingOptionalTable(error, table) {
  const message = error?.message || '';
  return message.includes(table) || /schema cache|relation .* does not exist|Could not find the table/i.test(message);
}

function localBootstrap() {
  const db = readLocal();
  if (!db.subjects.length) seedLocal(db);
  writeLocal(db);
  const user = demoUser();
  const subjects = db.subjects.map((subject) => ({
    ...subject,
    academic_results: db.academic_results.filter((result) => result.subject_id === subject.id).sort((a, b) => String(b.assessment_date || b.created_at || '').localeCompare(String(a.assessment_date || a.created_at || ''))),
    academic_topics: (db.academic_topics || []).filter((topic) => topic.subject_id === subject.id)
  }));
  return buildState({
    profile: db.user_profiles?.[0] || { display_name: 'Student preview', target_course: 'Oxford Economics & Management', current_school_year: 'Year 12' },
    tara: summarizeTara(db.attempts, db.responses, db.tara_error_analysis || []),
    programme: db.weekly_programmes.find((p) => p.is_active) || null,
    subjects,
    journal: db.journal_entries,
    reasoning: db.oxford_reasoning_sessions,
    milestones: db.milestones,
    weeklyReviews: db.weekly_reviews,
    interviews: db.interview_sessions,
    studyPlanLogs: db.study_plan_logs
  }, user);
}

function buildState({ profile, tara, programme, subjects, journal, reasoning, milestones, weeklyReviews, interviews = [], studyPlanLogs = [], parentStudents = [] }) {
  const tasks = programme?.weekly_tasks || programme?.tasks || readLocal().weekly_tasks.filter((t) => t.programme_id === programme?.id);
  return {
    profile,
    tara,
    programme,
    tasks,
    subjects,
    journal,
    reasoning,
    milestones,
    weeklyReviews,
    interviews,
    studyPlanLogs,
    parentStudents,
    readiness: readiness({ tara, subjects, journal, reasoning, milestones, tasks, studyPlanLogs }),
    recommendations: recommendations({ tara, subjects, journal, tasks, milestones, studyPlanLogs })
  };
}

export function summarizeTara(attempts, responses, errors = []) {
  responses = responses.map(normalizeResponseTags);
  const total = responses.length;
  const correct = responses.filter((r) => r.is_correct).length;
  const byType = groupAccuracy(responses, 'question_type');
  const byPattern = groupAccuracy(responses, 'reasoning_pattern');
  const errorsByResponse = Object.fromEntries(errors.map((item) => [item.response_id, item]));
  return {
    attempts,
    responses: responses.map((response) => ({ ...response, error_analysis: errorsByResponse[response.id] || null })),
    errors,
    totalAttempts: attempts.length,
    totalQuestions: total,
    overallAccuracy: total ? Math.round((correct / total) * 100) : 0,
    averageSetScore: attempts.length ? (attempts.reduce((s, a) => s + Number(a.score || 0), 0) / attempts.length).toFixed(1) : '0.0',
    criticalAccuracy: typeAccuracy(responses, 'Critical Thinking'),
    problemAccuracy: typeAccuracy(responses, 'Numerical Reasoning & Problem-Solving'),
    byType,
    byPattern,
    weakestType: byType.at(0),
    strongestType: byType.at(-1),
    weakestSubtype: byPattern.at(0),
    strongestSubtype: byPattern.at(-1),
    recentTrend: attempts.slice(0, 5).map((a) => ({ label: new Date(a.completed_at).toLocaleDateString(), value: Math.round((a.score / a.total) * 100) })),
    repeatErrors: groupAccuracy(responses.filter((r) => !r.is_correct), 'question_type').slice(0, 5)
  };
}

function groupAccuracy(rows, key) {
  return Object.values(rows.reduce((acc, row) => {
    const name = row[key] || 'Unclassified';
    acc[name] ||= { name, total: 0, correct: 0, accuracy: 0 };
    acc[name].total += 1;
    if (row.is_correct) acc[name].correct += 1;
    acc[name].accuracy = Math.round((acc[name].correct / acc[name].total) * 100);
    return acc;
  }, {})).sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
}

function typeAccuracy(rows, type) {
  const selected = rows.filter((r) => r.question_type === type);
  return selected.length ? Math.round((selected.filter((r) => r.is_correct).length / selected.length) * 100) : 0;
}

function recommendations({ tara, subjects, journal, tasks, studyPlanLogs = [] }) {
  const recs = [];
  if (tara.weakestSubtype && tara.weakestSubtype.total >= 3 && tara.weakestSubtype.accuracy < 65) recs.push(`TARA Assessment ${tara.weakestSubtype.name} is below 65%, so schedule two targeted 5-question sets and one methodology review.`);
  if (!journal.length || daysSince(journal[0].date_completed) >= 14) recs.push('No recent E&M journal entry in 14 days, so complete one CLAIM-MECHANISM-EVIDENCE-OBJECTION-RESPONSE entry.');
  const maths = subjects.find((s) => s.name === 'Mathematics');
  if (maths && maths.predicted_grade !== 'A*') recs.push('Maths is not yet predicted A*, so protect one high-priority quantitative revision block this week.');
  const completion = tasks.length ? tasks.filter((t) => t.status === 'completed').length / tasks.length : 1;
  const redLogs = studyPlanLogs.filter((log) => log.rag_status === 'red');
  const amberLogs = studyPlanLogs.filter((log) => log.rag_status === 'amber');
  if (redLogs.length) recs.push(`${redLogs.length} study-plan block${redLogs.length === 1 ? '' : 's'} marked red. Use the next spillover slot for reteaching or slower practice.`);
  if (!redLogs.length && amberLogs.length >= 3) recs.push(`${amberLogs.length} study-plan blocks are amber. Choose the most repeated topic and move it into deliberate practice.`);
  if (completion < 0.6) recs.push('Weekly completion is below 60%, so reduce next week’s workload and prioritise fewer high-value tasks.');
  return recs.slice(0, 4);
}

function readiness({ tara, subjects, journal, reasoning, milestones, tasks, studyPlanLogs = [] }) {
  const academic = subjects.length ? Math.round(subjects.reduce((s, item) => s + (latestPercent(item) || 0), 0) / subjects.length) : 0;
  const taskCompletion = tasks.length ? Math.round((tasks.filter((t) => t.status === 'completed').length / tasks.length) * 100) : 0;
  const planLogging = studyPlanLogs.length ? Math.min(100, studyPlanLogs.length * 4) : 0;
  const milestoneCompletion = milestones.length ? Math.round((milestones.filter((m) => m.status === 'completed').length / milestones.length) * 100) : 0;
  return {
    'Academic Strength': band(academic),
    'TARA Assessment Readiness': band(tara.overallAccuracy),
    'Supercurricular Depth': band(Math.min(100, journal.length * 18)),
    'Reading / Thinking Readiness': band(reasoning.length ? 45 : 0),
    'Application Readiness': band(Math.max(taskCompletion, milestoneCompletion, planLogging)),
    'Interview Readiness': band(reasoning.length && milestoneCompletion > 30 ? 45 : 0)
  };
}

function latestPercent(subject) {
  return subject.academic_results?.[0]?.percentage || 0;
}

function band(score) {
  const label = score >= 85 ? 'Very Strong' : score >= 70 ? 'Strong' : score >= 40 ? 'Developing' : score > 0 ? 'Early' : 'Not Started';
  return { score, label };
}

function readLocal() {
  const db = JSON.parse(localStorage.getItem(localKey) || '{"user_profiles":[],"attempts":[],"responses":[],"weekly_programmes":[],"weekly_tasks":[],"subjects":[],"academic_results":[],"academic_topics":[],"journal_entries":[],"oxford_reasoning_sessions":[],"milestones":[],"weekly_reviews":[],"interview_sessions":[],"tara_error_analysis":[],"study_plan_logs":[]}');
  db.user_profiles = (db.user_profiles || []).map((profile) => ({ parent_digest_enabled: false, parent_digest_time: '06:00', ...profile }));
  db.study_plan_logs ||= [];
  return db;
}

function writeLocal(db) {
  localStorage.setItem(localKey, JSON.stringify(db));
}

function isMissingDigestColumn(error) {
  return Boolean(error?.message && error.message.includes('parent_digest_'));
}

function stripDigestColumns(row) {
  const { parent_digest_enabled, parent_digest_time, parent_digest_timezone, parent_digest_include_no_activity, ...rest } = row;
  return rest;
}

function seedLocal(db) {
  const user = demoUser();
  db.subjects = ['Mathematics', 'Economics', 'Physics', 'History'].map((name) => ({ id: crypto.randomUUID(), user_id: user.id, name, target_grade: name === 'Mathematics' || name === 'Economics' ? 'A*' : 'A', current_estimated_grade: 'Not set', predicted_grade: 'Not set', academic_results: [], academic_topics: [] }));
  db.milestones = ['Year 12 school assessments', 'Predicted grades review', 'Summer preparation plan', 'Admissions test registration (TARA)', 'Admissions test date (TARA)', 'UCAS preparation', 'Oxford application deadline', 'Shortlist period', 'Interview preparation', 'Interview period'].map((title) => ({ id: crypto.randomUUID(), user_id: user.id, title, category: 'application', status: 'not_started', target_date: null }));
}

function demoUser() {
  return { id: 'demo-user', email: 'demo@student.local' };
}

function currentWeek() {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { week_start: start.toISOString().slice(0, 10), week_end: end.toISOString().slice(0, 10) };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysSince(value) {
  if (!value) return 999;
  return Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
}

function splitTags(value) {
  return String(value || '').split(',').map((tag) => tag.trim()).filter(Boolean);
}

function splitLines(value) {
  return String(value || '').split('\n').map((line) => line.trim()).filter(Boolean);
}

function toOptionalNumber(value) {
  return value === '' || value === null || value === undefined ? null : Number(value);
}
