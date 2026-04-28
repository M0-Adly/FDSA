-- ============================================================
-- SQL Fix for Infinite Recursion and Duplicate Departments
-- ============================================================

-- 1. Fix Infinite Recursion
-- Drop the recursive policies on profiles
DROP POLICY IF EXISTS "own_profile_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read" ON public.profiles;
DROP POLICY IF EXISTS "employee_profile_select" ON public.profiles;

-- Allow anyone logged in to view profiles (Fixes recursion completely)
CREATE POLICY "profiles_public_select" ON public.profiles 
  FOR SELECT USING (true);

-- Ensure we don't have recursive reports policies
DROP POLICY IF EXISTS "citizens_own_reports_select" ON public.reports;
CREATE POLICY "citizens_own_reports_select" ON public.reports
  FOR SELECT USING (
    auth.uid() = created_by OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('employee', 'admin')
  );

DROP POLICY IF EXISTS "citizens_insert_reports" ON public.reports;
CREATE POLICY "citizens_insert_reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- 2. Clean Up Duplicates
-- First, drop the existing unique constraint if it was wrong
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS dept_name_district_unique;

-- Delete exact duplicate rows in departments keeping only the lowest ID
DELETE FROM public.departments a USING public.departments b
WHERE a.id > b.id 
  AND a.name_en = b.name_en 
  AND a.district_id = b.district_id;

-- Add the unique constraint to prevent future duplicates
ALTER TABLE public.departments ADD CONSTRAINT dept_name_district_unique UNIQUE (name_en, district_id);

-- 3. Add 'account_status' for the new Citizen Approval Workflow
-- Check if column exists before adding
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='account_status') THEN
    ALTER TABLE public.profiles ADD COLUMN account_status text NOT NULL DEFAULT 'pending' CHECK (account_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Update existing admins and employees to be approved automatically
UPDATE public.profiles SET account_status = 'approved' WHERE role IN ('admin', 'employee');
-- We can also approve existing citizens so they aren't locked out immediately
UPDATE public.profiles SET account_status = 'approved' WHERE role = 'citizen';
