import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

export const hasSupabaseConfig =
  SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR-PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR_');

let module = null;
if (hasSupabaseConfig) {
  try {
    module = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  } catch (error) {
    console.warn('Supabase client could not be loaded.', error);
  }
}

export const supabase = module ? module.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;
