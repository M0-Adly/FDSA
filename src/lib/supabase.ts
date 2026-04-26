import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnon);

// ── Database Types ────────────────────────────────────────────────────────────
export interface DbProfile {
  id: string;
  role: 'citizen' | 'employee' | 'admin';
  full_name: string | null;
  phone: string | null;
  national_id_image_url: string | null;
  employee_id: string | null;
  created_at: string;
}

export interface DbDistrict {
  id: number;
  name_en: string;
  name_ar: string;
}

export interface DbDepartment {
  id: number;
  name_en: string;
  name_ar: string;
  district_id: number;
}

export interface DbReport {
  id: string;
  created_by: string | null;
  department_id: number | null;
  type: string;
  description: string;
  priority: number;
  status: 'Pending' | 'Ongoing' | 'Resolved';
  escalated: boolean;
  ics_score: number | null;
  created_at: string;
  resolved_at: string | null;
  duration: number | null;
  sim_step: number | null;
}

export interface DbReportAction {
  id: string;
  report_id: string | null;
  action_type: string;
  performed_by: string | null;
  from_dept: string | null;
  to_dept: string | null;
  created_at: string;
}
