export const BROAD_TYPES = [
  'Critical Thinking',
  'Numerical Reasoning & Problem-Solving'
];

export const TOP_LEVEL_TYPES = BROAD_TYPES;

export const CRITICAL_THINKING_SUBTYPES = [
  'Identifying the Main Conclusion',
  'Drawing a Conclusion',
  'Identifying Assumptions',
  'Detecting Reasoning Errors (Flaws)',
  'Assessing Additional Evidence',
  'Applying Principles',
  'Matching Arguments (Parallel Reasoning)'
];

export const CRITICAL_THINKING_OBJECTIVES = {
  'Structural Analysis': [
    'Identifying the Main Conclusion',
    'Identifying Assumptions',
    'Matching Arguments (Parallel Reasoning)'
  ],
  'Evaluative Analysis': [
    'Detecting Reasoning Errors (Flaws)',
    'Assessing Additional Evidence',
    'Drawing a Conclusion'
  ],
  'Applied Logic': [
    'Applying Principles'
  ]
};

export const PROBLEM_SOLVING_SUBTYPES = [
  'Relevant Selection',
  'Finding Procedures',
  'Spatial Reasoning & Pattern Analysis'
];

export const PROBLEM_SOLVING_TOPIC_TAGS = [
  'Data Filtering & Table Extraction',
  'Identifying Missing Constraints',
  'Rate, Ratio & Multi-step Arithmetic',
  'Cost-Optimization & Combinatorics',
  'Work Rates & Motion Dynamics',
  '3D Net Folding & Block Rotating',
  'Timetable & Gantt/Schedule Optimization',
  'Abstract Pattern Logic'
];

export const ALL_SUBTYPES = [
  ...CRITICAL_THINKING_SUBTYPES,
  ...PROBLEM_SOLVING_SUBTYPES
];

export function normalizeQuestionTags(question) {
  const tags = classifyTags(question);
  const normalized = {
    ...question,
    type: tags.broadType,
    sub_type: tags.subType,
    broad_type: tags.broadType,
    topic_tag: tags.topicTag,
    critical_objective: tags.criticalObjective,
    time_budget_seconds: timeBudgetSeconds(question, tags),
    distractor_analysis: distractorAnalysis(question),
    has_image: Boolean(question.visuals?.length),
    requires_spatial_processing: tags.requiresSpatialProcessing,
    em_concept_link: emConceptLink(tags)
  };

  return {
    ...normalized,
    metadata: {
      question_id: question.id,
      paper_year: question.paper_year,
      paper_name: question.paper || 'TSA Section 1',
      question_num: question.question_number,
      broad_type: normalized.broad_type,
      sub_type: normalized.sub_type,
      topic_tag: normalized.topic_tag,
      critical_objective: normalized.critical_objective,
      time_budget_seconds: normalized.time_budget_seconds,
      distractor_analysis: normalized.distractor_analysis,
      has_image: normalized.has_image,
      requires_spatial_processing: normalized.requires_spatial_processing,
      em_concept_link: normalized.em_concept_link
    }
  };
}

export function normalizeResponseTags(response) {
  const tags = classifyTags({
    family: response.question_type,
    official_question_type: response.question_type,
    reasoning_pattern: response.reasoning_pattern,
    question_text: ''
  });
  return {
    ...response,
    question_type: tags.broadType,
    reasoning_pattern: tags.subType,
    topic_tag: response.topic_tag || tags.topicTag
  };
}

export function subtypesForType(type) {
  if (type === 'Critical Thinking') return CRITICAL_THINKING_SUBTYPES;
  if (type === 'Numerical Reasoning & Problem-Solving') return PROBLEM_SOLVING_SUBTYPES;
  return ALL_SUBTYPES;
}

export function objectiveForCriticalSubtype(subType) {
  return Object.entries(CRITICAL_THINKING_OBJECTIVES)
    .find(([, subTypes]) => subTypes.includes(subType))?.[0] || null;
}

function classifyTags(item) {
  const rawType = clean(item.official_question_type || item.question_type || item.family || item.type);
  const rawFamily = clean(item.family || item.question_type || item.type);
  const rawPattern = clean(item.reasoning_pattern || item.specificPattern || item.pattern || item.topic_tag);
  const text = clean(item.question_text || item.question);

  const criticalSubtype = criticalSubtypeFrom(rawType) || criticalSubtypeFrom(rawPattern);
  if (criticalSubtype || rawFamily.includes('critical')) {
    return {
      broadType: 'Critical Thinking',
      subType: criticalSubtype || 'Drawing a Conclusion',
      topicTag: criticalSubtype || 'Drawing a Conclusion',
      criticalObjective: objectiveForCriticalSubtype(criticalSubtype || 'Drawing a Conclusion'),
      requiresSpatialProcessing: false
    };
  }

  const problem = problemSolvingTags(`${rawType} ${rawPattern} ${text}`);
  return {
    broadType: 'Numerical Reasoning & Problem-Solving',
    subType: problem.subType,
    topicTag: problem.topicTag,
    criticalObjective: null,
    requiresSpatialProcessing: problem.subType === 'Spatial Reasoning & Pattern Analysis' || /spatial|rotation|cube|net|grid|shape|diagram|adjacency|tile/.test(`${rawPattern} ${text}`)
  };
}

function criticalSubtypeFrom(value) {
  if (!value) return null;
  if (value.includes('main conclusion') || value.includes('conclusion vs reasons')) return 'Identifying the Main Conclusion';
  if (value.includes('drawing a conclusion') || value.includes('inference')) return 'Drawing a Conclusion';
  if (value.includes('assumption') || value.includes('missing link')) return 'Identifying Assumptions';
  if (value.includes('flaw') || value.includes('error') || value.includes('correlation') || value.includes('causation') || value.includes('overgeneralisation') || value.includes('invalid')) return 'Detecting Reasoning Errors (Flaws)';
  if (value.includes('additional evidence') || value.includes('strengthen') || value.includes('weaken') || value.includes('new evidence')) return 'Assessing Additional Evidence';
  if (value.includes('matching principles') || value.includes('principle') || value.includes('general rule')) return 'Applying Principles';
  if (value.includes('parallel') || value.includes('argument structure match')) return 'Matching Arguments (Parallel Reasoning)';
  return null;
}

function problemSolvingTags(value) {
  if (/\b(table|chart|graph|data|row|column|extract|selection|relevant information)\b/.test(value)) {
    return { subType: 'Relevant Selection', topicTag: 'Data Filtering & Table Extraction' };
  }
  if (/\b(constraint|condition|must|cannot|at least|at most|minimum|maximum|missing)\b/.test(value)) {
    return { subType: 'Relevant Selection', topicTag: 'Identifying Missing Constraints' };
  }
  if (/\b(schedule|timetable|gantt|queue|overlap|hour|minute|date|calendar)\b/.test(value)) {
    return { subType: 'Spatial Reasoning & Pattern Analysis', topicTag: 'Timetable & Gantt/Schedule Optimization' };
  }
  if (/\b(spatial|rotation|cube|net|block|3d|grid|shape|diagram|adjacency|tile)\b/.test(value)) {
    return { subType: 'Spatial Reasoning & Pattern Analysis', topicTag: '3D Net Folding & Block Rotating' };
  }
  if (/\b(rate|speed|distance|work|motion|flow|per hour|per minute)\b/.test(value)) {
    return { subType: 'Finding Procedures', topicTag: 'Work Rates & Motion Dynamics' };
  }
  if (/\b(cost|price|profit|cheap|expensive|optim|combination|combinatoric|bottleneck|maximum|minimum)\b/.test(value)) {
    return { subType: 'Finding Procedures', topicTag: 'Cost-Optimization & Combinatorics' };
  }
  if (/\b(pattern|sequence|cycle|logic|similarity|abstract)\b/.test(value)) {
    return { subType: 'Spatial Reasoning & Pattern Analysis', topicTag: 'Abstract Pattern Logic' };
  }
  return { subType: 'Finding Procedures', topicTag: 'Rate, Ratio & Multi-step Arithmetic' };
}

function timeBudgetSeconds(question, tags) {
  if (tags.broadType === 'Critical Thinking') {
    if (tags.subType === 'Identifying the Main Conclusion') return 55;
    if (tags.subType === 'Matching Arguments (Parallel Reasoning)') return 105;
    return 75;
  }
  if (tags.subType === 'Relevant Selection') return question.visuals?.length ? 115 : 95;
  if (tags.subType === 'Spatial Reasoning & Pattern Analysis') return 140;
  return 110;
}

function distractorAnalysis(question) {
  const options = Object.keys(question.answer_options || {});
  return Object.fromEntries(options.map((option) => [
    `option_${option}`,
    option === question.correct_answer ? 'Correct' : genericDistractorReason(option, question)
  ]));
}

function genericDistractorReason(option, question) {
  const text = clean(question.question_text);
  if (text.includes('table') || text.includes('graph') || text.includes('chart')) return 'Likely uses the wrong row, column, chart label or extracted value.';
  if (text.includes('must') || text.includes('cannot') || text.includes('at least')) return 'Likely violates or overlooks one of the constraints.';
  if (text.includes('conclusion') || text.includes('flaw') || text.includes('assumption')) return 'Plausible distractor, but it does not perform the exact logical task asked.';
  return `Plausible distractor ${option}; check the method steps to see which condition it fails.`;
}

function emConceptLink(tags) {
  if (tags.topicTag === 'Cost-Optimization & Combinatorics') return 'Opportunity Cost / Resource Allocation';
  if (tags.topicTag === 'Data Filtering & Table Extraction') return 'Evidence Selection / Data Use';
  if (tags.topicTag === 'Rate, Ratio & Multi-step Arithmetic') return 'Marginal Change / Proportional Reasoning';
  if (tags.subType === 'Relevant Selection') return 'Decision-Making Under Constraints';
  if (tags.broadType === 'Critical Thinking') return 'Argument Evaluation / Evidence Quality';
  return 'Structured Problem Solving';
}

function clean(value) {
  return String(value || '').toLowerCase();
}
