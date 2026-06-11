REVOKE EXECUTE ON FUNCTION public.rebuild_match_ratings(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rebuild_match_ratings(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rebuild_match_ratings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rebuild_match_ratings(uuid) TO service_role;