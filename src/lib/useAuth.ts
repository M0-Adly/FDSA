import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { DbProfile } from '../lib/supabase';

interface AuthState {
  user: import('@supabase/supabase-js').User | null;
  profile: DbProfile | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, profile: null, loading: true });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user ?? null;
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setState({ user, profile: profile ?? null, loading: false });
      } else {
        setState({ user: null, profile: null, loading: false });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      const user = session?.user ?? null;
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setState({ user, profile: profile ?? null, loading: false });
      } else {
        setState({ user: null, profile: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
