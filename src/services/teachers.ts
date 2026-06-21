// src/services/teachers.ts
// Data access for teachers — reads the SAME RLS-safe view + reviews table the web
// app uses. No new tables, no duplicate logic.
import { supabase } from '@/lib/supabase';
import type { PublicTeacher, Review, CourseType } from '@/types/database';

export async function fetchTeachers(): Promise<PublicTeacher[]> {
  const { data, error } = await supabase
    .from('public_teachers')
    .select('*')
    .order('avg_rating', { ascending: false });
  if (error) throw error;
  return (data as PublicTeacher[]) ?? [];
}

export async function fetchTeacherById(id: string): Promise<PublicTeacher | null> {
  const { data, error } = await supabase
    .from('public_teachers')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return (data as PublicTeacher) ?? null;
}

export async function fetchTeacherReviews(teacherId: string, limit = 10): Promise<Review[]> {
  const { data } = await supabase
    .from('reviews')
    .select('id, teacher_id, rating, comment, is_public, created_at, profiles!reviews_student_id_fkey(first_name, last_name, avatar_url)')
    .eq('teacher_id', teacherId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data as unknown as Review[]) ?? [];
}

export const COURSE_FILTERS: Array<{ value: CourseType | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'Noorani Qaida', label: 'Noorani Qaida' },
  { value: 'Tajweed', label: 'Tajweed' },
  { value: 'Hifz', label: 'Hifz' },
  { value: 'Tafseer', label: 'Tafseer' },
  { value: 'Islamic Studies', label: 'Islamic Studies' },
  { value: 'Ijazah', label: 'Ijazah' },
];
