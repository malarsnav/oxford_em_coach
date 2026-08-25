export const methodologies = {
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
  Flaw: [
    'Find the conclusion.',
    'Find the evidence.',
    'Rewrite the logic as: Because X, therefore Y.',
    'Ask whether X actually proves Y.',
    'Look for alternative explanations, causality mistakes, generalisations, comparison errors or missing evidence.',
    'Choose the option attacking the exact logical bridge.'
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
  'Parallel Reasoning': [
    'Ignore the topic.',
    'Map the logical structure of the original argument.',
    'Track whether the move is valid or flawed.',
    'Choose the option with the same structure, not the same subject matter.'
  ],
  'Matching Principles': [
    'Extract the general rule behind the argument.',
    'State it without the original topic.',
    'Apply that rule to each answer choice.',
    'Choose the option governed by the same principle.'
  ],
  'Selecting Relevant Information': [
    'Read the final question first.',
    'Identify the exact quantity required.',
    'Extract only the needed values, labels and units.',
    'Ignore distractor information.',
    'Check that the answer uses the correct row, column or condition.'
  ],
  'Finding Procedures': [
    'Translate every verbal condition into a constraint.',
    'Define simple variables.',
    'Use the strongest equation or restriction first.',
    'Apply inequalities and units carefully.',
    'Eliminate any option violating even one condition.'
  ],
  'Identifying Similarity': [
    'Find the underlying relationship or pattern.',
    'Ignore superficial presentation differences.',
    'Map the same structure onto each option.',
    'Reject options with a hidden mismatch in order, proportion or adjacency.'
  ]
};

export function methodologyFor(type) {
  return methodologies[type] || methodologies['Finding Procedures'];
}
