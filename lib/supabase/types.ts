export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          user_id: string
          filename: string
          mime_type: string
          storage_path: string
          text_excerpt: string | null
          full_text: string | null
          char_count: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          mime_type: string
          storage_path: string
          text_excerpt?: string | null
          full_text?: string | null
          char_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          mime_type?: string
          storage_path?: string
          text_excerpt?: string | null
          full_text?: string | null
          char_count?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      runs: {
        Row: {
          id: string
          document_id: string
          system_prompt: string
          user_prompt: string
          prompt_hash: string
          models_used: string[]
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          system_prompt: string
          user_prompt: string
          prompt_hash: string
          models_used: string[]
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          system_prompt?: string
          user_prompt?: string
          prompt_hash?: string
          models_used?: string[]
          created_at?: string
        }
      }
      outputs: {
        Row: {
          id: string
          run_id: string
          model: string
          json_valid: boolean
          json_payload: Json | null
          raw_response: string | null
          cost_in: number | null
          cost_out: number | null
          tokens_in: number | null
          tokens_out: number | null
          execution_time_ms: number | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          run_id: string
          model: string
          json_valid?: boolean
          json_payload?: Json | null
          raw_response?: string | null
          cost_in?: number | null
          cost_out?: number | null
          tokens_in?: number | null
          tokens_out?: number | null
          execution_time_ms?: number | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          run_id?: string
          model?: string
          json_valid?: boolean
          json_payload?: Json | null
          raw_response?: string | null
          cost_in?: number | null
          cost_out?: number | null
          tokens_in?: number | null
          tokens_out?: number | null
          execution_time_ms?: number | null
          error_message?: string | null
          created_at?: string
        }
      }
      models: {
        Row: {
          id: string
          provider: string
          name: string
          display_name: string
          price_in: number
          price_out: number
          enabled: boolean
          supports_json_mode: boolean
          context_window: number
          created_at: string
        }
        Insert: {
          id?: string
          provider: string
          name: string
          display_name: string
          price_in: number
          price_out: number
          enabled?: boolean
          supports_json_mode?: boolean
          context_window?: number
          created_at?: string
        }
        Update: {
          id?: string
          provider?: string
          name?: string
          display_name?: string
          price_in?: number
          price_out?: number
          enabled?: boolean
          supports_json_mode?: boolean
          context_window?: number
          created_at?: string
        }
      }
    }
  }
}
