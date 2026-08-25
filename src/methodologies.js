export const methodologies = {
  'Identifying the Main Conclusion': [
    'Read the question stem first.',
    'Find the author’s central claim, not just a true detail.',
    'Separate background, examples and reasons from the final point being argued.',
    'Ask: what is the author trying to get me to accept?',
    'Reject options that are only evidence, context or one example.'
  ],
  'Main Conclusion': [
    'Read the question stem first.',
    'Identify the author’s central claim.',
    'Separate reasons and examples from conclusions.',
    'Ask what the author is trying to persuade you to accept.',
    'Match the answer to the argument as a whole.',
    'Reject answers that capture only one example or supporting point.'
  ],
  Assumption: [
    'Find the conclusion.',
    'Find the stated reasons.',
    'Identify the unstated bridge between them.',
    'Test options using the negation test.',
    'The correct assumption is something the argument requires.'
  ],
  'Identifying Assumptions': [
    'Find the conclusion.',
    'Find the stated reasons.',
    'Ask what unstated bridge must be true for the reasons to support the conclusion.',
    'Use the negation test: if denying the option breaks the argument, it is likely required.',
    'Reject options that merely strengthen the argument but are not necessary.'
  ],
  Flaw: [
    'Find the conclusion.',
    'Find the evidence.',
    'Rewrite the logic as: Because X, therefore Y.',
    'Ask whether X actually proves Y.',
    'Look for alternative explanations, causality mistakes, generalisations, comparison errors or missing evidence.',
    'Choose the option attacking the exact logical bridge.'
  ],
  'Detecting Reasoning Errors (Flaws)': [
    'Find the conclusion.',
    'Find the evidence.',
    'Rewrite the argument as: because X, therefore Y.',
    'Ask whether X really proves Y.',
    'Look for causation errors, overgeneralisation, false comparison, missing evidence or alternative explanations.',
    'Choose the option that attacks the exact bridge from evidence to conclusion.'
  ],
  'Drawing a Conclusion': [
    'Treat the passage as the only evidence.',
    'Ask what must follow.',
    'Reject claims stronger than the evidence.',
    'Reject outside knowledge.',
    'Choose the narrowest fully supported conclusion.'
  ],
  'Additional Evidence / Strengthen / Weaken': [
    'Find the argument’s conclusion and support.',
    'Ask what would make the link more or less believable.',
    'Ignore options that are merely interesting background.',
    'Choose evidence that changes the strength of the exact argument.'
  ],
  'Assessing Additional Evidence': [
    'Identify the original conclusion first.',
    'Identify the evidence currently supporting it.',
    'Ask whether the new information makes the conclusion more or less likely.',
    'Ignore options that are interesting but do not affect the argument’s logical link.',
    'Choose the option that changes the strength of the exact argument.'
  ],
  'Parallel Reasoning': [
    'Ignore the topic.',
    'Map the logical structure of the original argument.',
    'Track whether the move is valid or flawed.',
    'Choose the option with the same structure, not the same subject matter.'
  ],
  'Matching Arguments (Parallel Reasoning)': [
    'Ignore the subject matter.',
    'Map the skeleton of the original argument: evidence type, logical move and conclusion type.',
    'Track whether the original reasoning is valid or flawed.',
    'Compare the structure of each option, not the topic or wording.',
    'Choose the option with the same logical shape.'
  ],
  'Matching Principles': [
    'Extract the general rule behind the argument.',
    'State it without the original topic.',
    'Apply that rule to each answer choice.',
    'Choose the option governed by the same principle.'
  ],
  'Applying Principles': [
    'Extract the general rule behind the passage.',
    'State the rule without the original topic.',
    'Check the conditions under which the principle applies.',
    'Apply that same rule to each option.',
    'Choose the option governed by the same principle.'
  ],
  'Finding Procedures': [
    'Translate every verbal condition into a constraint.',
    'Define simple variables.',
    'Use the strongest equation or restriction first.',
    'Apply inequalities and units carefully.',
    'Eliminate any option violating even one condition.'
  ],
  'Relevant Selection': [
    'Read the final question first and name the exact target quantity.',
    'Mark only the values, labels, rows, columns or constraints needed for that target.',
    'Ignore distraction data even if it looks mathematically useful.',
    'Check whether any condition is missing, hidden or only implied.',
    'Choose the option that uses all relevant information and no irrelevant information.'
  ],
  'Spatial Reasoning & Pattern Analysis': [
    'Convert the visual, timetable or pattern into explicit constraints.',
    'Track position, order, adjacency, timing or repetition step by step.',
    'Use impossible cases to eliminate options quickly.',
    'Check whether the same pattern is being shown in a different format.',
    'Choose the option that satisfies every spatial, schedule or pattern constraint.'
  ]
};

export function methodologyFor(type) {
  return methodologies[type] || methodologies['Finding Procedures'];
}
