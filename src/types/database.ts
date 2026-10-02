// Generálta: scripts/gen-types.ts – ne szerkeszd kézzel.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      albums: {
        Row: {
          id: string;
          candidate_id: string;
          title: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          title: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          title?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "albums_candidate_id_fkey"; columns: ["candidate_id"]; isOneToOne: false; referencedRelation: "candidate_profiles"; referencedColumns: ["user_id"] },
        ];
      };
      application_events: {
        Row: {
          id: number;
          application_id: string;
          from_status: Database["public"]["Enums"]["application_status"] | null;
          to_status: Database["public"]["Enums"]["application_status"];
          actor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          application_id: string;
          from_status?: Database["public"]["Enums"]["application_status"] | null;
          to_status: Database["public"]["Enums"]["application_status"];
          actor_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          application_id?: string;
          from_status?: Database["public"]["Enums"]["application_status"] | null;
          to_status?: Database["public"]["Enums"]["application_status"];
          actor_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "application_events_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "application_events_application_id_fkey"; columns: ["application_id"]; isOneToOne: false; referencedRelation: "applications"; referencedColumns: ["id"] },
        ];
      };
      applications: {
        Row: {
          id: string;
          job_id: string;
          candidate_id: string;
          status: Database["public"]["Enums"]["application_status"];
          match_score: number | null;
          match_breakdown: Json | null;
          response_due_at: string;
          reminder_sent_at: string | null;
          decided_at: string | null;
          closed_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          candidate_id: string;
          status?: Database["public"]["Enums"]["application_status"];
          match_score?: number | null;
          match_breakdown?: Json | null;
          response_due_at?: string;
          reminder_sent_at?: string | null;
          decided_at?: string | null;
          closed_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          candidate_id?: string;
          status?: Database["public"]["Enums"]["application_status"];
          match_score?: number | null;
          match_breakdown?: Json | null;
          response_due_at?: string;
          reminder_sent_at?: string | null;
          decided_at?: string | null;
          closed_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "applications_candidate_id_fkey"; columns: ["candidate_id"]; isOneToOne: false; referencedRelation: "candidate_profiles"; referencedColumns: ["user_id"] },
          { foreignKeyName: "applications_job_id_fkey"; columns: ["job_id"]; isOneToOne: false; referencedRelation: "jobs"; referencedColumns: ["id"] },
        ];
      };
      candidate_profiles: {
        Row: {
          user_id: string;
          headline: string | null;
          bio: string | null;
          postal_code: string | null;
          settlement_id: number | null;
          travel_km: number | null;
          wage_expectation: number | null;
          wage_period: Database["public"]["Enums"]["wage_period"];
          start_date: string | null;
          availability: Database["public"]["Enums"]["shift_type"][];
          intro_video_path: string | null;
          intro_video_poster_path: string | null;
          onboarding_step: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          headline?: string | null;
          bio?: string | null;
          postal_code?: string | null;
          settlement_id?: number | null;
          travel_km?: number | null;
          wage_expectation?: number | null;
          wage_period?: Database["public"]["Enums"]["wage_period"];
          start_date?: string | null;
          availability?: Database["public"]["Enums"]["shift_type"][];
          intro_video_path?: string | null;
          intro_video_poster_path?: string | null;
          onboarding_step?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          headline?: string | null;
          bio?: string | null;
          postal_code?: string | null;
          settlement_id?: number | null;
          travel_km?: number | null;
          wage_expectation?: number | null;
          wage_period?: Database["public"]["Enums"]["wage_period"];
          start_date?: string | null;
          availability?: Database["public"]["Enums"]["shift_type"][];
          intro_video_path?: string | null;
          intro_video_poster_path?: string | null;
          onboarding_step?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "candidate_profiles_settlement_id_fkey"; columns: ["settlement_id"]; isOneToOne: false; referencedRelation: "settlements"; referencedColumns: ["id"] },
          { foreignKeyName: "candidate_profiles_user_id_fkey"; columns: ["user_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      candidate_skills: {
        Row: {
          candidate_id: string;
          competency_id: number;
          level: number;
          status: Database["public"]["Enums"]["skill_status"];
          verification_type: Database["public"]["Enums"]["verification_type"] | null;
          verified_at: string | null;
          language_level: string | null;
          updated_at: string;
        };
        Insert: {
          candidate_id: string;
          competency_id: number;
          level: number;
          status?: Database["public"]["Enums"]["skill_status"];
          verification_type?: Database["public"]["Enums"]["verification_type"] | null;
          verified_at?: string | null;
          language_level?: string | null;
          updated_at?: string;
        };
        Update: {
          candidate_id?: string;
          competency_id?: number;
          level?: number;
          status?: Database["public"]["Enums"]["skill_status"];
          verification_type?: Database["public"]["Enums"]["verification_type"] | null;
          verified_at?: string | null;
          language_level?: string | null;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "candidate_skills_candidate_id_fkey"; columns: ["candidate_id"]; isOneToOne: false; referencedRelation: "candidate_profiles"; referencedColumns: ["user_id"] },
          { foreignKeyName: "candidate_skills_competency_id_fkey"; columns: ["competency_id"]; isOneToOne: false; referencedRelation: "competencies"; referencedColumns: ["id"] },
        ];
      };
      candidate_swipe_answers: {
        Row: {
          candidate_id: string;
          card_id: number;
          direction: Database["public"]["Enums"]["swipe_dir"];
          answered_at: string;
        };
        Insert: {
          candidate_id: string;
          card_id: number;
          direction: Database["public"]["Enums"]["swipe_dir"];
          answered_at?: string;
        };
        Update: {
          candidate_id?: string;
          card_id?: number;
          direction?: Database["public"]["Enums"]["swipe_dir"];
          answered_at?: string;
        };
        Relationships: [
          { foreignKeyName: "candidate_swipe_answers_candidate_id_fkey"; columns: ["candidate_id"]; isOneToOne: false; referencedRelation: "candidate_profiles"; referencedColumns: ["user_id"] },
          { foreignKeyName: "candidate_swipe_answers_card_id_fkey"; columns: ["card_id"]; isOneToOne: false; referencedRelation: "swipe_cards"; referencedColumns: ["id"] },
        ];
      };
      candidate_target_roles: {
        Row: {
          candidate_id: string;
          template_id: number;
        };
        Insert: {
          candidate_id: string;
          template_id: number;
        };
        Update: {
          candidate_id?: string;
          template_id?: number;
        };
        Relationships: [
          { foreignKeyName: "candidate_target_roles_candidate_id_fkey"; columns: ["candidate_id"]; isOneToOne: false; referencedRelation: "candidate_profiles"; referencedColumns: ["user_id"] },
          { foreignKeyName: "candidate_target_roles_template_id_fkey"; columns: ["template_id"]; isOneToOne: false; referencedRelation: "job_role_templates"; referencedColumns: ["id"] },
        ];
      };
      companies: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          website: string | null;
          logo_path: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          website?: string | null;
          logo_path?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          website?: string | null;
          logo_path?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "companies_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      company_members: {
        Row: {
          company_id: string;
          user_id: string;
          member_role: Database["public"]["Enums"]["company_member_role"];
          created_at: string;
        };
        Insert: {
          company_id: string;
          user_id: string;
          member_role?: Database["public"]["Enums"]["company_member_role"];
          created_at?: string;
        };
        Update: {
          company_id?: string;
          user_id?: string;
          member_role?: Database["public"]["Enums"]["company_member_role"];
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "company_members_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
          { foreignKeyName: "company_members_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      competencies: {
        Row: {
          id: number;
          slug: string;
          name: string;
          description: string | null;
          category: string;
          has_language_level: boolean;
        };
        Insert: {
          id?: number;
          slug: string;
          name: string;
          description?: string | null;
          category?: string;
          has_language_level?: boolean;
        };
        Update: {
          id?: number;
          slug?: string;
          name?: string;
          description?: string | null;
          category?: string;
          has_language_level?: boolean;
        };
        Relationships: [
        ];
      };
      evaluation_items: {
        Row: {
          evaluation_id: string;
          competency_id: number;
          score: number;
        };
        Insert: {
          evaluation_id: string;
          competency_id: number;
          score: number;
        };
        Update: {
          evaluation_id?: string;
          competency_id?: number;
          score?: number;
        };
        Relationships: [
          { foreignKeyName: "evaluation_items_competency_id_fkey"; columns: ["competency_id"]; isOneToOne: false; referencedRelation: "competencies"; referencedColumns: ["id"] },
          { foreignKeyName: "evaluation_items_evaluation_id_fkey"; columns: ["evaluation_id"]; isOneToOne: false; referencedRelation: "evaluations"; referencedColumns: ["id"] },
        ];
      };
      evaluations: {
        Row: {
          id: string;
          trial_shift_id: string;
          evaluator_id: string | null;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trial_shift_id: string;
          evaluator_id?: string | null;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          trial_shift_id?: string;
          evaluator_id?: string | null;
          comment?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "evaluations_evaluator_id_fkey"; columns: ["evaluator_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "evaluations_trial_shift_id_fkey"; columns: ["trial_shift_id"]; isOneToOne: true; referencedRelation: "trial_shifts"; referencedColumns: ["id"] },
        ];
      };
      followups: {
        Row: {
          id: string;
          application_id: string;
          day_offset: number;
          due_at: string;
          token_hash: string;
          sent_at: string | null;
          answered_at: string | null;
          still_employed: boolean | null;
          reliable: number | null;
          independent: number | null;
          productive: number | null;
        };
        Insert: {
          id?: string;
          application_id: string;
          day_offset: number;
          due_at: string;
          token_hash: string;
          sent_at?: string | null;
          answered_at?: string | null;
          still_employed?: boolean | null;
          reliable?: number | null;
          independent?: number | null;
          productive?: number | null;
        };
        Update: {
          id?: string;
          application_id?: string;
          day_offset?: number;
          due_at?: string;
          token_hash?: string;
          sent_at?: string | null;
          answered_at?: string | null;
          still_employed?: boolean | null;
          reliable?: number | null;
          independent?: number | null;
          productive?: number | null;
        };
        Relationships: [
          { foreignKeyName: "followups_application_id_fkey"; columns: ["application_id"]; isOneToOne: false; referencedRelation: "applications"; referencedColumns: ["id"] },
        ];
      };
      job_requirements: {
        Row: {
          job_id: string;
          competency_id: number;
          kind: Database["public"]["Enums"]["requirement_kind"];
          min_level: number;
        };
        Insert: {
          job_id: string;
          competency_id: number;
          kind: Database["public"]["Enums"]["requirement_kind"];
          min_level?: number;
        };
        Update: {
          job_id?: string;
          competency_id?: number;
          kind?: Database["public"]["Enums"]["requirement_kind"];
          min_level?: number;
        };
        Relationships: [
          { foreignKeyName: "job_requirements_competency_id_fkey"; columns: ["competency_id"]; isOneToOne: false; referencedRelation: "competencies"; referencedColumns: ["id"] },
          { foreignKeyName: "job_requirements_job_id_fkey"; columns: ["job_id"]; isOneToOne: false; referencedRelation: "jobs"; referencedColumns: ["id"] },
        ];
      };
      job_role_templates: {
        Row: {
          id: number;
          slug: string;
          name: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: number;
          slug: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          id?: number;
          slug?: string;
          name?: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [
        ];
      };
      job_swipes: {
        Row: {
          candidate_id: string;
          job_id: string;
          direction: Database["public"]["Enums"]["swipe_dir"];
          created_at: string;
        };
        Insert: {
          candidate_id: string;
          job_id: string;
          direction: Database["public"]["Enums"]["swipe_dir"];
          created_at?: string;
        };
        Update: {
          candidate_id?: string;
          job_id?: string;
          direction?: Database["public"]["Enums"]["swipe_dir"];
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "job_swipes_candidate_id_fkey"; columns: ["candidate_id"]; isOneToOne: false; referencedRelation: "candidate_profiles"; referencedColumns: ["user_id"] },
          { foreignKeyName: "job_swipes_job_id_fkey"; columns: ["job_id"]; isOneToOne: false; referencedRelation: "jobs"; referencedColumns: ["id"] },
        ];
      };
      jobs: {
        Row: {
          id: string;
          company_id: string;
          venue_id: string;
          template_id: number;
          slug: string;
          title: string;
          description: string | null;
          wage_min: number | null;
          wage_max: number | null;
          wage_period: Database["public"]["Enums"]["wage_period"];
          shifts: Database["public"]["Enums"]["shift_type"][];
          schedule_note: string | null;
          start_date: string | null;
          is_seasonal: boolean;
          status: Database["public"]["Enums"]["job_status"];
          published_at: string | null;
          expires_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          venue_id: string;
          template_id: number;
          slug: string;
          title: string;
          description?: string | null;
          wage_min?: number | null;
          wage_max?: number | null;
          wage_period?: Database["public"]["Enums"]["wage_period"];
          shifts?: Database["public"]["Enums"]["shift_type"][];
          schedule_note?: string | null;
          start_date?: string | null;
          is_seasonal?: boolean;
          status?: Database["public"]["Enums"]["job_status"];
          published_at?: string | null;
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          venue_id?: string;
          template_id?: number;
          slug?: string;
          title?: string;
          description?: string | null;
          wage_min?: number | null;
          wage_max?: number | null;
          wage_period?: Database["public"]["Enums"]["wage_period"];
          shifts?: Database["public"]["Enums"]["shift_type"][];
          schedule_note?: string | null;
          start_date?: string | null;
          is_seasonal?: boolean;
          status?: Database["public"]["Enums"]["job_status"];
          published_at?: string | null;
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "jobs_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
          { foreignKeyName: "jobs_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "jobs_template_id_fkey"; columns: ["template_id"]; isOneToOne: false; referencedRelation: "job_role_templates"; referencedColumns: ["id"] },
          { foreignKeyName: "jobs_venue_id_fkey"; columns: ["venue_id"]; isOneToOne: false; referencedRelation: "venues"; referencedColumns: ["id"] },
        ];
      };
      media_item_competencies: {
        Row: {
          media_item_id: string;
          competency_id: number;
        };
        Insert: {
          media_item_id: string;
          competency_id: number;
        };
        Update: {
          media_item_id?: string;
          competency_id?: number;
        };
        Relationships: [
          { foreignKeyName: "media_item_competencies_competency_id_fkey"; columns: ["competency_id"]; isOneToOne: false; referencedRelation: "competencies"; referencedColumns: ["id"] },
          { foreignKeyName: "media_item_competencies_media_item_id_fkey"; columns: ["media_item_id"]; isOneToOne: false; referencedRelation: "media_items"; referencedColumns: ["id"] },
        ];
      };
      media_items: {
        Row: {
          id: string;
          album_id: string;
          candidate_id: string;
          kind: Database["public"]["Enums"]["media_kind"];
          file_path: string;
          thumb_path: string | null;
          description: string | null;
          duration_s: number | null;
          size_bytes: number | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          album_id: string;
          candidate_id: string;
          kind: Database["public"]["Enums"]["media_kind"];
          file_path: string;
          thumb_path?: string | null;
          description?: string | null;
          duration_s?: number | null;
          size_bytes?: number | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          album_id?: string;
          candidate_id?: string;
          kind?: Database["public"]["Enums"]["media_kind"];
          file_path?: string;
          thumb_path?: string | null;
          description?: string | null;
          duration_s?: number | null;
          size_bytes?: number | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "media_items_album_id_fkey"; columns: ["album_id"]; isOneToOne: false; referencedRelation: "albums"; referencedColumns: ["id"] },
          { foreignKeyName: "media_items_candidate_id_fkey"; columns: ["candidate_id"]; isOneToOne: false; referencedRelation: "candidate_profiles"; referencedColumns: ["user_id"] },
        ];
      };
      messages: {
        Row: {
          id: string;
          application_id: string;
          sender_id: string;
          body: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          application_id: string;
          sender_id: string;
          body: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          application_id?: string;
          sender_id?: string;
          body?: string;
          created_at?: string;
          read_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: "messages_application_id_fkey"; columns: ["application_id"]; isOneToOne: false; referencedRelation: "applications"; referencedColumns: ["id"] },
          { foreignKeyName: "messages_sender_id_fkey"; columns: ["sender_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      profiles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          full_name: string;
          email: string;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
          full_name?: string;
          email?: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          full_name?: string;
          email?: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
        ];
      };
      reference_competencies: {
        Row: {
          reference_id: string;
          competency_id: number;
        };
        Insert: {
          reference_id: string;
          competency_id: number;
        };
        Update: {
          reference_id?: string;
          competency_id?: number;
        };
        Relationships: [
          { foreignKeyName: "reference_competencies_competency_id_fkey"; columns: ["competency_id"]; isOneToOne: false; referencedRelation: "competencies"; referencedColumns: ["id"] },
          { foreignKeyName: "reference_competencies_reference_id_fkey"; columns: ["reference_id"]; isOneToOne: false; referencedRelation: "references"; referencedColumns: ["id"] },
        ];
      };
      reference_requests: {
        Row: {
          id: string;
          candidate_id: string;
          company_name: string;
          referee_name: string;
          referee_email: string;
          position: string;
          period_from: string;
          period_to: string | null;
          token_hash: string;
          status: Database["public"]["Enums"]["reference_request_status"];
          sent_at: string | null;
          reminder_at: string | null;
          reminded_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          company_name: string;
          referee_name: string;
          referee_email: string;
          position: string;
          period_from: string;
          period_to?: string | null;
          token_hash: string;
          status?: Database["public"]["Enums"]["reference_request_status"];
          sent_at?: string | null;
          reminder_at?: string | null;
          reminded_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          company_name?: string;
          referee_name?: string;
          referee_email?: string;
          position?: string;
          period_from?: string;
          period_to?: string | null;
          token_hash?: string;
          status?: Database["public"]["Enums"]["reference_request_status"];
          sent_at?: string | null;
          reminder_at?: string | null;
          reminded_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "reference_requests_candidate_id_fkey"; columns: ["candidate_id"]; isOneToOne: false; referencedRelation: "candidate_profiles"; referencedColumns: ["user_id"] },
        ];
      };
      references: {
        Row: {
          id: string;
          request_id: string;
          employment_confirmed: boolean;
          recommendation: string | null;
          would_rehire: boolean | null;
          submitted_at: string;
          approved_at: string | null;
          hidden: boolean;
        };
        Insert: {
          id?: string;
          request_id: string;
          employment_confirmed: boolean;
          recommendation?: string | null;
          would_rehire?: boolean | null;
          submitted_at?: string;
          approved_at?: string | null;
          hidden?: boolean;
        };
        Update: {
          id?: string;
          request_id?: string;
          employment_confirmed?: boolean;
          recommendation?: string | null;
          would_rehire?: boolean | null;
          submitted_at?: string;
          approved_at?: string | null;
          hidden?: boolean;
        };
        Relationships: [
          { foreignKeyName: "references_request_id_fkey"; columns: ["request_id"]; isOneToOne: true; referencedRelation: "reference_requests"; referencedColumns: ["id"] },
        ];
      };
      settlements: {
        Row: {
          id: number;
          postal_code: string;
          name: string;
          county: string | null;
          lat: number;
          lng: number;
        };
        Insert: {
          id?: number;
          postal_code: string;
          name: string;
          county?: string | null;
          lat: number;
          lng: number;
        };
        Update: {
          id?: number;
          postal_code?: string;
          name?: string;
          county?: string | null;
          lat?: number;
          lng?: number;
        };
        Relationships: [
        ];
      };
      swipe_cards: {
        Row: {
          id: number;
          template_id: number | null;
          kind: Database["public"]["Enums"]["card_kind"];
          statement: string;
          competency_id: number | null;
          dimension_id: number | null;
          polarity: number;
          is_active: boolean;
          sort_order: number;
        };
        Insert: {
          id?: number;
          template_id?: number | null;
          kind: Database["public"]["Enums"]["card_kind"];
          statement: string;
          competency_id?: number | null;
          dimension_id?: number | null;
          polarity?: number;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: {
          id?: number;
          template_id?: number | null;
          kind?: Database["public"]["Enums"]["card_kind"];
          statement?: string;
          competency_id?: number | null;
          dimension_id?: number | null;
          polarity?: number;
          is_active?: boolean;
          sort_order?: number;
        };
        Relationships: [
          { foreignKeyName: "swipe_cards_competency_id_fkey"; columns: ["competency_id"]; isOneToOne: false; referencedRelation: "competencies"; referencedColumns: ["id"] },
          { foreignKeyName: "swipe_cards_dimension_id_fkey"; columns: ["dimension_id"]; isOneToOne: false; referencedRelation: "work_style_dimensions"; referencedColumns: ["id"] },
          { foreignKeyName: "swipe_cards_template_id_fkey"; columns: ["template_id"]; isOneToOne: false; referencedRelation: "job_role_templates"; referencedColumns: ["id"] },
        ];
      };
      template_competencies: {
        Row: {
          template_id: number;
          competency_id: number;
          default_requirement: Database["public"]["Enums"]["requirement_kind"];
          sort_order: number;
        };
        Insert: {
          template_id: number;
          competency_id: number;
          default_requirement?: Database["public"]["Enums"]["requirement_kind"];
          sort_order?: number;
        };
        Update: {
          template_id?: number;
          competency_id?: number;
          default_requirement?: Database["public"]["Enums"]["requirement_kind"];
          sort_order?: number;
        };
        Relationships: [
          { foreignKeyName: "template_competencies_competency_id_fkey"; columns: ["competency_id"]; isOneToOne: false; referencedRelation: "competencies"; referencedColumns: ["id"] },
          { foreignKeyName: "template_competencies_template_id_fkey"; columns: ["template_id"]; isOneToOne: false; referencedRelation: "job_role_templates"; referencedColumns: ["id"] },
        ];
      };
      trial_shifts: {
        Row: {
          id: string;
          application_id: string;
          starts_at: string;
          duration_minutes: number;
          is_paid: boolean;
          note: string | null;
          status: Database["public"]["Enums"]["trial_status"];
          proposed_by: string | null;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          starts_at: string;
          duration_minutes: number;
          is_paid?: boolean;
          note?: string | null;
          status?: Database["public"]["Enums"]["trial_status"];
          proposed_by?: string | null;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          starts_at?: string;
          duration_minutes?: number;
          is_paid?: boolean;
          note?: string | null;
          status?: Database["public"]["Enums"]["trial_status"];
          proposed_by?: string | null;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "trial_shifts_application_id_fkey"; columns: ["application_id"]; isOneToOne: false; referencedRelation: "applications"; referencedColumns: ["id"] },
          { foreignKeyName: "trial_shifts_proposed_by_fkey"; columns: ["proposed_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      venue_photos: {
        Row: {
          id: string;
          venue_id: string;
          path: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          path: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          venue_id?: string;
          path?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "venue_photos_venue_id_fkey"; columns: ["venue_id"]; isOneToOne: false; referencedRelation: "venues"; referencedColumns: ["id"] },
        ];
      };
      venues: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          address: string | null;
          postal_code: string;
          settlement_id: number;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          address?: string | null;
          postal_code: string;
          settlement_id: number;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          address?: string | null;
          postal_code?: string;
          settlement_id?: number;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "venues_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
          { foreignKeyName: "venues_settlement_id_fkey"; columns: ["settlement_id"]; isOneToOne: false; referencedRelation: "settlements"; referencedColumns: ["id"] },
        ];
      };
      work_style_dimensions: {
        Row: {
          id: number;
          slug: string;
          name: string;
          low_label: string;
          high_label: string;
          sort_order: number;
        };
        Insert: {
          id?: number;
          slug: string;
          name: string;
          low_label: string;
          high_label: string;
          sort_order?: number;
        };
        Update: {
          id?: number;
          slug?: string;
          name?: string;
          low_label?: string;
          high_label?: string;
          sort_order?: number;
        };
        Relationships: [
        ];
      };
      work_style_profiles: {
        Row: {
          candidate_id: string;
          dimension_id: number;
          score: number;
          updated_at: string;
        };
        Insert: {
          candidate_id: string;
          dimension_id: number;
          score: number;
          updated_at?: string;
        };
        Update: {
          candidate_id?: string;
          dimension_id?: number;
          score?: number;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "work_style_profiles_candidate_id_fkey"; columns: ["candidate_id"]; isOneToOne: false; referencedRelation: "candidate_profiles"; referencedColumns: ["user_id"] },
          { foreignKeyName: "work_style_profiles_dimension_id_fkey"; columns: ["dimension_id"]; isOneToOne: false; referencedRelation: "work_style_dimensions"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      app_role: { Args: Record<PropertyKey, never>; Returns: Database["public"]["Enums"]["user_role"] };
      company_has_public_job: { Args: { p_company_id: string }; Returns: boolean };
      create_company: { Args: { p_name: string; p_description?: string; p_website?: string }; Returns: string };
      distance_km: { Args: { lat1: number; lng1: number; lat2: number; lng2: number }; Returns: number };
      employer_can_view_candidate: { Args: { p_candidate_id: string }; Returns: boolean };
      expire_jobs: { Args: Record<PropertyKey, never>; Returns: number };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_application_employer: { Args: { p_application_id: string }; Returns: boolean };
      is_application_participant: { Args: { p_application_id: string }; Returns: boolean };
      is_company_member: { Args: { p_company_id: string }; Returns: boolean };
      is_company_owner: { Args: { p_company_id: string }; Returns: boolean };
      is_job_public: { Args: { p_job_id: string }; Returns: boolean };
      search_public_jobs: { Args: { p_template_id?: number; p_lat?: number; p_lng?: number; p_max_km?: number; p_wage_period?: Database["public"]["Enums"]["wage_period"]; p_wage_min?: number; p_seasonal?: boolean; p_limit?: number; p_offset?: number }; Returns: { job_id: string | null; distance_km: number | null }[] };
      try_uuid: { Args: { p: string }; Returns: string };
      venue_has_public_job: { Args: { p_venue_id: string }; Returns: boolean };
    };
    Enums: {
      application_status: "new" | "viewed" | "trial" | "offer" | "hired" | "rejected" | "auto_closed";
      card_kind: "competency" | "work_style";
      company_member_role: "owner" | "manager";
      job_status: "draft" | "active" | "expired" | "closed";
      media_kind: "image" | "video";
      reference_request_status: "pending" | "reminded" | "completed" | "expired";
      requirement_kind: "required" | "preferred";
      shift_type: "reggel" | "delutan" | "este" | "ejszaka" | "hetvege";
      skill_status: "claimed" | "verified";
      swipe_dir: "left" | "right" | "up";
      trial_status: "proposed" | "accepted" | "declined" | "completed" | "cancelled";
      user_role: "candidate" | "employer" | "admin";
      verification_type: "reference" | "trial" | "admin";
      wage_period: "hourly" | "monthly";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
