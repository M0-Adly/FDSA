-- Add citizen_confirmed to reports
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS citizen_confirmed BOOLEAN DEFAULT FALSE;

-- Update status constraint if needed (though resolved is still the final state)
-- We might want to add 'resolved_by_staff' to distinguish?
-- Let's stick with: status='resolved' AND citizen_confirmed=false -> "Awaiting Citizen Confirmation"
-- status='resolved' AND citizen_confirmed=true -> "Fully Resolved"
