import { generatedQuestionBank } from './questionBank.generated.js';
import { normalizeQuestionTags } from './tagTaxonomy.js';

export const questions = generatedQuestionBank.map(normalizeQuestionTags);
