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
      mails: {
        Row: {
          content: Json
          content_en: Json | null
          content_ja: Json | null
          created_at: string | null
          id: string
          preview_text: string | null
          preview_text_en: string | null
          preview_text_ja: string | null
          title: string
          title_en: string | null
          title_ja: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: Json
          content_en?: Json | null
          content_ja?: Json | null
          created_at?: string | null
          id?: string
          preview_text?: string | null
          preview_text_en?: string | null
          preview_text_ja?: string | null
          title: string
          title_en?: string | null
          title_ja?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: Json
          content_en?: Json | null
          content_ja?: Json | null
          created_at?: string | null
          id?: string
          preview_text?: string | null
          preview_text_en?: string | null
          preview_text_ja?: string | null
          title?: string
          title_en?: string | null
          title_ja?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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
