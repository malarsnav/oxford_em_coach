import { supabase } from './supabaseClient.js';

export function schoolTaskPayload(values, existing = {}) {
  if (!String(values.assessment_name || '').trim()) throw new Error('Enter a task title.');
  if (!['homework', 'assessment'].includes(values.assessment_type)) throw new Error('Choose homework or assessment.');
  if (!['not_started', 'in_progress', 'completed'].includes(values.status)) throw new Error('Choose a task status.');
  const number = (value) => value === '' || value == null ? null : Number(value);
  const score = number(values.score);
  const max = number(values.max_score);
  if ((score !== null && (!Number.isFinite(score) || score < 0)) ||
      (max !== null && (!Number.isFinite(max) || max <= 0)) ||
      (score !== null && (max === null || score > max))) throw new Error('Enter a valid score and total marks.');
  if (values.status !== 'completed' && (score !== null || values.is_marked === 'on')) throw new Error('Mark the task completed before recording marks.');
  return {
    subject_id: values.subject_id, assessment_name: values.assessment_name.trim(),
    assessment_type: values.assessment_type, status: values.status,
    due_date: values.due_date || null, assessment_date: values.assessment_date || null,
    description: values.description || '', teacher_feedback: values.teacher_feedback || '',
    self_reflection: values.self_reflection || '', grade: values.grade || '',
    is_marked: values.is_marked === 'on' || score !== null,
    score, max_score: max, percentage: score === null ? null : Math.round(score / max * 100),
    completed_at: values.status === 'completed' ? existing.completed_at || new Date().toISOString() : null
  };
}

export async function saveSchoolTask(user, values, file, existing) {
  if (!supabase) throw new Error('Sign in to save homework and assessments across devices.');
  const row = schoolTaskPayload(values, existing);
  const id = existing?.id || crypto.randomUUID();
  let path;
  if (file?.size) {
    if (file.size > 10 * 1024 * 1024) throw new Error('Choose a file smaller than 10 MB.');
    if (!['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) throw new Error('Choose a PDF, JPG, PNG or Word document.');
    path = `${user.id}/${id}/${crypto.randomUUID()}/${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error } = await supabase.storage.from('school-work').upload(path, file);
    if (error) throw error;
    row.attachment_path = path;
    row.attachment_name = file.name;
  }
  const result = existing
    ? await supabase.from('academic_results').update(row).eq('id', id).eq('user_id', user.id).select('id').single()
    : await supabase.from('academic_results').insert({ ...row, id, user_id: user.id }).select('id').single();
  if (result.error) {
    if (path) await supabase.storage.from('school-work').remove([path]);
    if (['PGRST204', '42703'].includes(result.error.code)) throw new Error('School tasks need the database update 006_school_tasks.sql. Existing results remain saved.');
    throw result.error;
  }
  if (path && existing?.attachment_path) await supabase.storage.from('school-work').remove([existing.attachment_path]);
}

export async function schoolAttachmentUrl(path) {
  const { data, error } = await supabase.storage.from('school-work').createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}
