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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: number
          max_transaction: number
          min_transaction: number
          promo_code: string
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          id?: number
          max_transaction?: number
          min_transaction?: number
          promo_code?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Update: {
          id?: number
          max_transaction?: number
          min_transaction?: number
          promo_code?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          active: boolean
          created_at: string
          icon: string
          id: string
          name: string
          number: string
          sort_order: number
          type: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string
          id: string
          name: string
          number: string
          sort_order?: number
          type?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string
          id?: string
          name?: string
          number?: string
          sort_order?: number
          type?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          read_at: string | null
          title: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          message: string
          read_at?: string | null
          title: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          read_at?: string | null
          title?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          player_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          player_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          player_id?: string | null
        }
        Relationships: []
      }
      sports_fixtures: {
        Row: {
          away_team: string
          commence_at: string
          home_team: string
          id: string
          league_key: string | null
          league_name: string | null
          provider: string
          provider_fixture_id: string
          raw: Json
          sport: string
          status: string
          updated_at: string
        }
        Insert: {
          away_team: string
          commence_at: string
          home_team: string
          id?: string
          league_key?: string | null
          league_name?: string | null
          provider?: string
          provider_fixture_id: string
          raw?: Json
          sport: string
          status?: string
          updated_at?: string
        }
        Update: {
          away_team?: string
          commence_at?: string
          home_team?: string
          id?: string
          league_key?: string | null
          league_name?: string | null
          provider?: string
          provider_fixture_id?: string
          raw?: Json
          sport?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sports_odds_snapshots: {
        Row: {
          bookmaker: string
          captured_at: string
          decimal_odds: number
          fixture_id: string
          id: string
          implied_probability: number | null
          market_key: string
          provider: string
          raw: Json
          selection: string
        }
        Insert: {
          bookmaker: string
          captured_at?: string
          decimal_odds: number
          fixture_id: string
          id?: string
          implied_probability?: number | null
          market_key: string
          provider?: string
          raw?: Json
          selection: string
        }
        Update: {
          bookmaker?: string
          captured_at?: string
          decimal_odds?: number
          fixture_id?: string
          id?: string
          implied_probability?: number | null
          market_key?: string
          provider?: string
          raw?: Json
          selection?: string
        }
        Relationships: [
          {
            foreignKeyName: "sports_odds_snapshots_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "sports_fixtures"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_tips: {
        Row: {
          captured_at: string
          decimal_odds: number
          expires_at: string
          fixture_id: string
          id: string
          market_key: string
          published_at: string
          rank: number
          rationale: string
          result: string
          result_updated_at: string | null
          risk_band: string
          score: number
          selection: string
          source: string
          sport: string
          update_run_id: string
        }
        Insert: {
          captured_at: string
          decimal_odds: number
          expires_at: string
          fixture_id: string
          id?: string
          market_key: string
          published_at?: string
          rank: number
          rationale: string
          result?: string
          result_updated_at?: string | null
          risk_band: string
          score: number
          selection: string
          source?: string
          sport: string
          update_run_id: string
        }
        Update: {
          captured_at?: string
          decimal_odds?: number
          expires_at?: string
          fixture_id?: string
          id?: string
          market_key?: string
          published_at?: string
          rank?: number
          rationale?: string
          result?: string
          result_updated_at?: string | null
          risk_band?: string
          score?: number
          selection?: string
          source?: string
          sport?: string
          update_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sports_tips_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "sports_fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_tips_update_run_id_fkey"
            columns: ["update_run_id"]
            isOneToOne: false
            referencedRelation: "sports_update_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_update_runs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          fixture_count: number
          id: string
          metadata: Json
          provider: string
          slot: string
          sport: string
          started_at: string
          status: string
          tip_count: number
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          fixture_count?: number
          id?: string
          metadata?: Json
          provider?: string
          slot: string
          sport: string
          started_at?: string
          status?: string
          tip_count?: number
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          fixture_count?: number
          id?: string
          metadata?: Json
          provider?: string
          slot?: string
          sport?: string
          started_at?: string
          status?: string
          tip_count?: number
        }
        Relationships: []
      }
      transaction_events: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          status: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          status: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          status?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_events_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_number: string | null
          amount: number
          bank: string | null
          contact_number: string | null
          created_at: string
          full_name: string | null
          id: string
          payment_method: string | null
          player_id: string | null
          receipt_image: string | null
          receipt_reference: string | null
          reference: string
          rejection_reason: string | null
          security_code: string | null
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          account_number?: string | null
          amount: number
          bank?: string | null
          contact_number?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          payment_method?: string | null
          player_id?: string | null
          receipt_image?: string | null
          receipt_reference?: string | null
          reference?: string
          rejection_reason?: string | null
          security_code?: string | null
          status?: string
          type: string
          user_id?: string | null
        }
        Update: {
          account_number?: string | null
          amount?: number
          bank?: string | null
          contact_number?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          payment_method?: string | null
          player_id?: string | null
          receipt_image?: string | null
          receipt_reference?: string | null
          reference?: string
          rejection_reason?: string | null
          security_code?: string | null
          status?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
