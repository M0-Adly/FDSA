-- ============================================================
-- National Crisis Management System — Supabase Migration
-- Fixes Infinite Recursion in RLS & Seed Data
-- ============================================================

-- 1. Create a secure function to check roles without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  -- SECURITY DEFINER bypasses RLS, so this won't cause an infinite loop
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(user_role IN ('employee', 'admin'), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Drop existing policies to recreate them
DROP POLICY IF EXISTS "own_profile_select" ON public.profiles;
DROP POLICY IF EXISTS "own_profile_update" ON public.profiles;
DROP POLICY IF EXISTS "own_profile_insert" ON public.profiles;
DROP POLICY IF EXISTS "citizens_own_reports_select" ON public.reports;
DROP POLICY IF EXISTS "citizens_insert_reports" ON public.reports;
DROP POLICY IF EXISTS "employees_update_reports" ON public.reports;
DROP POLICY IF EXISTS "employees_delete_reports" ON public.reports;
DROP POLICY IF EXISTS "employees_report_actions" ON public.report_actions;

-- 3. Recreate policies using the secure function
-- Profiles
CREATE POLICY "own_profile_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_staff());

CREATE POLICY "own_profile_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "own_profile_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Reports
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_status_check CHECK (status IN ('pending','ongoing','resolved','escalated'));
ALTER TABLE public.reports ALTER COLUMN status SET DEFAULT 'pending';

CREATE POLICY "citizens_own_reports_select" ON public.reports
  FOR SELECT USING (auth.uid() = created_by OR public.is_staff());

CREATE POLICY "citizens_insert_reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = created_by OR public.is_staff());

CREATE POLICY "employees_update_reports" ON public.reports
  FOR UPDATE USING (public.is_staff());

CREATE POLICY "employees_delete_reports" ON public.reports
  FOR DELETE USING (public.is_staff());

-- Report Actions
CREATE POLICY "employees_report_actions" ON public.report_actions
  FOR ALL USING (public.is_staff());

-- 4. Clean up duplicated departments (if any)
TRUNCATE TABLE public.departments CASCADE;
TRUNCATE TABLE public.districts CASCADE;

-- Ensure constraints to prevent future duplicates
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS dept_name_district_unique;
ALTER TABLE public.departments ADD CONSTRAINT dept_name_district_unique UNIQUE (name_en, district_id);

-- 5. Seed Districts
INSERT INTO public.districts (id, name_en, name_ar) VALUES
  (1, 'First District',  'المنطقة الأولى'),
  (2, 'Second District', 'المنطقة الثانية')
ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar;

-- 6. Seed Departments (12 total: 6 per district, including Gas Co.)
INSERT INTO public.departments (name_en, name_ar, district_id) VALUES
  ('Fire Dept - D1',       'إدارة الحرائق - م1',   1),
  ('Police Dept - D1',     'الشرطة - م1',            1),
  ('Ambulance - D1',       'الإسعاف - م1',           1),
  ('Water Co. - D1',       'شركة المياه - م1',       1),
  ('Electricity Co. - D1', 'شركة الكهرباء - م1',     1),
  ('Gas Co. - D1',         'شركة الغاز - م1',         1),
  
  ('Fire Dept - D2',       'إدارة الحرائق - م2',   2),
  ('Police Dept - D2',     'الشرطة - م2',            2),
  ('Ambulance - D2',       'الإسعاف - م2',           2),
  ('Water Co. - D2',       'شركة المياه - م2',       2),
  ('Electricity Co. - D2', 'شركة الكهرباء - م2',     2),
  ('Gas Co. - D2',         'شركة الغاز - م2',         2)
ON CONFLICT (name_en, district_id) DO NOTHING;

-- 7. Insert Test Users (Using pgcrypto extension to hash passwords)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  admin_uid uuid := gen_random_uuid();
  citizen_uid uuid := gen_random_uuid();
BEGIN
  -- Insert Admin
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@gov.eg') THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (admin_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@gov.eg', crypt('Admin123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"admin"}', now(), now());
    
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_uid, admin_uid::text, format('{"sub":"%s","email":"%s"}', admin_uid::text, 'admin@gov.eg')::jsonb, 'email', now(), now(), now());

    INSERT INTO public.profiles (id, role, full_name, created_at)
    VALUES (admin_uid, 'admin', 'System Admin', now());
  END IF;

  -- Insert Citizen
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = '0123456789@citizen.eg') THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (citizen_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '0123456789@citizen.eg', crypt('Citizen123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"citizen"}', now(), now());
    
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), citizen_uid, citizen_uid::text, format('{"sub":"%s","email":"%s"}', citizen_uid::text, '0123456789@citizen.eg')::jsonb, 'email', now(), now(), now());

    INSERT INTO public.profiles (id, role, full_name, phone, created_at)
    VALUES (citizen_uid, 'citizen', 'Test Citizen', '0123456789', now());
  END IF;
END $$;
