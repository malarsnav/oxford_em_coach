const DAY_MS = 86400000;

export function buildDailyDigest(data, date = previousLocalDate()) {
  const tasks = data.tasks || [];
  const attempts = attemptsForDate(data.tara?.attempts || [], date);
  const responses = responsesForAttempts(data.tara?.responses || [], attempts);
  const completedTasks = tasksForDate(tasks, date, 'completed');
  const skippedTasks = tasksForDate(tasks, date, 'skipped');
  const academicResults = rowsForDate(flatResults(data.subjects || []), date, ['assessment_date', 'completed_at', 'updated_at', 'created_at']);
  const journalEntries = [];
  const reasoningSessions = [];
  const studyPlanLogs = (data.studyPlanLogs || []).filter((log) => log.log_date === date);
  const totalQuestions = responses.length;
  const correct = responses.filter((response) => response.is_correct).length;
  const weakTypes = weakestGroups(responses, 'question_type');
  const weakSubtypes = weakestGroups(responses, 'reasoning_pattern');
  const recommendations = buildDigestRecommendations({ attempts, responses, weakSubtypes, completedTasks, skippedTasks, journalEntries, reasoningSessions, studyPlanLogs, appRecommendations: data.recommendations || [] });

  return {
    date,
    hasActivity: Boolean(attempts.length || completedTasks.length || skippedTasks.length || academicResults.length || journalEntries.length || reasoningSessions.length || studyPlanLogs.length),
    tara: {
      attempts,
      totalSets: attempts.length,
      totalQuestions,
      correct,
      accuracy: totalQuestions ? Math.round((correct / totalQuestions) * 100) : 0,
      weakTypes,
      weakSubtypes
    },
    weeklyProgramme: {
      completedTasks,
      skippedTasks,
      completedMinutes: completedTasks.reduce((sum, task) => sum + Number(task.estimated_minutes || 0), 0)
    },
    studyPlan: {
      logs: studyPlanLogs,
      green: studyPlanLogs.filter((log) => log.rag_status === 'green').length,
      amber: studyPlanLogs.filter((log) => log.rag_status === 'amber').length,
      red: studyPlanLogs.filter((log) => log.rag_status === 'red').length
    },
    academics: academicResults,
    journal: journalEntries,
    reasoning: reasoningSessions,
    recommendations
  };
}

export function previousLocalDate() {
  const date = new Date(Date.now() - DAY_MS);
  return formatLocalDate(date);
}

export function todayLocalDate() {
  return formatLocalDate(new Date());
}

function attemptsForDate(attempts, date) {
  return rowsForDate(attempts, date, ['completed_at', 'created_at']);
}

function responsesForAttempts(responses, attempts) {
  const attemptIds = new Set(attempts.map((attempt) => attempt.id));
  return responses.filter((response) => attemptIds.has(response.attempt_id));
}

function tasksForDate(tasks, date, status) {
  return tasks.filter((task) =>
    task.status === status &&
    [task.completed_at, task.updated_at, task.created_at].some((value) => sameLocalDate(value, date))
  );
}

function rowsForDate(rows, date, keys) {
  return rows.filter((row) => keys.some((key) => sameLocalDate(row[key], date)));
}

function flatResults(subjects) {
  return subjects.flatMap((subject) => (subject.academic_results || []).map((result) => ({ ...result, subject_name: subject.name })));
}

function weakestGroups(rows, key) {
  const groups = Object.values(rows.reduce((acc, row) => {
    const name = row[key] || 'Unclassified';
    acc[name] ||= { name, total: 0, correct: 0, accuracy: 0 };
    acc[name].total += 1;
    if (row.is_correct) acc[name].correct += 1;
    acc[name].accuracy = Math.round((acc[name].correct / acc[name].total) * 100);
    return acc;
  }, {}));
  return groups
    .filter((group) => group.total > 0)
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)
    .slice(0, 3);
}

function buildDigestRecommendations({ attempts, responses, weakSubtypes, completedTasks, skippedTasks, journalEntries, reasoningSessions, studyPlanLogs, appRecommendations }) {
  const recs = [];
  if (attempts.length && weakSubtypes[0]?.accuracy < 70) recs.push(`Review ${weakSubtypes[0].name}: yesterday's accuracy was ${weakSubtypes[0].accuracy}%.`);
  if (responses.some((response) => !response.is_correct)) recs.push('Spend 10 minutes reviewing every missed TARA Assessment question before starting a new set.');
  if (skippedTasks.length) recs.push('Look at skipped weekly tasks and either reschedule or deliberately remove them from this week.');
  if (studyPlanLogs.some((log) => log.rag_status === 'red')) recs.push('Review the red study-plan blocks and decide what needs reteaching, extra practice or spillover time.');
  if (!studyPlanLogs.length) recs.push('No standing-plan blocks were logged yesterday, so capture Learn / Practise / Assess / RAG for the next study block.');
  if (!completedTasks.length && !attempts.length) recs.push('Start with one school task or a 5-question TARA set.');
  return recs.slice(0, 4);
}

function sameLocalDate(value, expected) {
  if (!value) return false;
  return formatLocalDate(new Date(value)) === expected;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
