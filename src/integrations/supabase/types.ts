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
      competition_phases: {
        Row: {
          competition_id: string
          created_at: string
          id: string
          phase_name: string
          phase_order: number
          phase_weight: number
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          phase_name: string
          phase_order: number
          phase_weight?: number
        }
        Update: {
          competition_id?: string
          created_at?: string
          id?: string
          phase_name?: string
          phase_order?: number
          phase_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "competition_phases_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          base_coefficient: number
          competition_code: string | null
          computed_coefficient: number
          country: string
          created_at: string
          display_name: string | null
          division: string | null
          final_coefficient: number
          has_phases: boolean
          id: string
          is_active: boolean | null
          is_unique: boolean | null
          name: string
          phase: string | null
          state: string | null
          tier: string
          type: Database["public"]["Enums"]["competition_type"]
          updated_at: string
          visibility_score: number | null
        }
        Insert: {
          base_coefficient?: number
          competition_code?: string | null
          computed_coefficient?: number
          country: string
          created_at?: string
          display_name?: string | null
          division?: string | null
          final_coefficient?: number
          has_phases?: boolean
          id?: string
          is_active?: boolean | null
          is_unique?: boolean | null
          name: string
          phase?: string | null
          state?: string | null
          tier?: string
          type: Database["public"]["Enums"]["competition_type"]
          updated_at?: string
          visibility_score?: number | null
        }
        Update: {
          base_coefficient?: number
          competition_code?: string | null
          computed_coefficient?: number
          country?: string
          created_at?: string
          display_name?: string | null
          division?: string | null
          final_coefficient?: number
          has_phases?: boolean
          id?: string
          is_active?: boolean | null
          is_unique?: boolean | null
          name?: string
          phase?: string | null
          state?: string | null
          tier?: string
          type?: Database["public"]["Enums"]["competition_type"]
          updated_at?: string
          visibility_score?: number | null
        }
        Relationships: []
      }
      instagram_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          last_refreshed_at: string | null
          token_type: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          last_refreshed_at?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          last_refreshed_at?: string | null
          token_type?: string | null
          updated_at?: string
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
      match_events: {
        Row: {
          created_at: string
          display_minute: string | null
          event_type: Database["public"]["Enums"]["match_event_type"]
          half: number | null
          id: string
          match_id: string
          minute: number | null
          player_id: string
          value: number
        }
        Insert: {
          created_at?: string
          display_minute?: string | null
          event_type: Database["public"]["Enums"]["match_event_type"]
          half?: number | null
          id?: string
          match_id: string
          minute?: number | null
          player_id: string
          value?: number
        }
        Update: {
          created_at?: string
          display_minute?: string | null
          event_type?: Database["public"]["Enums"]["match_event_type"]
          half?: number | null
          id?: string
          match_id?: string
          minute?: number | null
          player_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          created_at: string
          entered_minute: number | null
          exited_minute: number | null
          id: string
          is_on_field: boolean
          is_removed: boolean | null
          match_id: string
          minutes_played: number | null
          notes: string | null
          player_id: string
          position_template: Database["public"]["Enums"]["position_template"]
          removed_at: string | null
          removed_by: string | null
          started: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          entered_minute?: number | null
          exited_minute?: number | null
          id?: string
          is_on_field?: boolean
          is_removed?: boolean | null
          match_id: string
          minutes_played?: number | null
          notes?: string | null
          player_id: string
          position_template?: Database["public"]["Enums"]["position_template"]
          removed_at?: string | null
          removed_by?: string | null
          started?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          entered_minute?: number | null
          exited_minute?: number | null
          id?: string
          is_on_field?: boolean
          is_removed?: boolean | null
          match_id?: string
          minutes_played?: number | null
          notes?: string | null
          player_id?: string
          position_template?: Database["public"]["Enums"]["position_template"]
          removed_at?: string | null
          removed_by?: string | null
          started?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          added_time_first_half: number | null
          added_time_second_half: number | null
          clock_status: string | null
          competition_id: string | null
          created_at: string
          created_by: string
          duration_minutes: number
          elapsed_seconds_in_half: number | null
          half: number | null
          half_start_time: string | null
          id: string
          match_date: string
          match_start_time: string | null
          notes: string | null
          opponent_name: string
          season_year: number
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
          venue: string | null
        }
        Insert: {
          added_time_first_half?: number | null
          added_time_second_half?: number | null
          clock_status?: string | null
          competition_id?: string | null
          created_at?: string
          created_by: string
          duration_minutes?: number
          elapsed_seconds_in_half?: number | null
          half?: number | null
          half_start_time?: string | null
          id?: string
          match_date?: string
          match_start_time?: string | null
          notes?: string | null
          opponent_name: string
          season_year?: number
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
          venue?: string | null
        }
        Update: {
          added_time_first_half?: number | null
          added_time_second_half?: number | null
          clock_status?: string | null
          competition_id?: string | null
          created_at?: string
          created_by?: string
          duration_minutes?: number
          elapsed_seconds_in_half?: number | null
          half?: number | null
          half_start_time?: string | null
          id?: string
          match_date?: string
          match_start_time?: string | null
          notes?: string | null
          opponent_name?: string
          season_year?: number
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          excerpt: string | null
          featured_image_url: string | null
          id: string
          publish_date: string
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          publish_date?: string
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          publish_date?: string
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      player_attribute_scores: {
        Row: {
          ata_score_100: number | null
          attr_confidence: number | null
          competition_id: string
          cri_score_100: number | null
          def_score_100: number | null
          details: Json | null
          id: string
          player_id: string
          season_year: number
          tat_score_100: number | null
          tec_score_100: number | null
          updated_at: string | null
        }
        Insert: {
          ata_score_100?: number | null
          attr_confidence?: number | null
          competition_id: string
          cri_score_100?: number | null
          def_score_100?: number | null
          details?: Json | null
          id?: string
          player_id: string
          season_year: number
          tat_score_100?: number | null
          tec_score_100?: number | null
          updated_at?: string | null
        }
        Update: {
          ata_score_100?: number | null
          attr_confidence?: number | null
          competition_id?: string
          cri_score_100?: number | null
          def_score_100?: number | null
          details?: Json | null
          id?: string
          player_id?: string
          season_year?: number
          tat_score_100?: number | null
          tec_score_100?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_attribute_scores_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_attribute_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
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
      player_market_value_history: {
        Row: {
          created_at: string
          currency: string
          deleted_at: string | null
          id: string
          note: string | null
          player_id: string
          recorded_at: string
          source: string | null
          value: number
        }
        Insert: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          note?: string | null
          player_id: string
          recorded_at?: string
          source?: string | null
          value: number
        }
        Update: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          note?: string | null
          player_id?: string
          recorded_at?: string
          source?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_market_value_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_rating_history: {
        Row: {
          created_at: string
          id: string
          player_id: string
          rating: number
          recorded_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          rating: number
          recorded_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          rating?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_rating_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats: {
        Row: {
          accurate_passes: number
          aerial_duels_total: number
          aerial_duels_won: number
          assists: number
          chances_created: number
          claims: number
          clean_sheets: number
          clearances: number
          competition_id: string | null
          created_at: string
          crosses_faced: number
          crosses_stopped: number
          duels_won: number
          errors_leading_to_goal: number
          errors_leading_to_shot: number
          fouls_committed: number
          fouls_drawn: number
          goals: number
          goals_conceded: number
          ground_duels_total: number
          ground_duels_won: number
          high_claims: number
          id: string
          interceptions: number
          key_passes: number
          long_passes_accurate: number
          long_passes_total: number
          matches: number
          minutes: number
          offsides: number
          penalties_saved: number
          penalty_faced: number
          player_id: string
          possession_lost: number
          punches: number
          recoveries: number
          red_cards: number
          saves: number
          saves_inside_box: number
          season_year: number
          shots: number
          shots_blocked: number
          shots_on_target: number
          shots_on_target_against: number
          successful_dribbles: number
          successful_runs_out: number
          tackles: number
          times_dribbled_past: number
          total_dribbles: number
          total_duels: number
          total_passes: number
          total_runs_out: number
          updated_at: string
          yellow_cards: number
        }
        Insert: {
          accurate_passes?: number
          aerial_duels_total?: number
          aerial_duels_won?: number
          assists?: number
          chances_created?: number
          claims?: number
          clean_sheets?: number
          clearances?: number
          competition_id?: string | null
          created_at?: string
          crosses_faced?: number
          crosses_stopped?: number
          duels_won?: number
          errors_leading_to_goal?: number
          errors_leading_to_shot?: number
          fouls_committed?: number
          fouls_drawn?: number
          goals?: number
          goals_conceded?: number
          ground_duels_total?: number
          ground_duels_won?: number
          high_claims?: number
          id?: string
          interceptions?: number
          key_passes?: number
          long_passes_accurate?: number
          long_passes_total?: number
          matches?: number
          minutes?: number
          offsides?: number
          penalties_saved?: number
          penalty_faced?: number
          player_id: string
          possession_lost?: number
          punches?: number
          recoveries?: number
          red_cards?: number
          saves?: number
          saves_inside_box?: number
          season_year?: number
          shots?: number
          shots_blocked?: number
          shots_on_target?: number
          shots_on_target_against?: number
          successful_dribbles?: number
          successful_runs_out?: number
          tackles?: number
          times_dribbled_past?: number
          total_dribbles?: number
          total_duels?: number
          total_passes?: number
          total_runs_out?: number
          updated_at?: string
          yellow_cards?: number
        }
        Update: {
          accurate_passes?: number
          aerial_duels_total?: number
          aerial_duels_won?: number
          assists?: number
          chances_created?: number
          claims?: number
          clean_sheets?: number
          clearances?: number
          competition_id?: string | null
          created_at?: string
          crosses_faced?: number
          crosses_stopped?: number
          duels_won?: number
          errors_leading_to_goal?: number
          errors_leading_to_shot?: number
          fouls_committed?: number
          fouls_drawn?: number
          goals?: number
          goals_conceded?: number
          ground_duels_total?: number
          ground_duels_won?: number
          high_claims?: number
          id?: string
          interceptions?: number
          key_passes?: number
          long_passes_accurate?: number
          long_passes_total?: number
          matches?: number
          minutes?: number
          offsides?: number
          penalties_saved?: number
          penalty_faced?: number
          player_id?: string
          possession_lost?: number
          punches?: number
          recoveries?: number
          red_cards?: number
          saves?: number
          saves_inside_box?: number
          season_year?: number
          shots?: number
          shots_blocked?: number
          shots_on_target?: number
          shots_on_target_against?: number
          successful_dribbles?: number
          successful_runs_out?: number
          tackles?: number
          times_dribbled_past?: number
          total_dribbles?: number
          total_duels?: number
          total_passes?: number
          total_runs_out?: number
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
          archived_at: string | null
          areas_to_develop: string[] | null
          auto_rating: number | null
          auto_rating_details: Json | null
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
          is_archived: boolean | null
          is_public: boolean | null
          last_physical_evaluation: string | null
          market_value: number | null
          market_value_currency: string | null
          market_value_trend: string | null
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
          rating_updated_at: string | null
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
          archived_at?: string | null
          areas_to_develop?: string[] | null
          auto_rating?: number | null
          auto_rating_details?: Json | null
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
          is_archived?: boolean | null
          is_public?: boolean | null
          last_physical_evaluation?: string | null
          market_value?: number | null
          market_value_currency?: string | null
          market_value_trend?: string | null
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
          rating_updated_at?: string | null
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
          archived_at?: string | null
          areas_to_develop?: string[] | null
          auto_rating?: number | null
          auto_rating_details?: Json | null
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
          is_archived?: boolean | null
          is_public?: boolean | null
          last_physical_evaluation?: string | null
          market_value?: number | null
          market_value_currency?: string | null
          market_value_trend?: string | null
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
          rating_updated_at?: string | null
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
          deleted_at: string | null
          final_score: number
          id: string
          impact_notes: string | null
          impact_score: number
          match_date: string
          match_notes: string | null
          mental_notes: string | null
          mental_score: number
          opponent: string | null
          phase_id: string | null
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
          deleted_at?: string | null
          final_score: number
          id?: string
          impact_notes?: string | null
          impact_score: number
          match_date: string
          match_notes?: string | null
          mental_notes?: string | null
          mental_score: number
          opponent?: string | null
          phase_id?: string | null
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
          deleted_at?: string | null
          final_score?: number
          id?: string
          impact_notes?: string | null
          impact_score?: number
          match_date?: string
          match_notes?: string | null
          mental_notes?: string | null
          mental_score?: number
          opponent?: string | null
          phase_id?: string | null
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
            foreignKeyName: "scouting_reports_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "competition_phases"
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
      calculate_athlete_auto_rating: {
        Args: { p_player_id: string }
        Returns: number
      }
      calculate_player_attribute_scores: {
        Args: {
          p_competition_id: string
          p_player_id: string
          p_season_year: number
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_internal_user: { Args: { _user_id: string }; Returns: boolean }
      recalculate_all_attribute_scores: {
        Args: never
        Returns: {
          player_id: string
          player_name: string
          rows_processed: number
        }[]
      }
      recalculate_all_competition_coefficients: {
        Args: never
        Returns: {
          competition_id: string
          competition_name: string
          new_final: number
          new_tier: string
          old_final: number
        }[]
      }
      recalculate_all_player_ratings: {
        Args: never
        Returns: {
          new_rating: number
          old_rating: number
          player_id: string
          player_name: string
        }[]
      }
      recalculate_player_all_attributes: {
        Args: { p_player_id: string }
        Returns: {
          competition_id: string
          result: Json
          season_year: number
        }[]
      }
      recalculate_player_market_value_summary: {
        Args: { p_player_id: string }
        Returns: undefined
      }
      update_player_auto_rating: {
        Args: { p_player_id: string }
        Returns: undefined
      }
      update_player_market_value:
        | {
            Args: {
              p_currency?: string
              p_note?: string
              p_player_id: string
              p_value: number
            }
            Returns: undefined
          }
        | {
            Args: {
              p_currency?: string
              p_note?: string
              p_player_id: string
              p_recorded_at?: string
              p_source?: string
              p_value: number
            }
            Returns: undefined
          }
    }
    Enums: {
      app_role: "admin" | "scout" | "member" | "partner"
      competition_type: "league" | "cup" | "state_league" | "continental"
      match_event_type:
        | "goal"
        | "assist"
        | "shot"
        | "shot_on_target"
        | "key_pass"
        | "chance_created"
        | "dribble_success"
        | "dribble_attempt"
        | "tackle"
        | "interception"
        | "recovery"
        | "clearance"
        | "duel_won"
        | "duel_total"
        | "aerial_duel_won"
        | "yellow"
        | "red"
        | "foul_committed"
        | "foul_suffered"
        | "pass_success"
        | "pass_total"
        | "possession_lost"
        | "save"
        | "goal_conceded"
        | "clean_sheet"
        | "penalty_saved"
        | "error_led_to_goal"
        | "box_save"
        | "punch"
        | "high_claim"
        | "sweeper_action"
      match_status: "draft" | "live" | "finished" | "applied"
      position_template: "outfield" | "goalkeeper"
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
      match_event_type: [
        "goal",
        "assist",
        "shot",
        "shot_on_target",
        "key_pass",
        "chance_created",
        "dribble_success",
        "dribble_attempt",
        "tackle",
        "interception",
        "recovery",
        "clearance",
        "duel_won",
        "duel_total",
        "aerial_duel_won",
        "yellow",
        "red",
        "foul_committed",
        "foul_suffered",
        "pass_success",
        "pass_total",
        "possession_lost",
        "save",
        "goal_conceded",
        "clean_sheet",
        "penalty_saved",
        "error_led_to_goal",
        "box_save",
        "punch",
        "high_claim",
        "sweeper_action",
      ],
      match_status: ["draft", "live", "finished", "applied"],
      position_template: ["outfield", "goalkeeper"],
    },
  },
} as const
