// src/screens/teachers/TeacherProfileScreen.tsx
// Reads the same public_teachers view + public reviews the web profile uses.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Screen, Avatar, Stars, Badge, Button } from '@/components';
import { colors, fonts, radius, spacing } from '@/theme';
import { fetchTeacherById, fetchTeacherReviews } from '@/services/teachers';
import type { PublicTeacher, Review } from '@/types/database';
import type { AppScreenProps } from '@/navigation/types';

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

export function TeacherProfileScreen({ route, navigation }: AppScreenProps<'TeacherProfile'>) {
  const { id } = route.params;
  const [teacher, setTeacher] = useState<PublicTeacher | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [t, r] = await Promise.all([fetchTeacherById(id), fetchTeacherReviews(id, 10)]);
      setTeacher(t);
      setReviews(r);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <Screen>
        <StatusBar style="light" />
        <View style={styles.center}><ActivityIndicator color={colors.gold} /></View>
      </Screen>
    );
  }

  if (!teacher) {
    return (
      <Screen>
        <StatusBar style="light" />
        <View style={styles.center}>
          <Text style={styles.notFound}>Teacher not found</Text>
          <Button label="Go back" variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: 16 }} />
        </View>
      </Screen>
    );
  }

  const name = `${teacher.first_name} ${teacher.last_name}`.trim();
  const initials = `${teacher.first_name?.[0] ?? ''}${teacher.last_name?.[0] ?? ''}`.toUpperCase();
  const rating = teacher.avg_rating ?? 0;
  const trial = Number(teacher.trial_rate_usd);

  return (
    <Screen padded={false}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}><Text style={styles.backTxt}>‹  Teachers</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Avatar uri={teacher.avatar_url} initials={initials} size={88} />
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.role}>Online Quran Teacher{teacher.country ? ` · ${teacher.country}` : ''}</Text>
          <View style={styles.ratingRow}>
            <Stars rating={rating} size={15} />
            <Text style={styles.ratingTxt}>{rating > 0 ? rating.toFixed(1) : 'New'}</Text>
            <Text style={styles.reviewsTxt}>({teacher.total_reviews ?? 0} reviews)</Text>
          </View>
          <View style={styles.badges}>
            {teacher.ijazah_verified ? <Badge label="Ijazah Certified" /> : null}
            {teacher.identity_verified ? <Badge label="ID Verified" tone="soft" /> : null}
            {teacher.quran_mentor_verified ? <Badge label="QMG Verified" tone="soft" /> : null}
          </View>
        </View>

        {teacher.bio ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>About</Text>
            <Text style={styles.bodyText}>{teacher.bio}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Teaching Details</Text>
          <View style={styles.factGrid}>
            <Fact label="EXPERIENCE" value={`${teacher.years_experience ?? 0}+ yrs`} />
            <Fact label="TRIAL" value={trial > 0 ? `$${trial}` : 'Free'} />
            <Fact label="PER HOUR" value={teacher.hourly_rate_usd > 0 ? `$${teacher.hourly_rate_usd}` : '—'} />
            <Fact label="LANGUAGES" value={(teacher.teaching_languages ?? []).join(', ') || '—'} />
            <Fact label="SPECIALIZES" value={(teacher.specializations ?? []).join(', ') || '—'} />
            <Fact label="AVAILABILITY" value={(teacher.available_days ?? []).length ? teacher.available_days.join(', ') : 'Flexible'} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Student Reviews{teacher.total_reviews ? ` (${teacher.total_reviews})` : ''}</Text>
          {reviews.length === 0 ? (
            <Text style={styles.muted}>No reviews yet — be the first to learn with {teacher.first_name}.</Text>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={styles.review}>
                <View style={styles.reviewHead}>
                  <Text style={styles.reviewer}>
                    {(r.profiles?.first_name ?? 'Student')} {(r.profiles?.last_name ?? '').charAt(0)}
                    {r.profiles?.last_name ? '.' : ''}
                  </Text>
                  <Stars rating={Number(r.rating) || 5} size={12} />
                </View>
                {r.comment ? <Text style={styles.reviewBody}>{r.comment}</Text> : null}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Free trial</Text>
          <Text style={styles.footerPrice}>{trial > 0 ? `$${trial}` : 'Free'}</Text>
        </View>
        <Button label="Book a Trial" onPress={() => {}} style={{ flex: 1, marginLeft: 14 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontFamily: fonts.displaySemi, fontSize: 18, color: colors.text },
  topBar: { paddingHorizontal: 14, paddingTop: 2, paddingBottom: 6 },
  back: { paddingVertical: 8, paddingHorizontal: 4 },
  backTxt: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.gold },
  scroll: { paddingHorizontal: 18 },
  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  name: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginTop: 14, textAlign: 'center' },
  role: { fontFamily: fonts.body, fontSize: 13, color: colors.gold, marginTop: 6 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  ratingTxt: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  reviewsTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, justifyContent: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surfaceLine, padding: spacing.lg, marginTop: spacing.md },
  cardTitle: { fontFamily: fonts.displaySemi, fontSize: 17, color: colors.text, marginBottom: 12 },
  bodyText: { fontFamily: fonts.body, fontSize: 14.5, color: colors.textSoft, lineHeight: 23 },
  muted: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  fact: { width: '50%', marginBottom: 16 },
  factLabel: { fontFamily: fonts.bodySemi, fontSize: 10.5, color: colors.textMuted, letterSpacing: 0.5, marginBottom: 4 },
  factValue: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  review: { borderTopWidth: 1, borderTopColor: colors.surfaceLine, paddingTop: 12, marginTop: 12 },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewer: { fontFamily: fonts.bodySemi, fontSize: 13.5, color: colors.text },
  reviewBody: { fontFamily: fonts.body, fontSize: 13.5, color: colors.textSoft, lineHeight: 20 },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.surfaceLine,
  },
  footerLabel: { fontFamily: fonts.bodySemi, fontSize: 10, color: colors.textMuted, textTransform: 'uppercase' },
  footerPrice: { fontFamily: fonts.display, fontSize: 20, color: colors.gold },
});
