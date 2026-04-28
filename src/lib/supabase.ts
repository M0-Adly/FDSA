import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.warn('Supabase URL is missing or using placeholder. Check your .env.local file.');
}

if (!supabaseAnonKey || supabaseAnonKey.includes('placeholder')) {
  console.warn('Supabase Anon Key is missing or using placeholder. Check your .env.local file.');
}

// Client for general use (browser/server components)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
