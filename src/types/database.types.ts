export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      merchants: {
        Row: {
          id: string
          wallet_address: string
          email: string | null
          business_name: string | null
          default_receive_chain: number | null
          default_receive_token: string | null
          branding_settings: Json | null
          total_links_created: number
          total_revenue: number
          created_at: string
          last_login_at: string | null
          api_key_hash: string | null
          api_key_prefix: string | null
          api_key_name: string | null
          api_enabled: boolean
          api_created_at: string | null
          api_last_used_at: string | null
          api_total_calls: number
        }
        Insert: {
          id: string
          wallet_address: string
          email?: string | null
          business_name?: string | null
          default_receive_chain?: number | null
          default_receive_token?: string | null
          branding_settings?: Json | null
          total_links_created?: number
          total_revenue?: number
          created_at?: string
          last_login_at?: string | null
          api_key_hash?: string | null
          api_key_prefix?: string | null
          api_key_name?: string | null
          api_enabled?: boolean
          api_created_at?: string | null
          api_last_used_at?: string | null
          api_total_calls?: number
        }
        Update: {
          id: string
          wallet_address?: string
          email?: string | null
          business_name?: string | null
          default_receive_chain?: number | null
          default_receive_token?: string | null
          branding_settings?: Json | null
          total_links_created?: number
          total_revenue?: number
          created_at?: string
          last_login_at?: string | null
          api_key_hash?: string | null
          api_key_prefix?: string | null
          api_key_name?: string | null
          api_enabled?: boolean
          api_created_at?: string | null
          api_last_used_at?: string | null
          api_total_calls?: number
        }
      }
      payment_links: {
        Row: {
          id: string
          merchant_id: string
          amount: number | null
          currency: string
          receive_token: string | null
          receive_token_symbol: string | null
          receive_chain_id: number | null
          recipient_address: string | null
          title: string | null
          description: string | null
          customization: Json | null
          status: 'active' | 'paused' | 'archived' | 'expired'
          receive_mode: 'same_chain' | 'specific_chain'
          max_uses: number | null
          current_uses: number
          expires_at: string | null
          created_at: string
          updated_at: string
          created_via: 'dashboard' | 'api'
          success_url: string | null
          cancel_url: string | null
          api_metadata: Json | null
        }
        Insert: {
          id?: string
          merchant_id: string
          amount?: number | null
          currency?: string
          receive_token?: string | null
          receive_token_symbol?: string | null
          receive_chain_id?: number | null
          recipient_address?: string | null
          title?: string | null
          description?: string | null
          customization?: Json | null
          status?: 'active' | 'paused' | 'archived' | 'expired'
          receive_mode?: 'same_chain' | 'specific_chain'
          max_uses?: number | null
          current_uses?: number
          expires_at?: string | null
          created_at?: string
          updated_at?: string
          created_via?: 'dashboard' | 'api'
          success_url?: string | null
          cancel_url?: string | null
          api_metadata?: Json | null
        }
        Update: {
          id?: string
          merchant_id?: string
          amount?: number | null
          currency?: string
          receive_token?: string | null
          receive_token_symbol?: string | null
          receive_chain_id?: number | null
          recipient_address?: string | null
          title?: string | null
          description?: string | null
          customization?: Json | null
          status?: 'active' | 'paused' | 'archived' | 'expired'
          receive_mode?: 'same_chain' | 'specific_chain'
          max_uses?: number | null
          current_uses?: number
          expires_at?: string | null
          created_at?: string
          updated_at?: string
          created_via?: 'dashboard' | 'api'
          success_url?: string | null
          cancel_url?: string | null
          api_metadata?: Json | null
        }
      }
      transactions: {
        Row: {
          id: string
          payment_link_id: string | null
          customer_wallet: string | null
          from_chain_id: number | null
          from_token: string | null
          from_token_symbol: string | null
          from_amount: number | null
          to_chain_id: number | null
          to_token: string | null
          to_token_symbol: string | null
          to_amount: number | null
          actual_output: number | null
          status: 'initiated' | 'quote_generated' | 'pending_signature' | 'submitted' | 'processing' | 'swapping' | 'bridging' | 'settling' | 'completed' | 'failed' | 'expired'
          provider: 'lifi' | 'rango' | 'near-intents' | 'rubic' | 'symbiosis' | 'cctp' | null
          route_details: Json | null
          source_tx_hash: string | null
          bridge_tx_hash: string | null
          dest_tx_hash: string | null
          gas_estimate: number | null
          gas_paid: number | null
          slippage_tolerance: number | null
          actual_slippage: number | null
          platform_fee: number | null
          provider_fee: number | null
          total_fees: number | null
          error_message: string | null
          failure_stage: string | null
          refund_status: 'not_needed' | 'pending' | 'processing' | 'completed' | 'failed' | null
          refund_tx_hash: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          payment_link_id?: string | null
          customer_wallet?: string | null
          from_chain_id?: number | null
          from_token?: string | null
          from_token_symbol?: string | null
          from_amount?: number | null
          to_chain_id?: number | null
          to_token?: string | null
          to_token_symbol?: string | null
          to_amount?: number | null
          actual_output?: number | null
          status?: 'initiated' | 'quote_generated' | 'pending_signature' | 'submitted' | 'processing' | 'swapping' | 'bridging' | 'settling' | 'completed' | 'failed' | 'expired'
          provider?: 'lifi' | 'rango' | 'near-intents' | 'rubic' | 'symbiosis' | 'cctp' | null
          route_details?: Json | null
          source_tx_hash?: string | null
          bridge_tx_hash?: string | null
          dest_tx_hash?: string | null
          gas_estimate?: number | null
          gas_paid?: number | null
          slippage_tolerance?: number | null
          actual_slippage?: number | null
          platform_fee?: number | null
          provider_fee?: number | null
          total_fees?: number | null
          error_message?: string | null
          failure_stage?: string | null
          refund_status?: 'not_needed' | 'pending' | 'processing' | 'completed' | 'failed' | null
          refund_tx_hash?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          payment_link_id?: string | null
          customer_wallet?: string | null
          from_chain_id?: number | null
          from_token?: string | null
          from_token_symbol?: string | null
          from_amount?: number | null
          to_chain_id?: number | null
          to_token?: string | null
          to_token_symbol?: string | null
          to_amount?: number | null
          actual_output?: number | null
          status?: 'initiated' | 'quote_generated' | 'pending_signature' | 'submitted' | 'processing' | 'swapping' | 'bridging' | 'settling' | 'completed' | 'failed' | 'expired'
          provider?: 'lifi' | 'rango' | 'near-intents' | 'rubic' | 'symbiosis' | 'cctp' | null
          route_details?: Json | null
          source_tx_hash?: string | null
          bridge_tx_hash?: string | null
          dest_tx_hash?: string | null
          gas_estimate?: number | null
          gas_paid?: number | null
          slippage_tolerance?: number | null
          actual_slippage?: number | null
          platform_fee?: number | null
          provider_fee?: number | null
          total_fees?: number | null
          error_message?: string | null
          failure_stage?: string | null
          refund_status?: 'not_needed' | 'pending' | 'processing' | 'completed' | 'failed' | null
          refund_tx_hash?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      api_logs: {
        Row: {
          id: string
          merchant_id: string
          endpoint: string
          method: string
          status_code: number
          request_body: Json | null
          response_body: Json | null
          error_message: string | null
          ip_address: string | null
          user_agent: string | null
          execution_time_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          merchant_id: string
          endpoint: string
          method: string
          status_code: number
          request_body?: Json | null
          response_body?: Json | null
          error_message?: string | null
          ip_address?: string | null
          user_agent?: string | null
          execution_time_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          merchant_id?: string
          endpoint?: string
          method?: string
          status_code?: number
          request_body?: Json | null
          response_body?: Json | null
          error_message?: string | null
          ip_address?: string | null
          user_agent?: string | null
          execution_time_ms?: number | null
          created_at?: string
        }
      }
      cached_chains: {
        Row: {
          key: string
          chain_id: number | null
          name: string
          type: string
          symbol: string
          logo_url: string | null
          has_usdc: boolean
          providers: Json
          provider_ids: Json
          updated_at: string
        }
        Insert: {
          key: string
          chain_id?: number | null
          name: string
          type: string
          symbol: string
          logo_url?: string | null
          has_usdc?: boolean
          providers: Json
          provider_ids: Json
          updated_at?: string
        }
        Update: {
          key?: string
          chain_id?: number | null
          name?: string
          type?: string
          symbol?: string
          logo_url?: string | null
          has_usdc?: boolean
          providers?: Json
          provider_ids?: Json
          updated_at?: string
        }
      }
      cached_tokens: {
        Row: {
          id: string
          chain_key: string
          address: string
          symbol: string
          name: string
          decimals: number
          logo_url: string | null
          is_native: boolean
          provider_ids: Json | null
          updated_at: string
        }
        Insert: {
          id: string
          chain_key: string
          address: string
          symbol: string
          name: string
          decimals?: number
          logo_url?: string | null
          is_native?: boolean
          provider_ids?: Json | null
          updated_at?: string
        }
        Update: {
          id?: string
          chain_key?: string
          address?: string
          symbol?: string
          name?: string
          decimals?: number
          logo_url?: string | null
          is_native?: boolean
          provider_ids?: Json | null
          updated_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          payment_link_id: string | null
          wallet_address: string | null
          from_chain_id: number | null
          from_token: string | null
          from_amount: number | null
          to_chain_id: number | null
          to_token: string | null
          providers_queried: string[] | null
          lifi_quote: Json | null
          rango_quote: Json | null
          near_quote: Json | null
          rubic_quote: Json | null
          symbiosis_quote: Json | null
          best_provider: string | null
          best_output: number | null
          comparison_data: Json | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id: string
          payment_link_id?: string | null
          wallet_address?: string | null
          from_chain_id?: number | null
          from_token?: string | null
          from_amount?: number | null
          to_chain_id?: number | null
          to_token?: string | null
          providers_queried?: string[] | null
          lifi_quote?: Json | null
          rango_quote?: Json | null
          near_quote?: Json | null
          rubic_quote?: Json | null
          symbiosis_quote?: Json | null
          best_provider?: string | null
          best_output?: number | null
          comparison_data?: Json | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id: string
          payment_link_id?: string | null
          wallet_address?: string | null
          from_chain_id?: number | null
          from_token?: string | null
          from_amount?: number | null
          to_chain_id?: number | null
          to_token?: string | null
          providers_queried?: string[] | null
          lifi_quote?: Json | null
          rango_quote?: Json | null
          near_quote?: Json | null
          rubic_quote?: Json | null
          symbiosis_quote?: Json | null
          best_provider?: string | null
          best_output?: number | null
          comparison_data?: Json | null
          expires_at?: string | null
          created_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          wallet_address: string
          email: string | null
          total_payments: number
          total_volume: number
          first_payment_at: string | null
          last_payment_at: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id: string
          wallet_address: string
          email?: string | null
          total_payments?: number
          total_volume?: number
          first_payment_at?: string | null
          last_payment_at?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id: string
          wallet_address?: string
          email?: string | null
          total_payments?: number
          total_volume?: number
          first_payment_at?: string | null
          last_payment_at?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }

      failure_logs: {
        Row: {
          id: string
          transaction_id: string | null
          provider: string | null
          failure_stage: string | null
          error_code: string | null
          error_message: string | null
          blockchain_error: string | null
          stack_trace: string | null
          refund_initiated: boolean | null
          refund_completed: boolean | null
          support_ticket_id: string | null
          resolved_at: string | null
          resolution_notes: string | null
          created_at: string
        }
        Insert: {
          id: string
          transaction_id?: string | null
          provider?: string | null
          failure_stage?: string | null
          error_code?: string | null
          error_message?: string | null
          blockchain_error?: string | null
          stack_trace?: string | null
          refund_initiated?: boolean | null
          refund_completed?: boolean | null
          support_ticket_id?: string | null
          resolved_at?: string | null
          resolution_notes?: string | null
          created_at?: string
        }
        Update: {
          id: string
          transaction_id?: string | null
          provider?: string | null
          failure_stage?: string | null
          error_code?: string | null
          error_message?: string | null
          blockchain_error?: string | null
          stack_trace?: string | null
          refund_initiated?: boolean | null
          refund_completed?: boolean | null
          support_ticket_id?: string | null
          resolved_at?: string | null
          resolution_notes?: string | null
          created_at?: string
        }
      }
      analytics: {
        Row: {
          id: string
          date: string | null
          provider: string | null
          chain_id: number | null
          total_transactions: number
          successful_transactions: number
          failed_transactions: number
          total_volume: number
          total_fees_collected: number
          avg_transaction_value: number
          avg_completion_time: number
          unique_payers: number
          unique_merchants: number
          created_at: string
        }
        Insert: {
          id: string
          date?: string | null
          provider?: string | null
          chain_id?: number | null
          total_transactions?: number
          successful_transactions?: number
          failed_transactions?: number
          total_volume?: number
          total_fees_collected?: number
          avg_transaction_value?: number
          avg_completion_time?: number
          unique_payers?: number
          unique_merchants?: number
          created_at?: string
        }
        Update: {
          id: string
          date?: string | null
          provider?: string | null
          chain_id?: number | null
          total_transactions?: number
          successful_transactions?: number
          failed_transactions?: number
          total_volume?: number
          total_fees_collected?: number
          avg_transaction_value?: number
          avg_completion_time?: number
          unique_payers?: number
          unique_merchants?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      payment_link_status: 'active' | 'paused' | 'archived' | 'expired'
      transaction_status: 'initiated' | 'quote_generated' | 'pending_signature' | 'submitted' | 'processing' | 'swapping' | 'bridging' | 'settling' | 'completed' | 'failed' | 'expired'
      provider_type: 'lifi' | 'rango' | 'near-intents' | 'rubic' | 'symbiosis' | 'cctp'
      refund_status: 'not_needed' | 'pending' | 'processing' | 'completed' | 'failed'
    }
  }
}

