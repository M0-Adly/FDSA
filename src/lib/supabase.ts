import { createClient } from '@supabase/supabase-js';

// Using fallback values so that createClient doesn't throw during Next.js build time
// At runtime on Vercel, the actual env vars are injected correctly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

// Client for general use (browser/server components) - uses the public anon key
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
