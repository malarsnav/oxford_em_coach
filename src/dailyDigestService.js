const DAY_MS = 86400000;

export function buildDailyDigest(data, date = previousLocalDate()) {
  const tasks = data.tasks || [];
  const attempts = attemptsForDate(data.tara?.attempts || [], date);
  const responses = responsesForAttempts(data.tara?.responses || [], attempts);
  const completedTasks = tasksForDate(tasks, date, 'completed');
  const skippedTasks = tasksForDate(tasks, date, 'skipped');
  const academicResults = rowsForDate(flatResults(data.subjects || []), date, ['assessment_date', 'created_at']);
  const journalEntries = rowsForDate(data.journal || [], date, ['date_completed', 'created_at']);
  const reasoningSessions = rowsForDate(data.reasoning || [], date, ['date', 'created_at']);
  const totalQuestions = responses.length;
  const correct = responses.filter((response) => response.is_correct).length;
  const weakTypes = weakestGroups(responses, 'question_type');
  const weakSubtypes = weakestGroups(responses, 'reasoning_pattern');
  const recommendations = buildDigestRecommendations({ attempts, responses, weakSubtypes, completedTasks, skippedTasks, journalEntries, reasoningSessions, appRecommendations: data.recommendations || [] });

  return {
    date,
    hasActivity: Boolean(attempts.length || completedTasks.length || skippedTasks.length || academicResults.length || journalEntries.length || reasoningSessions.length),
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

function buildDigestRecommendations({ attempts, responses, weakSubtypes, completedTasks, skippedTasks, journalEntries, reasoningSessions, appRecommendations }) {
  const recs = [];
  if (attempts.length && weakSubtypes[0]?.accuracy < 70) recs.push(`Review ${weakSubtypes[0].name}: yesterday's accuracy was ${weakSubtypes[0].accuracy}%.`);
  if (responses.some((response) => !response.is_correct)) recs.push('Spend 10 minutes reviewing every missed TARA Assessment question before starting a new set.');
  if (skippedTasks.length) recs.push('Look at skipped weekly tasks and either reschedule or deliberately remove them from this week.');
  if (!journalEntries.length && !reasoningSessions.length) recs.push('Add one short E&M journal or Oxford reasoning reflection today to keep depth building.');
  if (!completedTasks.length && !attempts.length) recs.push('Start with one small task today: either a 5-question TARA Assessment set or one high-priority weekly task.');
  return [...recs, ...appRecommendations].slice(0, 4);
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
