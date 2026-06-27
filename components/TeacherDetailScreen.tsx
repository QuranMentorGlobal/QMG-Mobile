// components/TeacherDetailScreen.tsx — full teacher profile (shared student/parent).
import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading } from '@/components/ui';
import { Panel, EmptyCard, Initials } from '@/components/dashboard';
import { fetchTeacherDetail, fetchTeachers, teacherName, type TeacherDetail, type PublicTeacher } from '@/lib/db';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';
import { Price } from '@/components/Price';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HERO = ['#15402A', '#166534', '#3F5A1E'] as const;

export function TeacherDetailScreen({ basePath }: { basePath: string }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [t, setT] = useState<TeacherDetail | null>(null);
  const [similar, setSimilar] = useState<PublicTeacher[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    const [d, all] = await Promise.all([fetchTeacherDetail(id), fetchTeachers()]);
    setT(d); setSimilar(all.filter((x) => x.id !== id).slice(0, 3));
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Screen scroll={false}><Loading label="Loading profile…" /></Screen>;
  if (!t) return <Screen><EmptyCard icon="person-outline" title="Teacher not found" body="This profile may no longer be available." /></Screen>;

  const completeness = Math.round(
    ([t.bio, t.avatar_url, t.specializations.length, t.teaching_languages.length, t.available_days.length, t.intro_video_url].filter(Boolean).length / 6) * 100,
  );
  const rate = t.hourly_rate_usd ?? 0;
  const trial = t.trial_rate_usd ?? 0;

  const verifs = [
    { label: 'Identity Verified', on: t.identity_verified },
    { label: 'Qualifications Verified', on: t.quran_mentor_verified },
    { label: 'Ijazah Certified', on: t.ijazah_verified },
    { label: 'Phone Verified', on: t.phone_verified },
    { label: 'Email Verified', on: t.email_verified },
  ];

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.backLink} hitSlop={8}>
        <Ionicons name="arrow-back" size={18} color={C.ink} />
        <Text style={styles.backText}>View All Teachers</Text>
      </Pressable>

      {/* Hero */}
      <LinearGradient colors={HERO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroAvatarWrap}>
          {t.avatar_url ? <Image source={{ uri: t.avatar_url }} style={styles.heroAvatar} /> : <Initials name={t.name} size={96} />}
        </View>
        <View style={styles.nameRow}>
          <Text style={styles.heroName}>{t.name}</Text>
          {(t.identity_verified || t.quran_mentor_verified) ? (
            <View style={styles.verifiedPill}><Ionicons name="shield-checkmark" size={12} color={C.forest} /><Text style={styles.verifiedText}>Verified</Text></View>
          ) : null}
        </View>
        <Text style={styles.heroSub}>{(t.avg_rating ?? 0) > 0 ? `${t.avg_rating?.toFixed(1)} rating` : 'New teacher'}</Text>
        <Text style={styles.heroFacts}>{[t.country, t.teaching_languages[0], t.years_experience ? `${t.years_experience} years' experience` : null].filter(Boolean).join('   ·   ')}</Text>
        <View style={styles.completeRow}>
          <Text style={styles.completeLabel}>Profile completeness</Text>
          <Text style={styles.completePct}>{completeness}%</Text>
        </View>
        <View style={styles.completeTrack}><View style={[styles.completeFill, { width: `${completeness}%` }]} /></View>
        <Text style={styles.heroPrice}><Price usd={rate} approx={false} /><Text style={styles.heroPriceUnit}>/lesson</Text></Text>
        <Pressable onPress={() => router.push(`${basePath}/${t.id}/book` as any)}>
          <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bookBtn}>
            <Text style={styles.bookText}>Book a Lesson →</Text>
          </LinearGradient>
        </Pressable>
      </LinearGradient>

      {/* Stats 2x2 */}
      <View style={styles.statGrid}>
        <StatBox icon="time-outline" value={t.years_experience ? `${t.years_experience} yrs` : '—'} label="Experience" />
        <StatBox icon="book-outline" value={t.total_lessons > 0 ? String(t.total_lessons) : '—'} label="Lessons Taught" />
        <StatBox icon="star-outline" value={t.total_reviews > 0 ? String(t.total_reviews) : '—'} label="Reviews" />
        <StatBox icon="trophy-outline" value={(t.avg_rating ?? 0) > 0 ? t.avg_rating!.toFixed(1) : 'New'} label="Rating" />
      </View>

      {t.bio ? (
        <Panel><Text style={styles.cardTitle}>About {t.firstName}</Text><Text style={styles.about}>{t.bio}</Text></Panel>
      ) : null}

      {/* Intro video */}
      <Panel>
        <Text style={styles.cardTitle}>Introduction Video</Text>
        <Pressable disabled={!t.intro_video_url} onPress={() => t.intro_video_url && Linking.openURL(t.intro_video_url)} style={styles.videoRow}>
          <View style={styles.playBtn}><Ionicons name="play" size={22} color={C.white} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.videoTitle}>Watch {t.firstName}'s Introduction</Text>
            <Text style={styles.videoSub}>{t.intro_video_url ? 'See how they teach — tap to play' : 'No introduction video yet'}</Text>
          </View>
          {t.intro_video_url ? <Text style={styles.playLabel}>▶ Play</Text> : null}
        </Pressable>
      </Panel>

      {/* Specializations */}
      {t.specializations.length > 0 ? (
        <Panel>
          <Text style={styles.cardTitle}>Teaching Specializations</Text>
          <View style={styles.chipWrap}>
            {t.specializations.map((s) => <View key={s} style={styles.specChip}><Text style={styles.specChipText}>{s}</Text></View>)}
          </View>
        </Panel>
      ) : null}

      {/* Verification */}
      <Panel>
        <Text style={styles.cardTitle}>Verification & Trust</Text>
        {verifs.map((v) => (
          <View key={v.label} style={[styles.verifRow, !v.on && { opacity: 0.4 }]}>
            <Ionicons name={v.on ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={v.on ? C.forest : C.faint} />
            <Text style={styles.verifLabel}>{v.label}</Text>
          </View>
        ))}
      </Panel>

      {/* Reviews empty */}
      <Panel style={{ alignItems: 'center', paddingVertical: SPACE.section }}>
        <Text style={[styles.cardTitle, { alignSelf: 'flex-start' }]}>Student Reviews</Text>
        <Ionicons name="star-outline" size={32} color={C.gold} style={{ marginTop: SPACE.md }} />
        <Text style={styles.reviewEmpty}>No reviews yet — be the first to review!</Text>
      </Panel>

      {/* Teaching journey */}
      <Panel>
        <Text style={styles.cardTitle}>Teaching Journey</Text>
        <Journey title={`${t.years_experience ?? 0} years of teaching`} body="Guiding students of all levels in their Qur'an learning." />
        {t.specializations.length > 0 ? <Journey title="Specialist educator" body={`Focused on ${t.specializations.join(', ')}.`} /> : null}
        {t.ijazah_verified ? <Journey title="Ijazah certified" body="Holds a traditional certification in Qur'an recitation." /> : null}
      </Panel>

      {/* CTA */}
      <LinearGradient colors={HERO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
        <Text style={styles.ctaTitle}>Ready to learn?</Text>
        <Text style={styles.ctaSub}>Book your first lesson with {t.firstName}.</Text>
        <Text style={styles.ctaTrial}>Trial from <Price usd={trial} approx={false} /></Text>
        <Text style={styles.ctaPrice}>${rate}<Text style={styles.heroPriceUnit}>/lesson</Text></Text>
        <Pressable onPress={() => router.push(`${basePath}/${t.id}/book` as any)}>
          <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bookBtn}>
            <Text style={styles.bookText}>Book a Lesson →</Text>
          </LinearGradient>
        </Pressable>
      </LinearGradient>

      {/* Available days */}
      <Panel>
        <Text style={styles.cardTitle}>Available Days</Text>
        <View style={styles.chipWrap}>
          {DAYS.map((d) => {
            const on = t.available_days.some((a) => a.toLowerCase().startsWith(d.toLowerCase()));
            return <View key={d} style={[styles.dayChip, on && styles.dayChipOn]}><Text style={[styles.dayText, on && styles.dayTextOn]}>{d}</Text></View>;
          })}
        </View>
      </Panel>

      {/* Languages */}
      {t.teaching_languages.length > 0 ? (
        <Panel>
          <Text style={styles.cardTitle}>Languages</Text>
          <View style={styles.chipWrap}>
            {t.teaching_languages.map((l) => <View key={l} style={styles.specChip}><Text style={styles.specChipText}>{l}</Text></View>)}
          </View>
        </Panel>
      ) : null}

      {/* Similar */}
      {similar.length > 0 ? (
        <>
          <Text style={[styles.cardTitle, { marginTop: SPACE.sm, marginBottom: SPACE.md, fontSize: 18 }]}>Similar Teachers</Text>
          {similar.map((s) => (
            <Pressable key={s.id} onPress={() => router.push(`${basePath}/${s.id}` as any)} style={styles.simRow}>
              {s.avatar_url ? <Image source={{ uri: s.avatar_url }} style={styles.simAvatar} /> : <Initials name={teacherName(s)} size={44} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.simName}>{teacherName(s)}</Text>
                <Text style={styles.simMeta}>{(s.avg_rating ?? 0) > 0 ? s.avg_rating?.toFixed(1) : 'New'} · {s.country ?? 'Worldwide'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.faint} />
            </Pressable>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function StatBox({ icon, value, label }: { icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={18} color={C.gold} />
      <Text style={styles.statBoxValue}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );
}

function Journey({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.journeyRow}>
      <View style={styles.journeyDot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.journeyTitle}>{title}</Text>
        <Text style={styles.journeyBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACE.xs, marginBottom: SPACE.md, alignSelf: 'flex-start', backgroundColor: C.card, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, ...SHADOW.card },
  backText: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink },
  hero: { borderRadius: RADIUS.xl, padding: SPACE.lg, alignItems: 'center', marginBottom: SPACE.md, ...SHADOW.lg },
  heroAvatarWrap: { marginBottom: SPACE.md },
  heroAvatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  heroName: { fontFamily: FONT.displayBold, fontSize: 26, color: C.white },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.white, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  verifiedText: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.forest },
  heroSub: { fontFamily: FONT.bodyMed, fontSize: 13, color: C.goldLight, marginTop: 6 },
  heroFacts: { fontFamily: FONT.body, fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 8, textAlign: 'center' },
  completeRow: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: SPACE.md, marginBottom: 6 },
  completeLabel: { fontFamily: FONT.body, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  completePct: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.white },
  completeTrack: { alignSelf: 'stretch', height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  completeFill: { height: 6, borderRadius: 3, backgroundColor: C.gold },
  heroPrice: { fontFamily: FONT.displayBold, fontSize: 28, color: C.white, marginTop: SPACE.md },
  heroPriceUnit: { fontFamily: FONT.body, fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  bookBtn: { borderRadius: RADIUS.md, paddingVertical: 15, paddingHorizontal: SPACE.section, alignItems: 'center', marginTop: SPACE.md, alignSelf: 'stretch' },
  bookText: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.white },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, marginBottom: SPACE.md },
  statBox: { width: '47.5%', flexGrow: 1, backgroundColor: C.card, borderRadius: RADIUS.lg, paddingVertical: SPACE.lg, alignItems: 'center', gap: 6, ...SHADOW.card },
  statBoxValue: { fontFamily: FONT.displayBold, fontSize: 22, color: C.ink },
  statBoxLabel: { fontFamily: FONT.body, fontSize: 12, color: C.muted },
  cardTitle: { fontFamily: FONT.displayBold, fontSize: 17, color: C.ink, marginBottom: SPACE.sm },
  about: { fontFamily: FONT.body, fontSize: 14, color: C.text, lineHeight: 22 },
  videoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.cream, borderRadius: RADIUS.md, padding: SPACE.md },
  playBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center' },
  videoTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  videoSub: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 3 },
  playLabel: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.accent2 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specChip: { borderWidth: 1.5, borderColor: C.borderSoft, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 8 },
  specChipText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.forest },
  dayChip: { width: 52, borderWidth: 1.5, borderColor: C.borderSoft, borderRadius: RADIUS.md, paddingVertical: 10, alignItems: 'center', backgroundColor: C.cream },
  dayChipOn: { borderColor: C.gold, backgroundColor: C.tintGold },
  dayText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.faint },
  dayTextOn: { color: C.accent2 },
  verifRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.tintGreen, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 8 },
  verifLabel: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink },
  reviewEmpty: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: SPACE.sm },
  journeyRow: { flexDirection: 'row', gap: 12, marginBottom: SPACE.md },
  journeyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.gold, marginTop: 5 },
  journeyTitle: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },
  journeyBody: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 3, lineHeight: 19 },
  cta: { borderRadius: RADIUS.xl, padding: SPACE.lg, alignItems: 'center', marginBottom: SPACE.md, ...SHADOW.lg },
  ctaTitle: { fontFamily: FONT.displayBold, fontSize: 22, color: C.white },
  ctaSub: { fontFamily: FONT.body, fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  ctaTrial: { fontFamily: FONT.bodyMed, fontSize: 13, color: C.goldLight, marginTop: SPACE.md },
  ctaPrice: { fontFamily: FONT.displayBold, fontSize: 26, color: C.white, marginTop: 4 },
  simRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  simAvatar: { width: 44, height: 44, borderRadius: 22 },
  simName: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  simMeta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
});
