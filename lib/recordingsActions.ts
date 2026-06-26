// lib/recordingsActions.ts — teacher course videos / recordings management (mirrors
// the web recordings page). Reads the course + its course_lessons, and supports
// add (paste link OR native upload) and delete.
import { supabase } from '@/lib/supabase';
import { uploadToAttachments } from '@/lib/db';

export interface CourseMeta { id: string; title: string; product_type: string; teacher_id: string }
export interface CourseLesson { id: string; title: string; video_url: string | null; duration_mins: number | null; sort_order: number | null }

export async function fetchCourseForRecordings(courseId: string, uid: string): Promise<CourseMeta | null> {
  const sb = supabase as any;
  try {
    const { data } = await sb.from('courses').select('id, title, product_type, teacher_id').eq('id', courseId).single();
    if (!data || data.teacher_id !== uid) return null;
    return data as CourseMeta;
  } catch { return null; }
}

export async function fetchCourseLessons(courseId: string): Promise<CourseLesson[]> {
  const sb = supabase as any;
  try {
    const { data } = await sb.from('course_lessons').select('id, title, video_url, duration_mins, sort_order').eq('course_id', courseId).order('sort_order');
    return (data as CourseLesson[]) ?? [];
  } catch { return []; }
}

export async function addCourseLesson(args: { courseId: string; title: string; videoUrl: string; duration: number; sortOrder: number }): Promise<boolean> {
  const sb = supabase as any;
  try {
    const { error } = await sb.from('course_lessons').insert({
      course_id: args.courseId, title: args.title.trim(), lesson_type: 'video',
      video_url: args.videoUrl.trim() || null, duration_mins: Number(args.duration) || null, sort_order: args.sortOrder,
    });
    return !error;
  } catch { return false; }
}

export async function deleteCourseLesson(id: string): Promise<boolean> {
  const sb = supabase as any;
  try { const { error } = await sb.from('course_lessons').delete().eq('id', id); return !error; } catch { return false; }
}

// Native video upload → Supabase Storage public URL (reuses the attachments bucket).
export async function uploadCourseVideo(uri: string, fileName: string): Promise<string | null> {
  const ext = (fileName.split('.').pop() || 'mp4').toLowerCase();
  return uploadToAttachments(uri, `video/${ext === 'mov' ? 'quicktime' : ext}`, ext);
}
