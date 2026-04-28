-- ============================================================
-- National Crisis Management System — Supabase Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Profiles (extends auth.users) ────────────────────────────────────────────
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  role                  text not null default 'citizen' check (role in ('citizen','employee','admin')),
  full_name             text,
  phone                 text,
  national_id_image_url text,
  employee_id           text unique,
  created_at            timestamptz default now()
);

-- ── Districts ─────────────────────────────────────────────────────────────────
create table if not exists public.districts (
  id      serial primary key,
  name_en text not null,
  name_ar text not null
);

-- ── Departments ───────────────────────────────────────────────────────────────
create table if not exists public.departments (
  id          serial primary key,
  name_en     text not null,
  name_ar     text not null,
  district_id int references public.districts(id)
);

-- ── Reports ───────────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  created_by    uuid references public.profiles(id) on delete set null,
  department_id int  references public.departments(id) on delete set null,
  type          text not null,
  description   text not null,
  priority      int  not null check (priority between 1 and 5),
  status        text not null default 'pending' check (status in ('pending','ongoing','resolved','escalated')),
  escalated     boolean default false,
  ics_score     int,
  created_at    timestamptz default now(),
  resolved_at   timestamptz,
  duration      int,
  sim_step      int
);

-- ── Report Actions (Audit Trail) ──────────────────────────────────────────────
create table if not exists public.report_actions (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid references public.reports(id) on delete cascade,
  action_type  text not null,
  performed_by uuid references public.profiles(id) on delete set null,
  from_dept    text,
  to_dept      text,
  metadata     jsonb,
  created_at   timestamptz default now()
);

-- ── Storage Bucket ────────────────────────────────────────────────────────────
-- Run separately in Storage section or via API:
-- insert into storage.buckets (id, name, public) values ('national-ids', 'national-ids', false);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

alter table public.profiles       enable row level security;
alter table public.reports        enable row level security;
alter table public.report_actions enable row level security;
alter table public.districts      enable row level security;
alter table public.departments    enable row level security;

-- Districts & Departments — publicly readable
create policy "districts_public_read"    on public.districts    for select using (true);
create policy "departments_public_read"  on public.departments  for select using (true);

-- Profiles — own row or employee/admin
create policy "own_profile_select" on public.profiles
  for select using (auth.uid() = id or
    exists (select 1 from public.profiles p2 where p2.id = auth.uid() and p2.role in ('employee','admin')));

create policy "own_profile_update" on public.profiles
  for update using (auth.uid() = id);

create policy "own_profile_insert" on public.profiles
  for insert with check (auth.uid() = id);

-- Reports — citizens see own, employees/admins see all
create policy "citizens_own_reports_select" on public.reports
  for select using (
    auth.uid() = created_by or
    exists (select 1 from public.profiles where id = auth.uid() and role in ('employee','admin'))
  );

create policy "citizens_insert_reports" on public.reports
  for insert with check (
    auth.uid() = created_by or
    exists (select 1 from public.profiles where id = auth.uid() and role in ('employee','admin'))
  );

create policy "employees_update_reports" on public.reports
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('employee','admin'))
  );

create policy "employees_delete_reports" on public.reports
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('employee','admin'))
  );

-- Report Actions — employees/admins only
create policy "employees_report_actions" on public.report_actions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('employee','admin'))
  );

-- ============================================================
-- SEED DATA
-- ============================================================

insert into public.districts (name_en, name_ar) values
  ('First District',  'المنطقة الأولى'),
  ('Second District', 'المنطقة الثانية')
on conflict do nothing;

-- First District departments
insert into public.departments (name_en, name_ar, district_id) values
  ('Fire Dept - D1',       'إدارة الحرائق - م1',   1),
  ('Police Dept - D1',     'الشرطة - م1',            1),
  ('Ambulance - D1',       'الإسعاف - م1',           1),
  ('Water Co. - D1',       'شركة المياه - م1',       1),
  ('Electricity Co. - D1', 'شركة الكهرباء - م1',     1),
  ('Gas Co. - D1',         'شركة الغاز - م1',         1)
on conflict do nothing;

-- Second District departments
insert into public.departments (name_en, name_ar, district_id) values
  ('Fire Dept - D2',       'إدارة الحرائق - م2',   2),
  ('Police Dept - D2',     'الشرطة - م2',            2),
  ('Ambulance - D2',       'الإسعاف - م2',           2),
  ('Water Co. - D2',       'شركة المياه - م2',       2),
  ('Electricity Co. - D2', 'شركة الكهرباء - م2',     2),
  ('Gas Co. - D2',         'شركة الغاز - م2',         2)
on conflict do nothing;

-- ============================================================
-- HELPER: Create the storage bucket (run after migration)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('national-ids', 'national-ids', false)
-- on conflict do nothing;

-- Storage policy for national IDs
-- create policy "users_upload_own_id" on storage.objects
--   for insert with check (bucket_id = 'national-ids' and auth.uid()::text = (storage.foldername(name))[1]);

-- create policy "users_view_own_id" on storage.objects
--   for select using (bucket_id = 'national-ids' and auth.uid()::text = (storage.foldername(name))[1]);

-- create policy "employees_view_all_ids" on storage.objects
--   for select using (bucket_id = 'national-ids' and
--     exists (select 1 from public.profiles where id = auth.uid() and role in ('employee','admin')));
