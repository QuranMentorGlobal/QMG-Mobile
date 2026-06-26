// components/CourseWizard.tsx
// 3-step create/edit course wizard, ported from the web course-studio/new flow.
// Step 1 type → Step 2 type-specific billing/pricing (live tiers + earnings) →
// Step 3 details (+ video-lesson builder for recorded). Saves a real course via
// lib/coursesActions (courses + sub-tables + plans). Thumbnail/video are URL
// fields for now; the in-app media picker arrives with the next native build.

import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import {
  COURSE_TYPES, BILLING_OPTIONS, CATEGORIES, LEVELS, COMMISSION_PCT,
  computePlans, createCourse, updateCourse, fetchCourseForEdit,
  type ProductType, type BillingModel, type LessonsPerMo, type CourseInput, type LessonInput,
} from '@/lib/coursesActions';
import { C, FONT, RADIUS, SPACE } from '@/lib/theme';

const DEFAULTS: CourseInput = {
  productType: 'trial', billingModel: 'one_time',
  title: '', category: CATEGORIES[0], level: 'All levels', description: '', thumbnailUrl: '',
  isFree: false, priceUsd: 0,
  monthlyBasePrice: 100, lessonsPerMo: 4, enabledIntervals: ['monthly', 'quarterly', 'annual'],
  liveDuration: 60, sessionsCount: 8, startDate: '', endDate: '', capacity: 10,
  programMonths: 6,
  accessType: 'lifetime', accessDays: 365, downloadsEnabled: false, lessons: [{ title: '', video_url: '', duration: 0 }],
  trialDuration: 30, isAssessment: false,
};

const TITLE_FOR: Record<ProductType, string> = {
  trial: 'Trial Class', live: 'Live Class', recorded: 'Recorded Course', program: 'Long Course',
};

export function CourseWizard({ mode, initialType, courseId }: { mode: 'create' | 'edit'; initialType?: ProductType; courseId?: string }) {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(mode === 'edit');
  const [step, setStep] = useState<1 | 2 | 3>(mode === 'edit' ? 2 : 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [f, setF] = useState<CourseInput>({ ...DEFAULTS, productType: initialType ?? 'trial', billingModel: defaultBilling(initialType ?? 'trial') });

  useEffect(() => {
    if (mode === 'edit' && courseId) {
      fetchCourseForEdit(courseId).then((d) => {
        if (d) setF((prev) => ({ ...prev, ...d } as CourseInput));
        setLoading(false);
      });
    }
  }, [mode, courseId]);

  const set = (patch: Partial<CourseInput>) => setF((p) => ({ ...p, ...patch }));

  const plans = useMemo(() => computePlans(f.monthlyBasePrice, f.enabledIntervals), [f.monthlyBasePrice, f.enabledIntervals]);

  async function onSave() {
    if (!f.title.trim()) { setError('Please enter a course title.'); setStep(3); return; }
    setError(''); setSaving(true);
    const res = mode === 'edit' && courseId
      ? await updateCourse(session!.user.id, courseId, f)
      : await createCourse(session!.user.id, f);
    setSaving(false);
    if (!res.ok) { setError(res.error || 'Could not save course.'); return; }
    router.replace('/teacher/courses');
  }

  if (loading) return <Screen scroll={false}><Loading label="Loading course…" /></Screen>;

  return (
    <Screen>
      <Pressable onPress={() => (step === 1 || mode === 'edit' ? router.back() : setStep((s) => (s - 1) as 1 | 2 | 3))} style={styles.back}>
        <Ionicons name="arrow-back" size={18} color={C.muted} /><Text style={styles.backText}>Back</Text>
      </Pressable>

      {mode === 'create' && <Text style={styles.stepLabel}>STEP {step} OF 3</Text>}
      <Text style={styles.h1}>{step === 1 ? 'Course Type' : step === 2 ? 'Billing & Pricing' : 'Course Details'}</Text>
      <Text style={styles.sub}>
        {step === 1 ? 'Choose the type of course. This sets the billing model and workflow.'
          : step === 2 ? 'Set how students will pay for this course.'
          : 'Add the content and details for your course.'}
      </Text>

      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

      {step === 1 && <StepType f={f} set={set} />}
      {step === 2 && <StepBilling f={f} set={set} plans={plans} />}
      {step === 3 && <StepDetails f={f} set={set} />}

      {/* Footer nav */}
      {step === 1 ? (
        <Pressable onPress={() => f.productType && setStep(2)} disabled={!f.productType} style={{ marginTop: SPACE.lg }}>
          <Grad><Text style={styles.primaryText}>Continue → Billing</Text></Grad>
        </Pressable>
      ) : step === 2 ? (
        <Pressable onPress={() => setStep(3)} style={{ marginTop: SPACE.lg }}>
          <Grad><Text style={styles.primaryText}>Continue → Course Details</Text></Grad>
        </Pressable>
      ) : (
        <Pressable onPress={onSave} disabled={saving || !f.title.trim()} style={{ marginTop: SPACE.lg, opacity: saving || !f.title.trim() ? 0.6 : 1 }}>
          <Grad>
            {saving ? <ActivityIndicator color={C.ink} /> : <Text style={styles.primaryText}>{mode === 'edit' ? 'Save changes' : `Create ${TITLE_FOR[f.productType]}`}</Text>}
          </Grad>
        </Pressable>
      )}
      <View style={{ height: SPACE.section }} />
    </Screen>
  );
}

// ── Step 1: type ────────────────────────────────────────────────────────────────
function StepType({ f, set }: { f: CourseInput; set: (p: Partial<CourseInput>) => void }) {
  return (
    <View style={{ gap: SPACE.sm }}>
      {COURSE_TYPES.map((t) => {
        const on = f.productType === t.key;
        return (
          <Pressable key={t.key} onPress={() => set({ productType: t.key, billingModel: defaultBilling(t.key) })}
            style={[styles.typeCard, on && styles.typeCardOn]}>
            <View style={[styles.typeIcon, on && { backgroundColor: 'rgba(201,162,39,0.15)' }]}>
              <Ionicons name={t.icon as any} size={20} color={on ? C.gold : C.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.typeTitle, on && { color: C.forest }]}>{t.title}</Text>
              <Text style={styles.typeSub}>{t.sub}</Text>
            </View>
            {on ? <Ionicons name="checkmark-circle" size={20} color={C.forest} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Step 2: billing ─────────────────────────────────────────────────────────────
function StepBilling({ f, set, plans }: { f: CourseInput; set: (p: Partial<CourseInput>) => void; plans: ReturnType<typeof computePlans> }) {
  const opts = BILLING_OPTIONS[f.productType];
  return (
    <View style={{ gap: SPACE.md }}>
      {opts.length > 1 && (
        <View style={{ gap: SPACE.sm }}>
          <Text style={styles.fieldLabel}>BILLING TYPE</Text>
          {opts.map((o) => {
            const on = f.billingModel === o.key;
            return (
              <Pressable key={o.key} onPress={() => set({ billingModel: o.key })} style={[styles.billOpt, on && styles.billOptOn]}>
                <Text style={[styles.billOptTitle, on && { color: C.forest }]}>{o.label}</Text>
                <Text style={styles.billOptSub}>{o.sub}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* TRIAL / RECORDED: Free/Paid + price */}
      {(f.productType === 'trial' || f.productType === 'recorded') && (
        <>
          <Text style={styles.fieldLabel}>PRICING</Text>
          <View style={styles.row2}>
            <Toggle label="Free" on={f.isFree} onPress={() => set({ isFree: true, priceUsd: 0 })} />
            <Toggle label="Paid" on={!f.isFree} onPress={() => set({ isFree: false })} />
          </View>
          {!f.isFree && <Money label="" value={f.priceUsd} onChange={(n) => set({ priceUsd: n })} />}
          {f.productType === 'recorded' && (
            <>
              <Text style={styles.fieldLabel}>ACCESS DURATION</Text>
              <View style={styles.row2}>
                <Toggle label="Lifetime" on={f.accessType === 'lifetime'} onPress={() => set({ accessType: 'lifetime' })} />
                <Toggle label="Limited" on={f.accessType === 'limited'} onPress={() => set({ accessType: 'limited' })} />
              </View>
              {f.accessType === 'limited' && <Num label="ACCESS DAYS" value={f.accessDays} onChange={(n) => set({ accessDays: n })} />}
            </>
          )}
          {f.productType === 'trial' && <Num label="DURATION (MINUTES)" value={f.trialDuration} onChange={(n) => set({ trialDuration: n })} />}
        </>
      )}

      {/* LIVE: lessons/mo + base price + tiers + earnings */}
      {f.productType === 'live' && (
        <>
          <Text style={styles.fieldLabel}>LESSONS PER MONTH</Text>
          <View style={styles.row2}>
            {[4, 8, 12].map((n) => (
              <Toggle key={n} label={`${n}/mo`} on={f.lessonsPerMo === n} onPress={() => set({ lessonsPerMo: n as LessonsPerMo })} />
            ))}
          </View>
          <Money label="MONTHLY BASE PRICE (USD)" value={f.monthlyBasePrice} onChange={(n) => set({ monthlyBasePrice: n })} />
          <Text style={styles.fieldLabel}>SUBSCRIPTION TIERS AVAILABLE</Text>
          {(['monthly', 'quarterly', 'semi_annual', 'annual'] as BillingModel[]).map((iv) => {
            const on = f.enabledIntervals.includes(iv);
            const plan = computePlans(f.monthlyBasePrice, [iv])[0];
            return (
              <Pressable key={iv} onPress={() => set({ enabledIntervals: on ? f.enabledIntervals.filter((x) => x !== iv) : [...f.enabledIntervals, iv] })}
                style={[styles.tierRow, on && styles.tierRowOn]}>
                <View style={[styles.check, on && styles.checkOn]}>{on ? <Ionicons name="checkmark" size={13} color={C.white} /> : null}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tierTitle}>{cap(plan.label)}{plan.months > 1 ? ` (${plan.months} mo)` : ''}</Text>
                  <Text style={styles.tierSub}>{f.lessonsPerMo} lessons × {plan.months} month{plan.months > 1 ? 's' : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.tierPrice}>${plan.price}</Text>
                  {plan.discount > 0 ? <Text style={styles.tierSave}>Save ${plan.months * f.monthlyBasePrice - plan.price}</Text> : null}
                </View>
              </Pressable>
            );
          })}
          <View style={styles.earnBox}>
            <Text style={styles.earnTitle}>Your Earnings (after {COMMISSION_PCT}% platform commission)</Text>
            <View style={styles.earnRow}>
              {plans.map((p) => (
                <View key={p.interval} style={styles.earnCell}>
                  <Text style={styles.earnLbl}>{cap(p.label)}</Text>
                  <Text style={styles.earnVal}>${Math.round(p.price * (1 - COMMISSION_PCT / 100))}</Text>
                  <Text style={styles.earnLbl}>you earn</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      {/* PROGRAM: months + installment/upfront price */}
      {f.productType === 'program' && (
        <>
          <Num label="PROGRAM DURATION (MONTHS)" value={f.programMonths} onChange={(n) => set({ programMonths: n })} />
          {f.billingModel === 'monthly'
            ? <Money label="MONTHLY INSTALLMENT PRICE (USD)" value={f.monthlyBasePrice} onChange={(n) => set({ monthlyBasePrice: n })} />
            : <Money label="UPFRONT PRICE (USD)" value={f.priceUsd} onChange={(n) => set({ priceUsd: n })} />}
        </>
      )}
    </View>
  );
}

// ── Step 3: details ─────────────────────────────────────────────────────────────
function StepDetails({ f, set }: { f: CourseInput; set: (p: Partial<CourseInput>) => void }) {
  function updateLesson(i: number, patch: Partial<LessonInput>) {
    set({ lessons: f.lessons.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });
  }
  return (
    <View style={{ gap: SPACE.md }}>
      <Field label="COURSE TITLE *" value={f.title} onChangeText={(t: string) => set({ title: t })} placeholder="e.g. Complete Tajweed Mastery Program" />
      <Pills label="CATEGORY" options={CATEGORIES} value={f.category} onChange={(v) => set({ category: v })} />
      <Pills label="LEVEL" options={LEVELS} value={f.level} onChange={(v) => set({ level: v })} />
      <Field label="DESCRIPTION" value={f.description} onChangeText={(t: string) => set({ description: t })} placeholder="What will students learn?" multiline />
      <Field label="THUMBNAIL URL (OPTIONAL)" value={f.thumbnailUrl} onChangeText={(t: string) => set({ thumbnailUrl: t })} placeholder="https://…" autoCapitalize="none" />

      {f.productType === 'trial' && (
        <Pressable onPress={() => set({ isAssessment: !f.isAssessment })} style={styles.checkboxRow}>
          <View style={[styles.check, f.isAssessment && styles.checkOn]}>{f.isAssessment ? <Ionicons name="checkmark" size={13} color={C.white} /> : null}</View>
          <Text style={styles.checkboxLabel}>This is an assessment session (Qaida level test etc.)</Text>
        </Pressable>
      )}

      {f.productType === 'live' && (
        <>
          <Num label="SESSION LENGTH (MINUTES)" value={f.liveDuration} onChange={(n) => set({ liveDuration: n })} />
          <Num label="CAPACITY (MAX STUDENTS)" value={f.capacity} onChange={(n) => set({ capacity: n })} />
          <Field label="START DATE (YYYY-MM-DD)" value={f.startDate} onChangeText={(t: string) => set({ startDate: t })} placeholder="2026-07-01" autoCapitalize="none" />
          <Field label="END DATE (OPTIONAL)" value={f.endDate} onChangeText={(t: string) => set({ endDate: t })} placeholder="YYYY-MM-DD" autoCapitalize="none" />
        </>
      )}

      {f.productType === 'recorded' && (
        <>
          <Pressable onPress={() => set({ downloadsEnabled: !f.downloadsEnabled })} style={styles.checkboxRow}>
            <View style={[styles.check, f.downloadsEnabled && styles.checkOn]}>{f.downloadsEnabled ? <Ionicons name="checkmark" size={13} color={C.white} /> : null}</View>
            <Text style={styles.checkboxLabel}>Allow resource downloads</Text>
          </Pressable>

          <View style={styles.lessonsHead}>
            <Text style={styles.fieldLabel}>VIDEO LESSONS</Text>
            <Pressable onPress={() => set({ lessons: [...f.lessons, { title: '', video_url: '', duration: 0 }] })}>
              <Grad small><Text style={styles.addText}>+ Add Lesson</Text></Grad>
            </Pressable>
          </View>
          {f.lessons.map((l, i) => (
            <View key={i} style={styles.lessonCard}>
              <View style={styles.lessonTop}>
                <Text style={styles.lessonNo}>Lesson {i + 1}</Text>
                {f.lessons.length > 1 ? (
                  <Pressable onPress={() => set({ lessons: f.lessons.filter((_, idx) => idx !== i) })}>
                    <Ionicons name="trash-outline" size={16} color={C.red} />
                  </Pressable>
                ) : null}
              </View>
              <TextInput style={styles.input} value={l.title} onChangeText={(t: string) => updateLesson(i, { title: t })} placeholder="Lesson title" placeholderTextColor={C.muted} />
              <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
                <TextInput style={[styles.input, { flex: 2 }]} value={l.video_url} onChangeText={(t: string) => updateLesson(i, { video_url: t })} placeholder="Video URL" placeholderTextColor={C.muted} autoCapitalize="none" />
                <TextInput style={[styles.input, { flex: 1 }]} value={l.duration ? String(l.duration) : ''} onChangeText={(t: string) => updateLesson(i, { duration: Number(t) || 0 })} placeholder="min" placeholderTextColor={C.muted} keyboardType="numeric" />
              </View>
            </View>
          ))}
          <Text style={styles.hint}>Tip: in-app video upload arrives in the next app update — paste a video URL for now.</Text>
        </>
      )}
    </View>
  );
}

/* ── small field helpers ─────────────────────────────────────────────── */
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
        <TextInput style={[styles.input, { flex: 1, borderWidth: 0 }]} value={value ? String(value) : ''} onChangeText={(t: string) => onChange(Number(t) || 0)} placeholder="0" placeholderTextColor={C.muted} keyboardType="numeric" />
      </View>
    </View>
  );
}
function Num({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} value={value ? String(value) : ''} onChangeText={(t: string) => onChange(Number(t) || 0)} placeholder="0" placeholderTextColor={C.muted} keyboardType="numeric" />
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
function Grad({ children, small }: { children: React.ReactNode; small?: boolean }) {
  return (
    <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={[styles.grad, small && { paddingVertical: 9, paddingHorizontal: 14, borderRadius: RADIUS.md }]}>
      {children}
    </LinearGradient>
  );
}
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function defaultBilling(t: ProductType): BillingModel { return BILLING_OPTIONS[t][0].key; }

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: SPACE.sm },
  backText: { fontFamily: FONT.bodySemi, fontSize: 15, color: C.muted },
  stepLabel: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.gold, letterSpacing: 1 },
  h1: { fontFamily: FONT.displayBold, fontSize: 26, color: C.ink, marginTop: 2 },
  sub: { fontFamily: FONT.body, fontSize: 14, color: C.muted, marginTop: 4, marginBottom: SPACE.md },
  errorBox: { backgroundColor: 'rgba(220,38,38,0.08)', borderRadius: RADIUS.md, padding: SPACE.md, marginBottom: SPACE.md },
  errorText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.red },

  typeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: C.borderSoft, padding: SPACE.md },
  typeCardOn: { borderColor: C.gold, backgroundColor: 'rgba(201,162,39,0.05)' },
  typeIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' },
  typeTitle: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  typeSub: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },

  fieldLabel: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.muted, letterSpacing: 0.8, marginBottom: 6, marginTop: 2 },
  billOpt: { backgroundColor: C.white, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: C.borderSoft, padding: SPACE.md },
  billOptOn: { borderColor: C.gold, backgroundColor: 'rgba(201,162,39,0.06)' },
  billOptTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  billOptSub: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },

  row2: { flexDirection: 'row', gap: SPACE.sm, flexWrap: 'wrap' },
  toggleOn: { borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  toggleOnText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.white },
  toggleOff: { borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center', backgroundColor: C.white, borderWidth: 1.5, borderColor: C.borderSoft },
  toggleOffText: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.muted },

  input: { backgroundColor: C.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderSoft, paddingHorizontal: 14, paddingVertical: 11, fontFamily: FONT.body, fontSize: 14, color: C.ink, marginBottom: 8 },
  moneyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderSoft, paddingLeft: 14 },
  moneyPrefix: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.muted },

  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: C.borderSoft, padding: SPACE.md, marginBottom: 8 },
  tierRowOn: { borderColor: C.gold, backgroundColor: 'rgba(201,162,39,0.05)' },
  tierTitle: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },
  tierSub: { fontFamily: FONT.body, fontSize: 11, color: C.muted, marginTop: 1 },
  tierPrice: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  tierSave: { fontFamily: FONT.bodySemi, fontSize: 11, color: C.success },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.borderSoft, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: C.forest, borderColor: C.forest },

  earnBox: { backgroundColor: 'rgba(201,162,39,0.08)', borderRadius: RADIUS.lg, padding: SPACE.md, marginTop: 4 },
  earnTitle: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.gold, marginBottom: 10 },
  earnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md },
  earnCell: { minWidth: '40%', alignItems: 'center' },
  earnLbl: { fontFamily: FONT.body, fontSize: 11, color: C.muted },
  earnVal: { fontFamily: FONT.displayBold, fontSize: 20, color: C.ink, marginVertical: 1 },

  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.pill, backgroundColor: C.white, borderWidth: 1, borderColor: C.borderSoft },
  pillOn: { backgroundColor: C.forest, borderColor: C.forest },
  pillText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.ink },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkboxLabel: { flex: 1, fontFamily: FONT.bodyMed, fontSize: 14, color: C.ink },

  lessonsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  addText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.ink },
  lessonCard: { backgroundColor: C.cream, borderRadius: RADIUS.md, padding: SPACE.md, marginTop: 8 },
  lessonTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  lessonNo: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.gold },
  hint: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 6 },

  grad: { borderRadius: RADIUS.md, paddingVertical: 15, alignItems: 'center' },
  primaryText: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
});
