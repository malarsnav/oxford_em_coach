export const PRIMARY_COURSE = 'Oxford Philosophy, Politics and Economics';
export const UNIVERSITY_TARGETS = [
  'Oxford - Philosophy, Politics and Economics (PPE)',
  'Imperial - Economics, Finance and Data Science (EFDS)',
  'LSE - Philosophy and Economics',
  'UCL - Economics',
  'Warwick or KCL - Economics (choice to confirm)'
];
export const A_LEVEL_SUBJECTS = ['Maths', 'Economics', 'Physics', 'History'];
// Preserve custom profile targets; translate only the former product default.
export function currentTarget(value) {
  return !value || ['Oxford Economics & Management','Oxford Economics and Management',PRIMARY_COURSE].includes(value) ? PRIMARY_COURSE : value;
}
