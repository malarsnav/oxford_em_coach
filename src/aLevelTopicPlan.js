const TOPIC_CATALOGUE = {
  Mathematics: [
    'Algebraic manipulation and factorisation',
    'Quadratics and inequalities',
    'Functions and graphs',
    'Differentiation basics',
    'Integration basics',
    'Coordinate geometry',
    'Sequences and series',
    'Logarithms and exponentials',
    'Trigonometry identities',
    'Probability and distributions',
    'Hypothesis testing',
    'Mechanics: constant acceleration'
  ],
  Economics: [
    'Demand, supply and market equilibrium',
    'Elasticities',
    'Market failure and externalities',
    'Government intervention',
    'Costs, revenues and profit',
    'Market structures',
    'Labour markets',
    'Macroeconomic objectives',
    'Aggregate demand and aggregate supply',
    'Fiscal policy',
    'Monetary policy',
    'International trade and exchange rates'
  ],
  Physics: [
    'Mechanics and forces',
    'Materials and stress-strain',
    'Waves and superposition',
    'Electricity and circuits',
    'Particle physics',
    'Quantum phenomena',
    'Measurements and uncertainties',
    'Energy and power'
  ],
  History: [
    'Essay argument structure',
    'Source evaluation',
    'Causation and consequence',
    'Change and continuity',
    'Historical interpretations',
    'Evidence selection',
    'Comparative judgement',
    'Evaluation paragraphs'
  ]
};

const SUBJECT_PRIORITY = ['Mathematics', 'Economics', 'Physics', 'History'];

export function getAlevelTopicPlan(state, date = new Date()) {
  const weakTopics = topicsFromStudentData(state);
  const weekIndex = weekOfYear(date);
  const planned = [...weakTopics];

  for (const subject of SUBJECT_PRIORITY) {
    if (planned.filter((item) => item.subject === subject).length) continue;
    const catalogue = TOPIC_CATALOGUE[subject] || [];
    const topic = catalogue[(weekIndex + SUBJECT_PRIORITY.indexOf(subject) * 3) % catalogue.length];
    planned.push({
      subject,
      topic,
      reason: subject === 'Mathematics' || subject === 'Economics'
        ? 'Core Oxford E&M foundation topic for this week.'
        : 'Supporting A-Level topic to keep academic breadth secure.',
      source: 'weekly_rotation'
    });
  }

  return planned.slice(0, 4);
}

export function topicTaskFor(item) {
  const highPriority = item.subject === 'Mathematics' || item.subject === 'Economics' || item.source === 'student_data';
  const method = item.subject === 'Economics'
    ? 'Write a five-sentence explanation, draw or describe the mechanism, add one real-world example, then answer one exam-style question.'
    : item.subject === 'History'
      ? 'Create a short argument plan, choose evidence for and against, then write one evaluation paragraph from memory.'
      : 'Rework core examples without notes, complete mixed practice questions, then explain the method aloud in under two minutes.';

  return {
    category: 'a_level',
    title: `Master ${item.subject}: ${item.topic}`,
    description: `${item.reason} ${method}`,
    estimated_minutes: highPriority ? 45 : 30,
    priority: highPriority ? 'high' : 'medium'
  };
}

function topicsFromStudentData(state) {
  const subjects = state?.subjects || [];
  const fromTopicTracker = subjects.flatMap((subject) =>
    (subject.academic_topics || [])
      .filter((topic) => ['weak', 'developing'].includes(topic.mastery_status))
      .map((topic) => ({
        subject: subject.name,
        topic: topic.topic_name,
        reason: `${topic.mastery_status === 'weak' ? 'Weak' : 'Developing'} topic recorded in the A-Level tracker.`,
        source: 'student_data'
      }))
  );

  const fromRecentResults = subjects.flatMap((subject) =>
    (subject.academic_results || [])
      .filter((result) => result.topic && Number(result.percentage || 0) < 75)
      .slice(0, 2)
      .map((result) => ({
        subject: subject.name,
        topic: result.topic,
        reason: `Recent assessment was ${result.percentage || 'below target'}%, so this needs consolidation.`,
        source: 'student_data'
      }))
  );

  return dedupeTopics([...fromTopicTracker, ...fromRecentResults])
    .sort((a, b) => subjectWeight(a.subject) - subjectWeight(b.subject));
}

function dedupeTopics(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.subject}:${item.topic}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function subjectWeight(subject) {
  const index = SUBJECT_PRIORITY.indexOf(subject);
  return index === -1 ? 99 : index;
}

function weekOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date - start) / 604800000);
}
