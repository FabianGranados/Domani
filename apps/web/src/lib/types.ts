// ============================================================
// Tipos generados desde la base de datos DOMANI (Supabase).
// Regenerar con: supabase gen types typescript --project-id <ref>
// (o vía MCP generate_typescript_types). No editar a mano.
// ============================================================
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      academy_attempts: {
        Row: {
          chosen_index: number
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          user_id: string
        }
        Insert: {
          chosen_index: number
          created_at?: string
          id?: string
          is_correct: boolean
          question_id: string
          user_id: string
        }
        Update: {
          chosen_index?: number
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          user_id?: string
        }
        Relationships: []
      }
      academy_questions: {
        Row: {
          category: string
          correct_index: number
          difficulty: string
          id: string
          is_active: boolean
          options: Json
          prompt: string
          reward_aurelios: number
          reward_influence: number
        }
        Insert: {
          category: string
          correct_index: number
          difficulty: string
          id?: string
          is_active?: boolean
          options: Json
          prompt: string
          reward_aurelios: number
          reward_influence: number
        }
        Update: {
          category?: string
          correct_index?: number
          difficulty?: string
          id?: string
          is_active?: boolean
          options?: Json
          prompt?: string
          reward_aurelios?: number
          reward_influence?: number
        }
        Relationships: []
      }
      game_entries: {
        Row: {
          id: string
          joined_at: string
          seat: number | null
          session_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          seat?: number | null
          session_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          seat?: number | null
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      game_results: {
        Row: {
          aurelios_delta: number
          created_at: string
          id: string
          influence_delta: number
          position: number | null
          session_id: string
          user_id: string
        }
        Insert: {
          aurelios_delta?: number
          created_at?: string
          id?: string
          influence_delta?: number
          position?: number | null
          session_id: string
          user_id: string
        }
        Update: {
          aurelios_delta?: number
          created_at?: string
          id?: string
          influence_delta?: number
          position?: number | null
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          buyin_aurelios: number
          created_at: string
          game_id: string
          host_user_id: string | null
          id: string
          is_private: boolean
          is_tournament: boolean
          max_seats: number
          status: Database["public"]["Enums"]["game_session_status"]
        }
        Insert: {
          buyin_aurelios?: number
          created_at?: string
          game_id: string
          host_user_id?: string | null
          id?: string
          is_private?: boolean
          is_tournament?: boolean
          max_seats?: number
          status?: Database["public"]["Enums"]["game_session_status"]
        }
        Update: {
          buyin_aurelios?: number
          created_at?: string
          game_id?: string
          host_user_id?: string | null
          id?: string
          is_private?: boolean
          is_tournament?: boolean
          max_seats?: number
          status?: Database["public"]["Enums"]["game_session_status"]
        }
        Relationships: []
      }
      games: {
        Row: {
          code: string
          family: Database["public"]["Enums"]["game_family"]
          id: string
          is_active: boolean
          max_players: number
          min_players: number
          name: string
        }
        Insert: {
          code: string
          family: Database["public"]["Enums"]["game_family"]
          id?: string
          is_active?: boolean
          max_players?: number
          min_players?: number
          name: string
        }
        Update: {
          code?: string
          family?: Database["public"]["Enums"]["game_family"]
          id?: string
          is_active?: boolean
          max_players?: number
          min_players?: number
          name?: string
        }
        Relationships: []
      }
      house_memberships: {
        Row: {
          house_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          house_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          house_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: []
      }
      houses: {
        Row: {
          city: string
          code: string
          color_primary: string | null
          created_at: string
          id: string
          motto: string | null
          name: string
          specialty: string | null
        }
        Insert: {
          city: string
          code: string
          color_primary?: string | null
          created_at?: string
          id?: string
          motto?: string | null
          name: string
          specialty?: string | null
        }
        Update: {
          city?: string
          code?: string
          color_primary?: string | null
          created_at?: string
          id?: string
          motto?: string | null
          name?: string
          specialty?: string | null
        }
        Relationships: []
      }
      influence_events: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      ledger_transactions: {
        Row: {
          amount: number
          bucket: Database["public"]["Enums"]["aureli_bucket"]
          created_at: string
          id: string
          metadata: Json
          reason: Database["public"]["Enums"]["ledger_reason"]
          ref_id: string | null
          ref_type: string | null
          status: Database["public"]["Enums"]["ledger_status"]
          user_id: string
        }
        Insert: {
          amount: number
          bucket?: Database["public"]["Enums"]["aureli_bucket"]
          created_at?: string
          id?: string
          metadata?: Json
          reason: Database["public"]["Enums"]["ledger_reason"]
          ref_id?: string | null
          ref_type?: string | null
          status?: Database["public"]["Enums"]["ledger_status"]
          user_id: string
        }
        Update: {
          amount?: number
          bucket?: Database["public"]["Enums"]["aureli_bucket"]
          created_at?: string
          id?: string
          metadata?: Json
          reason?: Database["public"]["Enums"]["ledger_reason"]
          ref_id?: string | null
          ref_type?: string | null
          status?: Database["public"]["Enums"]["ledger_status"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_confirmed: boolean
          alias: string
          avatar_code: string
          created_at: string
          house_id: string | null
          id: string
          influence: number
          is_admin: boolean
          is_bot: boolean
          membership: Database["public"]["Enums"]["membership_tier"]
          membership_expires_at: string | null
          rank: Database["public"]["Enums"]["rank_tier"]
          updated_at: string
        }
        Insert: {
          age_confirmed?: boolean
          alias: string
          avatar_code?: string
          created_at?: string
          house_id?: string | null
          id: string
          influence?: number
          is_bot?: boolean
          membership?: Database["public"]["Enums"]["membership_tier"]
          membership_expires_at?: string | null
          rank?: Database["public"]["Enums"]["rank_tier"]
          updated_at?: string
        }
        Update: {
          age_confirmed?: boolean
          alias?: string
          avatar_code?: string
          created_at?: string
          house_id?: string | null
          id?: string
          influence?: number
          is_bot?: boolean
          membership?: Database["public"]["Enums"]["membership_tier"]
          membership_expires_at?: string | null
          rank?: Database["public"]["Enums"]["rank_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      renta_claims: {
        Row: {
          action: string
          amount: number
          claim_date: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          amount: number
          claim_date?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          amount?: number
          claim_date?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      tesseras: {
        Row: {
          id: string
          joined_at: string
          reputation: number
          skin: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          reputation?: number
          skin?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          reputation?: number
          skin?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          balance_earned: number
          balance_locked: number
          balance_promo: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          balance_earned?: number
          balance_locked?: number
          balance_promo?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          balance_earned?: number
          balance_locked?: number
          balance_promo?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      roulette_sessions: {
        Row: {
          user_id: string
          chips: number
          opened_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          chips?: number
          opened_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          chips?: number
          opened_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      answer_academy_question: {
        Args: { p_chosen_index: number; p_question_id: string }
        Returns: {
          already_rewarded: boolean
          correct_index: number
          is_correct: boolean
          reward_aurelios: number
          reward_influence: number
        }[]
      }
      bootstrap_profile: {
        Args: { p_age_confirmed: boolean; p_alias: string }
        Returns: Database["public"]["Tables"]["profiles"]["Row"]
      }
      choose_house: {
        Args: { p_house_code: string }
        Returns: Database["public"]["Tables"]["profiles"]["Row"]
      }
      claim_renta: {
        Args: { p_action?: string }
        Returns: { amount: number; balance: number; claim_date: string }[]
      }
      settle_session: {
        Args: { p_results: Json; p_session_id: string }
        Returns: undefined
      }
      poker_buyin: { Args: { p_amount: number }; Returns: number }
      poker_cashout: { Args: { p_amount: number }; Returns: number }
      spin_roulette_free: {
        Args: { p_bet_type: string; p_bet_value?: number }
        Returns: {
          balance: number
          is_red: boolean
          result_number: number
          reward_aurelios: number
          spins_left: number
          won: boolean
        }[]
      }
      spin_roulette: {
        Args: { p_bets: Json }
        Returns: {
          result_number: number
          is_red: boolean
          total_staked: number
          total_return: number
          net: number
          chips: number
        }[]
      }
      roulette_buyin: {
        Args: { p_amount: number }
        Returns: number
      }
      roulette_cashout: {
        Args: Record<string, never>
        Returns: number
      }
    }
    Enums: {
      aureli_bucket: "earned" | "promotional" | "invested" | "locked" | "purchased"
      game_family: "skill" | "chance"
      game_session_status: "open" | "running" | "finished" | "cancelled"
      ledger_reason:
        | "renta_ciudadana"
        | "academy_reward"
        | "game_win"
        | "game_loss"
        | "game_buyin"
        | "tournament_buyin"
        | "tournament_prize"
        | "property_buy"
        | "property_sell"
        | "property_rent"
        | "tax"
        | "maintenance"
        | "promo_grant"
        | "admin_adjust"
        | "transfer_in_game"
      ledger_status: "pending" | "confirmed" | "reversed"
      membership_tier: "free" | "consigliere" | "don"
      rank_tier:
        | "ciudadano_nuevo"
        | "ciudadano_activo"
        | "ciudadano_reconocido"
        | "ciudadano_patricio"
        | "consigliere"
        | "don"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]

export type Profile = Tables<"profiles">
export type House = Tables<"houses">
export type Wallet = Tables<"wallets">
export type LedgerTransaction = Tables<"ledger_transactions">
export type AcademyQuestion = Tables<"academy_questions">
