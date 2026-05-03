-- ============================================================
-- 🛡️ NATIONAL CRISIS MANAGEMENT SYSTEM - MASTER DATABASE SETUP
-- ============================================================
-- Version: 3.0 (Comprehensive Fix)
-- Purpose: Ensures all tables, constraints, and RLS policies are correct.
-- Preserves existing users and profiles.

-- 1. PROFILES TABLE (Identity & Workflow)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT CHECK (role IN ('citizen', 'employee', 'admin')),
    phone TEXT,
    national_id TEXT,
    national_id_image_url TEXT,
    account_status TEXT DEFAULT 'pending' CHECK (account_status IN ('pending', 'approved', 'rejected', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure account_status is updated for existing users to avoid lockouts
UPDATE public.profiles SET account_status = 'approved' WHERE account_status IS NULL;

-- 2. ORGANIZATIONAL STRUCTURE (Districts & Departments)
CREATE TABLE IF NOT EXISTS public.districts (
    id SERIAL PRIMARY KEY,
    name_ar TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.departments (
    id SERIAL PRIMARY KEY,
    district_id INTEGER REFERENCES public.districts(id) ON DELETE CASCADE,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(district_id, name_en)
);

-- 🛑 FIX: Ensure unique constraint exists for ON CONFLICT (Fixes Error 42P10)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_district_id_name_en_key') THEN
        ALTER TABLE public.departments ADD CONSTRAINT departments_district_id_name_en_key UNIQUE (district_id, name_en);
    END IF;
END $$;

-- 3. SETUP REPORTS (Core Data)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES auth.users(id),
    department_id INTEGER REFERENCES public.departments(id),
    district_id INTEGER REFERENCES public.districts(id),
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    priority INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    citizen_confirmed BOOLEAN DEFAULT FALSE,
    escalated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id)
);

-- 🛑 CRITICAL FIX: Cast priority to INTEGER if it's currently TEXT (Fixes Error 42883)
DO $$
BEGIN
    ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_priority_check;
    ALTER TABLE public.reports ALTER COLUMN priority TYPE INTEGER USING priority::integer;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Priority column is already integer or conversion not needed.';
END $$;

ALTER TABLE public.reports ADD CONSTRAINT reports_priority_check CHECK (priority >= 1 AND priority <= 4);

-- FIX STATUS CONSTRAINT
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_status_check CHECK (status IN ('pending', 'ongoing', 'resolved', 'closed', 'escalated'));

-- 4. LOGGING & ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.report_assignments (
    id SERIAL PRIMARY KEY,
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES public.departments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(report_id, department_id)
);

CREATE TABLE IF NOT EXISTS public.report_actions (
    id SERIAL PRIMARY KEY,
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. SEED DATA (Clean Setup - Only requested districts)
-- 🛑 Clear all old data to prevent duplicates in UI
TRUNCATE TABLE public.departments, public.districts CASCADE;

INSERT INTO public.districts (name_ar, name_en) VALUES 
('قسم أول', 'First District'),
('قسم ثان', 'Second District')
ON CONFLICT DO NOTHING;

-- Populate Departments (Multi-District Seed)
DO $$
DECLARE
    d1 INT; d2 INT;
BEGIN
    SELECT id INTO d1 FROM public.districts WHERE name_ar = 'قسم أول';
    SELECT id INTO d2 FROM public.districts WHERE name_ar = 'قسم ثان';

    -- First District
    INSERT INTO public.departments (district_id, name_ar, name_en) VALUES 
    (d1, 'شركة الكهرباء', 'Electricity Co.'), (d1, 'شركة المياه', 'Water Co.'), (d1, 'هيئة الإسعاف', 'Ambulance Authority')
    ON CONFLICT (district_id, name_en) DO NOTHING;

    -- Second District
    INSERT INTO public.departments (district_id, name_ar, name_en) VALUES 
    (d2, 'شركة الكهرباء', 'Electricity Co.'), (d2, 'طوارئ الغاز', 'Gas Co.'), (d2, 'هيئة المطافئ', 'Fire Department')
    ON CONFLICT (district_id, name_en) DO NOTHING;
END $$;

-- 6. SECURITY (RLS POLICIES)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- 6.1 Profiles Policies (Public Select to avoid recursion)
DROP POLICY IF EXISTS "profiles_public_select" ON public.profiles;
CREATE POLICY "profiles_public_select" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 6.2 Reports Policies
DROP POLICY IF EXISTS "reports_select_all" ON public.reports;
CREATE POLICY "reports_select_all" ON public.reports FOR SELECT USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('employee', 'admin'))
);

DROP POLICY IF EXISTS "reports_insert_citizen" ON public.reports;
CREATE POLICY "reports_insert_citizen" ON public.reports FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "reports_update_access" ON public.reports;
CREATE POLICY "reports_update_access" ON public.reports FOR UPDATE USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('employee', 'admin'))
);

-- 6.3 Actions & Assignments Policies
DROP POLICY IF EXISTS "actions_read" ON public.report_actions;
CREATE POLICY "actions_read" ON public.report_actions FOR SELECT USING (true);

DROP POLICY IF EXISTS "actions_insert" ON public.report_actions;
CREATE POLICY "actions_insert" ON public.report_actions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "assignments_read" ON public.report_assignments;
CREATE POLICY "assignments_read" ON public.report_assignments FOR SELECT USING (true);

-- 6.4 Static Data Policies
DROP POLICY IF EXISTS "static_data_select" ON public.districts;
CREATE POLICY "static_data_select" ON public.districts FOR SELECT USING (true);

DROP POLICY IF EXISTS "dept_data_select" ON public.departments;
CREATE POLICY "dept_data_select" ON public.departments FOR SELECT USING (true);
