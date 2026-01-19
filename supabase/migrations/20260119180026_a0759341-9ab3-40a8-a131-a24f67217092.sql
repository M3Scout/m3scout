-- Step 1: Add new roles to the existing enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

-- Step 2: Create user_permissions table for granular control
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_view BOOLEAN NOT NULL DEFAULT true,
  players_view BOOLEAN NOT NULL DEFAULT false,
  players_create BOOLEAN NOT NULL DEFAULT false,
  players_edit BOOLEAN NOT NULL DEFAULT false,
  players_delete BOOLEAN NOT NULL DEFAULT false,
  players_export BOOLEAN NOT NULL DEFAULT false,
  compare_view BOOLEAN NOT NULL DEFAULT false,
  reports_view BOOLEAN NOT NULL DEFAULT false,
  reports_create BOOLEAN NOT NULL DEFAULT false,
  reports_edit BOOLEAN NOT NULL DEFAULT false,
  reports_delete BOOLEAN NOT NULL DEFAULT false,
  reports_export BOOLEAN NOT NULL DEFAULT false,
  live_match_view BOOLEAN NOT NULL DEFAULT false,
  live_match_log BOOLEAN NOT NULL DEFAULT false,
  competitions_view BOOLEAN NOT NULL DEFAULT false,
  competitions_create BOOLEAN NOT NULL DEFAULT false,
  competitions_edit BOOLEAN NOT NULL DEFAULT false,
  competitions_delete BOOLEAN NOT NULL DEFAULT false,
  news_view BOOLEAN NOT NULL DEFAULT false,
  news_create BOOLEAN NOT NULL DEFAULT false,
  news_edit BOOLEAN NOT NULL DEFAULT false,
  news_delete BOOLEAN NOT NULL DEFAULT false,
  news_publish BOOLEAN NOT NULL DEFAULT false,
  leads_view BOOLEAN NOT NULL DEFAULT false,
  leads_create BOOLEAN NOT NULL DEFAULT false,
  leads_edit BOOLEAN NOT NULL DEFAULT false,
  leads_delete BOOLEAN NOT NULL DEFAULT false,
  leads_export BOOLEAN NOT NULL DEFAULT false,
  users_manage BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Step 3: Add columns to user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Step 4: Add last_login tracking to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Step 5: Enable RLS on user_permissions
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Step 6: Create security definer functions
CREATE OR REPLACE FUNCTION public.is_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND is_owner = true
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_delete(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _module TEXT, _action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  perm_value BOOLEAN;
  col_name TEXT;
BEGIN
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
  
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  IF _action = 'delete' THEN
    RETURN false;
  END IF;
  
  col_name := _module || '_' || _action;
  
  EXECUTE format('SELECT %I FROM public.user_permissions WHERE user_id = $1', col_name)
    INTO perm_value
    USING _user_id;
  
  RETURN COALESCE(perm_value, false);
END;
$$;

-- Step 7: RLS policies for user_permissions
DROP POLICY IF EXISTS "Admins can manage all permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;

CREATE POLICY "Admins can manage all permissions"
  ON public.user_permissions
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Step 8: Update user_roles policies for owner protection
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage non-owner roles" ON public.user_roles;

CREATE POLICY "Admins can manage non-owner roles"
  ON public.user_roles
  FOR ALL
  USING (
    is_admin(auth.uid()) 
    AND (user_id = auth.uid() OR is_owner = false OR is_owner(auth.uid()))
  )
  WITH CHECK (
    is_admin(auth.uid())
    AND (user_id = auth.uid() OR is_owner = false OR is_owner(auth.uid()))
  );

-- Step 9: Mark first admin as owner
UPDATE public.user_roles
SET is_owner = true
WHERE role = 'admin' 
AND created_at = (SELECT MIN(created_at) FROM public.user_roles WHERE role = 'admin');