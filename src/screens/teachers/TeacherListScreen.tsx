// src/screens/teachers/TeacherListScreen.tsx
// Reads the live public_teachers view (same data as the web directory). Search +
// specialization filter + sign-out.
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Screen } from '@/components';
import { TeacherCard } from '@/components/TeacherCard';
import { colors, fonts, radius, spacing } from '@/theme';
import { fetchTeachers, COURSE_FILTERS } from '@/services/teachers';
import { useAuth } from '@/context/AuthContext';
import type { PublicTeacher, CourseType } from '@/types/database';
import type { AppScreenProps } from '@/navigation/types';

export function TeacherListScreen({ navigation }: AppScreenProps<'TeacherList'>) {
  const { profile, signOut } = useAuth();
  const [teachers, setTeachers] = useState<PublicTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CourseType | 'all'>('all');

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchTeachers();
      setTeachers(data);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load teachers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = teachers;
    if (filter !== 'all') list = list.filter((t) => (t.specializations ?? []).includes(filter));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          `${t.first_name} ${t.last_name}`.toLowerCase().includes(q) ||
          (t.bio ?? '').toLowerCase().includes(q) ||
          (t.specializations ?? []).some((s) => s.toLowerCase().includes(q))
      );
    }
    return list;
  }, [teachers, filter, search]);

  return (
    <Screen padded={false}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{profile ? `Assalamu alaikum, ${profile.first_name}` : 'Discover'}</Text>
          <Text style={styles.title}>Find a Teacher</Text>
        </View>
        <Pressable onPress={signOut} style={styles.signOut}>
          <Text style={styles.signOutTxt}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, course, keyword…"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        horizontal
        data={COURSE_FILTERS}
        keyExtractor={(f) => f.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills}
        renderItem={({ item }) => {
          const active = filter === item.value;
          return (
            <Pressable onPress={() => setFilter(item.value)} style={[styles.pill, active && styles.pillActive]}>
              <Text style={[styles.pillTxt, active && styles.pillTxtActive]}>{item.label}</Text>
            </Pressable>
          );
        }}
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.gold} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Couldn’t load teachers</Text>
          <Text style={styles.emptySub}>{error}</Text>
          <Pressable onPress={load} style={styles.retry}><Text style={styles.retryTxt}>Retry</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.gold} onRefresh={() => { setRefreshing(true); load(); }} />}
          renderItem={({ item }) => (
            <TeacherCard
              teacher={item}
              onPress={() => navigation.navigate('TeacherProfile', { id: item.id, name: `${item.first_name} ${item.last_name}` })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No teachers found</Text>
              <Text style={styles.emptySub}>Try a different search or filter.</Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 18, paddingTop: 4, paddingBottom: 14 },
  kicker: { fontFamily: fonts.body, fontSize: 13, color: colors.gold, marginBottom: 4 },
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  signOut: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.surfaceLine },
  signOutTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.textMuted },
  searchWrap: { marginHorizontal: 18, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.surfaceLine, paddingHorizontal: 14, height: 48 },
  searchIcon: { color: colors.textMuted, fontSize: 18, marginRight: 8 },
  search: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 15 },
  pills: { paddingHorizontal: 18, paddingVertical: 14, gap: 8 },
  pill: { paddingHorizontal: 14, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.surfaceLine, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  pillTxt: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.textSoft },
  pillTxtActive: { color: colors.goldOnDark },
  listContent: { paddingHorizontal: 18, paddingBottom: 28 },
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontFamily: fonts.displaySemi, fontSize: 17, color: colors.text, marginBottom: 6 },
  emptySub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  retry: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.gold },
  retryTxt: { fontFamily: fonts.bodySemi, color: colors.goldOnDark },
});
