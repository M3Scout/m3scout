-- Create function to notify player when they are added to a match lineup
CREATE OR REPLACE FUNCTION public.notify_player_on_lineup()
RETURNS TRIGGER AS $$
DECLARE
  player_user_id UUID;
  match_info RECORD;
BEGIN
  -- Get the user_id linked to this player
  SELECT ur.user_id INTO player_user_id
  FROM public.user_roles ur
  WHERE ur.linked_player_id = NEW.player_id
    AND ur.role = 'player'
    AND ur.status = 'active'
  LIMIT 1;
  
  -- If player has a linked user account, create notification
  IF player_user_id IS NOT NULL THEN
    -- Get match details for the notification
    SELECT 
      m.opponent_name,
      m.match_date,
      c.name as competition_name
    INTO match_info
    FROM public.matches m
    LEFT JOIN public.competitions c ON c.id = m.competition_id
    WHERE m.id = NEW.match_id;
    
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      player_user_id,
      'Você foi escalado!',
      COALESCE(
        'Você foi escalado para o jogo contra ' || match_info.opponent_name || 
        CASE WHEN match_info.competition_name IS NOT NULL 
          THEN ' pela ' || match_info.competition_name 
          ELSE '' 
        END || '.',
        'Você foi escalado para um novo jogo.'
      ),
      'match',
      '/app/live-match/' || NEW.match_id::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for when player is added to match lineup
DROP TRIGGER IF EXISTS on_player_added_to_match ON public.match_players;
CREATE TRIGGER on_player_added_to_match
AFTER INSERT ON public.match_players
FOR EACH ROW
EXECUTE FUNCTION public.notify_player_on_lineup();