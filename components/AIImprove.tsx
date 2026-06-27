// components/AIImprove.tsx
// Suggest-only "Improve with AI" affordance for a free-text field. RN port of the
// web AIImprove. Never auto-saves: shows a suggestion the teacher can Apply or
// Dismiss. Visible only when AI is enabled server-side (/api/ai/status).

import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aiImproveText } from '@/lib/db';
import { C, FONT, RADIUS } from '@/lib/theme';

export function AIImprove({ field, value, context, onApply, disabled, enabled }: {
  field: string; value: string; context: any; onApply: (v: string) => void; disabled?: boolean; enabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [note, setNote] = useState('');
  if (!enabled) return null;

  async function run() {
    if (!value.trim()) { setNote('Write a short draft first, then let AI polish it.'); return; }
    setLoading(true); setSuggestion(null); setNote('');
    const s = await aiImproveText(field, value, context);
    if (s) setSuggestion(s); else setNote('Could not generate a suggestion — please try again.');
    setLoading(false);
  }

  return (
    <View style={{ marginTop: 8 }}>
      <Pressable onPress={run} disabled={disabled || loading} style={[styles.btn, (disabled || loading) && { opacity: 0.6 }]}>
        {loading ? <ActivityIndicator size="small" color={C.accent2} /> : <Ionicons name="sparkles" size={13} color={C.accent2} />}
        <Text style={styles.btnText}>{loading ? 'Improving…' : 'Improve with AI'}</Text>
      </Pressable>
      {note ? <Text style={styles.note}>{note}</Text> : null}
      {suggestion && (
        <View style={styles.box}>
          <View style={styles.boxHead}><Ionicons name="sparkles" size={12} color={C.forest} /><Text style={styles.boxTitle}>AI suggestion</Text></View>
          <Text style={styles.boxText}>{suggestion}</Text>
          <View style={styles.actions}>
            <Pressable onPress={() => { onApply(suggestion); setSuggestion(null); }} style={styles.apply}><Text style={styles.applyText}>Apply</Text></Pressable>
            <Pressable onPress={() => setSuggestion(null)} style={styles.dismiss}><Text style={styles.dismissText}>Dismiss</Text></Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1.5, borderColor: C.gold, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#FBF6E9' },
  btnText: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.accent2 },
  note: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 6 },
  box: { marginTop: 10, padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderSoft, backgroundColor: C.cream },
  boxHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  boxTitle: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.forest },
  boxText: { fontFamily: FONT.body, fontSize: 13.5, color: C.ink, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  apply: { backgroundColor: C.forest, borderRadius: RADIUS.sm, paddingHorizontal: 16, paddingVertical: 8 },
  applyText: { fontFamily: FONT.bodyBold, fontSize: 12.5, color: C.white },
  dismiss: { borderWidth: 1, borderColor: C.borderSoft, borderRadius: RADIUS.sm, paddingHorizontal: 16, paddingVertical: 8 },
  dismissText: { fontFamily: FONT.bodyBold, fontSize: 12.5, color: C.muted },
});
