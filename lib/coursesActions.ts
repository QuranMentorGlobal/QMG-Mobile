// lib/coursesActions.ts
// Course Studio data + the full create/edit workflow, mirroring the web
// course-studio (new/page.tsx). Writes the real `courses` row plus the
// product-type sub-tables (trial/live/recorded details, course_lessons) and,
// for live courses, subscription_plans — exactly like the web wizard.
//
// All writes go straight through Supabase (RLS scopes them to the teacher), so
// no cookie-authed API route is involved — this is fully mobile-capable.

import { supabase } from '@/lib/supabase';

export type ProductType = 'trial' | 'live' | 'recorded' | 'program';
export type BillingModel = 'one_time' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
export type LessonsPerMo = 4 | 8 | 12;

export const CATEGORIES = ['Noorani Qaida', 'Tajweed', 'Hifz', 'Tafseer', 'Islamic Studies', 'Ijazah'];
export const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All levels'];

export const COURSE_TYPES: { key: ProductType; title: string; sub: string; icon: string }[] = [
  { key: 'trial', title: 'Trial Class', sub: 'Short intro session, one-time payment.', icon: 'radio-button-on-outline' },
  { key: 'live', title: 'Live Class', sub: 'Recurring live lessons with subscription billing.', icon: 'videocam-outline' },
  { key: 'recorded', title: 'Recorded Course', sub: 'Self-paced video lessons, one-time purchase.', icon: 'book-outline' },
  { key: 'program', title: 'Long Course', sub: 'Multi-month program, installments or upfront.', icon: 'trending-up-outline' },
];

export const BILLING_OPTIONS: Record<ProductType, { key: BillingModel; label: string; sub: string }[]> = {
  trial: [{ key: 'one_time', label: 'One-Time', sub: 'Student pays once for the trial session' }],
  live: [
    { key: 'monthly', label: 'Monthly', sub: 'Charged every month' },
    { key: 'quarterly', label: 'Quarterly', sub: 'Charged every 3 months (offer discount)' },
    { key: 'semi_annual', label: 'Semi-Annual', sub: 'Charged every 6 months (offer discount)' },
    { key: 'annual', label: 'Annual', sub: 'Charged once per year (offer discount)' },
  ],
  recorded: [{ key: 'one_time', label: 'One-Time Purchase', sub: 'Lifetime or limited access' }],
  program: [
    { key: 'monthly', label: 'Monthly Installments', sub: 'Pay per month for program duration' },
    { key: 'one_time', label: 'Pay Upfront', sub: 'Single payment for full program (offer discount)' },
  ],
};

export const DEFAULT_DISCOUNTS: Record<BillingModel, number> = {
  one_time: 0, monthly: 0, quarterly: 10, semi_annual: 15, annual: 25,
};
export const INTERVAL_MONTHS: Record<BillingModel, number> = {
  one_time: 1, monthly: 1, quarterly: 3, semi_annual: 6, annual: 12,
};
export const COMMISSION_PCT = 20;

export interface PlanTier { interval: BillingModel; label: string; months: number; discount: number; price: number }

export function computePlans(monthlyBase: number, selectedIntervals: BillingModel[]): PlanTier[] {
  return selectedIntervals.map((interval) => {
    const months = INTERVAL_MONTHS[interval];
    const discount = DEFAULT_DISCOUNTS[interval];
    const gross = monthlyBase * months;
    const price = Math.round(gross * (1 - discount / 100));
    return { interval, label: interval.replace('_', ' '), months, discount, price };
  });
}

// ── Studio fetch (adds `status` so the Completed tab works) ──────────────────────
export interface StudioCourse {
  id: string; title: string; category: string | null; product_type: string | null;
  price_usd: number | null; is_free: boolean; is_active: boolean; status: string | null;
  duration_mins: number | null; enrollments: number; lessonCount: number;
  completedStudents: number; avgProgress: number;
}
export interface CourseStudio {
  courses: StudioCourse[];
  stats: { total: number; active: number; totalEnrollments: number; totalLessons: number };
}

export async function fetchStudio(uid: string): Promise<CourseStudio> {
  try {
    const sb = supabase as any;
    const { data: cs } = await sb
      .from('courses')
      .select('id, title, category, product_type, price_usd, is_free, is_active, status, duration_mins')
      .eq('teacher_id', uid)
      .order('created_at', { ascending: false });
    const rows = (cs as any[]) || [];
    const ids = rows.map((c) => c.id);
    let enr: any[] = [], lessons: any[] = [];
    if (ids.length) {
      const [e, l] = await Promise.all([
        sb.from('enrollments').select('course_id, status, progress').in('course_id', ids),
        sb.from('lessons').select('id, course_id, status').in('course_id', ids),
      ]);
      enr = (e.data as any[]) || []; lessons = (l.data as any[]) || [];
    }
    let totalLessons = 0;
    const courses: StudioCourse[] = rows.map((c) => {
      const ce = enr.filter((x) => x.course_id === c.id);
      const cl = lessons.filter((x) => x.course_id === c.id);
      const completedStudents = ce.filter((x) => x.status === 'completed' || (Number(x.progress) || 0) >= 100).length;
      const avgProgress = ce.length ? Math.round(ce.reduce((s, x) => s + (Number(x.progress) || 0), 0) / ce.length) : 0;
      totalLessons += cl.length;
      return {
        id: c.id, title: c.title ?? 'Untitled course', category: c.category ?? null, product_type: c.product_type ?? null,
        price_usd: c.price_usd ?? null, is_free: !!c.is_free, is_active: c.is_active !== false, status: c.status ?? 'active',
        duration_mins: c.duration_mins ?? null, enrollments: ce.length, lessonCount: cl.length, completedStudents, avgProgress,
      };
    });
    return {
      courses,
      stats: { total: rows.length, active: rows.filter((c) => c.is_active !== false).length, totalEnrollments: enr.length, totalLessons },
    };
  } catch {
    return { courses: [], stats: { total: 0, active: 0, totalEnrollments: 0, totalLessons: 0 } };
  }
}

export async function setCourseActive(id: string, active: boolean): Promise<boolean> {
  const { error } = await (supabase as any).from('courses').update({ is_active: active }).eq('id', id);
  return !error;
}
export async function deleteCourse(id: string): Promise<boolean> {
  const { error } = await (supabase as any).from('courses').delete().eq('id', id);
  return !error;
}
// Close (move to Completed) or reopen, matching the web (sets status + closed_at).
export async function markCourseComplete(id: string, complete: boolean): Promise<boolean> {
  const patch = complete
    ? { status: 'completed', closed_at: new Date().toISOString() }
    : { status: 'active', closed_at: null };
  const { error } = await (supabase as any).from('courses').update(patch).eq('id', id);
  return !error;
}

// ── Create / edit input ─────────────────────────────────────────────────────────
export interface LessonInput { title: string; video_url: string; duration: number }
export interface CourseInput {
  productType: ProductType;
  billingModel: BillingModel;
  title: string; category: string; level: string; description: string; thumbnailUrl: string;
  isFree: boolean; priceUsd: number;
  // live
  monthlyBasePrice: number; lessonsPerMo: LessonsPerMo; enabledIntervals: BillingModel[];
  liveDuration: number; sessionsCount: number; startDate: string; endDate: string; capacity: number;
  // program
  programMonths: number;
  // recorded
  accessType: 'lifetime' | 'limited'; accessDays: number; downloadsEnabled: boolean; lessons: LessonInput[];
  // trial
  trialDuration: number; isAssessment: boolean;
}

function buildBase(uid: string, f: CourseInput): Record<string, any> {
  const totalDuration =
    f.productType === 'recorded' ? f.lessons.reduce((s, l) => s + (Number(l.duration) || 0), 0)
    : f.productType === 'trial' ? Number(f.trialDuration) || 30
    : Number(f.liveDuration) || 60;

  const effectivePrice =
    f.productType === 'live' ? f.monthlyBasePrice
    : f.productType === 'program' ? (f.billingModel === 'one_time' ? f.priceUsd : f.monthlyBasePrice)
    : f.isFree ? 0 : Number(f.priceUsd) || 0;

  return {
    teacher_id: uid,
    title: f.title.trim(),
    course_type: f.category,
    category: f.category,
    product_type: f.productType,
    billing_model: f.billingModel,
    description: f.description.trim() || null,
    level: f.level,
    age_group: 'All ages',
    duration_mins: totalDuration,
    price_usd: effectivePrice,
    trial_price_usd: 0,
    max_students: f.productType === 'live' ? (Number(f.capacity) || 1) : (f.productType === 'recorded' ? 9999 : 1),
    is_active: true,
    is_free: f.isFree,
    status: 'published',
    thumbnail_url: f.thumbnailUrl.trim() || null,
    monthly_price_usd: f.productType === 'live' ? f.monthlyBasePrice : null,
    upfront_price_usd: f.productType === 'program' && f.billingModel === 'one_time' ? f.priceUsd : null,
    program_months: f.productType === 'program' ? f.programMonths : null,
    lessons_per_month: f.productType === 'live' ? f.lessonsPerMo : null,
    commission_pct: COMMISSION_PCT,
    access_duration_days: f.productType === 'recorded' && f.accessType === 'limited' ? f.accessDays : null,
  };
}

async function writeDetails(courseId: string, f: CourseInput, isEdit: boolean) {
  const sb = supabase as any;
  if (f.productType === 'trial') {
    await sb.from('trial_course_details').upsert(
      { course_id: courseId, duration_mins: Number(f.trialDuration) || 30, is_assessment: f.isAssessment },
      { onConflict: 'course_id' }
    );
  } else if (f.productType === 'live') {
    await sb.from('live_course_details').upsert(
      {
        course_id: courseId,
        sessions_count: Number(f.sessionsCount) || null,
        start_date: f.startDate || null,
        end_date: f.endDate || null,
        capacity: Number(f.capacity) || 10,
      },
      { onConflict: 'course_id' }
    );
    // Subscription plans are only created on first save (web inserts them on create).
    if (!isEdit) {
      const plans = computePlans(f.monthlyBasePrice, f.enabledIntervals);
      if (plans.length) {
        await sb.from('subscription_plans').insert(
          plans.map((p) => ({
            name: `${f.title.trim()} — ${p.label.charAt(0).toUpperCase() + p.label.slice(1)}`,
            description: `${f.lessonsPerMo} lessons/month · ${p.months} month${p.months > 1 ? 's' : ''}`,
            billing_interval: p.interval === 'monthly' ? 'month' : p.interval,
            lessons_per_month: f.lessonsPerMo,
            price_usd: p.price,
            commission_pct: COMMISSION_PCT,
            currency: 'usd',
            is_active: true,
          }))
        );
      }
    }
  } else if (f.productType === 'recorded') {
    const { data: det } = await sb.from('recorded_course_details').upsert(
      { course_id: courseId, total_duration_mins: f.lessons.reduce((s, l) => s + (Number(l.duration) || 0), 0), downloads_enabled: f.downloadsEnabled },
      { onConflict: 'course_id' }
    ).select('id').single();
    const valid = f.lessons.filter((l) => l.title.trim());
    // Replace lesson rows so edits stay consistent.
    await sb.from('course_lessons').delete().eq('course_id', courseId);
    if (valid.length) {
      await sb.from('course_lessons').insert(
        valid.map((l, i) => ({
          course_id: courseId,
          recorded_course_id: det?.id || null,
          title: l.title.trim(),
          video_url: l.video_url.trim() || null,
          duration_mins: Number(l.duration) || 0,
          sort_order: i + 1,
        }))
      );
    }
  }
}

export async function createCourse(uid: string, f: CourseInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const { data: course, error } = await (supabase as any).from('courses').insert(buildBase(uid, f)).select('id').single();
    if (error) throw new Error(error.message);
    await writeDetails(course.id, f, false);
    return { ok: true, id: course.id };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Could not save course.' };
  }
}

export async function updateCourse(uid: string, id: string, f: CourseInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const base = buildBase(uid, f);
    delete (base as any).status; // don't flip a completed course back to published on edit
    const { error } = await (supabase as any).from('courses').update(base).eq('id', id);
    if (error) throw new Error(error.message);
    await writeDetails(id, f, true);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Could not update course.' };
  }
}

// ── Load an existing course for editing (base + type details + lessons) ──────────
export async function fetchCourseForEdit(id: string): Promise<Partial<CourseInput> & { productType?: ProductType } | null> {
  try {
    const sb = supabase as any;
    const { data: c } = await sb.from('courses').select('*').eq('id', id).single();
    if (!c) return null;
    const out: any = {
      productType: c.product_type, billingModel: c.billing_model || 'one_time',
      title: c.title || '', category: c.category || CATEGORIES[0], level: c.level || 'All levels',
      description: c.description || '', thumbnailUrl: c.thumbnail_url || '',
      isFree: !!c.is_free, priceUsd: Number(c.price_usd) || 0,
      monthlyBasePrice: Number(c.monthly_price_usd) || 100, lessonsPerMo: (c.lessons_per_month as LessonsPerMo) || 4,
      enabledIntervals: ['monthly', 'quarterly', 'annual'], liveDuration: 60, sessionsCount: 8,
      startDate: '', endDate: '', capacity: Number(c.max_students) || 10,
      programMonths: Number(c.program_months) || 6,
      accessType: c.access_duration_days ? 'limited' : 'lifetime', accessDays: Number(c.access_duration_days) || 365,
      downloadsEnabled: false, lessons: [{ title: '', video_url: '', duration: 0 }],
      trialDuration: Number(c.duration_mins) || 30, isAssessment: false,
    };
    if (c.product_type === 'trial') {
      const { data: t } = await sb.from('trial_course_details').select('*').eq('course_id', id).single();
      if (t) { out.trialDuration = t.duration_mins ?? out.trialDuration; out.isAssessment = !!t.is_assessment; }
    } else if (c.product_type === 'live') {
      const { data: lv } = await sb.from('live_course_details').select('*').eq('course_id', id).single();
      if (lv) { out.sessionsCount = lv.sessions_count ?? out.sessionsCount; out.startDate = lv.start_date || ''; out.endDate = lv.end_date || ''; out.capacity = lv.capacity ?? out.capacity; }
    } else if (c.product_type === 'recorded') {
      const { data: rd } = await sb.from('recorded_course_details').select('*').eq('course_id', id).single();
      if (rd) out.downloadsEnabled = !!rd.downloads_enabled;
      const { data: ls } = await sb.from('course_lessons').select('*').eq('course_id', id).order('sort_order', { ascending: true });
      if (ls && ls.length) out.lessons = ls.map((l: any) => ({ title: l.title || '', video_url: l.video_url || '', duration: Number(l.duration_mins) || 0 }));
    }
    return out;
  } catch {
    return null;
  }
}
