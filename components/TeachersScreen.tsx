// components/TeachersScreen.tsx — Browse Teachers (shared student/parent).
// Search · category chips with counts · max-price filter · marketplace cards.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading } from '@/components/ui';
import { EmptyCard, Initials } from '@/components/dashboard';
import { fetchTeachers, teacherName, aiStatus, aiRecommendTeachers, type PublicTeacher } from '@/lib/db';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';
import { Price } from '@/components/Price';

const CATEGORIES = ['All Teachers', 'Noorani Qaida', 'Tajweed', 'Hifz', 'Tafseer', 'Islamic Studies', 'Ijazah'];
const PRICE_CAPS = [25, 50, 100, 200];
const HEADER_GRADIENT = ['#15402A', '#166534'] as const;

const GOALS = [{ v: 'any', l: 'Any subject' }, { v: 'Noorani Qaida', l: 'Noorani Qaida' }, { v: 'Tajweed', l: 'Tajweed' }, { v: 'Hifz', l: 'Hifz' }, { v: 'Tafseer', l: 'Tafseer' }, { v: 'Islamic Studies', l: 'Islamic Studies' }, { v: 'Ijazah', l: 'Ijazah' }];

export function TeachersScreen({ basePath }: { basePath: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<PublicTeacher[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All Teachers');
  const [maxPrice, setMaxPrice] = useState(200);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [goal, setGoal] = useState('any');
  const [language, setLanguage] = useState('');
  const [gender, setGender] = useState('any');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [recs, setRecs] = useState<{ id: string; why: string }[] | null>(null);
  const [aiMsg, setAiMsg] = useState('');
  useEffect(() => { aiStatus().then(setAiEnabled); }, []);
  const byId = useMemo(() => Object.fromEntries(teachers.map((t) => [t.id, t])), [teachers]);
  const matched = (recs || []).map((r) => ({ teacher: byId[r.id] as PublicTeacher | undefined, why: r.why })).filter((x) => x.teacher);
  async function findMatch() {
    setAiLoading(true); setRecs(null); setAiMsg('');
    const list = await aiRecommendTeachers({ goal, language, gender, maxBudget: budget ? Number(budget) : 0, notes });
    setRecs(list);
    if (list.length === 0) setAiMsg('No teachers matched those preferences — try widening them.');
    setAiLoading(false);
  }

  const load = useCallback(async () => {
    setTeachers(await fetchTeachers());
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const counts = useMemo(() => {
    const c: Record<string, number> = { 'All Teachers': teachers.length };
    CATEGORIES.slice(1).forEach((k) => {
      c[k] = teachers.filter((t) => (t.specializations ?? []).some((s) => s.toLowerCase().includes(k.toLowerCase()))).length;
    });
    return c;
  }, [teachers]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return teachers.filter((t) => {
      if (cat !== 'All Teachers' && !(t.specializations ?? []).some((s) => s.toLowerCase().includes(cat.toLowerCase()))) return false;
      const rate = t.hourly_rate_usd ?? 0;
      if (rate > maxPrice) return false;
      if (needle) {
        const hay = [teacherName(t), t.country ?? '', ...(t.specializations ?? []), ...(t.teaching_languages ?? [])].join(' ').toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [teachers, q, cat, maxPrice]);

  if (loading) return <Screen scroll={false}><Loading label="Finding teachers…" /></Screen>;

  return (
    <Screen>
      <Text style={styles.h1}>Teachers</Text>
      <Text style={styles.sub}>Find a certified Qari that matches your learning goals.</Text>

      {aiEnabled && (
        <View style={styles.aiCard}>
          <Pressable onPress={() => setAiOpen((o) => !o)} style={styles.aiHeader}>
            <View style={styles.aiIcon}><Ionicons name="sparkles" size={18} color={C.gold} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTitle}>Find my best match</Text>
              <Text style={styles.aiBody}>Answer a few questions and let AI pick teachers for you.</Text>
            </View>
            <Ionicons name={aiOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
          </Pressable>
          {aiOpen && (
            <View style={styles.aiForm}>
              <Text style={styles.aiLabel}>What do you want to learn?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.aiChipRow}>
                {GOALS.map((g) => (
                  <Pressable key={g.v} onPress={() => setGoal(g.v)} style={[styles.aiChip, goal === g.v && styles.aiChipOn]}>
                    <Text style={[styles.aiChipText, goal === g.v && styles.aiChipTextOn]}>{g.l}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.aiLabel}>Preferred language</Text>
              <TextInput value={language} onChangeText={setLanguage} placeholder="e.g. English, Urdu, Arabic" placeholderTextColor={C.faint} style={styles.aiInput} />
              <Text style={styles.aiLabel}>Teacher gender</Text>
              <View style={styles.aiChipWrap}>
                {[['any', 'No preference'], ['male', 'Male'], ['female', 'Female']].map(([v, l]) => (
                  <Pressable key={v} onPress={() => setGender(v)} style={[styles.aiChip, gender === v && styles.aiChipOn]}>
                    <Text style={[styles.aiChipText, gender === v && styles.aiChipTextOn]}>{l}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.aiLabel}>Max budget / hour (USD)</Text>
              <TextInput value={budget} onChangeText={(v) => setBudget(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="e.g. 25" placeholderTextColor={C.faint} style={styles.aiInput} />
              <Text style={styles.aiLabel}>Anything else? (optional)</Text>
              <TextInput value={notes} onChangeText={setNotes} placeholder="e.g. patient with kids, flexible evenings" placeholderTextColor={C.faint} style={styles.aiInput} />
              <Pressable onPress={findMatch} disabled={aiLoading} style={{ marginTop: SPACE.md }}>
                <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.aiBtn, aiLoading && { opacity: 0.6 }]}>
                  <Text style={styles.aiBtnText}>{aiLoading ? 'Finding your match…' : 'Find my match'}</Text>
                </LinearGradient>
              </Pressable>
              {aiMsg ? <Text style={styles.aiNote}>{aiMsg}</Text> : null}
              {matched.length > 0 && (
                <View style={{ marginTop: SPACE.md }}>
                  <Text style={styles.aiRecHead}>RECOMMENDED FOR YOU</Text>
                  {matched.map(({ teacher, why }) => (
                    <View key={teacher!.id} style={{ marginBottom: SPACE.md }}>
                      {!!why && (
                        <View style={styles.whyBox}>
                          <Ionicons name="sparkles" size={13} color={C.gold} style={{ marginTop: 1 }} />
                          <Text style={styles.whyText}>{why}</Text>
                        </View>
                      )}
                      <TeacherCard t={teacher!} onProfile={() => router.push(`${basePath}/${teacher!.id}` as any)} onCourses={() => router.push(`${basePath}/${teacher!.id}/book` as any)} />
                    </View>
                  ))}
                  <Text style={styles.aiDisclaimer}>AI-ranked from teachers matching your filters · always review profiles before booking.</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={C.faint} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search by name, course, or keyword…" placeholderTextColor={C.faint} style={styles.searchInput} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {CATEGORIES.map((k) => {
          const active = cat === k;
          return (
            <Pressable key={k} onPress={() => setCat(k)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{k}</Text>
              <View style={[styles.chipCount, active && styles.chipCountActive]}><Text style={[styles.chipCountText, active && { color: C.ink }]}>{counts[k] ?? 0}</Text></View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.priceCard}>
        <Text style={styles.priceLabel}>Max Price</Text>
        <View style={styles.priceCaps}>
          {PRICE_CAPS.map((p) => (
            <Pressable key={p} onPress={() => setMaxPrice(p)} style={[styles.cap, maxPrice === p && styles.capActive]}>
              <Text style={[styles.capText, maxPrice === p && styles.capTextActive]}>${p}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.found}>{filtered.length} teacher{filtered.length === 1 ? '' : 's'} found</Text>

      {filtered.length === 0 ? (
        <EmptyCard icon="search-outline" title="No teachers match" body="Try clearing the search or widening the price." />
      ) : (
        filtered.map((t) => <TeacherCard key={t.id} t={t} onProfile={() => router.push(`${basePath}/${t.id}` as any)} onCourses={() => router.push(`${basePath}/${t.id}/book` as any)} />)
      )}
    </Screen>
  );
}

function TeacherCard({ t, onProfile, onCourses }: { t: PublicTeacher; onProfile: () => void; onCourses: () => void }) {
  const name = teacherName(t);
  const exp = t.years_experience ?? 0;
  const rating = t.avg_rating ?? 0;
  const spec = (t.specializations ?? [])[0];
  const langs = (t.teaching_languages ?? []).slice(0, 3).join(', ');
  return (
    <View style={styles.card}>
      <LinearGradient colors={HEADER_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardHeader}>
        {t.avatar_url ? <Image source={{ uri: t.avatar_url }} style={styles.cardAvatar} /> : <View style={styles.cardAvatarFallback}><Initials name={name} size={56} /></View>}
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
          <Text style={styles.cardMeta}>{t.country ?? 'Worldwide'} · {exp}yr exp</Text>
          <View style={styles.stars}>
            {[0, 1, 2, 3, 4].map((i) => <Ionicons key={i} name="star" size={13} color={i < Math.round(rating) ? C.goldLight : 'rgba(255,255,255,0.3)'} />)}
            <Text style={styles.newTag}>{rating > 0 ? rating.toFixed(1) : 'New'}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.cardBody}>
        {t.bio ? <Text style={styles.bio} numberOfLines={1}>{t.bio}</Text> : null}
        {spec ? <View style={styles.specPill}><Text style={styles.specText}>{spec}</Text></View> : null}
        {langs ? (
          <View style={styles.langRow}><Ionicons name="globe-outline" size={13} color={C.muted} /><Text style={styles.langText}>{langs}</Text></View>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statValue}>{t.total_lessons ?? 0}</Text><Text style={styles.statLabel}>Lessons</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><Text style={styles.statValue}>{t.total_reviews ?? 0}</Text><Text style={styles.statLabel}>Reviews</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><Price usd={t.hourly_rate_usd ?? 0} approx={false} style={styles.priceValue} /><Text style={styles.statLabel}>per hour</Text></View>
        </View>

        <View style={styles.trialRow}>
          <Text style={styles.trialLabel}>First trial lesson</Text>
          {(t.trial_rate_usd ?? 0) === 0 ? <Text style={styles.trialFree}>Free</Text> : <Price usd={t.trial_rate_usd ?? 0} approx={false} style={styles.trialFree} />}
        </View>

        <View style={styles.btnRow}>
          <Pressable onPress={onProfile} style={styles.outlineBtn}><Text style={styles.outlineText}>View Profile</Text></Pressable>
          <Pressable onPress={onCourses} style={{ flex: 1 }}>
            <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fillBtn}>
              <Text style={styles.fillText}>View Courses →</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: FONT.displayBold, fontSize: 28, color: C.ink, textAlign: 'center', marginTop: SPACE.xs },
  sub: { fontFamily: FONT.body, fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 4, marginBottom: SPACE.md },
  aiCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  aiIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.tintGold, alignItems: 'center', justifyContent: 'center' },
  aiTitle: { fontFamily: FONT.displayBold, fontSize: 15, color: C.ink },
  aiBody: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiForm: { marginTop: SPACE.md, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: C.borderSoft },
  aiLabel: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.ink, marginBottom: 6, marginTop: 10 },
  aiChipRow: { gap: 8, paddingRight: SPACE.md },
  aiChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  aiChip: { borderWidth: 1, borderColor: '#D4C99A', borderRadius: RADIUS.pill, paddingHorizontal: 13, paddingVertical: 7, backgroundColor: C.white },
  aiChipOn: { backgroundColor: C.tintGold, borderColor: C.gold },
  aiChipText: { fontFamily: FONT.bodySemi, fontSize: 12.5, color: C.text },
  aiChipTextOn: { color: C.accent2 },
  aiInput: { borderWidth: 1, borderColor: '#D4C99A', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, fontFamily: FONT.body, fontSize: 14, color: C.ink, backgroundColor: C.white },
  aiBtn: { borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  aiBtnText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.white },
  aiNote: { fontFamily: FONT.body, fontSize: 12.5, color: C.accent2, marginTop: 10 },
  aiRecHead: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold, letterSpacing: 1, marginBottom: 10 },
  whyBox: { flexDirection: 'row', gap: 7, alignItems: 'flex-start', backgroundColor: C.tintGold, borderTopLeftRadius: RADIUS.md, borderTopRightRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 9 },
  whyText: { flex: 1, fontFamily: FONT.bodyMed, fontSize: 12, color: C.accent2, lineHeight: 17 },
  aiDisclaimer: { fontFamily: FONT.body, fontSize: 11, color: C.faint, marginTop: 4 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: RADIUS.md, paddingHorizontal: 14, height: 48, marginBottom: SPACE.md, borderWidth: 1, borderColor: C.borderSoft },
  searchInput: { flex: 1, fontFamily: FONT.body, fontSize: 14, color: C.ink },
  chips: { gap: 8, paddingBottom: SPACE.sm, paddingRight: SPACE.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderSoft },
  chipActive: { backgroundColor: C.forest, borderColor: C.forest },
  chipText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.text },
  chipTextActive: { color: C.white },
  chipCount: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  chipCountActive: { backgroundColor: C.gold },
  chipCountText: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.muted },
  priceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: RADIUS.md, padding: SPACE.sm, paddingHorizontal: SPACE.md, marginTop: SPACE.xs, marginBottom: SPACE.md, ...SHADOW.card },
  priceLabel: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.ink },
  priceCaps: { flexDirection: 'row', gap: 6, flex: 1, justifyContent: 'flex-end' },
  cap: { borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.cream },
  capActive: { backgroundColor: C.forest },
  capText: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.muted },
  capTextActive: { color: C.white },
  found: { fontFamily: FONT.bodyMed, fontSize: 12, color: C.muted, marginBottom: SPACE.md },

  card: { backgroundColor: C.card, borderRadius: RADIUS.lg, marginBottom: SPACE.md, overflow: 'hidden', ...SHADOW.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: SPACE.md },
  cardAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  cardAvatarFallback: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden' },
  cardName: { fontFamily: FONT.displayBold, fontSize: 19, color: C.white },
  cardMeta: { fontFamily: FONT.body, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6 },
  newTag: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.goldLight, marginLeft: 6 },
  cardBody: { padding: SPACE.md },
  bio: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginBottom: SPACE.sm },
  specPill: { alignSelf: 'flex-start', backgroundColor: C.tintGold, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 5, marginBottom: SPACE.sm },
  specText: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.accent2 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACE.md },
  langText: { fontFamily: FONT.body, fontSize: 12, color: C.muted },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACE.md },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 28, backgroundColor: C.borderSoft },
  statValue: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink },
  priceValue: { fontFamily: FONT.displayBold, fontSize: 18, color: C.gold },
  statLabel: { fontFamily: FONT.body, fontSize: 11, color: C.muted, marginTop: 2 },
  trialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.cream, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, marginBottom: SPACE.md },
  trialLabel: { fontFamily: FONT.bodyMed, fontSize: 13, color: C.text },
  trialFree: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.gold },
  btnRow: { flexDirection: 'row', gap: 10 },
  outlineBtn: { flex: 1, borderWidth: 1.5, borderColor: C.borderSoft, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center', backgroundColor: C.cream },
  outlineText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.accent2 },
  fillBtn: { borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  fillText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.white },
});
