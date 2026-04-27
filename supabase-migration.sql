-- Create tables
CREATE TABLE IF NOT EXISTS districts (
    id SERIAL PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    district_id INT REFERENCES districts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('citizen', 'employee', 'admin')),
    full_name TEXT,
    phone TEXT,
    national_id_image_url TEXT,
    employee_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES profiles(id),
    department_id INT REFERENCES departments(id),
    type TEXT NOT NULL,
    description TEXT,
    priority INT CHECK (priority BETWEEN 1 AND 5),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ongoing', 'resolved', 'escalated')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    escalated BOOLEAN DEFAULT FALSE,
    district_id INT REFERENCES districts(id)
);

CREATE TABLE IF NOT EXISTS report_actions (
    id SERIAL PRIMARY KEY,
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    performed_by UUID REFERENCES profiles(id),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- RLS Policies
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_actions ENABLE ROW LEVEL SECURITY;

-- Districts & Departments: Read for everyone authenticated
CREATE POLICY "Public read districts" ON districts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read departments" ON departments FOR SELECT TO authenticated USING (true);

-- Profiles: Users read own, admins read all
CREATE POLICY "Users read own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON profiles FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins update all profiles" ON profiles FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Reports: Citizens read/write own, Employees/Admins read/write all
CREATE POLICY "Citizens read own reports" ON reports FOR SELECT TO authenticated USING (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('employee', 'admin'))
);
CREATE POLICY "Citizens insert own reports" ON reports FOR INSERT TO authenticated WITH CHECK (
    created_by = auth.uid() AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'citizen'
);
CREATE POLICY "Employees/Admins update all reports" ON reports FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('employee', 'admin'))
);

-- Report Actions: Employees/Admins read/write all
CREATE POLICY "Employees/Admins manage actions" ON report_actions FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('employee', 'admin'))
);

-- Seed Data
INSERT INTO districts (id, name_en, name_ar) VALUES 
(1, 'First District', 'الحي الأول'),
(2, 'Second District', 'الحي الثاني')
ON CONFLICT (id) DO NOTHING;

INSERT INTO departments (name_en, name_ar, district_id)
SELECT 'Fire Dept', 'المطافئ', 1 UNION ALL
SELECT 'Police Dept', 'الشرطة', 1 UNION ALL
SELECT 'Ambulance', 'الإسعاف', 1 UNION ALL
SELECT 'Water Co.', 'شركة المياه', 1 UNION ALL
SELECT 'Electricity Co.', 'شركة الكهرباء', 1 UNION ALL
SELECT 'Gas Co.', 'شركة الغاز', 1 UNION ALL
SELECT 'Fire Dept', 'المطافئ', 2 UNION ALL
SELECT 'Police Dept', 'الشرطة', 2 UNION ALL
SELECT 'Ambulance', 'الإسعاف', 2 UNION ALL
SELECT 'Water Co.', 'شركة المياه', 2 UNION ALL
SELECT 'Electricity Co.', 'شركة الكهرباء', 2 UNION ALL
SELECT 'Gas Co.', 'شركة الغاز', 2
ON CONFLICT DO NOTHING;

-- Trigger for Profile Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE(new.raw_user_meta_data->>'role', 'citizen'),
    new.raw_user_meta_data->>'phone'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
