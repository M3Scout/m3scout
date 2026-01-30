-- Create contract_notifications table for anti-duplication
CREATE TABLE public.contract_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid NOT NULL REFERENCES public.player_contract_history(id) ON DELETE CASCADE,
  milestone_days integer NOT NULL,
  notified_at timestamp with time zone NOT NULL DEFAULT now(),
  notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Unique constraint to prevent duplicate notifications for same contract + milestone
  CONSTRAINT unique_contract_milestone UNIQUE (contract_id, milestone_days)
);

-- Enable RLS
ALTER TABLE public.contract_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Internal users can view contract notifications"
  ON public.contract_notifications
  FOR SELECT
  USING (is_internal_user(auth.uid()));

CREATE POLICY "Scouts and admins can manage contract notifications"
  ON public.contract_notifications
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'scout'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'scout'::app_role));

-- Create index for fast lookups
CREATE INDEX idx_contract_notifications_contract ON public.contract_notifications(contract_id);
CREATE INDEX idx_contract_notifications_milestone ON public.contract_notifications(milestone_days);