// app/teacher/attendance.tsx — Attendance Center (mirrors web). Stats + at-risk +
// tabs (Today / Upcoming / History / Calendar) + mark Present/Late/Absent/Excused
// with an optional note. Students and parents are notified on each mark.
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading, FilterChips } from '@/components/ui';
import { Initials } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchAttendance, recordAttendance, ATT_META, MARKABLE, type AttRow, type AttendanceStatus, type AttendanceData } from '@/lib/attendanceActions';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const todayStr = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; })();
const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return s; } };

export default function Attendance() {
  const { session } = useAuth();
  const uid = session?.user?.id ?? '';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AttendanceData>({ rows: [], att: {}, notes: {} });
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState('today');
  const [anchor, setAnchor] = useState(() => new Date());

  const load = useCallback(async () => {
    if (!uid) return;
    const d = await fetchAttendance(uid);
    setData(d); setDraftNotes(d.notes); setLoading(false);
  }, [uid]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const { rows, att } = data;
  const active = useMemo(() => rows.filter((r) => ['confirmed', 'completed', 'no_show'].includes(r.status)), [rows]);
  const today = active.filter((r) => r.start_date === todayStr);
  const upcoming = active.filter((r) => r.start_date > todayStr);
  const history = active.filter((r) => r.start_date < todayStr);

  const vals = Object.values(att);
  const c = (s: AttendanceStatus) => vals.filter((v) => v === s).length;
  const present = c('present'), late = c('late'), absent = c('absent'), excused = c('excused');
  const denom = present + late + absent;
  const rate = denom > 0 ? Math.round(((present + late) / denom) * 100) : 0;

  const atRisk = useMemo(() => {
    const m: Record<string, { name: string; p: number; l: number; a: number }> = {};
    active.forEach((r) => { const st = att[r.id]; const id = r.studentId; if (!st || !id) return; const s = (m[id] = m[id] || { name: r.studentName, p: 0, l: 0, a: 0 }); if (st === 'present') s.p++; else if (st === 'late') s.l++; else if (st === 'absent') s.a++; });
    return Object.values(m).map((s) => { const d = s.p + s.l + s.a; return { ...s, rate: d ? Math.round(((s.p + s.l) / d) * 100) : 0, denom: d }; }).filter((s) => s.denom >= 3 && (s.rate < 60 || s.a >= 3)).sort((a, b) => a.rate - b.rate);
  }, [active, att]);

  async function mark(r: AttRow, status: AttendanceStatus) {
    if (!r.studentId) return;
    setBusy(r.id + status);
    const ok = await recordAttendance({ bookingId: r.id, studentId: r.studentId, teacherId: uid, status, notes: draftNotes[r.id] || '', studentName: r.studentName, dateLabel: fmtDate(r.start_date) });
    if (ok) setData((d) => ({ ...d, att: { ...d.att, [r.id]: status } }));
    setBusy(null);
  }

  if (loading) return <Screen scroll={false}><Loading label="Loading attendance…" /></Screen>;

  const list = tab === 'today' ? today : tab === 'upcoming' ? upcoming : history;

  return (
    <Screen>
      <Text style={styles.eyebrow}>ATTENDANCE</Text>
      <Text style={styles.h1}>Attendance Center</Text>
      <Text style={styles.sub}>Mark attendance for your lessons. Students and parents are notified automatically.</Text>

      <View style={styles.kpiRow}>
        <Kpi value={`${rate}%`} label="Rate" color={C.forest} />
        <Kpi value={present} label="Present" color={ATT_META.present.color} />
        <Kpi value={late} label="Late" color={ATT_META.late.color} />
      </View>
      <View style={styles.kpiRow}>
        <Kpi value={absent} label="Absent" color={ATT_META.absent.color} />
        <Kpi value={excused} label="Excused" color={ATT_META.excused.color} />
        <View style={{ flex: 1 }} />
      </View>

      {atRisk.length > 0 ? (
        <View style={styles.riskCard}>
          <View style={styles.riskHead}><View style={styles.riskDot}><Text style={styles.riskBang}>!</Text></View><Text style={styles.riskTitle}>At-Risk Students</Text></View>
          <View style={styles.riskWrap}>
            {atRisk.map((s, i) => <View key={i} style={styles.riskPill}><Text style={styles.riskPillText}>{s.name} · {s.rate}% · {s.a} absent</Text></View>)}
          </View>
        </View>
      ) : null}

      <View style={{ marginTop: SPACE.md, marginBottom: SPACE.sm }}>
        <FilterChips
          options={[{ key: 'today', label: 'Today', count: today.length }, { key: 'upcoming', label: 'Upcoming', count: upcoming.length }, { key: 'history', label: 'History', count: history.length }, { key: 'calendar', label: 'Calendar' }]}
          value={tab} onChange={setTab} align="center"
        />
      </View>

      {tab === 'calendar' ? (
        <AttCalendar rows={active} att={att} anchor={anchor} setAnchor={setAnchor} />
      ) : list.length === 0 ? (
        <View style={styles.empty}><Ionicons name="calendar-outline" size={30} color={C.gold} /><Text style={styles.emptyText}>{tab === 'today' ? 'No lessons today.' : tab === 'upcoming' ? 'No upcoming lessons.' : 'No past lessons yet.'}</Text></View>
      ) : (
        list.map((r) => {
          const cur = att[r.id];
          const canMark = tab !== 'upcoming';
          return (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardTop}>
                {r.studentAvatar ? <Image source={{ uri: r.studentAvatar }} style={styles.avatar} /> : <Initials name={r.studentName} size={44} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{r.studentName}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{r.courseTitle} · {fmtDate(r.start_date)}{r.session_time ? ` · ${r.session_time}` : ''}</Text>
                </View>
                {cur ? <View style={[styles.statusPill, { backgroundColor: ATT_META[cur].bg }]}><Text style={[styles.statusText, { color: ATT_META[cur].color }]}>{ATT_META[cur].label}</Text></View> : null}
              </View>
              {canMark ? (
                <View style={{ marginTop: SPACE.sm }}>
                  <TextInput value={draftNotes[r.id] || ''} onChangeText={(t) => setDraftNotes((n) => ({ ...n, [r.id]: t }))} placeholder="Optional note…" placeholderTextColor={C.faint} style={styles.noteInput} />
                  <View style={styles.markRow}>
                    {MARKABLE.map((s) => {
                      const on = cur === s; const meta = ATT_META[s];
                      return (
                        <Pressable key={s} onPress={() => mark(r, s)} disabled={!!busy} style={[styles.markBtn, on ? { backgroundColor: meta.color } : { backgroundColor: meta.bg, borderWidth: 1, borderColor: meta.color + '33' }]}>
                          <Text style={[styles.markText, { color: on ? C.white : meta.color }]}>{busy === r.id + s ? '…' : meta.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
          );
        })
      )}
      <View style={{ height: SPACE.section }} />
    </Screen>
  );
}

const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function AttCalendar({ rows, att, anchor, setAnchor }: { rows: AttRow[]; att: Record<string, AttendanceStatus>; anchor: Date; setAnchor: (d: Date) => void }) {
  const dayMap: Record<string, (AttendanceStatus | null)[]> = {};
  rows.forEach((r) => { if (!r.start_date) return; (dayMap[r.start_date] = dayMap[r.start_date] || []).push(att[r.id] || null); });
  const y = anchor.getFullYear(); const m = anchor.getMonth();
  const startWd = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(startWd).fill(null), ...Array.from({ length: dim }, (_, i) => new Date(y, m, i + 1))];
  const todayKey = keyOf(new Date());
  const monthLabel = anchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  return (
    <View style={styles.calCard}>
      <View style={styles.calHead}>
        <Pressable onPress={() => setAnchor(new Date(y, m - 1, 1))} hitSlop={8} style={styles.calNav}><Ionicons name="chevron-back" size={18} color={C.ink} /></Pressable>
        <Text style={styles.calMonth}>{monthLabel}</Text>
        <Pressable onPress={() => setAnchor(new Date(y, m + 1, 1))} hitSlop={8} style={styles.calNav}><Ionicons name="chevron-forward" size={18} color={C.ink} /></Pressable>
      </View>
      <View style={styles.calWeek}>{WD.map((w, i) => <Text key={i} style={styles.calWd}>{w}</Text>)}</View>
      <View style={styles.calGrid}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={styles.calCell} />;
          const items = dayMap[keyOf(d)] || [];
          const isToday = keyOf(d) === todayKey;
          return (
            <View key={i} style={styles.calCell}>
              <View style={[styles.calDay, items.length > 0 && { backgroundColor: 'rgba(201,162,39,0.07)' }, isToday && { borderWidth: 2, borderColor: C.gold }]}>
                <Text style={styles.calNum}>{d.getDate()}</Text>
                <View style={styles.calDots}>
                  {items.slice(0, 4).map((st, j) => <View key={j} style={[styles.calDot, { backgroundColor: st ? ATT_META[st].dot : '#CBD5E1' }]} />)}
                </View>
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        {(['present', 'late', 'absent', 'excused'] as AttendanceStatus[]).map((s) => (
          <View key={s} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: ATT_META[s].dot }]} /><Text style={styles.legendText}>{ATT_META[s].label}</Text></View>
        ))}
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#CBD5E1' }]} /><Text style={styles.legendText}>Unmarked</Text></View>
      </View>
    </View>
  );
}

function Kpi({ value, label, color }: { value: string | number; label: string; color: string }) {
  return <View style={styles.kpi}><Text style={[styles.kpiValue, { color }]}>{value}</Text><Text style={styles.kpiLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold, letterSpacing: 1.2, marginTop: SPACE.sm, textAlign: 'center' },
  h1: { fontFamily: FONT.displayBold, fontSize: 26, color: C.ink, marginTop: 2, textAlign: 'center' },
  sub: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 4, marginBottom: SPACE.md, textAlign: 'center' },
  kpiRow: { flexDirection: 'row', gap: SPACE.sm, marginBottom: SPACE.sm },
  kpi: { flex: 1, backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, paddingVertical: SPACE.md, alignItems: 'center', ...SHADOW.card },
  kpiValue: { fontFamily: FONT.displayBold, fontSize: 22 },
  kpiLabel: { fontFamily: FONT.body, fontSize: 11, color: C.muted, marginTop: 2 },
  riskCard: { backgroundColor: 'rgba(220,38,38,0.05)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.18)', borderRadius: RADIUS.lg, padding: SPACE.md, marginTop: SPACE.xs },
  riskHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACE.sm },
  riskDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  riskBang: { color: C.white, fontFamily: FONT.bodyBold, fontSize: 12 },
  riskTitle: { fontFamily: FONT.bodyBold, fontSize: 14, color: '#991B1B' },
  riskWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  riskPill: { backgroundColor: C.white, borderWidth: 1, borderColor: 'rgba(220,38,38,0.2)', borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 6 },
  riskPillText: { fontFamily: FONT.bodySemi, fontSize: 12, color: '#991B1B' },
  empty: { alignItems: 'center', paddingVertical: SPACE.section, gap: 8 },
  emptyText: { fontFamily: FONT.body, fontSize: 13, color: C.muted },
  card: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  name: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  meta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  statusPill: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontFamily: FONT.bodyBold, fontSize: 11 },
  noteInput: { borderWidth: 1, borderColor: C.borderSoft, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, fontFamily: FONT.body, fontSize: 13, color: C.ink, marginBottom: SPACE.sm },
  markRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  markBtn: { borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 9 },
  markText: { fontFamily: FONT.bodyBold, fontSize: 13 },
  calCard: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, ...SHADOW.card },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.sm },
  calNav: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' },
  calMonth: { fontFamily: FONT.displayBold, fontSize: 15, color: C.ink },
  calWeek: { flexDirection: 'row' },
  calWd: { flex: 1, textAlign: 'center', fontFamily: FONT.bodyBold, fontSize: 10, color: C.faint, paddingVertical: 4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, padding: 2 },
  calDay: { borderRadius: 10, backgroundColor: 'rgba(201,162,39,0.03)', alignItems: 'center', paddingVertical: 5, minHeight: 42 },
  calNum: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.muted },
  calDots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 2, marginTop: 3 },
  calDot: { width: 5, height: 5, borderRadius: 3 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: SPACE.md, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontFamily: FONT.body, fontSize: 11, color: C.muted },
});
