import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://vnjcgznhxgvreiepmtiv.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_1maFzmWjS0CnBhzX1uwXiw_dL6li9UM';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_ANON_KEY) &&
    !SUPABASE_URL.includes('your-project')
  );
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
