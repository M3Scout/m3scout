export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      brazil_state_tiers: {
        Row: {
          base_coefficient: number
          created_at: string
          id: string
          notes: string | null
          state: string
          state_name: string | null
          tier: number
          tier_label: string | null
          updated_at: string
        }
        Insert: {
          base_coefficient?: number
          created_at?: string
          id?: string
          notes?: string | null
          state: string
          state_name?: string | null
          tier: number
          tier_label?: string | null
          updated_at?: string
        }
        Update: {
          base_coefficient?: number
          created_at?: string
          id?: string
          notes?: string | null
          state?: string
          state_name?: string | null
          tier?: number
          tier_label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      competitions: {
        Row: {
          base_coefficient: number
          computed_coefficient: number
          country: string
          created_at: string
          division: string | null
          id: string
          is_active: boolean | null
          name: string
          phase: string | null
          state: string | null
          type: Database["public"]["Enums"]["competition_type"]
          updated_at: string
          visibility_score: number | null
        }
        Insert: {
          base_coefficient?: number
          computed_coefficient?: number
          country: string
          created_at?: string
          division?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phase?: string | null
          state?: string | null
          type: Database["public"]["Enums"]["competition_type"]
          updated_at?: string
          visibility_score?: number | null
        }
        Update: {
          base_coefficient?: number
          computed_coefficient?: number
          country?: string
          created_at?: string
          division?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phase?: string | null
          state?: string | null
          type?: Database["public"]["Enums"]["competition_type"]
          updated_at?: string
          visibility_score?: number | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          notes: string | null
          organization: string | null
          phone: string | null
          player_slug: string | null
          status: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          notes?: string | null
          organization?: string | null
          phone?: string | null
          player_slug?: string | null
          status?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          notes?: string | null
          organization?: string | null
          phone?: string | null
          player_slug?: string | null
          status?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      player_injuries: {
        Row: {
          created_at: string
          id: string
          injury_type: string
          notes: string | null
          player_id: string
          return_date: string | null
          severity: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          injury_type: string
          notes?: string | null
          player_id: string
          return_date?: string | null
          severity?: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          injury_type?: string
          notes?: string | null
          player_id?: string
          return_date?: string | null
          severity?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_injuries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats: {
        Row: {
          assists: number
          competition_id: string | null
          created_at: string
          goals: number
          id: string
          interceptions: number
          matches: number
          minutes: number
          player_id: string
          recoveries: number
          red_cards: number
          season_year: number
          tackles: number
          updated_at: string
          yellow_cards: number
        }
        Insert: {
          assists?: number
          competition_id?: string | null
          created_at?: string
          goals?: number
          id?: string
          interceptions?: number
          matches?: number
          minutes?: number
          player_id: string
          recoveries?: number
          red_cards?: number
          season_year?: number
          tackles?: number
          updated_at?: string
          yellow_cards?: number
        }
        Update: {
          assists?: number
          competition_id?: string | null
          created_at?: string
          goals?: number
          id?: string
          interceptions?: number
          matches?: number
          minutes?: number
          player_id?: string
          recoveries?: number
          red_cards?: number
          season_year?: number
          tackles?: number
          updated_at?: string
          yellow_cards?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          age: number | null
          agent_contact: string | null
          agent_name: string | null
          areas_to_develop: string[] | null
          bio_public: string | null
          birth_date: string | null
          body_fat_percentage: number | null
          contract_end: string | null
          contract_notes: string | null
          contract_start: string | null
          contract_status: string | null
          country: string | null
          created_at: string
          created_by: string | null
          current_club: string | null
          dominant_foot: string | null
          estimated_level: string | null
          full_name: string
          height: number | null
          highlight_video_url: string | null
          id: string
          internal_evaluation_notes: string | null
          internal_notes: string | null
          is_public: boolean | null
          last_physical_evaluation: string | null
          max_speed: number | null
          medical_notes: string | null
          muscle_mass: number | null
          nationality: string
          overall_rating: number | null
          passports: string[] | null
          photo_url: string | null
          physical_status: string | null
          play_style: string | null
          playing_height_preference: string | null
          position: string
          potential_rating: number | null
          primary_tactical_role: string | null
          ready_to_compete: boolean | null
          release_clause: string | null
          salary_info: string | null
          secondary_positions: string[] | null
          secondary_tactical_role: string | null
          slug: string
          sprint_30m: number | null
          strengths: string[] | null
          updated_at: string
          vo2_max: number | null
          weight: number | null
          wingspan: number | null
        }
        Insert: {
          age?: number | null
          agent_contact?: string | null
          agent_name?: string | null
          areas_to_develop?: string[] | null
          bio_public?: string | null
          birth_date?: string | null
          body_fat_percentage?: number | null
          contract_end?: string | null
          contract_notes?: string | null
          contract_start?: string | null
          contract_status?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          current_club?: string | null
          dominant_foot?: string | null
          estimated_level?: string | null
          full_name: string
          height?: number | null
          highlight_video_url?: string | null
          id?: string
          internal_evaluation_notes?: string | null
          internal_notes?: string | null
          is_public?: boolean | null
          last_physical_evaluation?: string | null
          max_speed?: number | null
          medical_notes?: string | null
          muscle_mass?: number | null
          nationality: string
          overall_rating?: number | null
          passports?: string[] | null
          photo_url?: string | null
          physical_status?: string | null
          play_style?: string | null
          playing_height_preference?: string | null
          position: string
          potential_rating?: number | null
          primary_tactical_role?: string | null
          ready_to_compete?: boolean | null
          release_clause?: string | null
          salary_info?: string | null
          secondary_positions?: string[] | null
          secondary_tactical_role?: string | null
          slug: string
          sprint_30m?: number | null
          strengths?: string[] | null
          updated_at?: string
          vo2_max?: number | null
          weight?: number | null
          wingspan?: number | null
        }
        Update: {
          age?: number | null
          agent_contact?: string | null
          agent_name?: string | null
          areas_to_develop?: string[] | null
          bio_public?: string | null
          birth_date?: string | null
          body_fat_percentage?: number | null
          contract_end?: string | null
          contract_notes?: string | null
          contract_start?: string | null
          contract_status?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          current_club?: string | null
          dominant_foot?: string | null
          estimated_level?: string | null
          full_name?: string
          height?: number | null
          highlight_video_url?: string | null
          id?: string
          internal_evaluation_notes?: string | null
          internal_notes?: string | null
          is_public?: boolean | null
          last_physical_evaluation?: string | null
          max_speed?: number | null
          medical_notes?: string | null
          muscle_mass?: number | null
          nationality?: string
          overall_rating?: number | null
          passports?: string[] | null
          photo_url?: string | null
          physical_status?: string | null
          play_style?: string | null
          playing_height_preference?: string | null
          position?: string
          potential_rating?: number | null
          primary_tactical_role?: string | null
          ready_to_compete?: boolean | null
          release_clause?: string | null
          salary_info?: string | null
          secondary_positions?: string[] | null
          secondary_tactical_role?: string | null
          slug?: string
          sprint_30m?: number | null
          strengths?: string[] | null
          updated_at?: string
          vo2_max?: number | null
          weight?: number | null
          wingspan?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scouting_reports: {
        Row: {
          adjusted_score: number
          base_score: number
          competition_coefficient: number
          competition_id: string
          consistency_modifier: number | null
          created_at: string
          final_score: number
          id: string
          impact_notes: string | null
          impact_score: number
          match_date: string
          match_notes: string | null
          mental_notes: string | null
          mental_score: number
          opponent: string | null
          physical_notes: string | null
          physical_score: number
          player_id: string
          potential_bonus: number | null
          rating: number
          recommendation: string | null
          scout_id: string
          summary: string | null
          tactical_notes: string | null
          tactical_score: number
          technical_notes: string | null
          technical_score: number
          updated_at: string
        }
        Insert: {
          adjusted_score: number
          base_score: number
          competition_coefficient: number
          competition_id: string
          consistency_modifier?: number | null
          created_at?: string
          final_score: number
          id?: string
          impact_notes?: string | null
          impact_score: number
          match_date: string
          match_notes?: string | null
          mental_notes?: string | null
          mental_score: number
          opponent?: string | null
          physical_notes?: string | null
          physical_score: number
          player_id: string
          potential_bonus?: number | null
          rating: number
          recommendation?: string | null
          scout_id: string
          summary?: string | null
          tactical_notes?: string | null
          tactical_score: number
          technical_notes?: string | null
          technical_score: number
          updated_at?: string
        }
        Update: {
          adjusted_score?: number
          base_score?: number
          competition_coefficient?: number
          competition_id?: string
          consistency_modifier?: number | null
          created_at?: string
          final_score?: number
          id?: string
          impact_notes?: string | null
          impact_score?: number
          match_date?: string
          match_notes?: string | null
          mental_notes?: string | null
          mental_score?: number
          opponent?: string | null
          physical_notes?: string | null
          physical_score?: number
          player_id?: string
          potential_bonus?: number | null
          rating?: number
          recommendation?: string | null
          scout_id?: string
          summary?: string | null
          tactical_notes?: string | null
          tactical_score?: number
          technical_notes?: string | null
          technical_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scouting_reports_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouting_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_internal_user: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "scout" | "member" | "partner"
      competition_type: "league" | "cup" | "state_league" | "continental"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "scout", "member", "partner"],
      competition_type: ["league", "cup", "state_league", "continental"],
    },
  },
} as const
