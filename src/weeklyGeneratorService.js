const labels = {
  a_level: 'A-Level',
  tara: 'TARA',
  economics: 'Economics',
  management: 'Management',
  oxford_reasoning: 'Oxford Reasoning',
  application: 'Application'
};

export function getPhase(date = new Date()) {
  const month = date.getMonth();
  if (month >= 8 && month <= 11) return { name: 'Year 12 Foundation', focus: 'A-level foundations, light TARA, light supercurricular and reasoning habits.' };
  if (month >= 0 && month <= 5) return { name: 'Year 12 Development', focus: 'Academic strength, supercurricular depth and structured TARA.' };
  if (month >= 6 && month <= 7) return { name: 'Summer Intensive', focus: 'TARA, application material and Oxford reasoning.' };
  return { name: 'Application Build', focus: 'Predicted grades, TARA improvement, journal depth and application evidence.' };
}

export function createProgrammeDraft(state, preferences = {}) {
  const week = currentWeek();
  const phase = getPhase();
  const targetMinutes = Number(preferences.minutes || 180);
  const workload = preferences.workload || 'standard';
  let tasks = baseTasks(state, preferences);
  tasks = rebalance(tasks, workload === 'light' ? targetMinutes * 0.7 : workload === 'intensive' ? targetMinutes * 1.25 : targetMinutes);
  return {
    programme: {
      week_start: week.week_start,
      week_end: week.week_end,
      phase: phase.name,
      weekly_focus: focusFor(state, preferences, phase),
      coach_summary: summaryFor(state, tasks, phase),
      version: 1
    },
    tasks
  };
}

function baseTasks(state, preferences) {
  const tasks = [
    task('a_level', 'Review the week’s most difficult Maths topic', 'Identify one Maths concept from school this week that felt least secure. Rework examples until you can solve the problem without notes.', 45, 'high'),
    task('a_level', 'Explain one Economics concept from memory', 'Write a clear five-sentence explanation without notes, then check your textbook and correct any gaps.', 25, 'high'),
    task('tara', 'Complete a 5-question TARA set', 'Use TARA Practice to complete one bite-sized set and review the methodology report.', 25, 'medium'),
    task('economics', 'Analyse one economics article', 'Record the main claim, mechanism, evidence, assumptions and one counterargument.', 35, 'medium'),
    task('management', 'Explain a strategic business choice', 'Answer: why might a company sell a product at a loss? Give at least three strategic reasons.', 20, 'low'),
    task('oxford_reasoning', 'Solve one unfamiliar reasoning prompt', 'Write assumptions first, answer, revise after a hint, then reflect on what changed.', 20, 'medium')
  ];
  if (state?.tara?.weakestType?.accuracy < 65) {
    tasks.push(task('tara', `Target weak type: ${state.tara.weakestType.name}`, `Accuracy in ${state.tara.weakestType.name} is below 65%. Complete one focused 5-question set and write the transferable method.`, 30, 'high'));
  }
  if (preferences.priority === 'application') {
    tasks.push(task('application', 'Capture one application evidence point', 'Convert one journal or school achievement into a concise example that could support a personal statement paragraph.', 25, 'medium'));
  }
  return tasks;
}

function task(category, title, description, estimated_minutes, priority) {
  return { category, title, description, estimated_minutes, priority, due_date: currentWeek().week_end, status: 'not_started' };
}

function rebalance(tasks, targetMinutes) {
  const ordered = [...tasks].sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));
  const chosen = [];
  let total = 0;
  for (const task of ordered) {
    if (total + task.estimated_minutes <= targetMinutes || chosen.length < 4) {
      chosen.push(task);
      total += task.estimated_minutes;
    }
  }
  return chosen;
}

function focusFor(state, preferences, phase) {
  if (preferences.priority && preferences.priority !== 'none') return `This week emphasises ${labels[preferences.priority] || preferences.priority} while maintaining ${phase.focus}`;
  if (state?.tara?.weakestType?.accuracy < 65) return `Repair ${state.tara.weakestType.name} while keeping A-level foundations moving.`;
  return 'Build strong academic habits and begin light Oxford reasoning preparation.';
}

function summaryFor(state, tasks, phase) {
  const minutes = tasks.reduce((sum, task) => sum + task.estimated_minutes, 0);
  const reason = state?.tara?.weakestType?.accuracy < 65 ? ` TARA ${state.tara.weakestType.name} is currently weak, so targeted practice is included.` : '';
  return `${phase.name}: ${minutes} minutes of focused work across ${new Set(tasks.map((task) => task.category)).size} preparation areas.${reason}`;
}

function priorityWeight(priority) {
  return priority === 'high' ? 1 : priority === 'medium' ? 2 : 3;
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
