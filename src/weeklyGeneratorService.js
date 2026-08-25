import { getAlevelTopicPlan, topicTaskFor } from './aLevelTopicPlan.js';

const labels = {
  a_level: 'A-Level',
  tara: 'TARA Assessment',
  economics: 'Super-Curricular Economics',
  management: 'Super-Curricular Management',
  oxford_reasoning: 'Reading / Thinking Readiness',
  application: 'Application'
};

const PILLAR_ALLOCATION = {
  a_level: 0.5,
  tara: 0.25,
  supercurricular: 0.15,
  thinking: 0.1
};

export function getPhase(date = new Date()) {
  const month = date.getMonth();
  if (month >= 8 && month <= 11) return { name: 'Year 12 Foundation', focus: 'A-level foundations, light TARA Assessment, super-curricular breadth and reasoning habits.' };
  if (month >= 0 && month <= 5) return { name: 'Year 12 Development', focus: 'Academic strength, super-curricular depth and structured TARA Assessment.' };
  if (month >= 6 && month <= 7) return { name: 'Summer Intensive', focus: 'TARA Assessment, application evidence and Oxford-style thinking.' };
  return { name: 'Application Build', focus: 'Predicted grades, admissions-test improvement, journal depth and application evidence.' };
}

export function createProgrammeDraft(state, preferences = {}) {
  const week = currentWeek();
  const phase = getPhase();
  const targetMinutes = Number(preferences.minutes || 180);
  const workload = preferences.workload || 'standard';
  const adjustedTarget = adjustedMinutes(targetMinutes, workload, preferences.schoolWeek);
  let tasks = baseTasks(state, preferences);
  tasks = carryForwardIncompleteTasks(tasks, state);
  tasks = rebalanceByPillar(tasks, adjustedTarget);
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
  const aLevelTasks = getAlevelTopicPlan(state).map((item) => {
    const planned = topicTaskFor(item);
    return task(planned.category, planned.title, planned.description, planned.estimated_minutes, planned.priority, item.reason);
  });
  const tasks = [
    ...aLevelTasks,
    task('tara', 'Complete a 5-question TARA Assessment set', 'Use TARA Assessment Practice to complete one bite-sized set and review the methodology report.', 25, 'medium', 'Admissions-test readiness needs steady low-friction practice so mistakes become visible early.'),
    task('tara', 'Review every TARA mistake methodically', 'For each missed question, record the question type, why the chosen answer was tempting, the clue missed and the method to carry forward.', 20, 'high', 'TARA progress comes from repairing reasoning habits, not simply doing more questions.'),
    task('economics', 'Analyse one economics article', 'Record the main claim, mechanism, evidence, assumptions and one counterargument.', 35, 'medium', 'Oxford E&M preparation needs depth of thought, not just reading volume.'),
    task('management', 'Explain a strategic business choice', 'Answer: why might a company sell a product at a loss? Give at least three strategic reasons.', 20, 'low', 'Management thinking improves when strategy is linked to incentives and trade-offs.'),
    task('economics', 'Connect one A-Level idea to E&M', crossSubjectPrompt(state), 20, 'medium', 'Cross-subject synthesis helps the student turn school knowledge into Oxford-style E&M thinking.'),
    task('oxford_reasoning', 'Solve one unfamiliar reasoning prompt', 'Write assumptions first, answer, revise after a hint, then reflect on what changed.', 20, 'medium', 'Interview-style reasoning rewards assumptions, clarity and adaptability.')
  ];
  if (state?.tara?.weakestSubtype?.accuracy < 65) {
    tasks.push(task('tara', `Target weak sub-type: ${state.tara.weakestSubtype.name}`, `Accuracy in ${state.tara.weakestSubtype.name} is below 65%. Complete one focused 5-question set and write the transferable method.`, 30, 'high', `Recent ${state.tara.weakestSubtype.name} accuracy is ${state.tara.weakestSubtype.accuracy}%, so this needs targeted repair.`));
  }
  if (preferences.priority === 'application') {
    tasks.push(task('application', 'Capture one application evidence point', 'Convert one journal or school achievement into a concise example that could support a personal statement paragraph.', 25, 'medium', 'You asked for more application/interview work this week.'));
  }
  if (preferences.priority && preferences.priority !== 'none' && preferences.priority !== 'application') {
    tasks.push(priorityTask(preferences.priority));
  }
  return tasks;
}

function task(category, title, description, estimated_minutes, priority, recommendation_reason = '') {
  return { category, title, description, estimated_minutes, priority, recommendation_reason, due_date: currentWeek().week_end, status: 'not_started' };
}

function priorityTask(category) {
  const byCategory = {
    tara: task('tara', 'Extra targeted TARA Assessment set', 'Complete one additional 5-question set using the weakest available sub-type filter.', 25, 'high', 'You selected More admissions-test practice for this week.'),
    economics: task('economics', 'Deepen one economics mechanism', 'Choose one school or article topic and explain the mechanism, assumptions and counterargument.', 30, 'high', 'You selected More Economics for this week.'),
    management: task('management', 'Compare two business strategies', 'Pick two firms in the same market and explain how their incentives, costs and positioning differ.', 30, 'high', 'You selected More Management for this week.'),
    a_level: task('a_level', 'Protect one weak A-Level topic', 'Spend one focused block on the weakest currently tracked A-Level topic, then update its confidence score.', 35, 'high', 'You selected More A-Level support for this week.'),
    oxford_reasoning: task('oxford_reasoning', 'Second Oxford reasoning prompt', 'Attempt a fresh prompt and explicitly revise your answer after identifying a hidden assumption.', 25, 'high', 'You selected More Oxford Reasoning for this week.')
  };
  return byCategory[category] || byCategory.a_level;
}

function carryForwardIncompleteTasks(tasks, state) {
  const unfinished = (state?.tasks || [])
    .filter((item) => item.priority === 'high' && !['completed', 'skipped'].includes(item.status))
    .slice(0, 2)
    .map((item) => task(item.category, `Carry forward: ${item.title}`, item.description || 'Finish this high-priority task from the current programme.', item.estimated_minutes || 20, 'high', 'This high-priority task was still open, so it is carried forward before adding more workload.'));
  return [...unfinished, ...tasks];
}

function adjustedMinutes(targetMinutes, workload, schoolWeek) {
  let minutes = workload === 'light' ? targetMinutes * 0.7 : workload === 'intensive' ? targetMinutes * 1.25 : targetMinutes;
  if (schoolWeek === 'exam') minutes *= 0.75;
  if (schoolWeek === 'holiday') minutes *= 1.2;
  return Math.round(minutes);
}

function rebalanceByPillar(tasks, targetMinutes) {
  const carried = tasks.filter((item) => item.title.startsWith('Carry forward:'));
  const planned = tasks.filter((item) => !item.title.startsWith('Carry forward:'));
  const carriedMinutes = carried.reduce((sum, item) => sum + Number(item.estimated_minutes || 0), 0);
  const available = Math.max(60, targetMinutes - carriedMinutes);
  const chosen = [...carried];
  for (const [pillar, share] of Object.entries(PILLAR_ALLOCATION)) {
    const pillarTasks = planned.filter((item) => pillarFor(item.category) === pillar);
    const target = Math.max(20, Math.round(available * share));
    chosen.push(...chooseWithinBudget(pillarTasks, target));
  }
  const seen = new Set();
  const unique = chosen.filter((item) => {
    const key = `${item.category}:${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return trimToBudget(unique, targetMinutes);
}

function chooseWithinBudget(tasks, targetMinutes) {
  const ordered = [...tasks].sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));
  const chosen = [];
  let total = 0;
  for (const task of ordered) {
    if (total + task.estimated_minutes <= targetMinutes || !chosen.length) {
      chosen.push(task);
      total += task.estimated_minutes;
    }
  }
  return chosen;
}

function trimToBudget(tasks, targetMinutes) {
  let total = tasks.reduce((sum, item) => sum + Number(item.estimated_minutes || 0), 0);
  const chosen = [...tasks];
  const flexibleLimit = Math.round(targetMinutes * 1.1);
  while (total > flexibleLimit && chosen.length > 4) {
    const removableIndex = [...chosen]
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.priority !== 'high' && !item.title.startsWith('Carry forward:'))
      .sort((a, b) => priorityWeight(b.item.priority) - priorityWeight(a.item.priority))[0]?.index;
    if (removableIndex === undefined) break;
    total -= Number(chosen[removableIndex].estimated_minutes || 0);
    chosen.splice(removableIndex, 1);
  }
  return chosen;
}

function pillarFor(category) {
  if (category === 'a_level') return 'a_level';
  if (category === 'tara') return 'tara';
  if (category === 'economics' || category === 'management') return 'supercurricular';
  if (category === 'oxford_reasoning' || category === 'application') return 'thinking';
  return 'thinking';
}

function focusFor(state, preferences, phase) {
  if (preferences.priority && preferences.priority !== 'none') return `This week emphasises ${labels[preferences.priority] || preferences.priority} while maintaining ${phase.focus}`;
  if (state?.tara?.weakestSubtype?.accuracy < 65) return `Repair ${state.tara.weakestSubtype.name} while keeping A-level foundations moving.`;
  return 'Build strong academic habits and begin light Oxford reasoning preparation.';
}

function summaryFor(state, tasks, phase) {
  const minutes = tasks.reduce((sum, task) => sum + task.estimated_minutes, 0);
  const reason = state?.tara?.weakestSubtype?.accuracy < 65 ? ` TARA Assessment ${state.tara.weakestSubtype.name} is currently weak, so targeted practice is included.` : '';
  const carried = tasks.filter((task) => task.title.startsWith('Carry forward:')).length;
  return `${phase.name}: ${minutes} minutes using the Oxford E&M preparation split of roughly 50% A-Levels, 25% TARA Assessment, 15% Super-Curricular, and 10% Reading/Thinking.${carried ? ` ${carried} high-priority task${carried === 1 ? '' : 's'} carried forward.` : ''}${reason}`;
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

function crossSubjectPrompt(state) {
  const weak = (state?.subjects || [])
    .flatMap((subject) => (subject.academic_topics || [])
      .filter((topic) => ['weak', 'developing'].includes(topic.mastery_status))
      .map((topic) => ({ subject: subject.name, topic: topic.topic_name })))
    [0];
  if (weak) return `Write a short synthesis note: how could ${weak.subject} topic "${weak.topic}" help explain an Economics or Management decision? Include one limitation of the analogy.`;
  return 'Write a short synthesis note connecting one current Maths, Physics, Economics or History topic to an E&M question. Include the mechanism, one assumption and one limitation.';
}
