import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

export const hasSupabaseConfig =
  SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR-PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR_');

const module = hasSupabaseConfig ? await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm') : null;

export const supabase = module ? module.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
