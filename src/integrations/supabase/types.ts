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
      contract_notifications: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          milestone_days: number
          notification_id: string | null
          notified_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          milestone_days: number
          notification_id?: string | null
          notified_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          milestone_days?: number
          notification_id?: string | null
          notified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_notifications_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "player_contract_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
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
      manual_player_stats: {
        Row: {
          aerial_duels_lost: number
          aerial_duels_won: number
          assists: number
          blocked_shots: number
          chances_created: number
          clean_sheets: number
          clearances: number
          competition_id: string | null
          created_at: string
          created_by: string | null
          dribbles_failed: number
          dribbles_success: number
          duels_lost: number
          duels_won: number
          fouls_committed: number
          fouls_suffered: number
          games: number
          goals: number
          goals_conceded: number
          id: string
          interceptions: number
          key_passes: number
          minutes: number
          notes: string | null
          passes_completed: number
          passes_failed: number
          penalties_saved: number
          penalties_won: number
          player_id: string
          recoveries: number
          red_cards: number
          saves: number
          season_year: number
          shots: number
          shots_on_target: number
          tackles: number
          updated_at: string
          yellow_cards: number
        }
        Insert: {
          aerial_duels_lost?: number
          aerial_duels_won?: number
          assists?: number
          blocked_shots?: number
          chances_created?: number
          clean_sheets?: number
          clearances?: number
          competition_id?: string | null
          created_at?: string
          created_by?: string | null
          dribbles_failed?: number
          dribbles_success?: number
          duels_lost?: number
          duels_won?: number
          fouls_committed?: number
          fouls_suffered?: number
          games?: number
          goals?: number
          goals_conceded?: number
          id?: string
          interceptions?: number
          key_passes?: number
          minutes?: number
          notes?: string | null
          passes_completed?: number
          passes_failed?: number
          penalties_saved?: number
          penalties_won?: number
          player_id: string
          recoveries?: number
          red_cards?: number
          saves?: number
          season_year?: number
          shots?: number
          shots_on_target?: number
          tackles?: number
          updated_at?: string
          yellow_cards?: number
        }
        Update: {
          aerial_duels_lost?: number
          aerial_duels_won?: number
          assists?: number
          blocked_shots?: number
          chances_created?: number
          clean_sheets?: number
          clearances?: number
          competition_id?: string | null
          created_at?: string
          created_by?: string | null
          dribbles_failed?: number
          dribbles_success?: number
          duels_lost?: number
          duels_won?: number
          fouls_committed?: number
          fouls_suffered?: number
          games?: number
          goals?: number
          goals_conceded?: number
          id?: string
          interceptions?: number
          key_passes?: number
          minutes?: number
          notes?: string | null
          passes_completed?: number
          passes_failed?: number
          penalties_saved?: number
          penalties_won?: number
          player_id?: string
          recoveries?: number
          red_cards?: number
          saves?: number
          season_year?: number
          shots?: number
          shots_on_target?: number
          tackles?: number
          updated_at?: string
          yellow_cards?: number
        }
        Relationships: [
          {
            foreignKeyName: "manual_player_stats_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      market_score_events: {
        Row: {
          created_at: string
          created_by: string | null
          delta: number
          details: Json | null
          id: string
          market_score_id: string
          new_score_total: number
          previous_score_total: number | null
          reason: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delta?: number
          details?: Json | null
          id?: string
          market_score_id: string
          new_score_total: number
          previous_score_total?: number | null
          reason: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delta?: number
          details?: Json | null
          id?: string
          market_score_id?: string
          new_score_total?: number
          previous_score_total?: number | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_score_events_market_score_id_fkey"
            columns: ["market_score_id"]
            isOneToOne: false
            referencedRelation: "market_scores"
            referencedColumns: ["id"]
          },
        ]
      }
      market_scores: {
        Row: {
          athlete_id: string | null
          calculated_from_range: string | null
          calculation_details: Json | null
          confidence_level: number
          created_at: string
          id: string
          last_calculated_at: string
          notes_internal: string | null
          score_age_window: number
          score_competitive_context: number
          score_consistency_reliability: number
          score_market_profile: number
          score_performance_impact: number
          score_total: number
          target_id: string | null
          trend_30d: Database["public"]["Enums"]["market_score_trend"] | null
          type: Database["public"]["Enums"]["market_score_type"]
          updated_at: string
        }
        Insert: {
          athlete_id?: string | null
          calculated_from_range?: string | null
          calculation_details?: Json | null
          confidence_level?: number
          created_at?: string
          id?: string
          last_calculated_at?: string
          notes_internal?: string | null
          score_age_window?: number
          score_competitive_context?: number
          score_consistency_reliability?: number
          score_market_profile?: number
          score_performance_impact?: number
          score_total?: number
          target_id?: string | null
          trend_30d?: Database["public"]["Enums"]["market_score_trend"] | null
          type: Database["public"]["Enums"]["market_score_type"]
          updated_at?: string
        }
        Update: {
          athlete_id?: string | null
          calculated_from_range?: string | null
          calculation_details?: Json | null
          confidence_level?: number
          created_at?: string
          id?: string
          last_calculated_at?: string
          notes_internal?: string | null
          score_age_window?: number
          score_competitive_context?: number
          score_consistency_reliability?: number
          score_market_profile?: number
          score_performance_impact?: number
          score_total?: number
          target_id?: string | null
          trend_30d?: Database["public"]["Enums"]["market_score_trend"] | null
          type?: Database["public"]["Enums"]["market_score_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_scores_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_scores_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "public_players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_scores_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: true
            referencedRelation: "targets"
            referencedColumns: ["id"]
          },
        ]
      }
      match_events: {
        Row: {
          client_event_id: string | null
          count_in_stats: boolean
          created_at: string
          display_minute: string | null
          event_status: string
          event_type: Database["public"]["Enums"]["match_event_type"]
          game_time_seconds: number | null
          half: number | null
          id: string
          match_id: string
          minute: number | null
          period: number | null
          player_id: string
          player_in_id: string | null
          value: number
          void_reason: string | null
        }
        Insert: {
          client_event_id?: string | null
          count_in_stats?: boolean
          created_at?: string
          display_minute?: string | null
          event_status?: string
          event_type: Database["public"]["Enums"]["match_event_type"]
          game_time_seconds?: number | null
          half?: number | null
          id?: string
          match_id: string
          minute?: number | null
          period?: number | null
          player_id: string
          player_in_id?: string | null
          value?: number
          void_reason?: string | null
        }
        Update: {
          client_event_id?: string | null
          count_in_stats?: boolean
          created_at?: string
          display_minute?: string | null
          event_status?: string
          event_type?: Database["public"]["Enums"]["match_event_type"]
          game_time_seconds?: number | null
          half?: number | null
          id?: string
          match_id?: string
          minute?: number | null
          period?: number | null
          player_id?: string
          player_in_id?: string | null
          value?: number
          void_reason?: string | null
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
          {
            foreignKeyName: "match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_player_in_id_fkey"
            columns: ["player_in_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_player_in_id_fkey"
            columns: ["player_in_id"]
            isOneToOne: false
            referencedRelation: "public_players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      match_player_stats: {
        Row: {
          aerial_duels_total: number
          aerial_duels_won: number
          assists: number
          ball_actions: number
          blocked_shots: number
          chances_created: number
          clearances: number
          created_at: string
          crosses_failed: number
          crosses_success: number
          dribbles_success: number
          dribbles_total: number
          duels_total: number
          duels_won: number
          fouls_committed: number
          fouls_suffered: number
          goals: number
          goals_conceded: number
          id: string
          interceptions: number
          key_passes: number
          match_id: string
          offsides: number
          passes_completed: number
          passes_total: number
          penalties_won: number
          player_id: string
          possession_lost: number
          progressive_passes: number
          rating: number | null
          rating_breakdown: Json | null
          rating_computed_at: string | null
          rating_engine_version: string
          rating_minutes_factor: number | null
          rating_minutes_played: number | null
          recoveries: number
          red_cards: number
          saves: number
          shots: number
          shots_blocked: number
          shots_on_post: number
          shots_on_target: number
          steals: number
          tackles: number
          updated_at: string
          was_dribbled: number
          yellow_cards: number
        }
        Insert: {
          aerial_duels_total?: number
          aerial_duels_won?: number
          assists?: number
          ball_actions?: number
          blocked_shots?: number
          chances_created?: number
          clearances?: number
          created_at?: string
          crosses_failed?: number
          crosses_success?: number
          dribbles_success?: number
          dribbles_total?: number
          duels_total?: number
          duels_won?: number
          fouls_committed?: number
          fouls_suffered?: number
          goals?: number
          goals_conceded?: number
          id?: string
          interceptions?: number
          key_passes?: number
          match_id: string
          offsides?: number
          passes_completed?: number
          passes_total?: number
          penalties_won?: number
          player_id: string
          possession_lost?: number
          progressive_passes?: number
          rating?: number | null
          rating_breakdown?: Json | null
          rating_computed_at?: string | null
          rating_engine_version?: string
          rating_minutes_factor?: number | null
          rating_minutes_played?: number | null
          recoveries?: number
          red_cards?: number
          saves?: number
          shots?: number
          shots_blocked?: number
          shots_on_post?: number
          shots_on_target?: number
          steals?: number
          tackles?: number
          updated_at?: string
          was_dribbled?: number
          yellow_cards?: number
        }
        Update: {
          aerial_duels_total?: number
          aerial_duels_won?: number
          assists?: number
          ball_actions?: number
          blocked_shots?: number
          chances_created?: number
          clearances?: number
          created_at?: string
          crosses_failed?: number
          crosses_success?: number
          dribbles_success?: number
          dribbles_total?: number
          duels_total?: number
          duels_won?: number
          fouls_committed?: number
          fouls_suffered?: number
          goals?: number
          goals_conceded?: number
          id?: string
          interceptions?: number
          key_passes?: number
          match_id?: string
          offsides?: number
          passes_completed?: number
          passes_total?: number
          penalties_won?: number
          player_id?: string
          possession_lost?: number
          progressive_passes?: number
          rating?: number | null
          rating_breakdown?: Json | null
          rating_computed_at?: string | null
          rating_engine_version?: string
          rating_minutes_factor?: number | null
          rating_minutes_played?: number | null
          recoveries?: number
          red_cards?: number
          saves?: number
          shots?: number
          shots_blocked?: number
          shots_on_post?: number
          shots_on_target?: number
          steals?: number
          tackles?: number
          updated_at?: string
          was_dribbled?: number
          yellow_cards?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_player_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_safe"
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
          {
            foreignKeyName: "match_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_safe"
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
          home_team_id: string | null
          id: string
          match_date: string
          match_start_time: string | null
          notes: string | null
          opponent_logo_url: string | null
          opponent_name: string
          pause_total_seconds: number
          season_year: number
          status: Database["public"]["Enums"]["match_status"]
          team_logo_url: string | null
          team_name_display: string | null
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
          home_team_id?: string | null
          id?: string
          match_date?: string
          match_start_time?: string | null
          notes?: string | null
          opponent_logo_url?: string | null
          opponent_name: string
          pause_total_seconds?: number
          season_year?: number
          status?: Database["public"]["Enums"]["match_status"]
          team_logo_url?: string | null
          team_name_display?: string | null
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
          home_team_id?: string | null
          id?: string
          match_date?: string
          match_start_time?: string | null
          notes?: string | null
          opponent_logo_url?: string | null
          opponent_name?: string
          pause_total_seconds?: number
          season_year?: number
          status?: Database["public"]["Enums"]["match_status"]
          team_logo_url?: string | null
          team_name_display?: string | null
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
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          card_crop: Json | null
          category: string
          content: string
          created_at: string
          created_by: string | null
          excerpt: string | null
          featured_image_url: string | null
          hero_crop: Json | null
          id: string
          publish_date: string
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          card_crop?: Json | null
          category: string
          content: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          hero_crop?: Json | null
          id?: string
          publish_date?: string
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          card_crop?: Json | null
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          hero_crop?: Json | null
          id?: string
          publish_date?: string
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      player_achievements: {
        Row: {
          achievement_tier: string
          achievement_type: string
          id: string
          metadata: Json | null
          player_id: string
          season_year: number
          unlocked_at: string
        }
        Insert: {
          achievement_tier?: string
          achievement_type: string
          id?: string
          metadata?: Json | null
          player_id: string
          season_year?: number
          unlocked_at?: string
        }
        Update: {
          achievement_tier?: string
          achievement_type?: string
          id?: string
          metadata?: Json | null
          player_id?: string
          season_year?: number
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_achievements_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_achievements_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_attribute_scores: {
        Row: {
          ata_score_100: number | null
          attr_confidence: number | null
          competition_id: string | null
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
          competition_id?: string | null
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
          competition_id?: string | null
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
          {
            foreignKeyName: "player_attribute_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_contract_history: {
        Row: {
          archived_at: string | null
          club_country: string | null
          club_name: string
          contract_file_url: string | null
          contract_type: string
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          is_archived: boolean | null
          is_current: boolean | null
          notes: string | null
          player_id: string
          salary_info: string | null
          sort_order: number | null
          start_date: string
          transfer_fee: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          club_country?: string | null
          club_name: string
          contract_file_url?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_archived?: boolean | null
          is_current?: boolean | null
          notes?: string | null
          player_id: string
          salary_info?: string | null
          sort_order?: number | null
          start_date: string
          transfer_fee?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          club_country?: string | null
          club_name?: string
          contract_file_url?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_archived?: boolean | null
          is_current?: boolean | null
          notes?: string | null
          player_id?: string
          salary_info?: string | null
          sort_order?: number | null
          start_date?: string
          transfer_fee?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_contract_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_contract_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_field_presence: {
        Row: {
          created_at: string
          entered_at_seconds: number
          exited_at_seconds: number | null
          id: string
          match_id: string
          match_player_id: string
          period: number
          player_id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entered_at_seconds?: number
          exited_at_seconds?: number | null
          id?: string
          match_id: string
          match_player_id: string
          period?: number
          player_id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entered_at_seconds?: number
          exited_at_seconds?: number | null
          id?: string
          match_id?: string
          match_player_id?: string
          period?: number
          player_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_field_presence_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_field_presence_match_player_id_fkey"
            columns: ["match_player_id"]
            isOneToOne: false
            referencedRelation: "match_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_field_presence_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_field_presence_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_safe"
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
          {
            foreignKeyName: "player_injuries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_safe"
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
          {
            foreignKeyName: "player_market_value_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_physical_history: {
        Row: {
          body_fat_percentage: number | null
          created_at: string
          created_by: string | null
          id: string
          max_speed: number | null
          muscle_mass: number | null
          notes: string | null
          player_id: string
          recorded_at: string
          sprint_30m: number | null
          vo2_max: number | null
          weight: number | null
        }
        Insert: {
          body_fat_percentage?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          max_speed?: number | null
          muscle_mass?: number | null
          notes?: string | null
          player_id: string
          recorded_at?: string
          sprint_30m?: number | null
          vo2_max?: number | null
          weight?: number | null
        }
        Update: {
          body_fat_percentage?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          max_speed?: number | null
          muscle_mass?: number | null
          notes?: string | null
          player_id?: string
          recorded_at?: string
          sprint_30m?: number | null
          vo2_max?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_physical_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_physical_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_safe"
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
          {
            foreignKeyName: "player_rating_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_season_goals: {
        Row: {
          created_at: string
          created_by: string | null
          goal_type: string
          id: string
          player_id: string
          season_year: number
          target_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          goal_type: string
          id?: string
          player_id: string
          season_year?: number
          target_value: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          goal_type?: string
          id?: string
          player_id?: string
          season_year?: number
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_season_goals_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_season_goals_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats: {
        Row: {
          accurate_passes: number
          aerial_duels_total: number
          aerial_duels_won: number
          archived_at: string | null
          archived_reason: string | null
          assists: number
          blocked_shots: number
          chances_created: number
          claims: number
          clean_sheets: number
          clearances: number
          competition_id: string | null
          created_at: string
          crosses_faced: number
          crosses_failed: number
          crosses_stopped: number
          crosses_success: number
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
          is_archived: boolean | null
          is_live_correction: boolean
          key_passes: number
          long_passes_accurate: number
          long_passes_total: number
          matches: number
          minutes: number
          offsides: number
          penalties_saved: number
          penalties_won: number
          penalty_faced: number
          player_id: string
          possession_lost: number
          progressive_passes: number
          punches: number
          recoveries: number
          red_cards: number
          saves: number
          saves_inside_box: number
          season_year: number
          shots: number
          shots_blocked: number
          shots_blocked_att: number
          shots_off_target: number
          shots_on_post: number
          shots_on_target: number
          shots_on_target_against: number
          steals: number
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
          archived_at?: string | null
          archived_reason?: string | null
          assists?: number
          blocked_shots?: number
          chances_created?: number
          claims?: number
          clean_sheets?: number
          clearances?: number
          competition_id?: string | null
          created_at?: string
          crosses_faced?: number
          crosses_failed?: number
          crosses_stopped?: number
          crosses_success?: number
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
          is_archived?: boolean | null
          is_live_correction?: boolean
          key_passes?: number
          long_passes_accurate?: number
          long_passes_total?: number
          matches?: number
          minutes?: number
          offsides?: number
          penalties_saved?: number
          penalties_won?: number
          penalty_faced?: number
          player_id: string
          possession_lost?: number
          progressive_passes?: number
          punches?: number
          recoveries?: number
          red_cards?: number
          saves?: number
          saves_inside_box?: number
          season_year?: number
          shots?: number
          shots_blocked?: number
          shots_blocked_att?: number
          shots_off_target?: number
          shots_on_post?: number
          shots_on_target?: number
          shots_on_target_against?: number
          steals?: number
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
          archived_at?: string | null
          archived_reason?: string | null
          assists?: number
          blocked_shots?: number
          chances_created?: number
          claims?: number
          clean_sheets?: number
          clearances?: number
          competition_id?: string | null
          created_at?: string
          crosses_faced?: number
          crosses_failed?: number
          crosses_stopped?: number
          crosses_success?: number
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
          is_archived?: boolean | null
          is_live_correction?: boolean
          key_passes?: number
          long_passes_accurate?: number
          long_passes_total?: number
          matches?: number
          minutes?: number
          offsides?: number
          penalties_saved?: number
          penalties_won?: number
          penalty_faced?: number
          player_id?: string
          possession_lost?: number
          progressive_passes?: number
          punches?: number
          recoveries?: number
          red_cards?: number
          saves?: number
          saves_inside_box?: number
          season_year?: number
          shots?: number
          shots_blocked?: number
          shots_blocked_att?: number
          shots_off_target?: number
          shots_on_post?: number
          shots_on_target?: number
          shots_on_target_against?: number
          steals?: number
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
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_safe"
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
          auto_potential: number
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
          m3_contract_end: string | null
          m3_contract_start: string | null
          muscle_mass: number | null
          nationality: string
          passports: string[] | null
          photo_url: string | null
          physical_status: string | null
          play_style: string | null
          playing_height_preference: string | null
          position: string
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
          auto_potential?: number
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
          m3_contract_end?: string | null
          m3_contract_start?: string | null
          muscle_mass?: number | null
          nationality: string
          passports?: string[] | null
          photo_url?: string | null
          physical_status?: string | null
          play_style?: string | null
          playing_height_preference?: string | null
          position: string
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
          auto_potential?: number
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
          m3_contract_end?: string | null
          m3_contract_start?: string | null
          muscle_mass?: number | null
          nationality?: string
          passports?: string[] | null
          photo_url?: string | null
          physical_status?: string | null
          play_style?: string | null
          playing_height_preference?: string | null
          position?: string
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
          last_login_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
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
          {
            foreignKeyName: "scouting_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      target_observations: {
        Row: {
          competition: string | null
          created_at: string
          created_by: string | null
          id: string
          match_context: string | null
          minutes_observed: number | null
          observation_date: string
          opponent: string | null
          performance_rating: number | null
          qualitative_notes: string | null
          result: string | null
          target_id: string
        }
        Insert: {
          competition?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          match_context?: string | null
          minutes_observed?: number | null
          observation_date?: string
          opponent?: string | null
          performance_rating?: number | null
          qualitative_notes?: string | null
          result?: string | null
          target_id: string
        }
        Update: {
          competition?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          match_context?: string | null
          minutes_observed?: number | null
          observation_date?: string
          opponent?: string | null
          performance_rating?: number | null
          qualitative_notes?: string | null
          result?: string | null
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "target_observations_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "targets"
            referencedColumns: ["id"]
          },
        ]
      }
      targets: {
        Row: {
          age_estimate: number | null
          birth_date: string | null
          city: string | null
          competition_id: string | null
          country: string | null
          created_at: string
          created_by: string | null
          current_club: string | null
          dominant_foot: string | null
          games_observed: number | null
          height: number | null
          highlight_video_url: string | null
          id: string
          ideal_approach_window: string | null
          interest_reason: string | null
          league_competition: string | null
          market_strategy: string | null
          minutes_observed: number | null
          name: string
          notable_characteristics: string[] | null
          notes_internal: string | null
          observation_context: string | null
          observation_type: string | null
          perceived_profile: string | null
          photo_url: string | null
          position: string
          priority: Database["public"]["Enums"]["target_priority"]
          secondary_position: string | null
          source: string | null
          state: string | null
          status: Database["public"]["Enums"]["target_status"]
          tags: string[] | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          age_estimate?: number | null
          birth_date?: string | null
          city?: string | null
          competition_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          current_club?: string | null
          dominant_foot?: string | null
          games_observed?: number | null
          height?: number | null
          highlight_video_url?: string | null
          id?: string
          ideal_approach_window?: string | null
          interest_reason?: string | null
          league_competition?: string | null
          market_strategy?: string | null
          minutes_observed?: number | null
          name: string
          notable_characteristics?: string[] | null
          notes_internal?: string | null
          observation_context?: string | null
          observation_type?: string | null
          perceived_profile?: string | null
          photo_url?: string | null
          position: string
          priority?: Database["public"]["Enums"]["target_priority"]
          secondary_position?: string | null
          source?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["target_status"]
          tags?: string[] | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          age_estimate?: number | null
          birth_date?: string | null
          city?: string | null
          competition_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          current_club?: string | null
          dominant_foot?: string | null
          games_observed?: number | null
          height?: number | null
          highlight_video_url?: string | null
          id?: string
          ideal_approach_window?: string | null
          interest_reason?: string | null
          league_competition?: string | null
          market_strategy?: string | null
          minutes_observed?: number | null
          name?: string
          notable_characteristics?: string[] | null
          notes_internal?: string | null
          observation_context?: string | null
          observation_type?: string | null
          perceived_profile?: string | null
          photo_url?: string | null
          position?: string
          priority?: Database["public"]["Enums"]["target_priority"]
          secondary_position?: string | null
          source?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["target_status"]
          tags?: string[] | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "targets_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      team_settings: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          team_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          team_name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          team_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          short_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          short_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          short_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          app_view: boolean
          compare_view: boolean
          competitions_create: boolean
          competitions_delete: boolean
          competitions_edit: boolean
          competitions_view: boolean
          created_at: string
          id: string
          leads_create: boolean
          leads_delete: boolean
          leads_edit: boolean
          leads_export: boolean
          leads_view: boolean
          live_match_log: boolean
          live_match_view: boolean
          news_create: boolean
          news_delete: boolean
          news_edit: boolean
          news_publish: boolean
          news_view: boolean
          players_create: boolean
          players_delete: boolean
          players_edit: boolean
          players_export: boolean
          players_view: boolean
          reports_create: boolean
          reports_delete: boolean
          reports_edit: boolean
          reports_export: boolean
          reports_view: boolean
          updated_at: string
          user_id: string
          users_manage: boolean
        }
        Insert: {
          app_view?: boolean
          compare_view?: boolean
          competitions_create?: boolean
          competitions_delete?: boolean
          competitions_edit?: boolean
          competitions_view?: boolean
          created_at?: string
          id?: string
          leads_create?: boolean
          leads_delete?: boolean
          leads_edit?: boolean
          leads_export?: boolean
          leads_view?: boolean
          live_match_log?: boolean
          live_match_view?: boolean
          news_create?: boolean
          news_delete?: boolean
          news_edit?: boolean
          news_publish?: boolean
          news_view?: boolean
          players_create?: boolean
          players_delete?: boolean
          players_edit?: boolean
          players_export?: boolean
          players_view?: boolean
          reports_create?: boolean
          reports_delete?: boolean
          reports_edit?: boolean
          reports_export?: boolean
          reports_view?: boolean
          updated_at?: string
          user_id: string
          users_manage?: boolean
        }
        Update: {
          app_view?: boolean
          compare_view?: boolean
          competitions_create?: boolean
          competitions_delete?: boolean
          competitions_edit?: boolean
          competitions_view?: boolean
          created_at?: string
          id?: string
          leads_create?: boolean
          leads_delete?: boolean
          leads_edit?: boolean
          leads_export?: boolean
          leads_view?: boolean
          live_match_log?: boolean
          live_match_view?: boolean
          news_create?: boolean
          news_delete?: boolean
          news_edit?: boolean
          news_publish?: boolean
          news_view?: boolean
          players_create?: boolean
          players_delete?: boolean
          players_edit?: boolean
          players_export?: boolean
          players_view?: boolean
          reports_create?: boolean
          reports_delete?: boolean
          reports_edit?: boolean
          reports_export?: boolean
          reports_view?: boolean
          updated_at?: string
          user_id?: string
          users_manage?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          is_owner: boolean
          linked_player_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_owner?: boolean
          linked_player_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_owner?: boolean
          linked_player_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_linked_player_id_fkey"
            columns: ["linked_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_linked_player_id_fkey"
            columns: ["linked_player_id"]
            isOneToOne: false
            referencedRelation: "public_players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_players_safe: {
        Row: {
          age: number | null
          areas_to_develop: string[] | null
          auto_potential: number | null
          auto_rating: number | null
          bio_public: string | null
          birth_date: string | null
          body_fat_percentage: number | null
          country: string | null
          created_at: string | null
          current_club: string | null
          dominant_foot: string | null
          estimated_level: string | null
          full_name: string | null
          height: number | null
          highlight_video_url: string | null
          id: string | null
          is_archived: boolean | null
          is_public: boolean | null
          market_value: number | null
          market_value_currency: string | null
          market_value_trend: string | null
          max_speed: number | null
          muscle_mass: number | null
          nationality: string | null
          passports: string[] | null
          photo_url: string | null
          physical_status: string | null
          play_style: string | null
          playing_height_preference: string | null
          position: string | null
          primary_tactical_role: string | null
          ready_to_compete: boolean | null
          secondary_positions: string[] | null
          secondary_tactical_role: string | null
          slug: string | null
          sprint_30m: number | null
          strengths: string[] | null
          updated_at: string | null
          vo2_max: number | null
          weight: number | null
          wingspan: number | null
        }
        Insert: {
          age?: number | null
          areas_to_develop?: string[] | null
          auto_potential?: number | null
          auto_rating?: number | null
          bio_public?: string | null
          birth_date?: string | null
          body_fat_percentage?: number | null
          country?: string | null
          created_at?: string | null
          current_club?: string | null
          dominant_foot?: string | null
          estimated_level?: string | null
          full_name?: string | null
          height?: number | null
          highlight_video_url?: string | null
          id?: string | null
          is_archived?: boolean | null
          is_public?: boolean | null
          market_value?: number | null
          market_value_currency?: string | null
          market_value_trend?: string | null
          max_speed?: number | null
          muscle_mass?: number | null
          nationality?: string | null
          passports?: string[] | null
          photo_url?: string | null
          physical_status?: string | null
          play_style?: string | null
          playing_height_preference?: string | null
          position?: string | null
          primary_tactical_role?: string | null
          ready_to_compete?: boolean | null
          secondary_positions?: string[] | null
          secondary_tactical_role?: string | null
          slug?: string | null
          sprint_30m?: number | null
          strengths?: string[] | null
          updated_at?: string | null
          vo2_max?: number | null
          weight?: number | null
          wingspan?: number | null
        }
        Update: {
          age?: number | null
          areas_to_develop?: string[] | null
          auto_potential?: number | null
          auto_rating?: number | null
          bio_public?: string | null
          birth_date?: string | null
          body_fat_percentage?: number | null
          country?: string | null
          created_at?: string | null
          current_club?: string | null
          dominant_foot?: string | null
          estimated_level?: string | null
          full_name?: string | null
          height?: number | null
          highlight_video_url?: string | null
          id?: string | null
          is_archived?: boolean | null
          is_public?: boolean | null
          market_value?: number | null
          market_value_currency?: string | null
          market_value_trend?: string | null
          max_speed?: number | null
          muscle_mass?: number | null
          nationality?: string | null
          passports?: string[] | null
          photo_url?: string | null
          physical_status?: string | null
          play_style?: string | null
          playing_height_preference?: string | null
          position?: string | null
          primary_tactical_role?: string | null
          ready_to_compete?: boolean | null
          secondary_positions?: string[] | null
          secondary_tactical_role?: string | null
          slug?: string | null
          sprint_30m?: number | null
          strengths?: string[] | null
          updated_at?: string | null
          vo2_max?: number | null
          weight?: number | null
          wingspan?: number | null
        }
        Relationships: []
      }
      unified_player_season_stats: {
        Row: {
          accurate_passes: number | null
          aerial_duels_total: number | null
          aerial_duels_won: number | null
          assists: number | null
          chances_created: number | null
          clean_sheets: number | null
          competition_id: string | null
          competition_name: string | null
          data_source: string | null
          dribbles_attempted: number | null
          dribbles_completed: number | null
          duels_won: number | null
          errors_leading_to_goal: number | null
          final_coefficient: number | null
          fouls_committed: number | null
          fouls_drawn: number | null
          goals: number | null
          goals_conceded: number | null
          ground_duels_total: number | null
          ground_duels_won: number | null
          interceptions: number | null
          key_passes: number | null
          matches: number | null
          minutes: number | null
          passes_attempted: number | null
          passes_completed: number | null
          penalties_saved: number | null
          penalties_won: number | null
          player_id: string | null
          recoveries: number | null
          red_cards: number | null
          saves: number | null
          season_year: number | null
          shots: number | null
          shots_on_target: number | null
          steals: number | null
          successful_dribbles: number | null
          tackles: number | null
          total_dribbles: number | null
          total_duels: number | null
          total_passes: number | null
          yellow_cards: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_event_stats: {
        Args: {
          p_delta: number
          p_event_type: string
          p_match_id: string
          p_player_id: string
        }
        Returns: undefined
      }
      calculate_athlete_auto_rating: {
        Args: { p_player_id: string }
        Returns: number
      }
      calculate_minutes_factor: {
        Args: { minutes_played: number }
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
      can_delete: { Args: { _user_id: string }; Returns: boolean }
      create_live_event_v2: {
        Args: {
          p_client_event_id?: string
          p_display_minute?: string
          p_force_time_seconds?: number
          p_game_id: string
          p_half?: number
          p_notes?: string
          p_player_id: string
          p_type: string
        }
        Returns: Json
      }
      delete_last_live_event: {
        Args: { p_event_type: string; p_game_id: string; p_player_id: string }
        Returns: Json
      }
      edit_live_event_time: {
        Args: { p_event_id: string; p_game_time_seconds: number }
        Returns: Json
      }
      end_first_half_v2: { Args: { p_game_id: string }; Returns: Json }
      end_game_v2: { Args: { p_game_id: string }; Returns: Json }
      finish_live_game: { Args: { p_game_id: string }; Returns: Json }
      get_competitions_usage: {
        Args: { p_season_year: number }
        Returns: {
          final_coefficient: number
          id: string
          jogadores: number
          name: string
          tier: string
          ultimo_uso: string
          usos: number
        }[]
      }
      get_linked_player_id: { Args: { _user_id: string }; Returns: string }
      get_live_game_clock_seconds: {
        Args: { p_match_id: string }
        Returns: number
      }
      get_match_player_stats: {
        Args: { p_match_id: string }
        Returns: {
          aerial_duels_total: number
          aerial_duels_won: number
          assists: number
          ball_actions: number
          blocked_shots: number
          chances_created: number
          clearances: number
          created_at: string
          crosses_failed: number
          crosses_success: number
          dribbles_success: number
          dribbles_total: number
          duels_total: number
          duels_won: number
          fouls_committed: number
          fouls_suffered: number
          goals: number
          goals_conceded: number
          id: string
          interceptions: number
          key_passes: number
          match_id: string
          offsides: number
          passes_completed: number
          passes_total: number
          penalties_won: number
          player_id: string
          possession_lost: number
          progressive_passes: number
          rating: number | null
          rating_breakdown: Json | null
          rating_computed_at: string | null
          rating_engine_version: string
          rating_minutes_factor: number | null
          rating_minutes_played: number | null
          recoveries: number
          red_cards: number
          saves: number
          shots: number
          shots_blocked: number
          shots_on_post: number
          shots_on_target: number
          steals: number
          tackles: number
          updated_at: string
          was_dribbled: number
          yellow_cards: number
        }[]
        SetofOptions: {
          from: "*"
          to: "match_player_stats"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_period_clock_seconds: {
        Args: { p_match_id: string }
        Returns: number
      }
      get_public_player_minutes_ranking: {
        Args: { p_season_year: number }
        Returns: {
          player_id: string
          total_minutes: number
        }[]
      }
      get_season_player_aggregates: {
        Args: { p_season_year: number }
        Returns: {
          full_name: string
          player_id: string
          slug: string
          total_accurate_passes: number
          total_aerial_duels_failed: number
          total_aerial_duels_won: number
          total_crosses_failed: number
          total_crosses_success: number
          total_dribbles_failed: number
          total_dribbles_success: number
          total_failed_passes: number
          total_ground_duels_failed: number
          total_ground_duels_won: number
          total_matches: number
          total_minutes: number
        }[]
      }
      get_user_rbac: { Args: { p_user_id: string }; Returns: Json }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_valid_role: { Args: { _user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_internal_user: { Args: { _user_id: string }; Returns: boolean }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      is_player: { Args: { _user_id: string }; Returns: boolean }
      pause_live_game: { Args: { p_game_id: string }; Returns: Json }
      player_enter_field: {
        Args: { p_match_id: string; p_match_player_id: string; p_role?: string }
        Returns: Json
      }
      player_exit_field: {
        Args: { p_match_id: string; p_match_player_id: string }
        Returns: Json
      }
      rebuild_match_player_stats_from_events: {
        Args: { p_match_id?: string; p_player_id?: string }
        Returns: {
          events_processed: number
          match_id: string
          player_id: string
          stats_after: Json
          stats_before: Json
        }[]
      }
      rebuild_match_ratings: {
        Args: { p_match_id?: string }
        Returns: {
          match_id: string
          match_player_stats_id: string
          minutes_factor: number
          minutes_played: number
          new_rating: number
          old_rating: number
          player_id: string
        }[]
      }
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
      recalculate_all_event_display_minutes: {
        Args: never
        Returns: {
          event_id: string
          game_time_seconds: number
          new_display_minute: string
          old_display_minute: string
          period: number
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
      remove_player_live_stats_group: {
        Args: {
          p_competition_id?: string
          p_player_id: string
          p_season_year: number
        }
        Returns: Json
      }
      resume_live_game: { Args: { p_game_id: string }; Returns: Json }
      set_added_time: {
        Args: { p_added_seconds: number; p_game_id: string }
        Returns: Json
      }
      start_first_half: { Args: { p_game_id: string }; Returns: Json }
      start_live_game: { Args: { p_game_id: string }; Returns: Json }
      start_second_half_v2: { Args: { p_game_id: string }; Returns: Json }
      toggle_clock: { Args: { p_game_id: string }; Returns: Json }
      toggle_live_game_clock: { Args: { p_game_id: string }; Returns: Json }
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
      update_player_stat_for_event: {
        Args: {
          p_delta: number
          p_event_type: Database["public"]["Enums"]["match_event_type"]
          p_match_id: string
          p_player_id: string
        }
        Returns: undefined
      }
      void_live_event: {
        Args: { p_event_id: string; p_reason?: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "scout"
        | "member"
        | "partner"
        | "editor"
        | "viewer"
        | "player"
      competition_type: "league" | "cup" | "state_league" | "continental"
      market_score_trend: "UP" | "DOWN" | "FLAT"
      market_score_type: "ACTIVE" | "TARGET"
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
        | "substitution"
        | "player_on"
        | "player_off"
        | "aerial_duel_total"
        | "ground_duel_won"
        | "ground_duel_total"
        | "offside"
        | "shot_blocked"
        | "cross_success"
        | "cross_failed"
        | "ball_action"
        | "was_dribbled"
        | "blocked_shot"
        | "long_pass_success"
        | "long_pass_total"
        | "steal"
        | "penalty_won"
        | "progressive_pass"
        | "shot_on_post"
      match_status: "draft" | "live" | "finished" | "applied"
      position_template: "outfield" | "goalkeeper"
      target_priority: "HIGH" | "MEDIUM" | "LOW"
      target_status:
        | "MONITORING"
        | "APPROACH"
        | "NEGOTIATION"
        | "DROPPED"
        | "SIGNED"
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
      app_role: [
        "admin",
        "scout",
        "member",
        "partner",
        "editor",
        "viewer",
        "player",
      ],
      competition_type: ["league", "cup", "state_league", "continental"],
      market_score_trend: ["UP", "DOWN", "FLAT"],
      market_score_type: ["ACTIVE", "TARGET"],
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
        "substitution",
        "player_on",
        "player_off",
        "aerial_duel_total",
        "ground_duel_won",
        "ground_duel_total",
        "offside",
        "shot_blocked",
        "cross_success",
        "cross_failed",
        "ball_action",
        "was_dribbled",
        "blocked_shot",
        "long_pass_success",
        "long_pass_total",
        "steal",
        "penalty_won",
        "progressive_pass",
        "shot_on_post",
      ],
      match_status: ["draft", "live", "finished", "applied"],
      position_template: ["outfield", "goalkeeper"],
      target_priority: ["HIGH", "MEDIUM", "LOW"],
      target_status: [
        "MONITORING",
        "APPROACH",
        "NEGOTIATION",
        "DROPPED",
        "SIGNED",
      ],
    },
  },
} as const
