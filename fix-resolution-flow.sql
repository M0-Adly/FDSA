-- ============================================================
-- SQL FIX FOR CITIZEN RESOLUTION CONFIRMATION
-- ============================================================

-- 1. Ensure citizen_confirmed column exists in reports table
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS citizen_confirmed BOOLEAN DEFAULT FALSE;

-- 2. Update status constraint to include possible values if missing
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_status_check CHECK (status IN ('pending', 'ongoing', 'resolved', 'escalated'));

-- 3. FIX RLS POLICIES FOR REPORTS
-- Allow citizens to update their own reports to confirm resolution
DROP POLICY IF EXISTS "reports_update" ON public.reports;
CREATE POLICY "reports_update" ON public.reports
  FOR UPDATE USING (
    (auth.uid() = created_by) OR 
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('employee', 'admin')))
  )
  WITH CHECK (
    (auth.uid() = created_by AND status = 'resolved') OR 
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('employee', 'admin')))
  );

-- 4. FIX RLS POLICIES FOR REPORT ACTIONS
-- Allow citizens to record their "CONFIRM" action
DROP POLICY IF EXISTS "actions_all" ON public.report_actions;
CREATE POLICY "actions_all" ON public.report_actions
  FOR ALL USING (
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('employee', 'admin'))) OR
    (EXISTS (SELECT 1 FROM public.reports WHERE id = report_id AND created_by = auth.uid()))
  );

-- 5. Fix potential recursion in profiles if it still exists
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles 
  FOR SELECT USING (true);

-- 6. Ensure account_status is approved for existing test users to avoid lockout
UPDATE public.profiles SET account_status = 'approved' WHERE account_status IS NULL;
