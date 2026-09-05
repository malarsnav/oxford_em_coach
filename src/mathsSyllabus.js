// Student-facing summaries of Pearson Edexcel 9MA0, Issue 4 (February 2020).
// References are scoped by paper section; Paper 3 restarts numbering at 1.
// Source: user-supplied a-level-l3-mathematics-specification-issue4.pdf,
// printed pages 11-28 and 30-38 (PDF pages 15-32 and 34-42).
// These are A-Level content labels, not verified AS eligibility or mastery claims.
export const MATHS_SPEC = { id: 'edexcel-9ma0-issue4', label: 'Edexcel A-Level Mathematics (9MA0), Issue 4' };
const groups = [
  ['Pure', '1', 'Proof', [
    ['1.1','Deduction, exhaustion, counterexamples and contradiction']]],
  ['Pure','2','Algebra and functions',[
    ['2.1','Laws of indices'],['2.2','Surds and rationalising denominators'],
    ['2.3','Quadratics: discriminant, completing the square and equations'],
    ['2.4','Simultaneous equations'],['2.5','Linear and quadratic inequalities'],
    ['2.6','Polynomials, factor theorem and rational expressions'],['2.7','Graphs, modulus, reciprocals and proportional relationships'],
    ['2.8','Composite and inverse functions, domain and range'],['2.9','Transformations of graphs'],
    ['2.10','Partial fractions'],['2.11','Functions in modelling']]],
  ['Pure','3','Coordinate geometry',[
    ['3.1','Straight lines, parallel and perpendicular gradients'],['3.2','Circles and tangents'],
    ['3.3','Parametric and Cartesian equations'],['3.4','Parametric modelling']]],
  ['Pure','4','Sequences and series',[
    ['4.1','Binomial expansions, including rational powers and validity'],['4.2','Sequences and recurrence relations'],
    ['4.3','Sigma notation'],['4.4','Arithmetic sequences and series'],['4.5','Geometric sequences and series'],['4.6','Sequences and series in modelling']]],
  ['Pure','5','Trigonometry',[
    ['5.1','Sine and cosine rules, triangle area and radians'],['5.2','Small-angle approximations'],
    ['5.3','Trigonometric graphs, periodicity and exact values'],['5.4','Reciprocal and inverse trigonometric functions'],
    ['5.5','Trigonometric identities'],['5.6','Addition, double-angle and harmonic forms'],
    ['5.7','Solving trigonometric equations'],['5.8','Proving trigonometric identities'],['5.9','Trigonometric modelling']]],
  ['Pure','6','Exponentials and logarithms',[
    ['6.1','Exponential functions and graphs'],['6.2','Exponential gradients and rate of change'],
    ['6.3','Logarithms and inverse functions'],['6.4','Laws of logarithms'],['6.5','Solving exponential equations'],
    ['6.6','Logarithmic graphs and estimating parameters'],['6.7','Growth, decay and model limitations']]],
  ['Pure','7','Differentiation',[
    ['7.1','First principles, gradient functions and second derivatives'],['7.2','Differentiating standard functions'],
    ['7.3','Tangents, normals, stationary points and optimisation'],
    ['7.4','Product, quotient and chain rules; connected rates'],['7.5','Implicit and parametric differentiation'],['7.6','Forming differential equations']]],
  ['Pure','8','Integration',[
    ['8.1','Fundamental theorem and integration constants'],['8.2','Integrating standard functions'],
    ['8.3','Definite integrals and areas'],['8.4','Integration as a limit of a sum'],
    ['8.5','Substitution and integration by parts'],['8.6','Integration using partial fractions'],
    ['8.7','Separable differential equations'],['8.8','Interpreting differential equation models']]],
  ['Pure','9','Numerical methods',[
    ['9.1','Locating roots and limitations of sign changes'],['9.2','Iteration, cobweb and staircase diagrams'],
    ['9.3','Newton-Raphson and convergence failures'],['9.4','Trapezium rule and numerical integration'],['9.5','Numerical methods in context']]],
  ['Pure','10','Vectors',[
    ['10.1','Vectors in two and three dimensions'],['10.2','Magnitude, direction and unit vectors'],
    ['10.3','Vector addition and scalar multiplication'],['10.4','Position vectors and distances'],['10.5','Vector geometry and applications']]],
  ['Statistics','1','Statistical sampling',[
    ['1.1','Populations, samples and sampling techniques']]],
  ['Statistics','2','Data presentation and interpretation',[
    ['2.1','Histograms and single-variable diagrams'],['2.2','Scatter diagrams, regression and correlation'],
    ['2.3','Averages, variation, standard deviation and coding'],['2.4','Outliers, data cleaning and interpretation']]],
  ['Statistics','3','Probability',[
    ['3.1','Independent and mutually exclusive events'],['3.2','Conditional probability, trees and Venn diagrams'],['3.3','Probability models and assumptions']]],
  ['Statistics','4','Statistical distributions',[
    ['4.1','Discrete distributions and binomial probabilities'],['4.2','Normal distribution and binomial approximation'],['4.3','Choosing and evaluating a distribution model']]],
  ['Statistics','5','Statistical hypothesis testing',[
    ['5.1','Hypotheses, significance, critical regions and correlation tests'],['5.2','Tests for a binomial proportion'],['5.3','Tests for a Normal mean']]],
  ['Mechanics','6','Quantities and units',[
    ['6.1','SI quantities, units and conversions']]],
  ['Mechanics','7','Kinematics',[
    ['7.1','Displacement, distance, velocity, speed and acceleration'],['7.2','Motion graphs'],
    ['7.3','Constant acceleration in one and two dimensions'],['7.4','Calculus in motion, including vectors'],['7.5','Projectiles']]],
  ['Mechanics','8',"Forces and Newton's laws",[
    ['8.1',"Forces and Newton's first law"],['8.2',"Newton's second law and resolving forces"],
    ['8.3','Weight and motion under gravity'],['8.4',"Newton's third law, equilibrium and connected particles"],
    ['8.5','Resultant forces and planar dynamics'],['8.6','Friction, limiting equilibrium and rough surfaces']]],
  ['Mechanics','9','Moments',[
    ['9.1','Moments and equilibrium of rigid bodies']]]
];

export const MATHS_TOPICS = groups.map(([section, number, topic, items]) => ({
  id: `${MATHS_SPEC.id}:${section}:${number}`, section, topic,
  items: items.map(([ref, label]) => ({id: `${MATHS_SPEC.id}:${section}:${ref}`, ref, label, topic, section}))
}));
export const MATHS_ITEMS = MATHS_TOPICS.flatMap(g => [
  {id:g.id + ':general', label:'Topic overview', topic:g.topic, section:g.section, ref:''}, ...g.items
]);
