// Database types matching supabase/migrations.
// Will be overwritten by `npm run db:types` (supabase gen types) once the project is linked.
// Do not edit by hand after that — change the schema via a migration and regenerate.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      dish_ingredients: {
        Row: {
          dish_id: number
          grams: number
          id: number
          position: number
          product_id: number
          user_id: string
        }
        Insert: {
          dish_id: number
          grams: number
          id?: never
          position?: number
          product_id: number
          user_id?: string
        }
        Update: {
          dish_id?: number
          grams?: number
          id?: never
          position?: number
          product_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'dish_ingredients_dish_id_fkey'
            columns: ['dish_id']
            isOneToOne: false
            referencedRelation: 'dishes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'dish_ingredients_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      dishes: {
        Row: {
          cooked_weight_grams: number | null
          created_at: string
          deleted_at: string | null
          id: number
          is_favorite: boolean
          name: string
          servings: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cooked_weight_grams?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: never
          is_favorite?: boolean
          name: string
          servings?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          cooked_weight_grams?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: never
          is_favorite?: boolean
          name?: string
          servings?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      entries: {
        Row: {
          amount: number
          carbs: number
          created_at: string
          date: string
          dish_id: number | null
          fat: number
          id: number
          kcal: number
          meal: string
          name: string
          product_id: number | null
          protein: number
          source_type: string
          unit: string
          user_id: string
        }
        Insert: {
          amount: number
          carbs?: number
          created_at?: string
          date: string
          dish_id?: number | null
          fat?: number
          id?: never
          kcal: number
          meal: string
          name: string
          product_id?: number | null
          protein?: number
          source_type: string
          unit: string
          user_id?: string
        }
        Update: {
          amount?: number
          carbs?: number
          created_at?: string
          date?: string
          dish_id?: number | null
          fat?: number
          id?: never
          kcal?: number
          meal?: string
          name?: string
          product_id?: number | null
          protein?: number
          source_type?: string
          unit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'entries_dish_id_fkey'
            columns: ['dish_id']
            isOneToOne: false
            referencedRelation: 'dishes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'entries_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      products: {
        Row: {
          carbs_100g: number
          created_at: string
          deleted_at: string | null
          fat_100g: number
          id: number
          is_favorite: boolean
          kcal_100g: number
          name: string
          protein_100g: number
          serving_grams: number | null
          serving_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs_100g?: number
          created_at?: string
          deleted_at?: string | null
          fat_100g?: number
          id?: never
          is_favorite?: boolean
          kcal_100g: number
          name: string
          protein_100g?: number
          serving_grams?: number | null
          serving_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          carbs_100g?: number
          created_at?: string
          deleted_at?: string | null
          fat_100g?: number
          id?: never
          is_favorite?: boolean
          kcal_100g?: number
          name?: string
          protein_100g?: number
          serving_grams?: number | null
          serving_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          user_id: string
          value: Json
        }
        Insert: {
          key: string
          user_id?: string
          value: Json
        }
        Update: {
          key?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      save_dish: {
        Args: {
          p_cooked_weight_grams: number | null
          p_id: number | null
          p_ingredients: Json
          p_is_favorite: boolean
          p_name: string
          p_servings: number
        }
        Returns: number
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
