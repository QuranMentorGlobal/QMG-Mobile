// components/TeachersScreen.tsx
// Browse Teachers — shared by student and parent. Reads the same public_teachers view
// the website uses. Header comes from the shell, so this starts with search + cards.

import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Card, Field, Screen, EmptyState, Loading } from '@/components/ui';
import { fetchTeachers, teacherName, type PublicTeacher } from '@/lib/db';
import { C, FONT, RADIUS, SPACE } from '@/lib/theme';

export function TeachersScreen() {
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<PublicTeacher[]>([]);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setTeachers(await fetchTeachers());
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return teachers;
    return teachers.filter((t) => {
      const hay = [teacherName(t), t.country ?? '', ...(t.specializations ?? []), ...(t.teaching_languages ?? [])].join(' ').toLowerCase();
      return hay.includes(needle);
    });
  }, [teachers, q]);

  if (loading) return <Screen scroll={false}><Loading label="Finding teachers…" /></Screen>;

  return (
    <Screen>
      <Text style={styles.h1}>Find your teacher</Text>
      <Text style={styles.sub}>{teachers.length} certified teachers available</Text>
      <Field placeholder="Search by name, subject, language…" value={q} onChangeText={setQ} />
      {filtered.length === 0 ? (
        <EmptyState title="No teachers matched" body="Try a different name, subject, or language." />
      ) : (
        filtered.map((t) => <TeacherCard key={t.id} t={t} />)
      )}
    </Screen>
  );
}

function TeacherCard({ t }: { t: PublicTeacher }) {
  const name = teacherName(t);
  const specs = (t.specializations ?? []).slice(0, 3);
  return (
    <Card>
      <View style={styles.top}>
        <Avatar uri={t.avatar_url} name={name} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>{(t.country ?? 'International')} · {t.years_experience ?? 0}yr exp</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color={C.gold} />
            <Text style={styles.rating}>{(t.avg_rating ?? 0).toFixed(1)}</Text>
            <Text style={styles.reviews}>({t.total_reviews ?? 0} reviews)</Text>
          </View>
        </View>
      </View>
      {t.bio ? <Text style={styles.bio} numberOfLines={2}>{t.bio}</Text> : null}
      {specs.length > 0 ? (
        <View style={styles.tags}>
          {specs.map((s) => (<View key={s} style={styles.tag}><Text style={styles.tagText}>{s}</Text></View>))}
        </View>
      ) : null}
      <View style={styles.rateRow}>
        <View><Text style={styles.rateLabel}>Per lesson</Text><Text style={styles.rate}>${t.hourly_rate_usd ?? 0}</Text></View>
        <View><Text style={styles.rateLabel}>Trial</Text><Text style={[styles.rate, { color: C.forest }]}>{Number(t.trial_rate_usd) > 0 ? `$${t.trial_rate_usd}` : 'Free'}</Text></View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: FONT.displayBold, fontSize: 22, color: C.ink, marginTop: SPACE.xs },
  sub: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 2, marginBottom: SPACE.md },
  top: { flexDirection: 'row', gap: SPACE.md, alignItems: 'center' },
  name: { fontFamily: FONT.displayBold, fontSize: 16, color: C.ink },
  meta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  rating: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.ink },
  reviews: { fontFamily: FONT.body, fontSize: 12, color: C.faint },
  bio: { fontFamily: FONT.body, fontSize: 13, color: C.text, lineHeight: 19, marginTop: SPACE.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACE.sm },
  tag: { backgroundColor: C.hoverGold, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontFamily: FONT.bodyMed, fontSize: 11, color: C.accent2 },
  rateRow: { flexDirection: 'row', gap: SPACE.xl, marginTop: SPACE.md, paddingTop: SPACE.sm, borderTopWidth: 1, borderTopColor: C.borderSoft },
  rateLabel: { fontFamily: FONT.body, fontSize: 11, color: C.muted },
  rate: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink, marginTop: 2 },
});
