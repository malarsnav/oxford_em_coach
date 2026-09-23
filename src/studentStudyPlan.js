const ORIGINAL_WEEKDAY_TIMETABLE = [
  { from: '07:00', to: '07:30', Monday: 'EPQ', Tuesday: 'EPQ', Wednesday: 'EPQ', Thursday: 'EPQ', Friday: 'EPQ' },
  { from: '17:00', to: '18:00', Monday: 'Economics', Tuesday: 'Maths', Wednesday: 'Maths tuition', Thursday: 'Economics', Friday: 'Maths' },
  { from: '18:00', to: '18:15', Monday: 'Break', Tuesday: 'Break', Wednesday: 'Break', Thursday: 'Break', Friday: 'Break' },
  { from: '18:15', to: '19:15', Monday: 'History', Tuesday: 'Economics', Wednesday: 'Physics', Thursday: 'Physics', Friday: 'History' },
  { from: '19:00', to: '20:00', Monday: 'Dinner', Tuesday: 'Dinner', Wednesday: 'Dinner', Thursday: 'Dinner', Friday: 'Dinner' },
  { from: '20:00', to: '21:00', Monday: 'Physics', Tuesday: 'History', Wednesday: 'Maths', Thursday: 'History', Friday: 'Physics' },
  { from: '21:00', to: '21:30', Monday: 'Book', Tuesday: 'Book', Wednesday: 'Book', Thursday: 'Book', Friday: 'Book' }
];

export const WEEKDAY_TIMETABLE = [
  { from: '05:30', to: '06:45', Monday: 'Chest and triceps', Tuesday: 'Rest', Wednesday: 'legs and shoulders', Thursday: 'back and biceps', Friday: 'Chest and triceps' },
  { from: '07:00', to: '07:30', Monday: 'Homework', Tuesday: 'Homework', Wednesday: 'Homework', Thursday: 'Homework', Friday: 'Homework' },
  { from: '08:00', to: '16:00', Monday: 'School', Tuesday: 'School', Wednesday: 'School', Thursday: 'School', Friday: 'School' },
  { from: '16:00', to: '16:45', Monday: 'REST', Tuesday: 'REST', Wednesday: 'REST', Thursday: 'REST', Friday: 'REST' },
  { from: '16:45', to: '17:15', Monday: 'Homework', Tuesday: 'Homework', Wednesday: 'Homework', Thursday: 'Homework', Friday: 'Homework' },
  { from: '17:15', to: '18:00', Monday: 'Economics', Tuesday: 'Maths', Wednesday: 'Tuition', Thursday: 'Economics', Friday: 'Maths' },
  { from: '18:00', to: '18:15', Monday: 'Break', Tuesday: 'Break', Wednesday: 'Break', Thursday: 'Break', Friday: 'Break' },
  { from: '18:15', to: '19:00', Monday: 'Physics', Tuesday: 'History', Wednesday: 'Maths(TMUA)', Thursday: 'Physics', Friday: 'History' },
  { from: '19:00', to: '19:45', Monday: 'Dinner', Tuesday: 'Dinner', Wednesday: 'Dinner', Thursday: 'Dinner', Friday: 'Dinner' },
  { from: '19:45', to: '20:15', Monday: 'Article', Tuesday: 'Article', Wednesday: 'Article', Thursday: 'Article', Friday: 'Article' },
  { from: '20:15', to: '21:00', Monday: 'SMC', Tuesday: 'SMC', Wednesday: 'SMC', Thursday: 'SMC', Friday: 'SMC' },
  { from: '21:00', to: '21:30', Monday: 'Club', Tuesday: 'Reading(EPQ)', Wednesday: 'Reading(EPQ)', Thursday: 'Club', Friday: 'Reading(EPQ)' }
];

export function isNonStudyActivity(value) {
  return ['break', 'breakfast', 'lunch', 'dinner', 'rest', 'school', 'shower', 'cardio', 'chest and triceps', 'legs and shoulders', 'back and biceps'].includes(String(value || '').toLowerCase());
}

const ORIGINAL_WEEKEND_TIMETABLE = [
  { from: '08:00', to: '09:00', Saturday: 'Breakfast', Sunday: 'Breakfast' },
  { from: '09:00', to: '10:00', Saturday: 'Maths', Sunday: 'Maths' },
  { from: '10:00', to: '10:15', Saturday: 'Break', Sunday: 'Breakfast' },
  { from: '10:15', to: '11:15', Saturday: 'Economics', Sunday: 'Economics' },
  { from: '11:30', to: '13:00', Saturday: 'AS Maths', Sunday: 'AS Maths' },
  { from: '13:00', to: '14:00', Saturday: 'Lunch', Sunday: 'Lunch' },
  { from: '14:00', to: '15:30', Saturday: 'EPQ', Sunday: 'EPQ' },
  { from: '15:30', to: '16:00', Saturday: 'Break', Sunday: 'Break' },
  { from: '16:00', to: '17:30', Saturday: 'SMC', Sunday: 'SMC' },
  { from: '17:30', to: '18:30', Saturday: 'Physics', Sunday: 'Physics' },
  { from: '18:30', to: '18:45', Saturday: 'Break', Sunday: 'Break' },
  { from: '18:45', to: '19:45', Saturday: 'History', Sunday: 'History' },
  { from: '19:45', to: '20:45', Saturday: 'Dinner', Sunday: 'Dinner' },
  { from: '20:45', to: '21:45', Saturday: 'Spillover', Sunday: 'Spillover' }
];

export const WEEKEND_TIMETABLE = [
  { from: '06:30', to: '07:15', Saturday: 'legs and shoulders', Sunday: 'back and biceps' },
  { from: '07:15', to: '07:45', Saturday: 'Shower', Sunday: 'Shower' },
  { from: '07:45', to: '08:30', Saturday: 'Homework', Sunday: 'Homework' },
  { from: '08:30', to: '09:15', Saturday: 'Breakfast', Sunday: 'Breakfast' },
  { from: '09:15', to: '10:00', Saturday: 'Homework', Sunday: 'Homework' },
  { from: '10:00', to: '10:45', Saturday: 'Homework', Sunday: 'Homework' },
  { from: '10:45', to: '11:15', Saturday: 'break', Sunday: 'break' },
  { from: '11:15', to: '12:00', Saturday: 'Economics', Sunday: 'Economics' },
  { from: '12:00', to: '12:45', Saturday: 'Economics', Sunday: 'Economics' },
  { from: '12:45', to: '13:45', Saturday: 'Lunch', Sunday: 'Lunch' },
  { from: '13:45', to: '14:30', Saturday: 'History', Sunday: 'History' },
  { from: '14:30', to: '15:15', Saturday: 'History', Sunday: 'History' },
  { from: '15:15', to: '15:45', Saturday: 'break', Sunday: 'break' },
  { from: '15:45', to: '16:30', Saturday: 'Physics', Sunday: 'Physics' },
  { from: '16:30', to: '17:15', Saturday: 'Physics', Sunday: 'Physics' },
  { from: '17:15', to: '17:45', Saturday: 'Cardio', Sunday: 'Cardio' },
  { from: '17:45', to: '18:30', Saturday: 'Maths', Sunday: 'Maths' },
  { from: '18:30', to: '19:15', Saturday: 'Maths', Sunday: 'Maths' },
  { from: '19:15', to: '20:15', Saturday: 'Dinner', Sunday: 'Dinner' },
  { from: '20:15', to: '21:00', Saturday: 'SMC', Sunday: 'SMC' },
  { from: '21:00', to: '21:45', Saturday: 'Reading(EPQ)', Sunday: 'Reading(EPQ)' }
];

// Effective dates are local calendar dates, not device first-visit timestamps.
// Append a new snapshot for future timetable changes; never edit a historical version.
export const STUDY_PLAN_VERSIONS = [{
  effectiveFrom: '2026-09-05',
  weekdays: ORIGINAL_WEEKDAY_TIMETABLE.map(row => ({...row})),
  weekends: ORIGINAL_WEEKEND_TIMETABLE.map(row => ({...row}))
}, {
  effectiveFrom: '2026-09-23',
  weekdays: WEEKDAY_TIMETABLE.map(row => ({...row})),
  weekends: ORIGINAL_WEEKEND_TIMETABLE.map(row => ({...row}))
}, {
  effectiveFrom: '2026-09-26',
  weekdays: WEEKDAY_TIMETABLE.map(row => ({...row})),
  weekends: WEEKEND_TIMETABLE.map(row => ({...row}))
}];
export const TRACKING_START_DATE = STUDY_PLAN_VERSIONS[0].effectiveFrom;
export function studyPlanForDate(date) {
  return [...STUDY_PLAN_VERSIONS].reverse().find(plan => plan.effectiveFrom <= date);
}

export const WEEKLY_TARGETS = [
  { name: 'Maths', hours: 6, pillar: 'A-Level Rigour' },
  { name: 'Physics', hours: 4.5, pillar: 'A-Level Rigour' },
  { name: 'Economics', hours: 4.5, pillar: 'A-Level Rigour' },
  { name: 'History', hours: 4.5, pillar: 'A-Level Rigour' },
  { name: 'AS-Further Maths', hours: 0, pillar: 'A-Level Rigour' },
  { name: 'EPQ', hours: 3, pillar: 'Super-Curricular' },
  { name: 'Super-Curricular', hours: 5.25, pillar: 'Super-Curricular' },
  { name: 'Homework', hours: 9.5, pillar: 'A-Level Rigour' },
  { name: 'Magazine', hours: 2.5, pillar: 'Reading / Thinking' },
  { name: 'Club', hours: 1, pillar: 'Super-Curricular' },
  { name: 'Buffer', hours: 0, pillar: 'Flexible' },
  { name: 'Book', hours: 0, pillar: 'Reading / Thinking' },
  { name: 'TARA', hours: 0, pillar: 'TARA Assessment' }
];

export const READING_PLAN = [
  { month: 'September', title: 'Undercover' },
  { month: 'October', title: 'Book 2 to choose' },
  { month: 'November', title: 'Book 3 to choose' },
  { month: 'December', title: 'Book 4 to choose' },
  { month: 'January', title: 'Book 5 to choose' },
  { month: 'February', title: 'Book 6 to choose' },
  { month: 'March', title: 'Book 7 to choose' },
  { month: 'April', title: 'Book 8 to choose' }
];

export function weeklyTargetHours(name) {
  return WEEKLY_TARGETS.find((target) => target.name.toLowerCase() === name.toLowerCase())?.hours || 0;
}

export function totalWeeklyTargetHours() {
  return WEEKLY_TARGETS.reduce((sum, target) => sum + Number(target.hours || 0), 0);
}

export function taraHasNoScheduledTime() {
  return weeklyTargetHours('TARA') === 0;
}
