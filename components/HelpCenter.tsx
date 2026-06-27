// components/HelpCenter.tsx
// Browsable Help Center — RN port of the web /platform/help experience. Driven by
// the shared static content module (lib/help/content). Self-contained internal
// navigation: hub (search + popular + categories) ↔ article view (overview, steps,
// FAQs, troubleshooting, related). `initialSlug` deep-links straight to an article.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  type HelpArticle, type HelpRole,
  popularArticles, categoriesForRole, articlesInCategory, searchArticles, getArticle, relatedArticles,
} from '@/lib/help/content';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

export function HelpCenter({ role, initialSlug }: { role: HelpRole; initialSlug?: string }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<HelpArticle | null>(initialSlug ? getArticle(role, initialSlug) || null : null);

  const popular = useMemo(() => popularArticles(role), [role]);
  const categories = useMemo(() => categoriesForRole(role), [role]);
  const results = useMemo(() => (query.trim() ? searchArticles(query, role) : []), [query, role]);

  if (active) return <ArticleView article={active} onBack={() => setActive(null)} onOpen={setActive} />;

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={C.faint} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search the Help Center…" placeholderTextColor={C.faint} style={styles.searchInput} />
        {query ? <Pressable onPress={() => setQuery('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={C.faint} /></Pressable> : null}
      </View>

      {query.trim() ? (
        <View style={{ marginTop: SPACE.md }}>
          <Text style={styles.sectionLabel}>{results.length} result{results.length === 1 ? '' : 's'}</Text>
          {results.length === 0
            ? <Text style={styles.empty}>No articles matched. Try different keywords, or open a support ticket below.</Text>
            : results.map((a) => <ArticleRow key={a.slug} a={a} onPress={() => setActive(a)} />)}
        </View>
      ) : (
        <>
          {popular.length > 0 && (
            <View style={{ marginTop: SPACE.md }}>
              <Text style={styles.sectionLabel}>POPULAR ARTICLES</Text>
              {popular.map((a) => <ArticleRow key={a.slug} a={a} onPress={() => setActive(a)} />)}
            </View>
          )}
          {categories.map((cat) => {
            const arts = articlesInCategory(cat.slug);
            if (arts.length === 0) return null;
            return (
              <View key={cat.slug} style={{ marginTop: SPACE.lg }}>
                <Text style={styles.catTitle}>{cat.title}</Text>
                {!!cat.description && <Text style={styles.catDesc}>{cat.description}</Text>}
                <View style={{ marginTop: SPACE.sm }}>
                  {arts.map((a) => <ArticleRow key={a.slug} a={a} onPress={() => setActive(a)} />)}
                </View>
              </View>
            );
          })}
        </>
      )}
      <View style={{ height: SPACE.lg }} />
    </ScrollView>
  );
}

function ArticleRow({ a, onPress }: { a: HelpArticle; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{a.title}</Text>
        <Text style={styles.rowSummary} numberOfLines={2}>{a.summary}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.faint} />
    </Pressable>
  );
}

function ArticleView({ article, onBack, onOpen }: { article: HelpArticle; onBack: () => void; onOpen: (a: HelpArticle) => void }) {
  const related = relatedArticles(article);
  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <Pressable onPress={onBack} hitSlop={8} style={styles.back}>
        <Ionicons name="chevron-back" size={20} color={C.forest} />
        <Text style={styles.backText}>Help Center</Text>
      </Pressable>

      <Text style={styles.title}>{article.title}</Text>
      <Text style={styles.overview}>{article.overview}</Text>

      {!!article.steps?.length && (
        <View style={styles.section}>
          <Text style={styles.h}>Steps</Text>
          {article.steps.map((s, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepBody}>{s.body}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {!!article.faqs?.length && (
        <View style={styles.section}>
          <Text style={styles.h}>FAQs</Text>
          {article.faqs.map((f, i) => (
            <View key={i} style={styles.qa}>
              <Text style={styles.q}>{f.q}</Text>
              <Text style={styles.a}>{f.a}</Text>
            </View>
          ))}
        </View>
      )}

      {!!article.troubleshooting?.length && (
        <View style={styles.section}>
          <Text style={styles.h}>Troubleshooting</Text>
          {article.troubleshooting.map((f, i) => (
            <View key={i} style={styles.qa}>
              <Text style={styles.q}>{f.q}</Text>
              <Text style={styles.a}>{f.a}</Text>
            </View>
          ))}
        </View>
      )}

      {related.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.h}>Related</Text>
          {related.map((r) => <ArticleRow key={r.slug} a={r} onPress={() => onOpen(r)} />)}
        </View>
      )}
      <View style={{ height: SPACE.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: RADIUS.md, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: C.borderSoft },
  searchInput: { flex: 1, fontFamily: FONT.body, fontSize: 14, color: C.ink },
  sectionLabel: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold, letterSpacing: 1, marginBottom: SPACE.sm },
  empty: { fontFamily: FONT.body, fontSize: 13.5, color: C.muted, lineHeight: 20 },
  catTitle: { fontFamily: FONT.displayBold, fontSize: 16, color: C.ink },
  catDesc: { fontFamily: FONT.body, fontSize: 12.5, color: C.muted, marginTop: 2, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: RADIUS.md, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  rowTitle: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },
  rowSummary: { fontFamily: FONT.body, fontSize: 12.5, color: C.muted, marginTop: 2, lineHeight: 18 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: SPACE.md },
  backText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.forest },
  title: { fontFamily: FONT.displayBold, fontSize: 22, color: C.ink, lineHeight: 28 },
  overview: { fontFamily: FONT.body, fontSize: 14.5, color: C.text, marginTop: SPACE.sm, lineHeight: 22 },
  section: { marginTop: SPACE.lg },
  h: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink, marginBottom: SPACE.sm },
  step: { flexDirection: 'row', gap: 12, marginBottom: SPACE.md },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.white },
  stepTitle: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },
  stepBody: { fontFamily: FONT.body, fontSize: 13.5, color: C.text, marginTop: 2, lineHeight: 20 },
  qa: { marginBottom: SPACE.md },
  q: { fontFamily: FONT.bodyBold, fontSize: 13.5, color: C.ink },
  a: { fontFamily: FONT.body, fontSize: 13.5, color: C.text, marginTop: 2, lineHeight: 20 },
});
