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
      academic_terms: {
        Row: {
          academic_year_id: string
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          name: string
          ordinal: number
          start_date: string
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          ordinal?: number
          start_date: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          ordinal?: number
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_terms_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_years: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          name: string
          school_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          school_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          attendance_date: string
          class_id: string
          created_at: string
          id: string
          note: string | null
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          attendance_date: string
          class_id: string
          created_at?: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          class_id?: string
          created_at?: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          foundation_id: string | null
          id: number
          ip_address: unknown
          metadata: Json | null
          school_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          foundation_id?: string | null
          id?: number
          ip_address?: unknown
          metadata?: Json | null
          school_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          foundation_id?: string | null
          id?: number
          ip_address?: unknown
          metadata?: Json | null
          school_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_foundation_id_fkey"
            columns: ["foundation_id"]
            isOneToOne: false
            referencedRelation: "foundations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_accounts: {
        Row: {
          account_number: string | null
          bank_name: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          opening_balance: number
          school_id: string
          type: Database["public"]["Enums"]["cash_account_type"]
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          opening_balance?: number
          school_id: string
          type?: Database["public"]["Enums"]["cash_account_type"]
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          opening_balance?: number
          school_id?: string
          type?: Database["public"]["Enums"]["cash_account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_accounts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          amount: number
          cash_account_id: string
          category: string | null
          created_at: string
          description: string
          id: string
          journal_entry_id: string | null
          kind: Database["public"]["Enums"]["cash_tx_kind"]
          occurred_at: string
          payment_id: string | null
          school_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          cash_account_id: string
          category?: string | null
          created_at?: string
          description: string
          id?: string
          journal_entry_id?: string | null
          kind: Database["public"]["Enums"]["cash_tx_kind"]
          occurred_at?: string
          payment_id?: string | null
          school_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cash_account_id?: string
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          journal_entry_id?: string | null
          kind?: Database["public"]["Enums"]["cash_tx_kind"]
          occurred_at?: string
          payment_id?: string | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      class_subjects: {
        Row: {
          class_id: string
          created_at: string
          id: string
          subject_id: string
          teacher_id: string | null
          updated_at: string
          weekly_hours: number
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          subject_id: string
          teacher_id?: string | null
          updated_at?: string
          weekly_hours?: number
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          subject_id?: string
          teacher_id?: string | null
          updated_at?: string
          weekly_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year_id: string
          capacity: number
          created_at: string
          grade_level: number
          homeroom_teacher_id: string | null
          id: string
          name: string
          room: string | null
          school_id: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          capacity?: number
          created_at?: string
          grade_level: number
          homeroom_teacher_id?: string | null
          id?: string
          name: string
          room?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          capacity?: number
          created_at?: string
          grade_level?: number
          homeroom_teacher_id?: string | null
          id?: string
          name?: string
          room?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_homeroom_teacher_id_fkey"
            columns: ["homeroom_teacher_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_categories: {
        Row: {
          created_at: string
          default_amount: number
          description: string | null
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_amount?: number
          description?: string | null
          id?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_amount?: number
          description?: string | null
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_categories_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_plan_items: {
        Row: {
          amount: number
          created_at: string
          due_day: number
          fee_category_id: string
          fee_plan_id: string
          id: string
          recurrence: Database["public"]["Enums"]["fee_recurrence"]
        }
        Insert: {
          amount: number
          created_at?: string
          due_day?: number
          fee_category_id: string
          fee_plan_id: string
          id?: string
          recurrence?: Database["public"]["Enums"]["fee_recurrence"]
        }
        Update: {
          amount?: number
          created_at?: string
          due_day?: number
          fee_category_id?: string
          fee_plan_id?: string
          id?: string
          recurrence?: Database["public"]["Enums"]["fee_recurrence"]
        }
        Relationships: [
          {
            foreignKeyName: "fee_plan_items_fee_category_id_fkey"
            columns: ["fee_category_id"]
            isOneToOne: false
            referencedRelation: "fee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_plan_items_fee_plan_id_fkey"
            columns: ["fee_plan_id"]
            isOneToOne: false
            referencedRelation: "fee_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_plans: {
        Row: {
          academic_year_id: string
          created_at: string
          grade_level: number | null
          id: string
          name: string
          notes: string | null
          school_id: string
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          grade_level?: number | null
          id?: string
          name: string
          notes?: string | null
          school_id: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          grade_level?: number | null
          id?: string
          name?: string
          notes?: string | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_plans_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_plans_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      foundations: {
        Row: {
          address: string | null
          city: string | null
          code: string
          created_at: string
          email: string | null
          id: string
          legal_name: string | null
          logo_url: string | null
          name: string
          npwp: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          created_at?: string
          email?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          name: string
          npwp?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          created_at?: string
          email?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          npwp?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      grades: {
        Row: {
          assessment_type: Database["public"]["Enums"]["assessment_type"]
          class_subject_id: string
          created_at: string
          id: string
          note: string | null
          recorded_by: string | null
          score: number
          student_id: string
          term_id: string
          title: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          assessment_type?: Database["public"]["Enums"]["assessment_type"]
          class_subject_id: string
          created_at?: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          score?: number
          student_id: string
          term_id: string
          title?: string | null
          updated_at?: string
          weight?: number
        }
        Update: {
          assessment_type?: Database["public"]["Enums"]["assessment_type"]
          class_subject_id?: string
          created_at?: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          score?: number
          student_id?: string
          term_id?: string
          title?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "grades_class_subject_id_fkey"
            columns: ["class_subject_id"]
            isOneToOne: false
            referencedRelation: "class_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          fee_category_id: string | null
          id: string
          invoice_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          fee_category_id?: string | null
          id?: string
          invoice_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          fee_category_id?: string | null
          id?: string
          invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_fee_category_id_fkey"
            columns: ["fee_category_id"]
            isOneToOne: false
            referencedRelation: "fee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          academic_year_id: string | null
          created_at: string
          due_date: string
          id: string
          invoice_no: string
          issue_date: string
          notes: string | null
          paid_amount: number
          period_label: string | null
          school_id: string
          status: Database["public"]["Enums"]["invoice_status"]
          student_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string
          due_date: string
          id?: string
          invoice_no: string
          issue_date?: string
          notes?: string | null
          paid_amount?: number
          period_label?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["invoice_status"]
          student_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          invoice_no?: string
          issue_date?: string
          notes?: string | null
          paid_amount?: number
          period_label?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          student_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          description: string
          entry_date: string
          entry_no: string
          id: string
          school_id: string
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          entry_date?: string
          entry_no: string
          id?: string
          school_id: string
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          entry_date?: string
          entry_no?: string
          id?: string
          school_id?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_code: string
          account_name: string
          created_at: string
          credit: number
          debit: number
          id: string
          journal_entry_id: string
          memo: string | null
        }
        Insert: {
          account_code: string
          account_name: string
          created_at?: string
          credit?: number
          debit?: number
          id?: string
          journal_entry_id: string
          memo?: string | null
        }
        Update: {
          account_code?: string
          account_name?: string
          created_at?: string
          credit?: number
          debit?: number
          id?: string
          journal_entry_id?: string
          memo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          cash_account_id: string
          created_at: string
          id: string
          invoice_id: string | null
          journal_entry_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          paid_at: string
          payment_no: string
          reference: string | null
          school_id: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          cash_account_id: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          payment_no: string
          reference?: string | null
          school_id: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          cash_account_id?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          payment_no?: string
          reference?: string | null
          school_id?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          foundation_id: string | null
          full_name: string | null
          id: string
          last_login_at: string | null
          locale: string
          nip: string | null
          phone: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          foundation_id?: string | null
          full_name?: string | null
          id: string
          last_login_at?: string | null
          locale?: string
          nip?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          foundation_id?: string | null
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          locale?: string
          nip?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_foundation_id_fkey"
            columns: ["foundation_id"]
            isOneToOne: false
            referencedRelation: "foundations"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          class_subject_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          room: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          class_subject_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          room?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          class_subject_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          room?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_class_subject_id_fkey"
            columns: ["class_subject_id"]
            isOneToOne: false
            referencedRelation: "class_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          city: string | null
          code: string
          created_at: string
          email: string | null
          foundation_id: string
          id: string
          level: Database["public"]["Enums"]["school_level"]
          logo_url: string | null
          name: string
          npsn: string | null
          phone: string | null
          postal_code: string | null
          principal_name: string | null
          province: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          created_at?: string
          email?: string | null
          foundation_id: string
          id?: string
          level?: Database["public"]["Enums"]["school_level"]
          logo_url?: string | null
          name: string
          npsn?: string | null
          phone?: string | null
          postal_code?: string | null
          principal_name?: string | null
          province?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          created_at?: string
          email?: string | null
          foundation_id?: string
          id?: string
          level?: Database["public"]["Enums"]["school_level"]
          logo_url?: string | null
          name?: string
          npsn?: string | null
          phone?: string | null
          postal_code?: string | null
          principal_name?: string | null
          province?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schools_foundation_id_fkey"
            columns: ["foundation_id"]
            isOneToOne: false
            referencedRelation: "foundations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          address: string | null
          birth_date: string | null
          birth_place: string | null
          created_at: string
          email: string | null
          employment_type: Database["public"]["Enums"]["employment_type"]
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          is_teacher: boolean
          joined_at: string | null
          nip: string | null
          phone: string | null
          position: string | null
          profile_id: string | null
          school_id: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string
          email?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          full_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          is_teacher?: boolean
          joined_at?: string | null
          nip?: string | null
          phone?: string | null
          position?: string | null
          profile_id?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string
          email?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          is_teacher?: boolean
          joined_at?: string | null
          nip?: string | null
          phone?: string | null
          position?: string | null
          profile_id?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_enrollments: {
        Row: {
          academic_year_id: string
          class_id: string
          created_at: string
          enrolled_at: string
          exited_at: string | null
          id: string
          roll_number: number | null
          status: Database["public"]["Enums"]["student_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          class_id: string
          created_at?: string
          enrolled_at?: string
          exited_at?: string | null
          id?: string
          roll_number?: number | null
          status?: Database["public"]["Enums"]["student_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          class_id?: string
          created_at?: string
          enrolled_at?: string
          exited_at?: string | null
          id?: string
          roll_number?: number | null
          status?: Database["public"]["Enums"]["student_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_enrollments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_parents: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_primary: boolean
          nik: string | null
          occupation: string | null
          phone: string | null
          profile_id: string | null
          relation: Database["public"]["Enums"]["parent_relation"]
          student_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean
          nik?: string | null
          occupation?: string | null
          phone?: string | null
          profile_id?: string | null
          relation?: Database["public"]["Enums"]["parent_relation"]
          student_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean
          nik?: string | null
          occupation?: string | null
          phone?: string | null
          profile_id?: string | null
          relation?: Database["public"]["Enums"]["parent_relation"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_parents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          birth_date: string | null
          birth_place: string | null
          city: string | null
          created_at: string
          email: string | null
          enrollment_date: string | null
          foundation_id: string
          full_name: string
          gender: Database["public"]["Enums"]["gender"]
          id: string
          nick_name: string | null
          nis: string | null
          nisn: string | null
          notes: string | null
          phone: string | null
          photo_url: string | null
          postal_code: string | null
          province: string | null
          religion: Database["public"]["Enums"]["religion"] | null
          school_id: string
          status: Database["public"]["Enums"]["student_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          enrollment_date?: string | null
          foundation_id: string
          full_name: string
          gender?: Database["public"]["Enums"]["gender"]
          id?: string
          nick_name?: string | null
          nis?: string | null
          nisn?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          postal_code?: string | null
          province?: string | null
          religion?: Database["public"]["Enums"]["religion"] | null
          school_id: string
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          enrollment_date?: string | null
          foundation_id?: string
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"]
          id?: string
          nick_name?: string | null
          nis?: string | null
          nisn?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          postal_code?: string | null
          province?: string | null
          religion?: Database["public"]["Enums"]["religion"] | null
          school_id?: string
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_foundation_id_fkey"
            columns: ["foundation_id"]
            isOneToOne: false
            referencedRelation: "foundations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          kkm: number
          name: string
          school_id: string
          status: Database["public"]["Enums"]["entity_status"]
          subject_group: Database["public"]["Enums"]["subject_group"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          kkm?: number
          name: string
          school_id: string
          status?: Database["public"]["Enums"]["entity_status"]
          subject_group?: Database["public"]["Enums"]["subject_group"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          kkm?: number
          name?: string
          school_id?: string
          status?: Database["public"]["Enums"]["entity_status"]
          subject_group?: Database["public"]["Enums"]["subject_group"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          foundation_id: string | null
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          foundation_id?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          foundation_id?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_foundation_id_fkey"
            columns: ["foundation_id"]
            isOneToOne: false
            referencedRelation: "foundations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_school_access: {
        Row: {
          granted_at: string
          school_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          school_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_school_access_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_foundation_ids: { Args: never; Returns: string[] }
      current_user_school_ids: { Args: never; Returns: string[] }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_in_school: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _school_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      user_can_access_school: {
        Args: { _school_id: string; _uid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "SUPERADMIN"
        | "FOUNDATION_ADMIN"
        | "PRINCIPAL"
        | "FINANCE"
        | "ACCOUNTING"
        | "ADMIN_STAFF"
        | "HR"
        | "TEACHER"
        | "HOMEROOM_TEACHER"
        | "LIBRARIAN"
        | "STUDENT"
        | "PARENT"
        | "AUDITOR"
      assessment_type:
        | "TUGAS"
        | "ULANGAN_HARIAN"
        | "UTS"
        | "UAS"
        | "PRAKTIK"
        | "PROYEK"
        | "SIKAP"
      attendance_status: "HADIR" | "SAKIT" | "IZIN" | "ALPA" | "TERLAMBAT"
      cash_account_type: "CASH" | "BANK"
      cash_tx_kind: "IN" | "OUT"
      employment_type:
        | "PNS"
        | "PPPK"
        | "TETAP_YAYASAN"
        | "HONORER"
        | "KONTRAK"
        | "MAGANG"
      entity_status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
      fee_recurrence: "ONCE" | "MONTHLY"
      gender: "L" | "P"
      invoice_status: "UNPAID" | "PARTIAL" | "PAID" | "CANCELLED"
      parent_relation: "AYAH" | "IBU" | "WALI"
      payment_method: "TUNAI" | "TRANSFER" | "QRIS" | "VA" | "LAINNYA"
      religion:
        | "ISLAM"
        | "KRISTEN"
        | "KATOLIK"
        | "HINDU"
        | "BUDDHA"
        | "KONGHUCU"
        | "LAINNYA"
      school_level: "TK" | "SD" | "SMP" | "SMA" | "SMK" | "PESANTREN" | "OTHER"
      student_status: "AKTIF" | "LULUS" | "PINDAH" | "KELUAR" | "CUTI"
      subject_group:
        | "UMUM"
        | "AGAMA"
        | "BAHASA"
        | "MATEMATIKA"
        | "IPA"
        | "IPS"
        | "SENI"
        | "OLAHRAGA"
        | "KEJURUAN"
        | "MUATAN_LOKAL"
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
        "SUPERADMIN",
        "FOUNDATION_ADMIN",
        "PRINCIPAL",
        "FINANCE",
        "ACCOUNTING",
        "ADMIN_STAFF",
        "HR",
        "TEACHER",
        "HOMEROOM_TEACHER",
        "LIBRARIAN",
        "STUDENT",
        "PARENT",
        "AUDITOR",
      ],
      assessment_type: [
        "TUGAS",
        "ULANGAN_HARIAN",
        "UTS",
        "UAS",
        "PRAKTIK",
        "PROYEK",
        "SIKAP",
      ],
      attendance_status: ["HADIR", "SAKIT", "IZIN", "ALPA", "TERLAMBAT"],
      cash_account_type: ["CASH", "BANK"],
      cash_tx_kind: ["IN", "OUT"],
      employment_type: [
        "PNS",
        "PPPK",
        "TETAP_YAYASAN",
        "HONORER",
        "KONTRAK",
        "MAGANG",
      ],
      entity_status: ["ACTIVE", "INACTIVE", "ARCHIVED"],
      fee_recurrence: ["ONCE", "MONTHLY"],
      gender: ["L", "P"],
      invoice_status: ["UNPAID", "PARTIAL", "PAID", "CANCELLED"],
      parent_relation: ["AYAH", "IBU", "WALI"],
      payment_method: ["TUNAI", "TRANSFER", "QRIS", "VA", "LAINNYA"],
      religion: [
        "ISLAM",
        "KRISTEN",
        "KATOLIK",
        "HINDU",
        "BUDDHA",
        "KONGHUCU",
        "LAINNYA",
      ],
      school_level: ["TK", "SD", "SMP", "SMA", "SMK", "PESANTREN", "OTHER"],
      student_status: ["AKTIF", "LULUS", "PINDAH", "KELUAR", "CUTI"],
      subject_group: [
        "UMUM",
        "AGAMA",
        "BAHASA",
        "MATEMATIKA",
        "IPA",
        "IPS",
        "SENI",
        "OLAHRAGA",
        "KEJURUAN",
        "MUATAN_LOKAL",
      ],
    },
  },
} as const
