export const TOP_LEVEL_TYPES = [
  'Critical Thinking',
  'Numerical Reasoning & Problem-Solving'
];

export const CRITICAL_THINKING_SUBTYPES = [
  'Identifying the Main Conclusion',
  'Drawing a Conclusion',
  'Identifying Assumptions',
  'Detecting Reasoning Errors (Flaws)',
  'Assessing Additional Evidence',
  'Applying Principles',
  'Matching Arguments (Parallel Reasoning)'
];

export const NUMERICAL_REASONING_SUBTYPES = [
  'Basic Arithmetic Operations',
  'Percentages and Ratios',
  'Real-Life Measurements',
  'Data Interpretation',
  'Spatial and Logical Problem-Solving'
];

export const ALL_SUBTYPES = [
  ...CRITICAL_THINKING_SUBTYPES,
  ...NUMERICAL_REASONING_SUBTYPES
];

export function normalizeQuestionTags(question) {
  const tags = classifyTags(question);
  return {
    ...question,
    type: tags.type,
    sub_type: tags.subType,
    family: tags.type,
    official_question_type: tags.subType,
    reasoning_pattern: tags.subType
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
    question_type: tags.type,
    reasoning_pattern: tags.subType
  };
}

export function subtypesForType(type) {
  if (type === 'Critical Thinking') return CRITICAL_THINKING_SUBTYPES;
  if (type === 'Numerical Reasoning & Problem-Solving') return NUMERICAL_REASONING_SUBTYPES;
  return ALL_SUBTYPES;
}

function classifyTags(item) {
  const rawType = clean(item.official_question_type || item.question_type || item.family);
  const rawFamily = clean(item.family || item.question_type);
  const rawPattern = clean(item.reasoning_pattern);
  const text = clean(item.question_text);

  const criticalSubtype = criticalSubtypeFrom(rawType) || criticalSubtypeFrom(rawPattern);
  if (criticalSubtype || rawFamily.includes('critical')) {
    return {
      type: 'Critical Thinking',
      subType: criticalSubtype || 'Drawing a Conclusion'
    };
  }

  return {
    type: 'Numerical Reasoning & Problem-Solving',
    subType: numericalSubtypeFrom(`${rawType} ${rawPattern} ${text}`)
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

function numericalSubtypeFrom(value) {
  if (/\b(percent|percentage|ratio|proportion|discount|scale|fraction)\b/.test(value)) return 'Percentages and Ratios';
  if (/\b(rate|resource|conversion|time|date|hour|minute|currency|money|pound|dollar|euro|metre|meter|litre|liter|weight|area|volume|speed|distance|unit)\b/.test(value)) return 'Real-Life Measurements';
  if (/\b(table|chart|graph|schedule|timetable|data|row|column|extract|selection|relevant information|queue|overlap)\b/.test(value)) return 'Data Interpretation';
  if (/\b(spatial|rotation|cube|net|grid|shape|diagram|pattern|logical|similarity|adjacency|tile)\b/.test(value)) return 'Spatial and Logical Problem-Solving';
  return 'Basic Arithmetic Operations';
}

function clean(value) {
  return String(value || '').toLowerCase();
}
