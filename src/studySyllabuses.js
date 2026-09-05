import { MATHS_SPEC, MATHS_TOPICS, MATHS_ITEMS } from './mathsSyllabus.js';

// Source references and scope decisions are documented in docs/year12-syllabuses.md.
// Labels summarise specification content; IDs never alias AS and A-level numbering.
function catalogue(id, label, rows) {
  const topics = rows.map(([section, number, topic, labels, level = 'as']) => ({
    id: `${id}:${section}:${number}`, section, topic, level,
    items: labels.map((value, i) => {
      const [ref, text] = Array.isArray(value) ? value : [`${number}.${i + 1}`, value];
      return { id: `${id}:${section}:${ref}`, ref, label: text, topic, section, level, spec: id };
    })
  }));
  return { id, label, topics, items: topics.flatMap(g => [
    { id: g.id + ':general', ref: '', label: 'Topic overview', topic: g.topic, section: g.section, level: g.level, spec: id }, ...g.items
  ]) };
}

export const AS_MATHS = catalogue('edexcel-8ma0-issue3', 'Edexcel AS Mathematics (8MA0), Issue 3', [
  ['Pure','1','Proof',['Deduction, exhaustion and disproof by counterexample']],
  ['Pure','2','Algebra and functions',[
    'Rational indices','Surds and rationalising denominators','Quadratics: graphs, discriminant, completing the square and equations',
    'Simultaneous equations: linear and quadratic','Linear and quadratic inequalities','Polynomials, algebraic division and factor theorem',
    'Polynomial and reciprocal graphs; asymptotes and proportional relationships','Transformations of graphs']],
  ['Pure','3','Coordinate geometry',['Straight lines, parallel and perpendicular gradients','Circles, completing the square and tangents']],
  ['Pure','4','Sequences and series',['Binomial expansion for positive integer powers; factorials and combinations']],
  ['Pure','5','Trigonometry',['Sine, cosine and tangent; sine and cosine rules; triangle area','Trigonometric graphs, symmetry and periodicity',
    'Basic trigonometric identities','Trigonometric equations in a specified interval']],
  ['Pure','6','Exponentials and logarithms',['Exponential functions and graphs','Exponential gradients and rate of change',
    'Logarithms and inverse functions','Laws of logarithms','Solving exponential equations','Logarithmic graphs and parameter estimation','Growth, decay and exponential modelling']],
  ['Pure','7','Differentiation',['Derivatives, first principles, gradient functions and second derivatives','Differentiating rational powers, sums and multiples',
    'Tangents, normals, stationary points, optimisation and increasing/decreasing functions']],
  ['Pure','8','Integration',['Integration as reverse differentiation; constant of integration','Integrating powers, sums and multiples','Definite integrals and areas']],
  ['Pure','9','Vectors',['Vectors in two dimensions','Magnitude, direction and unit vectors','Vector addition and scalar multiplication','Position vectors and distances','Vector problems in geometry and context']],
  ['Statistics','1','Statistical sampling',['Populations, samples and sampling methods; inferences and limitations']],
  ['Statistics','2','Data presentation and interpretation',['Histograms, cumulative frequency and box plots','Scatter diagrams, regression and correlation',
    'Central tendency, variation and standard deviation','Outliers, data cleaning and evaluating representations']],
  ['Statistics','3','Probability',['Mutually exclusive and independent events; tree and Venn diagrams']],
  ['Statistics','4','Statistical distributions',['Discrete probability distributions and the binomial model']],
  ['Statistics','5','Statistical hypothesis testing',['Hypotheses, significance, tails and critical regions','Binomial proportion tests and interpretation']],
  ['Mechanics','6','Quantities and units',['SI quantities, derived units and conversions']],
  ['Mechanics','7','Kinematics',['Position, displacement, speed, velocity and acceleration','Displacement-time and velocity-time graphs','Constant acceleration in a straight line','Calculus for straight-line motion']],
  ['Mechanics','8',"Forces and Newton's laws",["Forces and Newton's first law","Newton's second law: straight-line motion",'Weight and motion under gravity',"Newton's third law, equilibrium, pulleys and connected particles"]]
]);

export const AS_PHYSICS = catalogue('ocr-h156-v2', 'OCR AS Physics A (H156), Version 2.0', [
  ['Module 1: Practical skills','1.1','Practical skills assessed in a written examination',['Planning','Implementing','Analysis','Evaluation']],
  ['Module 2: Foundations of physics','2.1','Physical quantities and units',['Physical quantities','SI units']],
  ['Module 2: Foundations of physics','2.2','Making measurements and analysing data',['Measurements and uncertainties']],
  ['Module 2: Foundations of physics','2.3','Nature of quantities',['Scalars and vectors']],
  ['Module 3: Forces and motion','3.1','Motion',['Kinematics','Linear motion','Projectile motion']],
  ['Module 3: Forces and motion','3.2','Forces in action',['Dynamics','Motion with non-uniform acceleration','Equilibrium','Density and pressure']],
  ['Module 3: Forces and motion','3.3','Work, energy and power',['Work and conservation of energy','Kinetic and potential energies','Power']],
  ['Module 3: Forces and motion','3.4','Materials',['Springs','Mechanical properties of matter']],
  ['Module 3: Forces and motion','3.5',"Newton's laws of motion and momentum",["Newton's laws of motion",'Collisions']],
  ['Module 4: Electrons, waves and photons','4.1','Charge and current',['Charge','Mean drift velocity']],
  ['Module 4: Electrons, waves and photons','4.2','Energy, power and resistance',['Circuit symbols','EMF and potential difference','Resistance','Resistivity','Power']],
  ['Module 4: Electrons, waves and photons','4.3','Electrical circuits',['Series and parallel circuits','Internal resistance','Potential dividers']],
  ['Module 4: Electrons, waves and photons','4.4','Waves',['Wave motion','Electromagnetic waves','Superposition','Stationary waves']],
  ['Module 4: Electrons, waves and photons','4.5','Quantum physics',['Photons','Photoelectric effect','Wave-particle duality']]
]);

const theme1 = 'Theme 1: Introduction to markets and market failure';
const theme2 = 'Theme 2: The UK economy - performance and policies';
const theme3 = 'Theme 3: Business behaviour and the labour market';
const theme4 = 'Theme 4: A global perspective';
export const ECONOMICS = catalogue('edexcel-economics-a-issue2', 'Edexcel Economics A (9EC0), Issue 2', [
  [theme1,'1.1','Nature of economics',['Economics as a social science','Positive and normative statements','Scarcity, resources and opportunity cost',
    'Production possibility frontiers','Specialisation and division of labour','Free market, mixed and command economies']],
  [theme1,'1.2','How markets work',['Rational decision making','Demand','Price, income and cross elasticities of demand','Supply','Elasticity of supply',
    'Price determination','Price mechanism','Consumer and producer surplus','Indirect taxes and subsidies','Alternative views of consumer behaviour']],
  [theme1,'1.3','Market failure',['Types of market failure','Externalities','Public goods','Information gaps']],
  [theme1,'1.4','Government intervention',['Government intervention in markets','Government failure']],
  [theme2,'2.1','Measures of economic performance',['Economic growth: GDP, GNI, PPP, living standards and wellbeing','Inflation: measurement, causes and effects','Employment and unemployment','Balance of payments']],
  [theme2,'2.2','Aggregate demand',['Characteristics and components of AD','Consumption','Investment','Government expenditure','Net trade']],
  [theme2,'2.3','Aggregate supply',['Characteristics of AS','Short-run AS','Long-run AS']],
  [theme2,'2.4','National income',['Circular flow; income and wealth','Injections and withdrawals','Equilibrium real national output','Multiplier and marginal propensities']],
  [theme2,'2.5','Economic growth',['Causes of growth','Output gaps','Trade cycle','Benefits and costs of growth']],
  [theme2,'2.6','Macroeconomic objectives and policies',['Macroeconomic objectives','Demand-side policies','Supply-side policies','Conflicts and trade-offs between objectives and policies']],
  [theme3,'3.1','Business growth',['Sizes and types of firms','Business growth','Demergers'],'a_level'],
  [theme3,'3.2','Business objectives',['Business objectives'],'a_level'],
  [theme3,'3.3','Revenues, costs and profits',['Revenue','Costs','Economies and diseconomies of scale','Normal and supernormal profits; losses'],'a_level'],
  [theme3,'3.4','Market structures',['Efficiency','Perfect competition','Monopolistic competition','Oligopoly','Monopoly','Monopsony','Contestability'],'a_level'],
  [theme3,'3.5','Labour market',['Demand for labour','Supply of labour','Wage determination in competitive and non-competitive markets'],'a_level'],
  [theme3,'3.6','Government intervention',['Government intervention','Impact of government intervention'],'a_level'],
  [theme4,'4.1','International economics',['Globalisation','Specialisation and trade','Pattern of trade','Terms of trade','Trading blocs and WTO','Restrictions on free trade','Balance of payments','Exchange rates','International competitiveness'],'a_level'],
  [theme4,'4.2','Poverty and inequality',['Absolute and relative poverty','Inequality'],'a_level'],
  [theme4,'4.3','Emerging and developing economies',['Measures of development','Factors influencing growth and development','Strategies influencing growth and development'],'a_level'],
  [theme4,'4.4','Financial sector',['Role of financial markets','Market failure in the financial sector','Role of central banks'],'a_level'],
  [theme4,'4.5','Role of the state in the macroeconomy',['Public expenditure','Taxation','Public sector finances','Macroeconomic policies in a global context'],'a_level']
]);

// History item suffixes are local tracking references, not official numbered clauses.
export const HISTORY = catalogue('aqa-history-1c-2n', 'AQA History: 1C Tudors and 2N Russia', [
  ['1C Tudors: AS / Part one','1C-H7','Henry VII, 1485-1509',[
    'Consolidating power: character, aims and establishing the dynasty','Government: councils, Parliament, justice, finance and domestic policy',
    'Foreign relations, Scotland, succession and marriage alliances','Society: churchmen, nobility, commoners, regions and rebellions',
    'Economy: trade, exploration, prosperity and depression','Religion, humanism, arts and learning']],
  ['1C Tudors: AS / Part one','1C-H8','Henry VIII, 1509-1547',[
    "Character, aims and Henry VII's legacy",'Crown, Parliament, ministers, domestic policy and Royal Supremacy',
    'Foreign relations, Scotland and succession','Society, regions, religious upheaval and rebellion','Economy: trade, exploration, prosperity and depression',
    'Renaissance ideas, Church reform and continuity/change by 1547']],
  ['1C Tudors: A-level only / Part two','1C-MT','Mid-Tudor crisis, 1547-1563',[
    'Edward VI, Somerset and Northumberland: authority, succession and foreign affairs','Edward VI: religion, economy, rebellion and intellectual change',
    'Mary I and ministers: authority, succession and foreign affairs','Mary I: religious, economic, social and intellectual change',
    'Elizabeth I: aims, consolidation, Settlement and foreign affairs','Early Elizabethan economic, social and religious developments'],'a_level'],
  ['1C Tudors: A-level only / Part two','1C-EL','Triumph of Elizabeth, 1563-1603',[
    'Court, ministers, Parliament and faction','Succession, Mary Queen of Scots and Spain','Society, regions, discontent and rebellions',
    'Trade, exploration, colonisation, prosperity and depression','Religion, Renaissance and the Golden Age','England and Elizabeth in the final years to 1603'],'a_level'],
  ['2N Russia: AS / Part one','2N-REV','Dissent and revolution, 1917',[
    'Russia before February/March: Tsarist authority, war, economy, society and discontent',
    'February/March revolution: causes, leadership, abdication, Provisional Government, Petrograd Soviet and Dual authority',
    'Between revolutions: Lenin, April Theses, July Days, Kornilov, Trotsky and Bolshevik leadership',
    'October/November revolution: causes, course, leadership, Bolshevik authority, Sovnarkom and decrees']],
  ['2N Russia: AS / Part one','2N-BOL','Bolshevik consolidation, 1918-1924',[
    'One-party dictatorship, Constituent Assembly and leaving the First World War',
    'Civil War: causes, course, Trotsky, murder of the Tsar, Red victory and wartime control',
    'State capitalism, social change, war communism, Red Terror, Tambov, Kronstadt and NEP',
    "Foreign intervention, Comintern, Russo-Polish War, Rapallo, recognition, Zinoviev letter and Lenin's legacy"]],
  ['2N Russia: AS / Part one','2N-RISE',"Stalin's rise to power, 1924-1929",[
    "Power vacuum, Lenin's testament and leadership contenders: Stalin, Trotsky, Bukharin, Kamenev, Rykov, Tomsky and Zinoviev",
    'NEP, industrialisation, permanent revolution, Socialism in One Country and Stalin becoming leader',
    'Great Turn: economic shift, first Five Year Plan and decision to collectivise',
    'Government, propaganda, early Stalin cult, China, Germany, Treaty of Berlin and Comintern']],
  ['2N Russia: A-level only / Part two','2N-ECON','Economy and society, 1929-1941',[
    'Collectivisation, state farms, mechanisation, kulaks, peasants and famine of 1932-1934',
    'Gosplan, first three Five Year Plans, industrial centres, foreign companies, working conditions, women and Stakhanovites',
    'Stalin cult: literature, arts, propaganda and Socialist Realism','Soviet social and economic strengths and weaknesses by 1941'],'a_level'],
  ['2N Russia: A-level only / Part two','2N-CONTROL','Stalinism, politics and control, 1929-1941',[
    'State terror, NKVD, early purges, Kirov, show trials and Stalin constitution',
    'Yezhovshchina, minorities, gulags, death of Trotsky and responsibility for the Terror',
    'Church, women, youth, workers, urban/rural society and cultural change under Lenin and Stalin',
    'Germany, League of Nations, France, Czechoslovakia, Spanish Civil War, appeasement, Japan and Nazi-Soviet Pact'],'a_level'],
  ['2N Russia: A-level only / Part two','2N-WAR','War and dictatorship, 1941-1953',[
    'Barbarossa, occupation, Soviet resistance, economy, industrial evacuation and foreign aid',
    'Defeat of Germany and post-war industrial and agricultural reconstruction',
    "High Stalinism: Beria, Zhdanovism, personality cult, Leningrad affair and Doctors' Plot",
    "Superpower status, Soviet bloc, conflict with the West, Stalin's death and legacy"],'a_level']
]);

const fullMaths = { ...MATHS_SPEC, topics: MATHS_TOPICS, items: MATHS_ITEMS };
export function syllabusFor(area, scope = 'as') {
  const source = ['Maths','AS Maths'].includes(area) ? (scope === 'full' ? fullMaths : AS_MATHS)
    : area === 'Physics' ? AS_PHYSICS : area === 'Economics' ? ECONOMICS : area === 'History' ? HISTORY : null;
  if (!source) return null;
  return { ...source, topics: source.topics.filter(g => scope === 'full' || g.level !== 'a_level'),
    items: source.items.filter(i => scope === 'full' || i.level !== 'a_level') };
}
export const SYLLABUS_ITEMS = [...MATHS_ITEMS, ...AS_MATHS.items, ...AS_PHYSICS.items, ...ECONOMICS.items, ...HISTORY.items];
