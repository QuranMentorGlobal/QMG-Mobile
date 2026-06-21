// src/components/TeacherCard.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, fonts, spacing } from '@/theme';
import type { PublicTeacher } from '@/types/database';
import { Avatar } from './Avatar';
import { Stars } from './Stars';
import { Badge } from './Badge';

export function TeacherCard({ teacher, onPress }: { teacher: PublicTeacher; onPress: () => void }) {
  const name = `${teacher.first_name} ${teacher.last_name}`.trim();
  const initials = `${teacher.first_name?.[0] ?? ''}${teacher.last_name?.[0] ?? ''}`.toUpperCase();
  const rating = teacher.avg_rating ?? 0;
  const trial = Number(teacher.trial_rate_usd);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <Avatar uri={teacher.avatar_url} initials={initials} size={56} />
        <View style={styles.head}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {(teacher.country ?? 'International') + ' · ' + (teacher.years_experience ?? 0) + ' yrs'}
          </Text>
          <View style={styles.rateRow}>
            <Stars rating={rating} />
            <Text style={styles.ratingTxt}>{rating > 0 ? rating.toFixed(1) : 'New'}</Text>
            <Text style={styles.reviews}>({teacher.total_reviews ?? 0})</Text>
          </View>
        </View>
        {teacher.ijazah_verified ? <Badge label="Ijazah" /> : null}
      </View>

      {teacher.bio ? <Text style={styles.bio} numberOfLines={2}>{teacher.bio}</Text> : null}

      <View style={styles.tags}>
        {(teacher.specializations ?? []).slice(0, 3).map((s) => (
          <Badge key={s} label={s} tone="soft" />
        ))}
      </View>

      <View style={styles.foot}>
        <Text style={styles.lang} numberOfLines={1}>
          {(teacher.teaching_languages ?? []).join(' · ') || 'English'}
        </Text>
        <View style={styles.trial}>
          <Text style={styles.trialLabel}>Trial</Text>
          <Text style={styles.trialVal}>{trial > 0 ? `$${trial}` : 'Free'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceLine,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  pressed: { opacity: 0.85, borderColor: 'rgba(200,162,74,0.4)' },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  head: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.display, fontSize: 17, color: colors.text },
  sub: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  ratingTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.text },
  reviews: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  bio: { fontFamily: fonts.body, fontSize: 13, color: colors.textSoft, lineHeight: 19, marginTop: spacing.md },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md },
  foot: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.surfaceLine,
  },
  lang: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, flex: 1, marginRight: spacing.md },
  trial: { alignItems: 'flex-end' },
  trialLabel: { fontFamily: fonts.bodySemi, fontSize: 10, color: colors.textMuted, textTransform: 'uppercase' },
  trialVal: { fontFamily: fonts.display, fontSize: 16, color: colors.gold },
});
