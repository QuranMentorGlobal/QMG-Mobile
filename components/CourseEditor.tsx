// components/CourseEditor.tsx
// Single-screen course editor — mirrors the web course-studio/[id]/edit page.
// Type (product) and billing model are shown READ-ONLY (changing them would
// desync subscriptions/enrollments). Editable: core fields + the type-specific
// detail rows. Video lessons are managed on the Videos screen (next update), so
// they are shown read-only here — exactly like the web editor.

import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import {
  CATEGORIES, LEVELS, fetchCourseForEdit, updateCourse,
  type ProductType, type BillingModel, type CourseInput,
} from '@/lib/coursesActions';
import { C, FONT, RADIUS, SPACE } from '@/lib/theme';

const PRODUCT_LABEL: Record<string, string> = {
  trial: 'Trial Class', live: 'Live Class', recorded: 'Recorded Course', program: 'Long Course',
};
const BILLING_LABEL: Record<string, string> = {
  one_time: 'One-Time', monthly: 'Monthly', quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual', annual: 'Annual',
};

const DEFAULTS: CourseInput = {
  productType: 'trial', billingModel: 'one_time',
  title: '', category: CATEGORIES[0], level: 'All levels', description: '', thumbnailUrl: '',
  isFree: false, priceUsd: 0,
  monthlyBasePrice: 100, lessonsPerMo: 4, enabledIntervals: ['monthly', 'quarterly', 'annual'],
  liveDuration: 60, sessionsCount: 8, startDate: '', endDate: '', capacity: 10,
  programMonths: 6,
  accessType: 'lifetime', accessDays: 365, downloadsEnabled: false, lessons: [],
  trialDuration: 30, isAssessment: false,
};

export function CourseEditor({ courseId }: { courseId: string }) {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [f, setF] = useState<CourseInput>(DEFAULTS);

  useEffect(() => {
    let on = true;
    fetchCourseForEdit(courseId).then((d) => {
      if (!on) return;
      if (!d) { setNotFound(true); setLoading(false); return; }
      setF({ ...DEFAULTS, ...(d as CourseInput) });
      setLoading(false);
    });
    return () => { on = false; };
  }, [courseId]);

  const set = (patch: Partial<CourseInput>) => setF((p) => ({ ...p, ...patch }));
  const pt = f.productType as ProductType;
  const lessonCount = useMemo(() => f.lessons.filter((l) => l.title.trim()).length, [f.lessons]);

  async function onSave() {
    if (!f.title.trim()) { setError('Please enter a course title.'); return; }
    setError(''); setSaving(true);
    const res = await updateCourse(session!.user.id, courseId, f);
    setSaving(false);
    if (!res.ok) { setError(res.error || 'Could not save changes.'); return; }
    router.replace('/teacher/courses');
  }

  if (loading) return <Screen scroll={false}><Loading label="Loading course…" /></Screen>;
  if (notFound) {
    return (
      <Screen scroll={false}>
        <View style={styles.notFound}>
          <Text style={styles.nfTitle}>Course not found</Text>
          <Text style={styles.nfBody}>This course doesn’t exist or doesn’t belong to your account.</Text>
          <Pressable onPress={() => router.replace('/teacher/courses')} style={{ marginTop: SPACE.md }}>
            <Grad><Text style={styles.primaryText}>← Back to Courses</Text></Grad>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Ionicons name="arrow-back" size={18} color={C.muted} /><Text style={styles.backText}>Back</Text>
      </Pressable>
      <Text style={styles.eyebrow}>EDIT COURSE</Text>
      <Text style={styles.h1}>Edit Course</Text>
      <Text style={styles.sub}>Update your course details. Type and billing are fixed once a course is created.</Text>

      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

      {/* Locked structural fields */}
      <View style={styles.lockedRow}>
        <ReadonlyPill label="TYPE" value={PRODUCT_LABEL[pt] || pt} />
        <ReadonlyPill label="BILLING" value={BILLING_LABEL[f.billingModel] || f.billingModel} />
      </View>

      <View style={{ gap: SPACE.md, marginTop: SPACE.md }}>
        <Field label="COURSE TITLE *" value={f.title} onChangeText={(t: string) => set({ title: t })} placeholder="e.g. Complete Tajweed Mastery Program" />
        <Pills label="CATEGORY" options={CATEGORIES} value={f.category} onChange={(v) => set({ category: v })} />
        <Pills label="LEVEL" options={LEVELS} value={f.level} onChange={(v) => set({ level: v })} />
        <Field label="DESCRIPTION" value={f.description} onChangeText={(t: string) => set({ description: t })} placeholder="What will students learn?" multiline />
        <Field label="THUMBNAIL URL (OPTIONAL)" value={f.thumbnailUrl} onChangeText={(t: string) => set({ thumbnailUrl: t })} placeholder="https://…" autoCapitalize="none" />

        {/* Pricing — live uses a monthly rate; others Free/Paid */}
        {pt === 'live' ? (
          <>
            <Money label="MONTHLY BASE PRICE (USD)" value={f.monthlyBasePrice} onChange={(n) => set({ monthlyBasePrice: n })} />
            <Num label="CAPACITY (MAX STUDENTS)" value={f.capacity} onChange={(n) => set({ capacity: n })} />
            <Num label="SESSIONS COUNT" value={f.sessionsCount} onChange={(n) => set({ sessionsCount: n })} />
            <Field label="START DATE (YYYY-MM-DD)" value={f.startDate} onChangeText={(t: string) => set({ startDate: t })} placeholder="2026-07-01" autoCapitalize="none" />
            <Field label="END DATE (OPTIONAL)" value={f.endDate} onChangeText={(t: string) => set({ endDate: t })} placeholder="YYYY-MM-DD" autoCapitalize="none" />
            <Text style={styles.lockNote}>Subscription tiers &amp; discounts are locked after creation to keep active subscriptions consistent.</Text>
          </>
        ) : pt === 'program' ? (
          <>
            <Num label="PROGRAM DURATION (MONTHS)" value={f.programMonths} onChange={(n) => set({ programMonths: n })} />
            {f.billingModel === 'monthly'
              ? <Money label="MONTHLY INSTALLMENT PRICE (USD)" value={f.monthlyBasePrice} onChange={(n) => set({ monthlyBasePrice: n })} />
              : <Money label="UPFRONT PRICE (USD)" value={f.priceUsd} onChange={(n) => set({ priceUsd: n })} />}
          </>
        ) : (
          <>
            <Text style={styles.fieldLabel}>PRICING</Text>
            <View style={styles.row2}>
              <Toggle label="Free" on={f.isFree} onPress={() => set({ isFree: true, priceUsd: 0 })} />
              <Toggle label="Paid" on={!f.isFree} onPress={() => set({ isFree: false })} />
            </View>
            {!f.isFree && <Money label="" value={f.priceUsd} onChange={(n) => set({ priceUsd: n })} />}
          </>
        )}

        {/* Type-specific detail rows */}
        {pt === 'trial' && (
          <>
            <Num label="DURATION (MINUTES)" value={f.trialDuration} onChange={(n) => set({ trialDuration: n })} />
            <Pressable onPress={() => set({ isAssessment: !f.isAssessment })} style={styles.checkboxRow}>
              <View style={[styles.check, f.isAssessment && styles.checkOn]}>{f.isAssessment ? <Ionicons name="checkmark" size={13} color={C.white} /> : null}</View>
              <Text style={styles.checkboxLabel}>This is an assessment session (Qaida level test etc.)</Text>
            </Pressable>
          </>
        )}

        {pt === 'recorded' && (
          <>
            <Pressable onPress={() => set({ downloadsEnabled: !f.downloadsEnabled })} style={styles.checkboxRow}>
              <View style={[styles.check, f.downloadsEnabled && styles.checkOn]}>{f.downloadsEnabled ? <Ionicons name="checkmark" size={13} color={C.white} /> : null}</View>
              <Text style={styles.checkboxLabel}>Allow resource downloads</Text>
            </Pressable>
            <View style={styles.lessonsReadonly}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="film-outline" size={18} color={C.gold} />
                <Text style={styles.lessonsCount}>{lessonCount} video lesson{lessonCount === 1 ? '' : 's'}</Text>
              </View>
              <Text style={styles.lessonsNote}>Add or reorder videos on the Videos screen (arriving in the next update).</Text>
            </View>
          </>
        )}

      </View>

      <Pressable onPress={onSave} disabled={saving || !f.title.trim()} style={{ marginTop: SPACE.lg, opacity: saving || !f.title.trim() ? 0.6 : 1 }}>
        <Grad>{saving ? <ActivityIndicator color={C.ink} /> : <Text style={styles.primaryText}>Save changes</Text>}</Grad>
      </Pressable>
      <View style={{ height: SPACE.section }} />
    </Screen>
  );
}

/* ── helpers ─────────────────────────────────────────────────────────────── */
function ReadonlyPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.roPill}>
      <Text style={styles.roLabel}>{label}</Text>
      <Text style={styles.roValue}>{value}</Text>
    </View>
  );
}
function Field({ label, multiline, ...props }: any) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput {...props} multiline={multiline} placeholderTextColor={C.muted}
        style={[styles.input, multiline && { height: 88, textAlignVertical: 'top' }]} />
    </View>
  );
}
function Money({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={styles.moneyRow}>
        <Text style={styles.moneyPrefix}>$</Text>
        <TextInput style={[styles.input, { flex: 1, borderWidth: 0, marginBottom: 0 }]} value={value ? String(value) : ''} onChangeText={(t) => onChange(Number(t) || 0)} placeholder="0" placeholderTextColor={C.muted} keyboardType="numeric" />
      </View>
    </View>
  );
}
function Num({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} value={value ? String(value) : ''} onChangeText={(t) => onChange(Number(t) || 0)} placeholder="0" placeholderTextColor={C.muted} keyboardType="numeric" />
    </View>
  );
}
function Pills({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {options.map((o) => {
          const on = value === o;
          return (
            <Pressable key={o} onPress={() => onChange(o)} style={[styles.pill, on && styles.pillOn]}>
              <Text style={[styles.pillText, on && { color: C.white }]}>{o}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return on ? (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.toggleOn}>
        <Text style={styles.toggleOnText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  ) : (
    <Pressable onPress={onPress} style={[styles.toggleOff, { flex: 1 }]}><Text style={styles.toggleOffText}>{label}</Text></Pressable>
  );
}
function Grad({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.grad}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: SPACE.sm },
  backText: { fontFamily: FONT.bodySemi, fontSize: 15, color: C.muted },
  eyebrow: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.gold, letterSpacing: 1 },
  h1: { fontFamily: FONT.displayBold, fontSize: 26, color: C.ink, marginTop: 2 },
  sub: { fontFamily: FONT.body, fontSize: 14, color: C.muted, marginTop: 4, marginBottom: SPACE.md },
  errorBox: { backgroundColor: 'rgba(220,38,38,0.08)', borderRadius: RADIUS.md, padding: SPACE.md, marginBottom: SPACE.md },
  errorText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.red },

  lockedRow: { flexDirection: 'row', gap: SPACE.sm },
  roPill: { flex: 1, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderSoft, backgroundColor: '#FAF8F3', paddingHorizontal: 14, paddingVertical: 10 },
  roLabel: { fontFamily: FONT.bodyBold, fontSize: 10, color: C.faint, letterSpacing: 0.8 },
  roValue: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink, marginTop: 2 },

  fieldLabel: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.muted, letterSpacing: 0.8, marginBottom: 6, marginTop: 2 },
  input: { backgroundColor: C.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderSoft, paddingHorizontal: 14, paddingVertical: 11, fontFamily: FONT.body, fontSize: 14, color: C.ink, marginBottom: 8 },
  moneyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderSoft, paddingLeft: 14, marginBottom: 8 },
  moneyPrefix: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.muted },

  row2: { flexDirection: 'row', gap: SPACE.sm },
  toggleOn: { borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  toggleOnText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.white },
  toggleOff: { borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center', backgroundColor: C.white, borderWidth: 1.5, borderColor: C.borderSoft },
  toggleOffText: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.muted },

  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.pill, backgroundColor: C.white, borderWidth: 1, borderColor: C.borderSoft },
  pillOn: { backgroundColor: C.forest, borderColor: C.forest },
  pillText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.ink },

  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.borderSoft, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: C.forest, borderColor: C.forest },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkboxLabel: { flex: 1, fontFamily: FONT.bodyMed, fontSize: 14, color: C.ink },

  lessonsReadonly: { backgroundColor: C.cream, borderRadius: RADIUS.md, padding: SPACE.md, gap: 4 },
  lessonsCount: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },
  lessonsNote: { fontFamily: FONT.body, fontSize: 12, color: C.muted },
  lockNote: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: -2 },

  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 },
  activeTitle: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },
  activeSub: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 1 },

  grad: { borderRadius: RADIUS.md, paddingVertical: 15, alignItems: 'center' },
  primaryText: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.lg },
  nfTitle: { fontFamily: FONT.displayBold, fontSize: 20, color: C.ink },
  nfBody: { fontFamily: FONT.body, fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 6 },
});
