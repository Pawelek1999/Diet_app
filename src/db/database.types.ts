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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity: {
        Row: {
          active_kcal: number
          date: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_kcal: number
          date: string
          source: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          active_kcal?: number
          date?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
            foreignKeyName: "dish_ingredients_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      dishes: {
        Row: {
          carbs: number | null
          cooked_weight_grams: number | null
          created_at: string
          deleted_at: string | null
          description: string | null
          fat: number | null
          id: number
          is_favorite: boolean
          kcal: number | null
          mode: string
          name: string
          notes: string | null
          protein: number | null
          recipe_url: string | null
          servings: number
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs?: number | null
          cooked_weight_grams?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          fat?: number | null
          id?: never
          is_favorite?: boolean
          kcal?: number | null
          mode?: string
          name: string
          notes?: string | null
          protein?: number | null
          recipe_url?: string | null
          servings?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          carbs?: number | null
          cooked_weight_grams?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          fat?: number | null
          id?: never
          is_favorite?: boolean
          kcal?: number | null
          mode?: string
          name?: string
          notes?: string | null
          protein?: number | null
          recipe_url?: string | null
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
            foreignKeyName: "entries_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      import_tokens: {
        Row: {
          created_at: string
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          token_hash?: string
          user_id?: string
        }
        Relationships: []
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
      create_import_token: { Args: never; Returns: string }
      import_activity: {
        Args: { p_date: string; p_kcal: string; p_token: string }
        Returns: Json
      }
      import_backup: { Args: { p_data: Json }; Returns: Json }
      import_backup_core: { Args: { p_data: Json }; Returns: Json }
      import_token_created_at: { Args: never; Returns: string }
      save_dish: {
        Args: { p_dish: Json; p_id: number; p_ingredients: Json }
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
    Enums: {},
  },
} as const
