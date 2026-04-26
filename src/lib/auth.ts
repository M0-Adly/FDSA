import { supabase, type DbProfile } from './supabase';

// ── Auth Helpers ──────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<DbProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data as DbProfile;
}

export async function signUpCitizen(params: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  nationalIdFile: File;
}): Promise<{ error: string | null }> {
  const { email, password, fullName, phone, nationalIdFile } = params;

  // 1. Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
  if (authError) return { error: authError.message };
  const userId = authData.user?.id;
  if (!userId) return { error: 'User creation failed' };

  // 2. Upload national ID image to storage
  const fileExt = nationalIdFile.name.split('.').pop();
  const filePath = `${userId}/national-id.${fileExt}`;
  const { error: uploadError } = await supabase.storage
    .from('national-ids')
    .upload(filePath, nationalIdFile, { upsert: true });
  const nationalIdUrl = uploadError
    ? null
    : supabase.storage.from('national-ids').getPublicUrl(filePath).data.publicUrl;

  // 3. Upsert profile
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    role: 'citizen',
    full_name: fullName,
    phone,
    national_id_image_url: nationalIdUrl,
  });
  if (profileError) return { error: profileError.message };

  return { error: null };
}

export async function signInCitizen(email: string, password: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

/** Employees log in with empId → email format is emp{ID}@gov.eg */
export async function signInEmployee(empId: string, password: string): Promise<{ error: string | null }> {
  const email = `emp${empId}@gov.eg`;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function updateProfile(userId: string, updates: Partial<DbProfile>): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
  return { error: error?.message ?? null };
}

/** Admin: create an employee account via Edge Function */
export async function adminCreateEmployee(params: {
  empId: string;
  fullName: string;
  password: string;
  isAdmin?: boolean;
}): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: {
      empId: params.empId,
      fullName: params.fullName,
      password: params.password,
      role: params.isAdmin ? 'admin' : 'employee'
    }
  });

  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { error: null };
}
