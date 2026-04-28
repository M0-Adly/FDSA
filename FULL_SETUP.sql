-- ============================================================
-- National Crisis Management System — FULL DATABASE SETUP
-- انسخ هذا الكود بالكامل وحطه في Supabase SQL Editor وشغله مرة واحدة
-- ============================================================


-- ============================================================
-- STEP 1: إنشاء الجداول (Tables)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                  TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'employee', 'admin')),
  full_name             TEXT,
  phone                 TEXT,
  national_id_image_url TEXT,
  employee_id           TEXT UNIQUE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.districts (
  id      SERIAL PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.departments (
  id          SERIAL PRIMARY KEY,
  name_en     TEXT NOT NULL,
  name_ar     TEXT NOT NULL,
  district_id INT REFERENCES public.districts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  department_id INT  REFERENCES public.departments(id) ON DELETE SET NULL,
  district_id   INT  REFERENCES public.districts(id) ON DELETE SET NULL,
  type          TEXT NOT NULL,
  description   TEXT,
  priority      INT  CHECK (priority BETWEEN 1 AND 5),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ongoing', 'resolved', 'escalated')),
  escalated     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.report_actions (
  id           SERIAL PRIMARY KEY,
  report_id    UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata     JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- STEP 2: تفعيل Row Level Security
-- ============================================================

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_actions ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 3: حذف السياسات القديمة وإنشاء الجديدة
-- ============================================================

-- Districts & Departments — يقرأهم أي شخص
DROP POLICY IF EXISTS "districts_public_read"   ON public.districts;
DROP POLICY IF EXISTS "departments_public_read" ON public.departments;
CREATE POLICY "districts_public_read"   ON public.districts   FOR SELECT USING (true);
CREATE POLICY "departments_public_read" ON public.departments FOR SELECT USING (true);

-- Profiles — السياسات
DROP POLICY IF EXISTS "own_profile_select"  ON public.profiles;
DROP POLICY IF EXISTS "own_profile_update"  ON public.profiles;
DROP POLICY IF EXISTS "own_profile_insert"  ON public.profiles;
DROP POLICY IF EXISTS "service_insert"      ON public.profiles;

-- قراءة البروفايل: المستخدم يشوف بتاعه + الموظف/أدمن يشوف الكل
CREATE POLICY "own_profile_select" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('employee', 'admin'))
  );

-- تعديل البروفايل: المستخدم يعدل بروفايله بس
CREATE POLICY "own_profile_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- إنشاء بروفايل: يسمح للمستخدم بإنشاء بروفايله (يُستخدم من الـ Trigger)
CREATE POLICY "own_profile_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- Reports — السياسات
DROP POLICY IF EXISTS "reports_select"  ON public.reports;
DROP POLICY IF EXISTS "reports_insert"  ON public.reports;
DROP POLICY IF EXISTS "reports_update"  ON public.reports;
DROP POLICY IF EXISTS "reports_delete"  ON public.reports;

CREATE POLICY "reports_select" ON public.reports
  FOR SELECT USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('employee', 'admin'))
  );

CREATE POLICY "reports_insert" ON public.reports
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('employee', 'admin'))
  );

CREATE POLICY "reports_update" ON public.reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('employee', 'admin'))
  );

CREATE POLICY "reports_delete" ON public.reports
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('employee', 'admin'))
  );

-- Report Actions
DROP POLICY IF EXISTS "actions_all" ON public.report_actions;
CREATE POLICY "actions_all" ON public.report_actions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('employee', 'admin'))
  );


-- ============================================================
-- STEP 4: Function + Trigger (ينشئ البروفايل تلقائياً لكل مستخدم جديد)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone, national_id_image_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'citizen'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'national_id_image_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ============================================================
-- STEP 5: البيانات الأساسية (Seed Data)
-- ============================================================

INSERT INTO public.districts (id, name_en, name_ar) VALUES
  (1, 'First District',  'الحي الأول'),
  (2, 'Second District', 'الحي الثاني')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.departments (name_en, name_ar, district_id) VALUES
  ('Fire Dept',       'المطافئ',       1),
  ('Police Dept',     'الشرطة',        1),
  ('Ambulance',       'الإسعاف',       1),
  ('Water Co.',       'شركة المياه',   1),
  ('Electricity Co.', 'شركة الكهرباء', 1),
  ('Gas Co.',         'شركة الغاز',    1),
  ('Fire Dept',       'المطافئ',       2),
  ('Police Dept',     'الشرطة',        2),
  ('Ambulance',       'الإسعاف',       2),
  ('Water Co.',       'شركة المياه',   2),
  ('Electricity Co.', 'شركة الكهرباء', 2),
  ('Gas Co.',         'شركة الغاز',    2)
ON CONFLICT DO NOTHING;


-- ============================================================
-- STEP 6: Storage Bucket لصور البطاقات
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('national-ids', 'national-ids', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_upload"  ON storage.objects;
DROP POLICY IF EXISTS "storage_select"  ON storage.objects;

CREATE POLICY "storage_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'national-ids' AND auth.uid() IS NOT NULL);

CREATE POLICY "storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'national-ids' AND auth.uid() IS NOT NULL);


-- ============================================================
-- خلصت! ✅
-- الجداول + السياسات + الـ Trigger + البيانات + Storage
-- ============================================================
