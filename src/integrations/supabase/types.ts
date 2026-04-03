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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      analysis_cache: {
        Row: {
          asset_type: string
          confidence: number | null
          id: string
          last_updated: string
          live_price: number | null
          macro_json: Json | null
          price_change: number | null
          risk_score: number | null
          setup_score: number | null
          summary: string | null
          symbol: string
          targets_json: Json | null
          technicals_json: Json | null
          verdict: string | null
        }
        Insert: {
          asset_type: string
          confidence?: number | null
          id?: string
          last_updated?: string
          live_price?: number | null
          macro_json?: Json | null
          price_change?: number | null
          risk_score?: number | null
          setup_score?: number | null
          summary?: string | null
          symbol: string
          targets_json?: Json | null
          technicals_json?: Json | null
          verdict?: string | null
        }
        Update: {
          asset_type?: string
          confidence?: number | null
          id?: string
          last_updated?: string
          live_price?: number | null
          macro_json?: Json | null
          price_change?: number | null
          risk_score?: number | null
          setup_score?: number | null
          summary?: string | null
          symbol?: string
          targets_json?: Json | null
          technicals_json?: Json | null
          verdict?: string | null
        }
        Relationships: []
      }
      chart_analyses: {
        Row: {
          analysis_json: Json | null
          created_at: string
          id: string
          image_url: string
          symbol: string | null
          user_id: string
        }
        Insert: {
          analysis_json?: Json | null
          created_at?: string
          id?: string
          image_url: string
          symbol?: string | null
          user_id: string
        }
        Update: {
          analysis_json?: Json | null
          created_at?: string
          id?: string
          image_url?: string
          symbol?: string | null
          user_id?: string
        }
        Relationships: []
      }
      community_votes: {
        Row: {
          id: string
          symbol: string
          user_id: string
          vote: string
          voted_at: string
        }
        Insert: {
          id?: string
          symbol: string
          user_id: string
          vote?: string
          voted_at?: string
        }
        Update: {
          id?: string
          symbol?: string
          user_id?: string
          vote?: string
          voted_at?: string
        }
        Relationships: []
      }
      daily_missions: {
        Row: {
          completed_count: number
          created_at: string
          date: string
          id: string
          missions: Json
          total_count: number
          user_id: string
          xp_earned: number
        }
        Insert: {
          completed_count?: number
          created_at?: string
          date?: string
          id?: string
          missions?: Json
          total_count?: number
          user_id: string
          xp_earned?: number
        }
        Update: {
          completed_count?: number
          created_at?: string
          date?: string
          id?: string
          missions?: Json
          total_count?: number
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
      daily_picks_cache: {
        Row: {
          created_at: string
          crypto: Json
          date: string
          forex: Json
          id: string
          stocks: Json
        }
        Insert: {
          created_at?: string
          crypto?: Json
          date: string
          forex?: Json
          id?: string
          stocks?: Json
        }
        Update: {
          created_at?: string
          crypto?: Json
          date?: string
          forex?: Json
          id?: string
          stocks?: Json
        }
        Relationships: []
      }
      decision_reviews: {
        Row: {
          emotion: string | null
          execution_quality: string | null
          followed_plan: boolean | null
          id: string
          lesson_learned: string | null
          mistake_type: string | null
          reviewed_date: string
          timing_correct: boolean | null
          trade_decision_id: string
          user_id: string
          verdict_correct: boolean | null
        }
        Insert: {
          emotion?: string | null
          execution_quality?: string | null
          followed_plan?: boolean | null
          id?: string
          lesson_learned?: string | null
          mistake_type?: string | null
          reviewed_date?: string
          timing_correct?: boolean | null
          trade_decision_id: string
          user_id: string
          verdict_correct?: boolean | null
        }
        Update: {
          emotion?: string | null
          execution_quality?: string | null
          followed_plan?: boolean | null
          id?: string
          lesson_learned?: string | null
          mistake_type?: string | null
          reviewed_date?: string
          timing_correct?: boolean | null
          trade_decision_id?: string
          user_id?: string
          verdict_correct?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_reviews_trade_decision_id_fkey"
            columns: ["trade_decision_id"]
            isOneToOne: true
            referencedRelation: "trade_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_likes: {
        Row: {
          created_at: string
          id: string
          idea_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_likes_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "trade_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_progress: {
        Row: {
          category: string
          completed: boolean
          completed_date: string | null
          id: string
          lesson_id: string
          lesson_title: string
          streak_day: number
          user_id: string
          xp_earned: number
        }
        Insert: {
          category?: string
          completed?: boolean
          completed_date?: string | null
          id?: string
          lesson_id: string
          lesson_title?: string
          streak_day?: number
          user_id: string
          xp_earned?: number
        }
        Update: {
          category?: string
          completed?: boolean
          completed_date?: string | null
          id?: string
          lesson_id?: string
          lesson_title?: string
          streak_day?: number
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      paper_trades: {
        Row: {
          asset_type: string
          closed_at: string | null
          direction: string
          emotion: string | null
          entry_price: number
          exit_price: number | null
          id: string
          leverage: number
          opened_at: string
          order_type: string
          pnl: number | null
          pnl_percent: number | null
          post_notes: string | null
          quantity: number
          status: string
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          thesis: string | null
          thesis_json: Json | null
          user_id: string
        }
        Insert: {
          asset_type?: string
          closed_at?: string | null
          direction?: string
          emotion?: string | null
          entry_price: number
          exit_price?: number | null
          id?: string
          leverage?: number
          opened_at?: string
          order_type?: string
          pnl?: number | null
          pnl_percent?: number | null
          post_notes?: string | null
          quantity: number
          status?: string
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          thesis?: string | null
          thesis_json?: Json | null
          user_id: string
        }
        Update: {
          asset_type?: string
          closed_at?: string | null
          direction?: string
          emotion?: string | null
          entry_price?: number
          exit_price?: number | null
          id?: string
          leverage?: number
          opened_at?: string
          order_type?: string
          pnl?: number | null
          pnl_percent?: number | null
          post_notes?: string | null
          quantity?: number
          status?: string
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          thesis?: string | null
          thesis_json?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      practice_progress: {
        Row: {
          attempt_count: number
          category: string
          completed: boolean
          completed_at: string | null
          drill_id: string
          id: string
          passed: boolean
          practice_type: string
          score: number
          started_at: string
          user_id: string
          weak_tags: string[] | null
          xp_earned: number
        }
        Insert: {
          attempt_count?: number
          category?: string
          completed?: boolean
          completed_at?: string | null
          drill_id: string
          id?: string
          passed?: boolean
          practice_type?: string
          score?: number
          started_at?: string
          user_id: string
          weak_tags?: string[] | null
          xp_earned?: number
        }
        Update: {
          attempt_count?: number
          category?: string
          completed?: boolean
          completed_at?: string | null
          drill_id?: string
          id?: string
          passed?: boolean
          practice_type?: string
          score?: number
          started_at?: string
          user_id?: string
          weak_tags?: string[] | null
          xp_earned?: number
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          created_at: string
          direction: string
          id: string
          symbol: string
          target_price: number
          triggered: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          direction?: string
          id?: string
          symbol: string
          target_price: number
          triggered?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          symbol?: string
          target_price?: number
          triggered?: boolean
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          experience_level: string | null
          id: string
          last_active_date: string | null
          level: string
          onboarding_complete: boolean | null
          paper_balance: number
          preferred_assets: string[] | null
          preferred_broker: string | null
          streak_count: number
          trading_goals: string[] | null
          trading_level: number
          trading_personality: string
          updated_at: string
          user_id: string
          xp_total: number
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          experience_level?: string | null
          id?: string
          last_active_date?: string | null
          level?: string
          onboarding_complete?: boolean | null
          paper_balance?: number
          preferred_assets?: string[] | null
          preferred_broker?: string | null
          streak_count?: number
          trading_goals?: string[] | null
          trading_level?: number
          trading_personality?: string
          updated_at?: string
          user_id: string
          xp_total?: number
        }
        Update: {
          created_at?: string
          display_name?: string | null
          experience_level?: string | null
          id?: string
          last_active_date?: string | null
          level?: string
          onboarding_complete?: boolean | null
          paper_balance?: number
          preferred_assets?: string[] | null
          preferred_broker?: string | null
          streak_count?: number
          trading_goals?: string[] | null
          trading_level?: number
          trading_personality?: string
          updated_at?: string
          user_id?: string
          xp_total?: number
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          completed_at: string
          id: string
          lesson_id: string
          passed: boolean
          score: number
          total_questions: number
          user_id: string
          weak_tags: string[] | null
        }
        Insert: {
          completed_at?: string
          id?: string
          lesson_id: string
          passed?: boolean
          score?: number
          total_questions?: number
          user_id: string
          weak_tags?: string[] | null
        }
        Update: {
          completed_at?: string
          id?: string
          lesson_id?: string
          passed?: boolean
          score?: number
          total_questions?: number
          user_id?: string
          weak_tags?: string[] | null
        }
        Relationships: []
      }
      trade_decisions: {
        Row: {
          asset_type: string
          catalyst_date: string | null
          catalyst_note: string | null
          confidence: number | null
          created_at: string
          date: string
          decision: string
          entry_price: number | null
          id: string
          invalidation_point: number | null
          notes: string | null
          outcome: string
          pnl_percent: number | null
          symbol: string
          thesis_why: string | null
          time_horizon: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_type: string
          catalyst_date?: string | null
          catalyst_note?: string | null
          confidence?: number | null
          created_at?: string
          date?: string
          decision: string
          entry_price?: number | null
          id?: string
          invalidation_point?: number | null
          notes?: string | null
          outcome?: string
          pnl_percent?: number | null
          symbol: string
          thesis_why?: string | null
          time_horizon?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_type?: string
          catalyst_date?: string | null
          catalyst_note?: string | null
          confidence?: number | null
          created_at?: string
          date?: string
          decision?: string
          entry_price?: number | null
          id?: string
          invalidation_point?: number | null
          notes?: string | null
          outcome?: string
          pnl_percent?: number | null
          symbol?: string
          thesis_why?: string | null
          time_horizon?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_ideas: {
        Row: {
          confidence: number | null
          created_at: string
          display_name: string | null
          id: string
          likes_count: number | null
          symbol: string
          thesis: string
          user_id: string
          verdict: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          display_name?: string | null
          id?: string
          likes_count?: number | null
          symbol: string
          thesis?: string
          user_id: string
          verdict: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          display_name?: string | null
          id?: string
          likes_count?: number | null
          symbol?: string
          thesis?: string
          user_id?: string
          verdict?: string
        }
        Relationships: []
      }
      trading_dna: {
        Row: {
          best_asset_class: string | null
          best_confidence_range: string | null
          dna_json: Json | null
          favourite_strategy: string | null
          id: string
          most_common_mistake: string | null
          overconfidence_score: number | null
          updated_at: string
          user_id: string
          worst_asset_class: string | null
          worst_emotional_trigger: string | null
        }
        Insert: {
          best_asset_class?: string | null
          best_confidence_range?: string | null
          dna_json?: Json | null
          favourite_strategy?: string | null
          id?: string
          most_common_mistake?: string | null
          overconfidence_score?: number | null
          updated_at?: string
          user_id: string
          worst_asset_class?: string | null
          worst_emotional_trigger?: string | null
        }
        Update: {
          best_asset_class?: string | null
          best_confidence_range?: string | null
          dna_json?: Json | null
          favourite_strategy?: string | null
          id?: string
          most_common_mistake?: string | null
          overconfidence_score?: number | null
          updated_at?: string
          user_id?: string
          worst_asset_class?: string | null
          worst_emotional_trigger?: string | null
        }
        Relationships: []
      }
      trading_rules: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          rule_text: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          rule_text: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          rule_text?: string
          user_id?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          added_date: string
          id: string
          name: string
          symbol: string
          type: string
          user_id: string
        }
        Insert: {
          added_date?: string
          id?: string
          name?: string
          symbol: string
          type: string
          user_id: string
        }
        Update: {
          added_date?: string
          id?: string
          name?: string
          symbol?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
