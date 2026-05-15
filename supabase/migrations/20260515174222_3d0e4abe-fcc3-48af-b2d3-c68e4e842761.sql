REVOKE ALL ON FUNCTION public.remove_player_live_stats_group(uuid, integer, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_player_live_stats_group(uuid, integer, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.remove_player_live_stats_group(uuid, integer, uuid) TO authenticated;