// src/types/database.ts
// Minimal, mobile-facing slice of the QMG schema. Intentionally a SUBSET of the
// web app's types — same column names and the same RLS-safe `public_teachers`
// view, so the mobile app reuses the existing data without duplicating models.
//
// To regenerate the full type set from the live database:
//   npx supabase gen types typescript --project-id <ID> --schema public > src/types/database.ts

export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

export type CourseType =
  | 'Noorani Qaida' | 'Tajweed' | 'Hifz' | 'Tafseer' | 'Islamic Studies' | 'Ijazah';

export interface Profile {
  id: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  email: string;
  country: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_active: boolean;
}

// RLS-safe view: approved + active teachers, readable by anon. Same view the web
// uses for both the public directory and in-portal discovery.
export interface PublicTeacher {
  id: string;
  slug: string | null;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  country: string | null;
  bio: string | null;
  intro_video_url: string | null;
  years_experience: number;
  specializations: CourseType[];
  teaching_languages: string[];
  available_days: string[];
  hourly_rate_usd: number;
  trial_rate_usd: number;
  ijazah_verified: boolean;
  avg_rating: number | null;
  total_reviews: number;
  total_lessons: number;
  email_verified: boolean;
  phone_verified: boolean;
  identity_verified: boolean;
  quran_mentor_verified: boolean;
}

export interface Review {
  id: string;
  teacher_id: string;
  rating: number;
  comment: string | null;
  is_public: boolean;
  created_at: string;
  profiles?: { first_name: string | null; last_name: string | null; avatar_url: string | null } | null;
}

type Tbl<Row> = { Row: Row; Insert: Partial<Row> & Record<string, any>; Update: Partial<Row> };

export interface Database {
  public: {
    Tables: {
      profiles: Tbl<Profile>;
      reviews: Tbl<Review>;
      teacher_profiles: Tbl<{ user_id: string; status: string } & Record<string, any>>;
    };
    Views: {
      public_teachers: { Row: PublicTeacher };
    };
  };
}
