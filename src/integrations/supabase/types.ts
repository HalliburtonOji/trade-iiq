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
      account_snapshots: {
        Row: {
          equity_usd: number
          id: string
          recorded_at: string
          user_id: string
        }
        Insert: {
          equity_usd?: number
          id?: string
          recorded_at?: string
          user_id: string
        }
        Update: {
          equity_usd?: number
          id?: string
          recorded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      accountability_streaks: {
        Row: {
          current_streak: number
          id: string
          last_review_date: string | null
          longest_streak: number
          pending_reviews: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          last_review_date?: string | null
          longest_streak?: number
          pending_reviews?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          last_review_date?: string | null
          longest_streak?: number
          pending_reviews?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      candle_cache: {
        Row: {
          cached_at: string | null
          candles: Json
          end_date: string
          id: string
          source: string | null
          start_date: string
          symbol: string
        }
        Insert: {
          cached_at?: string | null
          candles: Json
          end_date: string
          id?: string
          source?: string | null
          start_date: string
          symbol: string
        }
        Update: {
          cached_at?: string | null
          candles?: Json
          end_date?: string
          id?: string
          source?: string | null
          start_date?: string
          symbol?: string
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
      codex_lesson_progress: {
        Row: {
          completed_at: string | null
          id: string
          lesson_id: string
          scroll_pct: number
          started_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          lesson_id: string
          scroll_pct?: number
          started_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          lesson_id?: string
          scroll_pct?: number
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "codex_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "codex_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      codex_lessons: {
        Row: {
          body_markdown: string | null
          chapter_kicker: string
          created_at: string
          folio_number: number
          greek_label: string | null
          id: string
          marginalia_author: string | null
          marginalia_quote: string | null
          read_minutes: number | null
          teaser: string | null
          title: string
        }
        Insert: {
          body_markdown?: string | null
          chapter_kicker: string
          created_at?: string
          folio_number: number
          greek_label?: string | null
          id?: string
          marginalia_author?: string | null
          marginalia_quote?: string | null
          read_minutes?: number | null
          teaser?: string | null
          title: string
        }
        Update: {
          body_markdown?: string | null
          chapter_kicker?: string
          created_at?: string
          folio_number?: number
          greek_label?: string | null
          id?: string
          marginalia_author?: string | null
          marginalia_quote?: string | null
          read_minutes?: number | null
          teaser?: string | null
          title?: string
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
      council_reviews: {
        Row: {
          aggregates: Json
          ai_summary: string
          created_at: string
          decree: string
          id: string
          updated_at: string
          user_id: string
          viewed_at: string | null
          week_starting: string
        }
        Insert: {
          aggregates?: Json
          ai_summary?: string
          created_at?: string
          decree?: string
          id?: string
          updated_at?: string
          user_id: string
          viewed_at?: string | null
          week_starting: string
        }
        Update: {
          aggregates?: Json
          ai_summary?: string
          created_at?: string
          decree?: string
          id?: string
          updated_at?: string
          user_id?: string
          viewed_at?: string | null
          week_starting?: string
        }
        Relationships: []
      }
      daily_briefs: {
        Row: {
          acknowledged_at: string | null
          ai_summary: string
          bias_explainer: string
          bias_focus: string
          brief_date: string
          created_at: string
          discipline_focus: string
          id: string
          symbols: Json
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          ai_summary?: string
          bias_explainer?: string
          bias_focus?: string
          brief_date: string
          created_at?: string
          discipline_focus?: string
          id?: string
          symbols?: Json
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          ai_summary?: string
          bias_explainer?: string
          bias_focus?: string
          brief_date?: string
          created_at?: string
          discipline_focus?: string
          id?: string
          symbols?: Json
          user_id?: string
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
      daily_rules: {
        Row: {
          created_at: string
          date: string
          id: string
          rules_followed: number
          rules_total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          rules_followed?: number
          rules_total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          rules_followed?: number
          rules_total?: number
          updated_at?: string
          user_id?: string
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
      evening_reflections: {
        Row: {
          created_at: string
          id: string
          intent_tomorrow: string
          lesson: string
          reflection_date: string
          rules_honoured: Json
          trade_summary: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          intent_tomorrow?: string
          lesson?: string
          reflection_date: string
          rules_honoured?: Json
          trade_summary?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          intent_tomorrow?: string
          lesson?: string
          reflection_date?: string
          rules_honoured?: Json
          trade_summary?: Json
          user_id?: string
        }
        Relationships: []
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
      journal_entries: {
        Row: {
          closing_note: string | null
          created_at: string
          entry_date: string
          id: string
          lessons: string | null
          morning_prep: string | null
          reflections: Json
          setups: string | null
          updated_at: string
          user_id: string
          what_happened: string | null
        }
        Insert: {
          closing_note?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          lessons?: string | null
          morning_prep?: string | null
          reflections?: Json
          setups?: string | null
          updated_at?: string
          user_id: string
          what_happened?: string | null
        }
        Update: {
          closing_note?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          lessons?: string | null
          morning_prep?: string | null
          reflections?: Json
          setups?: string | null
          updated_at?: string
          user_id?: string
          what_happened?: string | null
        }
        Relationships: []
      }
      learn_modules: {
        Row: {
          content_md: string | null
          created_at: string | null
          diagrams: Json | null
          drill_json: Json | null
          id: string
          is_published: boolean | null
          learn_minutes: number | null
          level: number
          ordinal: number
          prereqs: string[] | null
          quiz_json: Json | null
          scenario_json: Json | null
          slug: string
          summary: string | null
          title_en: string
          title_gr: string
          track: string
          updated_at: string | null
          xp_reward: number | null
        }
        Insert: {
          content_md?: string | null
          created_at?: string | null
          diagrams?: Json | null
          drill_json?: Json | null
          id?: string
          is_published?: boolean | null
          learn_minutes?: number | null
          level: number
          ordinal?: number
          prereqs?: string[] | null
          quiz_json?: Json | null
          scenario_json?: Json | null
          slug: string
          summary?: string | null
          title_en: string
          title_gr: string
          track: string
          updated_at?: string | null
          xp_reward?: number | null
        }
        Update: {
          content_md?: string | null
          created_at?: string | null
          diagrams?: Json | null
          drill_json?: Json | null
          id?: string
          is_published?: boolean | null
          learn_minutes?: number | null
          level?: number
          ordinal?: number
          prereqs?: string[] | null
          quiz_json?: Json | null
          scenario_json?: Json | null
          slug?: string
          summary?: string | null
          title_en?: string
          title_gr?: string
          track?: string
          updated_at?: string | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      learn_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          mode: string
          module_id: string
          playbook_rule_created: boolean | null
          score: number | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          mode: string
          module_id: string
          playbook_rule_created?: boolean | null
          score?: number | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          mode?: string
          module_id?: string
          playbook_rule_created?: boolean | null
          score?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learn_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learn_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      learn_recommendations: {
        Row: {
          dismissed_at: string | null
          generated_at: string | null
          id: string
          module_id: string
          reason: string
          reason_detail: Json | null
          user_id: string
        }
        Insert: {
          dismissed_at?: string | null
          generated_at?: string | null
          id?: string
          module_id: string
          reason: string
          reason_detail?: Json | null
          user_id: string
        }
        Update: {
          dismissed_at?: string | null
          generated_at?: string | null
          id?: string
          module_id?: string
          reason?: string
          reason_detail?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learn_recommendations_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learn_modules"
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
      mentor_case_studies: {
        Row: {
          asset_type: string
          created_at: string
          direction: string
          entry_rationale: string
          greek_phrase: string | null
          hook: string
          id: string
          intent_id: string | null
          key_takeaway: string
          lesson: string
          mentor_slug: string
          outcome: string
          pnl_pct: number | null
          r_multiple: number | null
          setup: string
          symbol: string
          tags: Json
          title: string
          trade_id: string
          what_happened: string
        }
        Insert: {
          asset_type?: string
          created_at?: string
          direction: string
          entry_rationale?: string
          greek_phrase?: string | null
          hook?: string
          id?: string
          intent_id?: string | null
          key_takeaway?: string
          lesson?: string
          mentor_slug?: string
          outcome: string
          pnl_pct?: number | null
          r_multiple?: number | null
          setup?: string
          symbol: string
          tags?: Json
          title: string
          trade_id: string
          what_happened?: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          direction?: string
          entry_rationale?: string
          greek_phrase?: string | null
          hook?: string
          id?: string
          intent_id?: string | null
          key_takeaway?: string
          lesson?: string
          mentor_slug?: string
          outcome?: string
          pnl_pct?: number | null
          r_multiple?: number | null
          setup?: string
          symbol?: string
          tags?: Json
          title?: string
          trade_id?: string
          what_happened?: string
        }
        Relationships: []
      }
      mentor_copies: {
        Row: {
          created_at: string
          id: string
          paper_trade_id: string | null
          source_id: string
          source_kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          paper_trade_id?: string | null
          source_id: string
          source_kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          paper_trade_id?: string | null
          source_id?: string
          source_kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_copies_paper_trade_id_fkey"
            columns: ["paper_trade_id"]
            isOneToOne: false
            referencedRelation: "paper_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_followers: {
        Row: {
          created_at: string
          id: string
          mirror_enabled: boolean
          mirror_risk_pct: number
          mirror_started_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mirror_enabled?: boolean
          mirror_risk_pct?: number
          mirror_started_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mirror_enabled?: boolean
          mirror_risk_pct?: number
          mirror_started_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mentor_intent_watchers: {
        Row: {
          created_at: string
          id: string
          intent_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          intent_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          intent_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_intent_watchers_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "mentor_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_intents: {
        Row: {
          asset_type: string
          conviction: number | null
          created_at: string
          direction: string
          entry_hint: number | null
          fail_reasons: Json
          id: string
          invalidation_text: string
          mentor_slug: string
          resolution_note: string | null
          resolved_at: string | null
          size_pct: number
          status: string
          stop_loss: number
          symbol: string
          take_profit: number
          thesis: string
          trigger_condition_text: string
          trigger_kind: string
          trigger_value: number | null
          valid_until: string
        }
        Insert: {
          asset_type?: string
          conviction?: number | null
          created_at?: string
          direction: string
          entry_hint?: number | null
          fail_reasons?: Json
          id?: string
          invalidation_text?: string
          mentor_slug?: string
          resolution_note?: string | null
          resolved_at?: string | null
          size_pct?: number
          status?: string
          stop_loss: number
          symbol: string
          take_profit: number
          thesis?: string
          trigger_condition_text: string
          trigger_kind: string
          trigger_value?: number | null
          valid_until: string
        }
        Update: {
          asset_type?: string
          conviction?: number | null
          created_at?: string
          direction?: string
          entry_hint?: number | null
          fail_reasons?: Json
          id?: string
          invalidation_text?: string
          mentor_slug?: string
          resolution_note?: string | null
          resolved_at?: string | null
          size_pct?: number
          status?: string
          stop_loss?: number
          symbol?: string
          take_profit?: number
          thesis?: string
          trigger_condition_text?: string
          trigger_kind?: string
          trigger_value?: number | null
          valid_until?: string
        }
        Relationships: []
      }
      mentor_journal: {
        Row: {
          body_text: string
          created_at: string
          id: string
          intent_id: string | null
          kind: string
          mentor_slug: string
          payload: Json
          symbol: string | null
          trade_id: string | null
        }
        Insert: {
          body_text?: string
          created_at?: string
          id?: string
          intent_id?: string | null
          kind: string
          mentor_slug?: string
          payload?: Json
          symbol?: string | null
          trade_id?: string | null
        }
        Update: {
          body_text?: string
          created_at?: string
          id?: string
          intent_id?: string | null
          kind?: string
          mentor_slug?: string
          payload?: Json
          symbol?: string | null
          trade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_journal_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "mentor_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_journal_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "mentor_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_letters: {
        Row: {
          body_md: string
          created_at: string
          greek_phrase: string | null
          id: string
          intents_published: number
          intents_skipped: number
          mentor_slug: string
          pnl_pct: number | null
          stats: Json
          title: string
          trades_lost: number
          trades_won: number
          week_starting: string
        }
        Insert: {
          body_md: string
          created_at?: string
          greek_phrase?: string | null
          id?: string
          intents_published?: number
          intents_skipped?: number
          mentor_slug?: string
          pnl_pct?: number | null
          stats?: Json
          title: string
          trades_lost?: number
          trades_won?: number
          week_starting: string
        }
        Update: {
          body_md?: string
          created_at?: string
          greek_phrase?: string | null
          id?: string
          intents_published?: number
          intents_skipped?: number
          mentor_slug?: string
          pnl_pct?: number | null
          stats?: Json
          title?: string
          trades_lost?: number
          trades_won?: number
          week_starting?: string
        }
        Relationships: []
      }
      mentor_locks: {
        Row: {
          id: number
          locked_at: string | null
          locked_by: string | null
        }
        Insert: {
          id?: number
          locked_at?: string | null
          locked_by?: string | null
        }
        Update: {
          id?: number
          locked_at?: string | null
          locked_by?: string | null
        }
        Relationships: []
      }
      mentor_missed_reflections: {
        Row: {
          dismissed_at: string | null
          id: string
          intent_id: string | null
          mentor_slug: string
          note: string | null
          pnl_at_reflection: number | null
          prompted_at: string
          reason: string | null
          reflected_at: string | null
          symbol: string
          trade_id: string | null
          user_id: string
        }
        Insert: {
          dismissed_at?: string | null
          id?: string
          intent_id?: string | null
          mentor_slug?: string
          note?: string | null
          pnl_at_reflection?: number | null
          prompted_at?: string
          reason?: string | null
          reflected_at?: string | null
          symbol: string
          trade_id?: string | null
          user_id: string
        }
        Update: {
          dismissed_at?: string | null
          id?: string
          intent_id?: string | null
          mentor_slug?: string
          note?: string | null
          pnl_at_reflection?: number | null
          prompted_at?: string
          reason?: string | null
          reflected_at?: string | null
          symbol?: string
          trade_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mentor_profile: {
        Row: {
          bio: string
          born_at: string
          cadence_minutes: number
          display_name: string
          enabled: boolean
          equity: number
          id: string
          last_tick_at: string | null
          max_intents: number
          max_open: number
          max_valid_hours: number
          min_valid_hours: number
          name: string
          persona_color: string
          persona_kind: string
          persona_prompt: string
          persona_tagline: string
          risk_pct: number
          slug: string
          starting_balance: number
          stats_json: Json
          time_stop_hours: number
          updated_at: string
        }
        Insert: {
          bio?: string
          born_at?: string
          cadence_minutes?: number
          display_name?: string
          enabled?: boolean
          equity?: number
          id?: string
          last_tick_at?: string | null
          max_intents?: number
          max_open?: number
          max_valid_hours?: number
          min_valid_hours?: number
          name?: string
          persona_color?: string
          persona_kind?: string
          persona_prompt?: string
          persona_tagline?: string
          risk_pct?: number
          slug?: string
          starting_balance?: number
          stats_json?: Json
          time_stop_hours?: number
          updated_at?: string
        }
        Update: {
          bio?: string
          born_at?: string
          cadence_minutes?: number
          display_name?: string
          enabled?: boolean
          equity?: number
          id?: string
          last_tick_at?: string | null
          max_intents?: number
          max_open?: number
          max_valid_hours?: number
          min_valid_hours?: number
          name?: string
          persona_color?: string
          persona_kind?: string
          persona_prompt?: string
          persona_tagline?: string
          risk_pct?: number
          slug?: string
          starting_balance?: number
          stats_json?: Json
          time_stop_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      mentor_trades: {
        Row: {
          asset_type: string
          breakeven_moved: boolean
          close_reflection: string | null
          closed_at: string | null
          direction: string
          entry_price: number
          exit_price: number | null
          id: string
          intent_id: string | null
          mentor_slug: string
          opened_at: string
          partial_pnl: number | null
          partial_price: number | null
          partial_qty: number | null
          partial_taken: boolean
          pnl: number | null
          pnl_percent: number | null
          quantity: number
          r_initial: number | null
          status: string
          stop_loss: number
          symbol: string
          take_profit: number
          thesis: string
          time_stop_at: string | null
          trail_atr_mult: number | null
          trail_high_water: number | null
        }
        Insert: {
          asset_type?: string
          breakeven_moved?: boolean
          close_reflection?: string | null
          closed_at?: string | null
          direction: string
          entry_price: number
          exit_price?: number | null
          id?: string
          intent_id?: string | null
          mentor_slug?: string
          opened_at?: string
          partial_pnl?: number | null
          partial_price?: number | null
          partial_qty?: number | null
          partial_taken?: boolean
          pnl?: number | null
          pnl_percent?: number | null
          quantity: number
          r_initial?: number | null
          status?: string
          stop_loss: number
          symbol: string
          take_profit: number
          thesis?: string
          time_stop_at?: string | null
          trail_atr_mult?: number | null
          trail_high_water?: number | null
        }
        Update: {
          asset_type?: string
          breakeven_moved?: boolean
          close_reflection?: string | null
          closed_at?: string | null
          direction?: string
          entry_price?: number
          exit_price?: number | null
          id?: string
          intent_id?: string | null
          mentor_slug?: string
          opened_at?: string
          partial_pnl?: number | null
          partial_price?: number | null
          partial_qty?: number | null
          partial_taken?: boolean
          pnl?: number | null
          pnl_percent?: number | null
          quantity?: number
          r_initial?: number | null
          status?: string
          stop_loss?: number
          symbol?: string
          take_profit?: number
          thesis?: string
          time_stop_at?: string | null
          trail_atr_mult?: number | null
          trail_high_water?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_trades_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "mentor_intents"
            referencedColumns: ["id"]
          },
        ]
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
      oracle_messages: {
        Row: {
          content: string
          context_json: Json | null
          created_at: string
          id: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          context_json?: Json | null
          created_at?: string
          id?: string
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          context_json?: Json | null
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oracle_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "oracle_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      oracle_sessions: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          pinned: boolean
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          pinned?: boolean
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          pinned?: boolean
          title?: string | null
          updated_at?: string
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
      playbooks: {
        Row: {
          checklist: Json
          conditions: Json
          created_at: string
          example_screenshots: string[] | null
          id: string
          invalidation_rules: string | null
          name: string
          notes: string | null
          strategy_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checklist?: Json
          conditions?: Json
          created_at?: string
          example_screenshots?: string[] | null
          id?: string
          invalidation_rules?: string | null
          name: string
          notes?: string | null
          strategy_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checklist?: Json
          conditions?: Json
          created_at?: string
          example_screenshots?: string[] | null
          id?: string
          invalidation_rules?: string | null
          name?: string
          notes?: string | null
          strategy_type?: string
          updated_at?: string
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
      practice_streak: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_evening_date: string | null
          last_full_date: string | null
          last_morning_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_evening_date?: string | null
          last_full_date?: string | null
          last_morning_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_evening_date?: string | null
          last_full_date?: string | null
          last_morning_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
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
          onboarded_at: string | null
          onboarding_complete: boolean | null
          paper_balance: number
          preferred_assets: string[] | null
          preferred_broker: string | null
          streak_count: number
          streak_last_active: string | null
          timezone: string | null
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
          onboarded_at?: string | null
          onboarding_complete?: boolean | null
          paper_balance?: number
          preferred_assets?: string[] | null
          preferred_broker?: string | null
          streak_count?: number
          streak_last_active?: string | null
          timezone?: string | null
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
          onboarded_at?: string | null
          onboarding_complete?: boolean | null
          paper_balance?: number
          preferred_assets?: string[] | null
          preferred_broker?: string | null
          streak_count?: number
          streak_last_active?: string | null
          timezone?: string | null
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
      quote_cache: {
        Row: {
          cached_at: string | null
          change_pct: number | null
          payload: Json
          price: number | null
          symbol: string
        }
        Insert: {
          cached_at?: string | null
          change_pct?: number | null
          payload: Json
          price?: number | null
          symbol: string
        }
        Update: {
          cached_at?: string | null
          change_pct?: number | null
          payload?: Json
          price?: number | null
          symbol?: string
        }
        Relationships: []
      }
      recommended_lessons: {
        Row: {
          created_at: string
          dismissed_at: string | null
          id: string
          lesson_id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string | null
          id?: string
          lesson_id: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string | null
          id?: string
          lesson_id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rule_violations: {
        Row: {
          created_at: string | null
          dismissed: boolean | null
          id: string
          reason: string | null
          rule_id: string | null
          trade_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dismissed?: boolean | null
          id?: string
          reason?: string | null
          rule_id?: string | null
          trade_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dismissed?: boolean | null
          id?: string
          reason?: string | null
          rule_id?: string | null
          trade_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_violations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_memory: {
        Row: {
          created_at: string | null
          embedding: string | null
          feature_json: Json | null
          id: string
          module_id: string | null
          trade_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          feature_json?: Json | null
          id?: string
          module_id?: string | null
          trade_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          feature_json?: Json | null
          id?: string
          module_id?: string | null
          trade_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_memory_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learn_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      screenshot_vault: {
        Row: {
          annotation: string | null
          created_at: string
          id: string
          image_url: string
          phase: string
          symbol: string
          tags: string[] | null
          trade_id: string | null
          user_id: string
        }
        Insert: {
          annotation?: string | null
          created_at?: string
          id?: string
          image_url: string
          phase?: string
          symbol?: string
          tags?: string[] | null
          trade_id?: string | null
          user_id: string
        }
        Update: {
          annotation?: string | null
          created_at?: string
          id?: string
          image_url?: string
          phase?: string
          symbol?: string
          tags?: string[] | null
          trade_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screenshot_vault_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "paper_trades"
            referencedColumns: ["id"]
          },
        ]
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
      trades: {
        Row: {
          closed_at: string | null
          created_at: string
          entry_price: number | null
          exit_price: number | null
          id: string
          note: string | null
          opened_at: string
          pnl_usd: number | null
          r_multiple: number | null
          setup_grade: string | null
          side: string
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          entry_price?: number | null
          exit_price?: number | null
          id?: string
          note?: string | null
          opened_at?: string
          pnl_usd?: number | null
          r_multiple?: number | null
          setup_grade?: string | null
          side?: string
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          entry_price?: number | null
          exit_price?: number | null
          id?: string
          note?: string | null
          opened_at?: string
          pnl_usd?: number | null
          r_multiple?: number | null
          setup_grade?: string | null
          side?: string
          symbol?: string
          updated_at?: string
          user_id?: string
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
      trading_signatures: {
        Row: {
          computed_at: string | null
          embedding: string | null
          signature: Json
          user_id: string
        }
        Insert: {
          computed_at?: string | null
          embedding?: string | null
          signature: Json
          user_id: string
        }
        Update: {
          computed_at?: string | null
          embedding?: string | null
          signature?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          alerts: Json
          identity: Json
          markets: Json
          oracle: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          alerts?: Json
          identity?: Json
          markets?: Json
          oracle?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          alerts?: Json
          identity?: Json
          markets?: Json
          oracle?: Json
          updated_at?: string
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
      xp_ledger: {
        Row: {
          amount: number
          awarded_at: string
          id: string
          ref_id: string
          ref_table: string | null
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          awarded_at?: string
          id?: string
          ref_id: string
          ref_table?: string | null
          source: string
          user_id: string
        }
        Update: {
          amount?: number
          awarded_at?: string
          id?: string
          ref_id?: string
          ref_table?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard_30d: {
        Row: {
          active_days: number | null
          display_name: string | null
          level: string | null
          streak_count: number | null
          user_id: string | null
          xp_total: number | null
          xp_window: number | null
        }
        Relationships: []
      }
      leaderboard_7d: {
        Row: {
          active_days: number | null
          display_name: string | null
          level: string | null
          streak_count: number | null
          user_id: string | null
          xp_total: number | null
          xp_window: number | null
        }
        Relationships: []
      }
      leaderboard_alltime: {
        Row: {
          active_days: number | null
          display_name: string | null
          level: string | null
          streak_count: number | null
          user_id: string | null
          xp_total: number | null
          xp_window: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_xp: {
        Args: {
          p_amount: number
          p_ref_id: string
          p_ref_table?: string
          p_source: string
        }
        Returns: {
          awarded: boolean
          new_streak: number
          new_xp: number
        }[]
      }
      mentor_source_copy_count: {
        Args: { p_id: string; p_kind: string }
        Returns: number
      }
      touch_practice_ritual: {
        Args: { p_kind: string }
        Returns: {
          current_streak: number
          full_day: boolean
          longest_streak: number
        }[]
      }
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
