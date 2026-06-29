import { createClient } from '@supabase/supabase-js';
import { AppProperties } from './appProperties';

let supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
let supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// If test database is enabled:
if (AppProperties.useTestDatabase) {
  if (AppProperties.testDatabaseConfig?.supabaseUrl && AppProperties.testDatabaseConfig?.supabaseAnonKey) {
    // If explicit test database credentials are provided, use them
    supabaseUrl = AppProperties.testDatabaseConfig.supabaseUrl;
    supabaseAnonKey = AppProperties.testDatabaseConfig.supabaseAnonKey;
    console.log('[Database Mode] Routing to custom Test Supabase Database.');
  } else {
    // Otherwise, simulate a test database using local storage fallback by using invalid credentials
    supabaseUrl = 'https://offline-test-db-placeholder.supabase.co';
    supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';
    console.log('[Database Mode] Test Database enabled. Routing strictly to Local Offline Sandbox Database.');
  }
} else {
  console.log(`[Database Mode] Active in "${AppProperties.mode.toUpperCase()}" production database environment.`);
}

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('offline-test-db-placeholder')) {
  console.warn('Warning: Running with Local Offline Database Sandbox fallback.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

