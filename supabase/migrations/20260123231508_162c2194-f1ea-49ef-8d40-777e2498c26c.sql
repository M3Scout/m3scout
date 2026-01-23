-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications (via trigger)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to notify player when report is created
CREATE OR REPLACE FUNCTION public.notify_player_on_report()
RETURNS TRIGGER AS $$
DECLARE
  player_user_id UUID;
  player_name TEXT;
BEGIN
  -- Get the user_id linked to this player
  SELECT ur.user_id INTO player_user_id
  FROM public.user_roles ur
  WHERE ur.linked_player_id = NEW.player_id
    AND ur.role = 'player'
  LIMIT 1;
  
  -- If player has a linked user account, create notification
  IF player_user_id IS NOT NULL THEN
    -- Get player name for the notification
    SELECT name INTO player_name
    FROM public.players
    WHERE id = NEW.player_id;
    
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      player_user_id,
      'Novo Relatório Publicado',
      'Um novo relatório de scouting foi publicado sobre você.',
      'report',
      '/app/reports/' || NEW.id::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new scouting reports
CREATE TRIGGER on_scouting_report_created
AFTER INSERT ON public.scouting_reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_player_on_report();