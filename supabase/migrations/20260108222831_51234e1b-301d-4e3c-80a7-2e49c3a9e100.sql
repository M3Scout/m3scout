-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'scout', 'member', 'partner');

-- Create enum for competition types
CREATE TYPE public.competition_type AS ENUM ('league', 'cup', 'state_league', 'continental');

-- ========================================
-- USER ROLES TABLE (separate from profiles for security)
-- ========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PROFILES TABLE
-- ========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ========================================
-- COMPETITIONS TABLE
-- ========================================
CREATE TABLE public.competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  state TEXT,
  type competition_type NOT NULL,
  division TEXT,
  phase TEXT,
  base_coefficient DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  computed_coefficient DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  visibility_score INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PLAYERS TABLE
-- ========================================
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  
  -- Public fields
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  secondary_positions TEXT[] DEFAULT '{}',
  birth_date DATE,
  age INTEGER,
  height INTEGER,
  dominant_foot TEXT,
  nationality TEXT NOT NULL,
  current_club TEXT,
  country TEXT,
  photo_url TEXT,
  bio_public TEXT,
  highlight_video_url TEXT,
  
  -- Private fields
  contract_end DATE,
  contract_notes TEXT,
  salary_info TEXT,
  internal_notes TEXT,
  agent_name TEXT,
  agent_contact TEXT,
  
  -- Control
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- ========================================
-- SCOUTING REPORTS TABLE
-- ========================================
CREATE TABLE public.scouting_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.competitions(id),
  scout_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Match info
  match_date DATE NOT NULL,
  opponent TEXT,
  match_notes TEXT,
  
  -- Category scores (0-100)
  technical_score INTEGER NOT NULL CHECK (technical_score >= 0 AND technical_score <= 100),
  tactical_score INTEGER NOT NULL CHECK (tactical_score >= 0 AND tactical_score <= 100),
  physical_score INTEGER NOT NULL CHECK (physical_score >= 0 AND physical_score <= 100),
  mental_score INTEGER NOT NULL CHECK (mental_score >= 0 AND mental_score <= 100),
  impact_score INTEGER NOT NULL CHECK (impact_score >= 0 AND impact_score <= 100),
  
  -- Detailed notes per category
  technical_notes TEXT,
  tactical_notes TEXT,
  physical_notes TEXT,
  mental_notes TEXT,
  impact_notes TEXT,
  
  -- Calculated scores (stored for performance)
  base_score DECIMAL(5,2) NOT NULL,
  competition_coefficient DECIMAL(4,2) NOT NULL,
  adjusted_score DECIMAL(5,2) NOT NULL,
  
  -- Modifiers
  potential_bonus INTEGER DEFAULT 0 CHECK (potential_bonus >= 0 AND potential_bonus <= 8),
  consistency_modifier INTEGER DEFAULT 0 CHECK (consistency_modifier >= -5 AND consistency_modifier <= 5),
  
  -- Final
  final_score DECIMAL(5,2) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  
  -- Overall assessment
  summary TEXT,
  recommendation TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scouting_reports ENABLE ROW LEVEL SECURITY;

-- ========================================
-- LEADS TABLE (from public contact form)
-- ========================================
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  organization TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  player_slug TEXT,
  status TEXT DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- ========================================
-- SECURITY DEFINER FUNCTIONS
-- ========================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Function to check if user has any internal role (admin, scout, member)
CREATE OR REPLACE FUNCTION public.is_internal_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'scout', 'member')
  )
$$;

-- ========================================
-- RLS POLICIES
-- ========================================

-- User Roles policies
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Competitions policies (public read, admin write)
CREATE POLICY "Anyone can view active competitions"
ON public.competitions FOR SELECT
TO authenticated
USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage competitions"
ON public.competitions FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Players policies
CREATE POLICY "Public players visible to everyone"
ON public.players FOR SELECT
USING (is_public = true);

CREATE POLICY "Internal users can view all players"
ON public.players FOR SELECT
TO authenticated
USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Scouts and admins can create players"
ON public.players FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'scout')
);

CREATE POLICY "Scouts and admins can update players"
ON public.players FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'scout')
);

CREATE POLICY "Admins can delete players"
ON public.players FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Scouting Reports policies
CREATE POLICY "Internal users can view reports"
ON public.scouting_reports FOR SELECT
TO authenticated
USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Scouts and admins can create reports"
ON public.scouting_reports FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'scout'))
  AND scout_id = auth.uid()
);

CREATE POLICY "Scouts can update their own reports"
ON public.scouting_reports FOR UPDATE
TO authenticated
USING (
  scout_id = auth.uid() OR public.is_admin(auth.uid())
);

CREATE POLICY "Admins can delete reports"
ON public.scouting_reports FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Leads policies (public insert, internal read)
CREATE POLICY "Anyone can create leads"
ON public.leads FOR INSERT
WITH CHECK (true);

CREATE POLICY "Internal users can view leads"
ON public.leads FOR SELECT
TO authenticated
USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Admins can manage leads"
ON public.leads FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ========================================
-- TRIGGERS
-- ========================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_competitions_updated_at
  BEFORE UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scouting_reports_updated_at
  BEFORE UPDATE ON public.scouting_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- INDEXES
-- ========================================
CREATE INDEX idx_players_slug ON public.players(slug);
CREATE INDEX idx_players_is_public ON public.players(is_public);
CREATE INDEX idx_players_position ON public.players(position);
CREATE INDEX idx_scouting_reports_player ON public.scouting_reports(player_id);
CREATE INDEX idx_scouting_reports_scout ON public.scouting_reports(scout_id);
CREATE INDEX idx_competitions_type ON public.competitions(type);
CREATE INDEX idx_competitions_country ON public.competitions(country);
CREATE INDEX idx_leads_status ON public.leads(status);