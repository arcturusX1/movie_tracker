// Mirrors supabase/migrations. Regenerate with:
//   npx supabase gen types typescript --linked > lib/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      movies: {
        Row: {
          tmdb_id: number;
          imdb_id: string | null;
          title: string;
          year: number | null;
          release_date: string | null;
          poster_path: string | null;
          overview: string | null;
          runtime: number | null;
          director: string | null;
          updated_at: string;
        };
        Insert: {
          tmdb_id: number;
          imdb_id?: string | null;
          title: string;
          year?: number | null;
          release_date?: string | null;
          poster_path?: string | null;
          overview?: string | null;
          runtime?: number | null;
          director?: string | null;
          updated_at?: string;
        };
        Update: {
          tmdb_id?: number;
          imdb_id?: string | null;
          title?: string;
          year?: number | null;
          release_date?: string | null;
          poster_path?: string | null;
          overview?: string | null;
          runtime?: number | null;
          director?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      genres: {
        Row: { id: number; name: string };
        Insert: { id: number; name: string };
        Update: { id?: number; name?: string };
        Relationships: [];
      };
      movie_genres: {
        Row: { tmdb_id: number; genre_id: number; position: number };
        Insert: { tmdb_id: number; genre_id: number; position?: number };
        Update: { tmdb_id?: number; genre_id?: number; position?: number };
        Relationships: [
          {
            foreignKeyName: "movie_genres_tmdb_id_fkey";
            columns: ["tmdb_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["tmdb_id"];
          },
          {
            foreignKeyName: "movie_genres_genre_id_fkey";
            columns: ["genre_id"];
            isOneToOne: false;
            referencedRelation: "genres";
            referencedColumns: ["id"];
          },
        ];
      };
      user_movies: {
        Row: {
          id: string;
          user_id: string;
          tmdb_id: number;
          status: Database["public"]["Enums"]["movie_status"];
          rating: number | null;
          note: string | null;
          note_visibility: Database["public"]["Enums"]["note_visibility"];
          watched_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          tmdb_id: number;
          status: Database["public"]["Enums"]["movie_status"];
          rating?: number | null;
          note?: string | null;
          note_visibility?: Database["public"]["Enums"]["note_visibility"];
          watched_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tmdb_id?: number;
          status?: Database["public"]["Enums"]["movie_status"];
          rating?: number | null;
          note?: string | null;
          note_visibility?: Database["public"]["Enums"]["note_visibility"];
          watched_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_movies_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_movies_tmdb_id_fkey";
            columns: ["tmdb_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["tmdb_id"];
          },
        ];
      };
    };
    Views: {
      library: {
        Row: {
          id: string | null;
          user_id: string | null;
          tmdb_id: number | null;
          status: Database["public"]["Enums"]["movie_status"] | null;
          rating: number | null;
          note: string | null;
          note_visibility: Database["public"]["Enums"]["note_visibility"] | null;
          watched_at: string | null;
          created_at: string | null;
          title: string | null;
          year: number | null;
          poster_path: string | null;
          director: string | null;
          primary_genre: string | null;
          genre_ids: number[] | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      movie_status: "watched" | "watchlist";
      note_visibility: "private" | "public";
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type Views<T extends keyof PublicSchema["Views"]> =
  PublicSchema["Views"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
