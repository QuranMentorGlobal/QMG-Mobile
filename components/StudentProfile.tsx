// components/StudentProfile.tsx — full student Profile (mirrors web): identity
// cover, location/currency, stats, streak, awards, personal info, contact,
// Hifz/Tajweed level editor, learning goals, account, and email-notification prefs.
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { fetchStudentProfile, saveStudentProfile, saveNotifPrefs, type StudentProfileData } from '@/lib/studentProfileActions';
import { resetDisplayCurrency } from '@/lib/pricing/useDisplayCurrency';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const COUNTRIES = ['Pakistan', 'United Kingdom', 'United States', 'UAE', 'Saudi Arabia', 'Canada', 'Australia', 'Bangladesh', 'India', 'Malaysia', 'Indonesia', 'Egypt', 'Other'];
const TIMEZONES = ['Asia/Karachi', 'Europe/London', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Dhaka', 'Asia/Kolkata', 'Asia/Kuala_Lumpur', 'Australia/Sydney', 'Africa/Cairo'];
const LEARNING_GOALS = ['Complete Noorani Qaida', 'Learn to read Quran fluently', 'Master Tajweed rules', 'Memorise Juz Amma', 'Complete full Hifz', 'Learn Tafseer', 'Improve recitation', 'Other'];
const HIFZ_LEVELS = ['Not started', 'Juz 30', 'Juz 29-30', 'Juz 28-30', 'Juz 25-30', 'Half Quran', 'Juz 15-30', 'Juz 10-30', 'Juz 5-30', 'Almost complete', 'Hafiz/Hafiza ✓'];
const TAJWEED_LEVELS = ['Not started', 'Basic Makharij', 'Sifaat', 'Noon & Meem rules', 'Madd rules', 'Waqf & Ibtida', 'Advanced rules', 'Ijazah level', 'Certified ✓'];
const CURRENCY: Record<string, string> = { Pakistan: 'PKR', 'United Kingdom': 'GBP', 'United States': 'USD', UAE: 'AED', 'Saudi Arabia': 'SAR', Canada: 'CAD', Australia: 'AUD', Bangladesh: 'BDT', India: 'INR', Malaysia: 'MYR', Indonesia: 'IDR', Egypt: 'EGP', Other: 'USD' };

export function StudentProfile() {
  const { session, profile: authProfile, signOut } = useAuth();
  const uid = session?.user?.id ?? '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [d, setD] = useState<StudentProfileData | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    setD(await fetchStudentProfile(uid)); setLoading(false);
  }, [uid]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = (patch: Partial<StudentProfileData>) => setD((cur) => (cur ? { ...cur, ...patch } : cur));
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const completion = useMemo(() => {
    if (!d) return 0;
    const items = [d.firstName, d.lastName, d.phone, d.country, d.bio, d.learningGoals.length ? 'g' : '', d.hifzLevel > 0 ? 'h' : ''].filter((v) => v && String(v).trim());
    return Math.round((items.length / 7) * 100);
  }, [d]);

  if (loading || !d) return <Screen scroll={false}><Loading label="Loading profile…" /></Screen>;

  const initials = `${d.firstName.charAt(0)}${d.lastName.charAt(0)}`.toUpperCase() || 'S';
  const fullName = `${d.firstName || 'Your'} ${d.lastName || 'Name'}`.trim();
  const ccy = CURRENCY[d.country] || 'USD';

  async function save() {
    if (!d!.firstName.trim() || !d!.lastName.trim()) { flash('First and last name are required.'); return; }
    setSaving(true);
    const ok = await saveStudentProfile(uid, d!);
    if (ok) resetDisplayCurrency();
    setSaving(false);
    flash(ok ? 'Profile saved!' : 'Save failed, try again.');
  }
  async function savePrefs() {
    setSavingPrefs(true);
    const ok = await saveNotifPrefs(uid, d!.notify);
    setSavingPrefs(false);
    flash(ok ? 'Preferences saved!' : 'Save failed, try again.');
  }

  return (
    <Screen>
      {toast ? <View style={styles.toast}><Text style={styles.toastText}>✓ {toast}</Text></View> : null}

      {/* 1 — Identity / cover (first) */}
      <View style={styles.card}>
        <LinearGradient colors={G.signature} locations={G.signatureLocations} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover} />
        <View style={styles.idBody}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{fullName}</Text>
            <View style={styles.rolePill}><Text style={styles.rolePillText}>Student</Text></View>
          </View>
          {d.email ? <Text style={styles.email}>{d.email}</Text> : null}
          <Text style={styles.meta}>{[d.country, d.memberSince ? `Member since ${d.memberSince}` : null].filter(Boolean).join(' · ')}</Text>
          <View style={styles.completeRow}>
            <Text style={styles.completeLabel}>Profile completeness</Text>
            <Text style={styles.completePct}>{completion}%</Text>
          </View>
          <View style={styles.completeTrack}><LinearGradient colors={G.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.completeFill, { width: `${completion}%` }]} /></View>
        </View>
      </View>

      {/* 2 — Location / currency (second) */}
      <Section icon="location-outline" title="Your location" subtitle="Used to book or pay — we show prices in your local currency.">
        <View style={styles.locBox}>
          <Text style={styles.locCountry}>{d.country || 'Not set'}</Text>
          <Text style={styles.locCcy}>Billing currency: <Text style={{ color: C.forest, fontFamily: FONT.bodyBold }}>{ccy}</Text> · manual</Text>
        </View>
        <Field label="Or choose manually">
          <SelectField value={d.country} placeholder="Select country" options={COUNTRIES} onChange={(v) => set({ country: v })} />
        </Field>
      </Section>

      {/* 3 — Stats */}
      <StatCard icon="calendar-outline" label="BOOKINGS" value={d.stats.bookings} />
      <StatCard icon="checkmark-circle-outline" label="LESSONS DONE" value={d.stats.lessons} />
      <StatCard icon="people-outline" label="TEACHERS" value={d.stats.teachers} />

      {/* 4 — Streak */}
      <View style={[styles.streak, d.streak > 0 ? styles.streakOn : styles.streakOff]}>
        <Text style={styles.streakEmoji}>{d.streak > 0 ? '🔥' : '💤'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.streakNum, { color: d.streak > 0 ? C.orange : C.faint }]}>{d.streak} day{d.streak !== 1 ? 's' : ''}</Text>
          <Text style={styles.streakMsg}>{d.streak >= 30 ? '🏆 Legendary streak!' : d.streak >= 7 ? '🎯 One week strong!' : d.streak > 0 ? 'Keep going!' : 'Complete a lesson to start your streak'}</Text>
        </View>
      </View>

      {/* 5 — Awards */}
      <Section icon="trophy-outline" title="Your Awards" subtitle="Earned automatically as you learn">
        <Text style={styles.muted}>Complete lessons, attend regularly, and finish courses to earn awards.</Text>
      </Section>

      {/* 6 — Personal info */}
      <Section icon="person-outline" title="Personal Information" subtitle="Your name and how teachers will know you">
        <Field label="First Name"><Input value={d.firstName} onChangeText={(v) => set({ firstName: v })} placeholder="First name" /></Field>
        <Field label="Last Name"><Input value={d.lastName} onChangeText={(v) => set({ lastName: v })} placeholder="Last name" /></Field>
        <Field label="About Me" hint="Tell your teacher about your learning goals, level and age.">
          <Input value={d.bio} onChangeText={(v) => set({ bio: v })} placeholder="I'm a beginner hoping to improve my Tajweed…" multiline />
        </Field>
      </Section>

      {/* 7 — Contact & location */}
      <Section icon="globe-outline" title="Contact & Location" subtitle="How we reach you and schedule your lessons">
        <Field label="Phone / WhatsApp"><Input value={d.phone} onChangeText={(v) => set({ phone: v })} placeholder="+92 300 1234567" keyboardType="phone-pad" /></Field>
        <Field label="Country"><SelectField value={d.country} placeholder="Select country" options={COUNTRIES} onChange={(v) => set({ country: v })} /></Field>
        <Field label="Timezone" hint="Used to show lesson times in your local time."><SelectField value={d.timezone} placeholder="Select timezone" options={TIMEZONES} onChange={(v) => set({ timezone: v })} /></Field>
      </Section>

      {/* 8 — Learning progress */}
      <Section icon="book-outline" title="Learning Progress" subtitle="Track your Hifz and Tajweed journey">
        <LevelSelector label="Hifz Progress" icon="book" color={C.forest} value={d.hifzLevel} levels={HIFZ_LEVELS} onChange={(v) => set({ hifzLevel: v })} />
        <View style={{ height: SPACE.md }} />
        <LevelSelector label="Tajweed Progress" icon="musical-notes" color={C.gold} value={d.tajweedLevel} levels={TAJWEED_LEVELS} onChange={(v) => set({ tajweedLevel: v })} />
      </Section>

      {/* 9 — Learning goals */}
      <Section icon="locate-outline" title="Learning Goals" subtitle="What do you want to achieve?">
        {LEARNING_GOALS.map((g) => {
          const on = d.learningGoals.includes(g);
          return (
            <Pressable key={g} onPress={() => set({ learningGoals: on ? d.learningGoals.filter((x) => x !== g) : [...d.learningGoals, g] })} style={[styles.goal, on && styles.goalOn]}>
              <View style={[styles.goalBox, on && styles.goalBoxOn]}>{on ? <Ionicons name="checkmark" size={13} color={C.white} /> : null}</View>
              <Text style={[styles.goalText, on && styles.goalTextOn]}>{g}</Text>
            </Pressable>
          );
        })}
        {d.learningGoals.length ? <Text style={styles.goalCount}>✓ {d.learningGoals.length} goal{d.learningGoals.length !== 1 ? 's' : ''} selected</Text> : null}
      </Section>

      {/* 10 — Save */}
      <Pressable onPress={save} disabled={saving}>
        <LinearGradient colors={G.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
          {saving ? <ActivityIndicator color={C.white} /> : <Text style={styles.saveText}>Save Profile</Text>}
        </LinearGradient>
      </Pressable>

      {/* 11 — Account */}
      <Section icon="lock-closed-outline" title="Account" subtitle="Login & membership">
        <Row label="Email" value={d.email || '—'} />
        <Row label="Account type" value="Student" />
        <Row label="Member since" value={d.memberSince || '—'} />
        <Row label="Lessons done" value={String(d.stats.lessons)} last />
      </Section>

      {/* 12 — Notifications */}
      <Section icon="notifications-outline" title="Notifications" subtitle="Choose which emails you receive">
        <Text style={styles.notifNote}>In-app notifications always appear in your bell. These switches control which <Text style={{ fontFamily: FONT.bodyBold }}>emails</Text> we send you.</Text>
        <Toggle label="Bookings & lessons" hint="Requests, confirmations, cancellations and reminders" value={d.notify.notify_bookings} onChange={(v) => set({ notify: { ...d.notify, notify_bookings: v } })} />
        <Toggle label="Messages" hint="When you receive a new message" value={d.notify.notify_messages} onChange={(v) => set({ notify: { ...d.notify, notify_messages: v } })} />
        <Toggle label="Payments & earnings" hint="Payments, refunds and payout updates" value={d.notify.notify_payouts} onChange={(v) => set({ notify: { ...d.notify, notify_payouts: v } })} />
        <Toggle label="Tips & product updates" hint="Occasional news from Muddarris" value={d.notify.notify_marketing} onChange={(v) => set({ notify: { ...d.notify, notify_marketing: v } })} last />
        <Pressable onPress={savePrefs} disabled={savingPrefs} style={{ marginTop: SPACE.md }}>
          <LinearGradient colors={G.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.prefsBtn}>
            {savingPrefs ? <ActivityIndicator color={C.white} size="small" /> : <Text style={styles.prefsText}>Save preferences</Text>}
          </LinearGradient>
        </Pressable>
      </Section>

      {/* 13 — Quote */}
      <LinearGradient colors={['#16291E', '#166534']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quote}>
        <Text style={styles.quoteAr}>اقْرَأْ بِاسْمِ رَبِّكَ</Text>
        <Text style={styles.quoteEn}>"Read in the name of your Lord"</Text>
        <Text style={styles.quoteRef}>— Surah Al-Alaq 96:1</Text>
      </LinearGradient>

      <Pressable onPress={() => signOut()} style={styles.signOut}><Ionicons name="log-out-outline" size={18} color={C.red} /><Text style={styles.signOutText}>Sign out</Text></Pressable>
      <View style={{ height: SPACE.section }} />
    </Screen>
  );
}

/* ── pieces ─────────────────────────────────────────────────────────────────── */
function Section({ icon, title, subtitle, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}><Ionicons name={icon} size={18} color={C.gold} /></View>
        <View style={{ flex: 1 }}><Text style={styles.sectionTitle}>{title}</Text>{subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}</View>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <View style={{ marginBottom: SPACE.md }}><Text style={styles.fieldLabel}>{label}</Text>{children}{hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}</View>;
}
function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor={C.faint} {...props} style={[styles.input, props.multiline && styles.inputMulti, props.style]} />;
}
function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return <View style={[styles.accRow, last && { borderBottomWidth: 0 }]}><Text style={styles.accLabel}>{label}</Text><Text style={styles.accValue}>{value}</Text></View>;
}
function StatCard({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHead}><Ionicons name={icon} size={15} color={C.gold} /><Text style={styles.statLabel}>{label}</Text></View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}
function Toggle({ label, hint, value, onChange, last }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <View style={[styles.toggleRow, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1, paddingRight: 12 }}><Text style={styles.toggleLabel}>{label}</Text><Text style={styles.toggleHint}>{hint}</Text></View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#D8D5CC', true: C.forest }} thumbColor={C.white} />
    </View>
  );
}
function LevelSelector({ label, icon, color, value, levels, onChange }: { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; value: number; levels: string[]; onChange: (v: number) => void }) {
  const max = levels.length - 1;
  const pct = Math.round((value / max) * 100);
  return (
    <View style={styles.level}>
      <View style={styles.levelHead}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={icon} size={18} color={color} />
          <View><Text style={styles.levelLabel}>{label}</Text><Text style={styles.levelSub}>Level {value} of {max}</Text></View>
        </View>
        <View style={[styles.levelPct, { backgroundColor: `${color}1A` }]}><Text style={[styles.levelPctText, { color }]}>{pct}%</Text></View>
      </View>
      <View style={styles.levelTrack}><View style={[styles.levelFill, { width: `${pct}%`, backgroundColor: color }]} /></View>
      <View style={styles.levelGrid}>
        {levels.map((_, i) => (
          <Pressable key={i} onPress={() => onChange(i)} style={[styles.levelNum, value === i && { backgroundColor: color }]}>
            <Text style={[styles.levelNumText, value === i && { color: C.white }]}>{i}</Text>
          </Pressable>
        ))}
      </View>
      {value > 0 ? <Text style={[styles.levelName, { color }]}>{levels[value]}</Text> : null}
    </View>
  );
}
function SelectField({ value, placeholder, options, onChange }: { value: string; placeholder: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.select}>
        <Text style={[styles.selectText, !value && { color: C.faint }]}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={16} color={C.muted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setOpen(false)}>
          <View style={styles.modalCard}>
            <ScrollView>
              {options.map((o) => (
                <Pressable key={o} onPress={() => { onChange(o); setOpen(false); }} style={[styles.option, o === value && styles.optionOn]}>
                  <Text style={[styles.optionText, o === value && { color: C.forest, fontFamily: FONT.bodyBold }]}>{o}</Text>
                  {o === value ? <Ionicons name="checkmark" size={16} color={C.forest} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  toast: { backgroundColor: C.forest, borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 16, marginBottom: SPACE.md },
  toastText: { color: C.white, fontFamily: FONT.bodyBold, fontSize: 13, textAlign: 'center' },
  card: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, overflow: 'hidden', marginBottom: SPACE.md, ...SHADOW.card },
  cover: { height: 80 },
  idBody: { paddingHorizontal: SPACE.md, paddingBottom: SPACE.md },
  avatar: { width: 84, height: 84, borderRadius: RADIUS.lg, backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center', marginTop: -40, borderWidth: 4, borderColor: C.white, ...SHADOW.card },
  avatarText: { fontFamily: FONT.displayBold, fontSize: 30, color: C.white },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACE.md, flexWrap: 'wrap' },
  name: { fontFamily: FONT.displayBold, fontSize: 24, color: C.ink },
  rolePill: { backgroundColor: 'rgba(201,162,39,0.12)', borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 3 },
  rolePillText: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold },
  email: { fontFamily: FONT.body, fontSize: 14, color: C.forest, marginTop: 6 },
  meta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 4 },
  completeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACE.md },
  completeLabel: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.ink },
  completePct: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.gold },
  completeTrack: { height: 8, borderRadius: 4, backgroundColor: C.cream, marginTop: 6, overflow: 'hidden' },
  completeFill: { height: 8, borderRadius: 4 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACE.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(201,162,39,0.07)', backgroundColor: 'rgba(248,245,238,0.5)' },
  sectionIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(201,162,39,0.08)', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  sectionSub: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  sectionBody: { padding: SPACE.md },
  muted: { fontFamily: FONT.body, fontSize: 13, color: C.muted, lineHeight: 19 },

  locBox: { backgroundColor: C.cream, borderRadius: RADIUS.md, padding: SPACE.md, marginBottom: SPACE.md },
  locCountry: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  locCcy: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 3 },

  fieldLabel: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  fieldHint: { fontFamily: FONT.body, fontSize: 11, color: C.faint, marginTop: 5 },
  input: { borderWidth: 1.5, borderColor: '#E0DDD5', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 11, fontFamily: FONT.body, fontSize: 14, color: C.ink, backgroundColor: C.white },
  inputMulti: { minHeight: 90, textAlignVertical: 'top', paddingTop: 11 },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: '#E0DDD5', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.white },
  selectText: { fontFamily: FONT.body, fontSize: 14, color: C.ink },

  statCard: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statLabel: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.muted, letterSpacing: 0.6 },
  statValue: { fontFamily: FONT.displayBold, fontSize: 26, color: C.ink, marginTop: 6 },

  streak: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: RADIUS.lg, padding: SPACE.lg, marginBottom: SPACE.md, borderWidth: 1 },
  streakOn: { backgroundColor: '#FFF7ED', borderColor: 'rgba(234,88,12,0.15)' },
  streakOff: { backgroundColor: '#F9FAFB', borderColor: 'rgba(0,0,0,0.06)' },
  streakEmoji: { fontSize: 34 },
  streakNum: { fontFamily: FONT.displayBold, fontSize: 22 },
  streakMsg: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },

  goal: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', backgroundColor: 'rgba(0,0,0,0.02)', marginBottom: SPACE.sm },
  goalOn: { backgroundColor: 'rgba(201,162,39,0.08)', borderColor: 'rgba(201,162,39,0.25)' },
  goalBox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  goalBoxOn: { backgroundColor: C.forest, borderColor: C.gold },
  goalText: { fontFamily: FONT.body, fontSize: 14, color: C.muted },
  goalTextOn: { color: C.ink, fontFamily: FONT.bodySemi },
  goalCount: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.gold, marginTop: 4 },

  saveBtn: { borderRadius: RADIUS.md, paddingVertical: 15, alignItems: 'center', marginBottom: SPACE.md },
  saveText: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.white },

  accRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  accLabel: { fontFamily: FONT.body, fontSize: 14, color: C.muted },
  accValue: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },

  notifNote: { fontFamily: FONT.body, fontSize: 12, color: C.muted, lineHeight: 18, marginBottom: SPACE.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  toggleLabel: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },
  toggleHint: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  prefsBtn: { borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  prefsText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.white },

  level: { backgroundColor: 'rgba(201,162,39,0.04)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(201,162,39,0.08)', padding: SPACE.md },
  levelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  levelLabel: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },
  levelSub: { fontFamily: FONT.body, fontSize: 11, color: C.faint },
  levelPct: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  levelPctText: { fontFamily: FONT.bodyBold, fontSize: 11 },
  levelTrack: { height: 8, borderRadius: 4, backgroundColor: '#F0EDE6', overflow: 'hidden', marginBottom: 12 },
  levelFill: { height: 8, borderRadius: 4 },
  levelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  levelNum: { width: 34, height: 30, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center' },
  levelNumText: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.muted },
  levelName: { fontFamily: FONT.bodySemi, fontSize: 12, marginTop: 8 },

  quote: { borderRadius: RADIUS.lg, padding: SPACE.lg, alignItems: 'center', marginTop: SPACE.sm },
  quoteAr: { fontFamily: FONT.displayBold, fontSize: 24, color: C.goldLight, marginBottom: 8 },
  quoteEn: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.white, textAlign: 'center' },
  quoteRef: { fontFamily: FONT.body, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6 },

  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: SPACE.md },
  signOutText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.red },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: SPACE.lg },
  modalCard: { backgroundColor: C.white, borderRadius: RADIUS.lg, maxHeight: '70%', overflow: 'hidden', paddingVertical: 6 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.lg, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  optionOn: { backgroundColor: 'rgba(201,162,39,0.06)' },
  optionText: { fontFamily: FONT.body, fontSize: 15, color: C.ink },
});
