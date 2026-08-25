import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const EMAIL_API_URL = Deno.env.get('EMAIL_API_URL') || '';
const EMAIL_API_KEY = Deno.env.get('EMAIL_API_KEY') || '';
const DIGEST_FROM_EMAIL = Deno.env.get('DIGEST_FROM_EMAIL') || '';
const EMAIL_PROVIDER_PAYLOAD_TEMPLATE = Deno.env.get('EMAIL_PROVIDER_PAYLOAD_TEMPLATE') || '';
const CRON_SECRET = Deno.env.get('DAILY_DIGEST_CRON_SECRET') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405);
  if (CRON_SECRET && request.headers.get('x-cron-secret') !== CRON_SECRET) return json({ error: 'Unauthorized' }, 401);

  const date = previousDate();
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('user_id, display_name, parent_email, parent_digest_include_no_activity')
    .eq('parent_digest_enabled', true)
    .not('parent_email', 'is', null);

  if (error) return json({ error: error.message }, 500);

  const results = [];
  for (const profile of profiles || []) {
    const digest = await buildDigest(profile.user_id, date);
    if (!digest.hasActivity && !profile.parent_digest_include_no_activity) {
      results.push({ user_id: profile.user_id, status: 'skipped_no_activity' });
      continue;
    }
    await sendEmail(profile.parent_email, `Oxford E&M Coach daily summary - ${date}`, emailHtml(profile, digest, date));
    results.push({ user_id: profile.user_id, parent_email: profile.parent_email, status: 'sent' });
  }

  return json({ date, results });
});

async function buildDigest(userId: string, date: string) {
  const dayStart = `${date}T00:00:00+00:00`;
  const dayEnd = `${date}T23:59:59+00:00`;
  const [{ data: attempts }, { data: responses }, { data: tasks }, { data: journal }, { data: reasoning }, { data: results }] = await Promise.all([
    supabase.from('attempts').select('*').eq('user_id', userId).gte('completed_at', dayStart).lte('completed_at', dayEnd),
    supabase.from('responses').select('*').eq('user_id', userId).gte('created_at', dayStart).lte('created_at', dayEnd),
    supabase.from('weekly_tasks').select('*').eq('user_id', userId).gte('updated_at', dayStart).lte('updated_at', dayEnd),
    supabase.from('journal_entries').select('*').eq('user_id', userId).gte('created_at', dayStart).lte('created_at', dayEnd),
    supabase.from('oxford_reasoning_sessions').select('*').eq('user_id', userId).gte('created_at', dayStart).lte('created_at', dayEnd),
    supabase.from('academic_results').select('*').eq('user_id', userId).gte('created_at', dayStart).lte('created_at', dayEnd)
  ]);

  const correct = (responses || []).filter((row) => row.is_correct).length;
  const weakSubtype = weakestGroup(responses || [], 'reasoning_pattern');
  const completedTasks = (tasks || []).filter((task) => task.status === 'completed');
  const skippedTasks = (tasks || []).filter((task) => task.status === 'skipped');

  return {
    hasActivity: Boolean((attempts || []).length || (responses || []).length || completedTasks.length || skippedTasks.length || (journal || []).length || (reasoning || []).length || (results || []).length),
    attempts: attempts || [],
    responses: responses || [],
    correct,
    accuracy: responses?.length ? Math.round((correct / responses.length) * 100) : 0,
    weakSubtype,
    completedTasks,
    skippedTasks,
    journal: journal || [],
    reasoning: reasoning || [],
    academicResults: results || []
  };
}

function weakestGroup(rows: Array<Record<string, unknown>>, key: string) {
  const groups = new Map<string, { name: string; total: number; correct: number; accuracy: number }>();
  for (const row of rows) {
    const name = String(row[key] || 'Unclassified');
    const current = groups.get(name) || { name, total: 0, correct: 0, accuracy: 0 };
    current.total += 1;
    if (row.is_correct) current.correct += 1;
    current.accuracy = Math.round((current.correct / current.total) * 100);
    groups.set(name, current);
  }
  return [...groups.values()].sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)[0] || null;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!EMAIL_API_URL || !EMAIL_API_KEY || !DIGEST_FROM_EMAIL) throw new Error('Missing provider-neutral email environment variables');
  const response = await fetch(EMAIL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${EMAIL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(buildEmailPayload({ from: DIGEST_FROM_EMAIL, to, subject, html }))
  });
  if (!response.ok) throw new Error(await response.text());
}

function buildEmailPayload(values: Record<string, string>) {
  if (!EMAIL_PROVIDER_PAYLOAD_TEMPLATE) return values;
  const rendered = Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    EMAIL_PROVIDER_PAYLOAD_TEMPLATE
  );
  return JSON.parse(rendered);
}

function emailHtml(profile: Record<string, string>, digest: Record<string, any>, date: string) {
  return `<h2>Oxford E&M Coach daily summary</h2>
    <p><b>Student:</b> ${escapeHtml(profile.display_name || 'Student')}</p>
    <p><b>Date:</b> ${escapeHtml(date)}</p>
    <ul>
      <li>TARA sets completed: ${digest.attempts.length}</li>
      <li>TARA questions answered: ${digest.responses.length}</li>
      <li>TARA accuracy: ${digest.accuracy}%</li>
      <li>Weakest sub-type: ${escapeHtml(digest.weakSubtype?.name || 'Not enough data')}</li>
      <li>Weekly tasks completed: ${digest.completedTasks.length}</li>
      <li>Weekly tasks skipped: ${digest.skippedTasks.length}</li>
      <li>A-Level results added: ${digest.academicResults.length}</li>
      <li>E&M journal entries: ${digest.journal.length}</li>
      <li>Oxford reasoning sessions: ${digest.reasoning.length}</li>
    </ul>
    <p><b>Suggested focus:</b> ${escapeHtml(suggestFocus(digest))}</p>`;
}

function suggestFocus(digest: Record<string, any>) {
  if (digest.weakSubtype && digest.weakSubtype.accuracy < 70) return `Review ${digest.weakSubtype.name} before starting another TARA set.`;
  if (digest.skippedTasks.length) return 'Review skipped weekly tasks and decide whether to reschedule or remove them.';
  if (!digest.journal.length && !digest.reasoning.length) return 'Add one short E&M journal or Oxford reasoning reflection today.';
  return 'Keep the current weekly programme moving.';
}

function previousDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
