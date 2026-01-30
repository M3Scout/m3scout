-- Create optimized RBAC function that returns everything in a single call
-- This eliminates multiple roundtrips and N+1 queries

CREATE OR REPLACE FUNCTION public.get_user_rbac(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_roles jsonb;
  v_permissions jsonb;
  v_is_admin boolean := false;
  v_is_player boolean := false;
  v_linked_player_id uuid := null;
  v_is_owner boolean := false;
  v_status text := null;
BEGIN
  -- Get all roles data in one query
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'role', role,
        'status', status,
        'is_owner', is_owner,
        'linked_player_id', linked_player_id
      )
    ),
    bool_or(role = 'admin' AND status = 'active'),
    bool_or(role = 'player' AND status = 'active'),
    bool_or(is_owner),
    -- Get linked_player_id from player role
    (SELECT linked_player_id FROM user_roles WHERE user_id = p_user_id AND role = 'player' AND status = 'active' LIMIT 1),
    -- Derive status (suspended takes priority)
    CASE 
      WHEN bool_or(status = 'suspended') THEN 'suspended'
      WHEN bool_or(status = 'active') THEN 'active'
      ELSE null
    END
  INTO v_roles, v_is_admin, v_is_player, v_is_owner, v_linked_player_id, v_status
  FROM user_roles
  WHERE user_id = p_user_id;

  -- Get permissions only if not admin and not player (optimization)
  IF NOT v_is_admin AND NOT v_is_player THEN
    SELECT jsonb_build_object(
      'app_view', COALESCE(app_view, false),
      'players_view', COALESCE(players_view, false),
      'players_create', COALESCE(players_create, false),
      'players_edit', COALESCE(players_edit, false),
      'players_delete', false, -- Always false for non-admin
      'players_export', COALESCE(players_export, false),
      'compare_view', COALESCE(compare_view, false),
      'reports_view', COALESCE(reports_view, false),
      'reports_create', COALESCE(reports_create, false),
      'reports_edit', COALESCE(reports_edit, false),
      'reports_delete', false, -- Always false for non-admin
      'reports_export', COALESCE(reports_export, false),
      'live_match_view', COALESCE(live_match_view, false),
      'live_match_log', COALESCE(live_match_log, false),
      'competitions_view', COALESCE(competitions_view, false),
      'competitions_create', COALESCE(competitions_create, false),
      'competitions_edit', COALESCE(competitions_edit, false),
      'competitions_delete', false, -- Always false for non-admin
      'news_view', COALESCE(news_view, false),
      'news_create', COALESCE(news_create, false),
      'news_edit', COALESCE(news_edit, false),
      'news_delete', false, -- Always false for non-admin
      'news_publish', COALESCE(news_publish, false),
      'leads_view', COALESCE(leads_view, false),
      'leads_create', COALESCE(leads_create, false),
      'leads_edit', COALESCE(leads_edit, false),
      'leads_delete', false, -- Always false for non-admin
      'leads_export', COALESCE(leads_export, false),
      'users_manage', COALESCE(users_manage, false)
    )
    INTO v_permissions
    FROM user_permissions
    WHERE user_id = p_user_id
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;

  -- Build final result
  v_result := jsonb_build_object(
    'userId', p_user_id,
    'roles', COALESCE(
      (SELECT jsonb_agg(role ORDER BY 
        CASE role 
          WHEN 'admin' THEN 1 
          WHEN 'scout' THEN 2 
          WHEN 'editor' THEN 3 
          WHEN 'viewer' THEN 4 
          WHEN 'player' THEN 5 
          ELSE 6 
        END
      ) FROM user_roles WHERE user_id = p_user_id AND status = 'active'),
      '[]'::jsonb
    ),
    'isAdmin', COALESCE(v_is_admin, false),
    'isPlayer', COALESCE(v_is_player, false),
    'isOwner', COALESCE(v_is_owner, false),
    'linkedPlayerId', v_linked_player_id,
    'userStatus', v_status,
    'permissions', v_permissions,
    'fetchedAt', extract(epoch from now()) * 1000,
    'ttlSeconds', 1800 -- 30 minutes
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_rbac(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_user_rbac IS 'Consolidated RBAC function that returns roles, permissions, and metadata in a single call. Used by AuthProvider for optimized permission loading.';