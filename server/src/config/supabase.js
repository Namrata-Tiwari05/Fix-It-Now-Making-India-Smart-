import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';

let supabaseClient = null;
let supabaseAdminClient = null;

try {
  if (config.supabase.url && config.supabase.anonKey) {
    supabaseClient = createClient(config.supabase.url, config.supabase.anonKey);
  }
  if (config.supabase.url && (config.supabase.serviceRoleKey || config.supabase.anonKey)) {
    supabaseAdminClient = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey || config.supabase.anonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    );
  }
} catch (err) {
  console.warn('[Supabase Config] Error initializing remote Supabase client:', err.message);
}

export { supabaseClient, supabaseAdminClient };
