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
      audit_log: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_entries: {
        Row: {
          account: string
          commission_installment_id: string | null
          company_id: string | null
          created_at: string
          date: string
          description: string
          expense_id: string | null
          id: string
          receipt_url: string | null
          reconciled: boolean
          type: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          account?: string
          commission_installment_id?: string | null
          company_id?: string | null
          created_at?: string
          date: string
          description: string
          expense_id?: string | null
          id?: string
          receipt_url?: string | null
          reconciled?: boolean
          type?: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          account?: string
          commission_installment_id?: string | null
          company_id?: string | null
          created_at?: string
          date?: string
          description?: string
          expense_id?: string | null
          id?: string
          receipt_url?: string | null
          reconciled?: boolean
          type?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "bank_entries_commission_installment_id_fkey"
            columns: ["commission_installment_id"]
            isOneToOne: false
            referencedRelation: "commission_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_entries_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      client_interactions: {
        Row: {
          client_id: string
          company_id: string | null
          created_at: string
          date: string
          description: string
          id: string
          notes: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          company_id?: string | null
          created_at?: string
          date?: string
          description: string
          id?: string
          notes?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          company_id?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          notes?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          categoria: string | null
          cidade: string | null
          cnpj_cpf: string | null
          company_id: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome_fantasia: string | null
          observacoes: string | null
          razao_social: string
          status_funil: string | null
          telefone: string | null
          updated_at: string
          vendedor_responsavel: string | null
        }
        Insert: {
          categoria?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social: string
          status_funil?: string | null
          telefone?: string | null
          updated_at?: string
          vendedor_responsavel?: string | null
        }
        Update: {
          categoria?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string
          status_funil?: string | null
          telefone?: string | null
          updated_at?: string
          vendedor_responsavel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_installments: {
        Row: {
          commission_id: string
          created_at: string
          due_date: string
          id: string
          installment_number: number
          lot_id: string | null
          notes: string | null
          paid_date: string | null
          paid_observation: string | null
          paid_value: number | null
          receipt_url: string | null
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          commission_id: string
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          lot_id?: string | null
          notes?: string | null
          paid_date?: string | null
          paid_observation?: string | null
          paid_value?: number | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
          value: number
        }
        Update: {
          commission_id?: string
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          lot_id?: string | null
          notes?: string | null
          paid_date?: string | null
          paid_observation?: string | null
          paid_value?: number | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_installments_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_installments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "order_billing_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          billing_date: string | null
          client: string
          commission_percent: number
          commission_total: number
          company_id: string | null
          created_at: string
          crm_deal_id: string | null
          external_order_id: string | null
          factory: string
          id: string
          observations: string | null
          order_number: string
          sale_date: string
          sale_value: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_date?: string | null
          client: string
          commission_percent?: number
          commission_total: number
          company_id?: string | null
          created_at?: string
          crm_deal_id?: string | null
          external_order_id?: string | null
          factory: string
          id?: string
          observations?: string | null
          order_number: string
          sale_date: string
          sale_value: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_date?: string | null
          client?: string
          commission_percent?: number
          commission_total?: number
          company_id?: string | null
          created_at?: string
          crm_deal_id?: string | null
          external_order_id?: string | null
          factory?: string
          id?: string
          observations?: string | null
          order_number?: string
          sale_date?: string
          sale_value?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_rules: {
        Row: {
          account: string
          active: boolean
          category: string
          company_id: string | null
          created_at: string
          end_date: string | null
          id: string
          name: string
          recurrence_days: Json
          recurrence_type: string
          start_date: string
          type: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          account?: string
          active?: boolean
          category: string
          company_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          recurrence_days?: Json
          recurrence_type?: string
          start_date: string
          type?: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          account?: string
          active?: boolean
          category?: string
          company_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          recurrence_days?: Json
          recurrence_type?: string
          start_date?: string
          type?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "expense_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account: string
          category: string
          company_id: string | null
          created_at: string
          description: string
          due_date: string
          generated_from_rule_id: string | null
          id: string
          parent_expense_id: string | null
          payment_date: string | null
          receipt_url: string | null
          recurrence: string | null
          recurrence_end_date: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          account?: string
          category: string
          company_id?: string | null
          created_at?: string
          description: string
          due_date: string
          generated_from_rule_id?: string | null
          id?: string
          parent_expense_id?: string | null
          payment_date?: string | null
          receipt_url?: string | null
          recurrence?: string | null
          recurrence_end_date?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          account?: string
          category?: string
          company_id?: string | null
          created_at?: string
          description?: string
          due_date?: string
          generated_from_rule_id?: string | null
          id?: string
          parent_expense_id?: string | null
          payment_date?: string | null
          receipt_url?: string | null
          recurrence?: string | null
          recurrence_end_date?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_generated_from_rule_id_fkey"
            columns: ["generated_from_rule_id"]
            isOneToOne: false
            referencedRelation: "expense_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_parent_expense_id_fkey"
            columns: ["parent_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      factories: {
        Row: {
          comissao_padrao: number
          company_id: string | null
          contato_comercial: string | null
          created_at: string
          dia_recebimento: number | null
          email_financeiro: string | null
          id: string
          nome: string
          observacoes: string | null
          politica_comissao: string | null
          prazo_pagamento: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          comissao_padrao?: number
          company_id?: string | null
          contato_comercial?: string | null
          created_at?: string
          dia_recebimento?: number | null
          email_financeiro?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          politica_comissao?: string | null
          prazo_pagamento?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          comissao_padrao?: number
          company_id?: string | null
          contato_comercial?: string | null
          created_at?: string
          dia_recebimento?: number | null
          email_financeiro?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          politica_comissao?: string | null
          prazo_pagamento?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_import_configs: {
        Row: {
          company_id: string | null
          config_name: string
          created_at: string
          factory_id: string
          field_mapping: Json
          file_type: string
          id: string
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          config_name?: string
          created_at?: string
          factory_id: string
          field_mapping?: Json
          file_type?: string
          id?: string
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          config_name?: string
          created_at?: string
          factory_id?: string
          field_mapping?: Json
          file_type?: string
          id?: string
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factory_import_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_import_configs_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          notify_commission_overdue: boolean
          notify_expense_due_soon: boolean
          notify_expense_overdue: boolean
          notify_lead_inactive: boolean
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          notify_commission_overdue?: boolean
          notify_expense_due_soon?: boolean
          notify_expense_overdue?: boolean
          notify_lead_inactive?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          notify_commission_overdue?: boolean
          notify_expense_due_soon?: boolean
          notify_expense_overdue?: boolean
          notify_lead_inactive?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_billing_lots: {
        Row: {
          billed_value: number
          billing_date: string
          commission_percent: number
          commission_value: number
          created_at: string
          id: string
          lot_number: number
          notes: string | null
          order_id: string
          updated_at: string
        }
        Insert: {
          billed_value: number
          billing_date: string
          commission_percent?: number
          commission_value?: number
          created_at?: string
          id?: string
          lot_number: number
          notes?: string | null
          order_id: string
          updated_at?: string
        }
        Update: {
          billed_value?: number
          billing_date?: string
          commission_percent?: number
          commission_value?: number
          created_at?: string
          id?: string
          lot_number?: number
          notes?: string | null
          order_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_billing_lots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_installments: {
        Row: {
          commission_value_preposto: number | null
          commission_value_rep: number
          created_at: string
          due_date: string
          id: string
          installment_number: number
          notes: string | null
          order_id: string
          paid_date: string | null
          paid_observation: string | null
          paid_value: number | null
          receipt_url: string | null
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          commission_value_preposto?: number | null
          commission_value_rep?: number
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          notes?: string | null
          order_id: string
          paid_date?: string | null
          paid_observation?: string | null
          paid_value?: number | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
          value: number
        }
        Update: {
          commission_value_preposto?: number | null
          commission_value_rep?: number
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          notes?: string | null
          order_id?: string
          paid_date?: string | null
          paid_observation?: string | null
          paid_value?: number | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_installments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_date: string | null
          client: string
          client_city: string | null
          client_cnpj: string | null
          client_id: string | null
          client_state: string | null
          commission_base_value: number
          commission_percent_preposto: number | null
          commission_percent_rep: number
          commission_total_preposto: number | null
          commission_total_rep: number
          company_id: string | null
          created_at: string
          crm_deal_id: string | null
          external_order_id: string | null
          factory: string
          factory_id: string | null
          factory_invoice_number: string | null
          id: string
          invoice_total_value: number | null
          observations: string | null
          order_date: string
          order_number: string
          order_type: string
          origin_order_id: string | null
          pre_posto: string | null
          salesperson: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_date?: string | null
          client: string
          client_city?: string | null
          client_cnpj?: string | null
          client_id?: string | null
          client_state?: string | null
          commission_base_value: number
          commission_percent_preposto?: number | null
          commission_percent_rep?: number
          commission_total_preposto?: number | null
          commission_total_rep?: number
          company_id?: string | null
          created_at?: string
          crm_deal_id?: string | null
          external_order_id?: string | null
          factory: string
          factory_id?: string | null
          factory_invoice_number?: string | null
          id?: string
          invoice_total_value?: number | null
          observations?: string | null
          order_date: string
          order_number: string
          order_type?: string
          origin_order_id?: string | null
          pre_posto?: string | null
          salesperson?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_date?: string | null
          client?: string
          client_city?: string | null
          client_cnpj?: string | null
          client_id?: string | null
          client_state?: string | null
          commission_base_value?: number
          commission_percent_preposto?: number | null
          commission_percent_rep?: number
          commission_total_preposto?: number | null
          commission_total_rep?: number
          company_id?: string | null
          created_at?: string
          crm_deal_id?: string | null
          external_order_id?: string | null
          factory?: string
          factory_id?: string | null
          factory_invoice_number?: string | null
          id?: string
          invoice_total_value?: number | null
          observations?: string | null
          order_date?: string
          order_number?: string
          order_type?: string
          origin_order_id?: string | null
          pre_posto?: string | null
          salesperson?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_origin_order_id_fkey"
            columns: ["origin_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          alert_days: number
          cnpj: string | null
          company_id: string | null
          company_logo_url: string | null
          company_name: string | null
          created_at: string
          currency: string
          default_account: string
          email: string | null
          financial_day_start: number
          id: string
          phone: string | null
          primary_color: string | null
          responsible_name: string | null
          secondary_color: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_days?: number
          cnpj?: string | null
          company_id?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string
          default_account?: string
          email?: string | null
          financial_day_start?: number
          id?: string
          phone?: string | null
          primary_color?: string | null
          responsible_name?: string | null
          secondary_color?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_days?: number
          cnpj?: string | null
          company_id?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string
          default_account?: string
          email?: string | null
          financial_day_start?: number
          id?: string
          phone?: string | null
          primary_color?: string | null
          responsible_name?: string | null
          secondary_color?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_goals: {
        Row: {
          company_id: string | null
          created_at: string
          goal_value: number
          id: string
          month: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          goal_value?: number
          id?: string
          month: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          goal_value?: number
          id?: string
          month?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_goals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          active: boolean
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_write: { Args: { _user_id: string }; Returns: boolean }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "financeiro"
        | "comercial"
        | "visualizador"
        | "socio"
        | "vendedor"
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
        "financeiro",
        "comercial",
        "visualizador",
        "socio",
        "vendedor",
      ],
    },
  },
} as const
