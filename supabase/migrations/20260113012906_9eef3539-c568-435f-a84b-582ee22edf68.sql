-- Fix function search path for security
ALTER FUNCTION public.calculate_player_attribute_scores(uuid, uuid, integer) SET search_path = public;
ALTER FUNCTION public.recalculate_player_all_attributes(uuid) SET search_path = public;
ALTER FUNCTION public.recalculate_all_attribute_scores() SET search_path = public;