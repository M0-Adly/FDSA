import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Client for general use (browser/server components)
// Uses the anon key - safe to expose to browser
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// DO NOT export supabaseAdmin from here (service role key must stay server-side only)
// Use createServerSupabaseAdmin() inside API routes instead
