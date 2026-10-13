import { supabase } from './supabaseClient.js';
import { configureStudyPlans } from './studentStudyPlan.js';

export const PLAN_DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export function validateBlocks(blocks) {
  if(!Array.isArray(blocks) || blocks.length>200)throw new Error('Use at most 200 blocks.');
  const rows=blocks.map(b=>({day:b.day,from:b.from,to:b.to,activity:String(b.activity || '').trim()}));
  for(const b of rows){
    if(!PLAN_DAYS.includes(b.day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.from) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.to) || b.from>=b.to || !b.activity || b.activity.length>100)throw new Error('Each block needs a day, activity and valid start/end times.');
  }
  for(const day of PLAN_DAYS){
    const daily=rows.filter(b=>b.day===day).sort((a,b)=>a.from.localeCompare(b.from));
    if(daily.some((b,i)=>i>0 && b.from<daily[i-1].to))throw new Error(`Overlapping blocks on ${day}.`);
  }
  return rows;
}
export async function loadPlanner(userId) {
  if(!supabase){configureStudyPlans([]);return {available:false,versions:[],tasks:[]};}
  const [plans,tasks]=await Promise.all([
    supabase.from('study_plan_versions').select('*').eq('user_id',userId).order('effective_from'),
    supabase.from('study_block_tasks').select('*').eq('user_id',userId).order('block_date')
  ]);
  const error=plans.error || tasks.error;
  if(error){
    configureStudyPlans([]);
    if(['42P01','PGRST205'].includes(error.code))return {available:false,versions:[],tasks:[]};
    throw error;
  }
  configureStudyPlans(plans.data || []);
  return {available:true,versions:plans.data || [],tasks:tasks.data || []};
}
export async function savePlanVersion(userId,values) {
  if(!supabase)throw new Error('Connect to your account to save a timetable.');
  const blocks=validateBlocks(values.blocks);
  const {error}=await supabase.from('study_plan_versions').insert({user_id:userId,effective_from:values.effective_from,single_day:!!values.single_day,blocks});
  if(error)throw error.code==='23505'?new Error('A version already exists for this date. Choose a later date.'):error;
}
export async function saveBlockTask(userId,values,id) {
  if(!supabase)throw new Error('Connect to your account to save tasks.');
  const title=String(values.title || '').trim();
  if(!title || title.length>250)throw new Error('Enter a task title (up to 250 characters).');
  const row={title,status:values.status || 'not_started',notes:values.notes || ''};
  const query=id?supabase.from('study_block_tasks').update(row).eq('user_id',userId).eq('id',id):supabase.from('study_block_tasks').insert({...row,user_id:userId,block_date:values.block_date,start_time:values.start_time,end_time:values.end_time,activity:values.activity});
  const {error}=await query;
  if(error)throw error;
}
