// app/parent/attendance.tsx — Parent Attendance. Pick a child (attendance is
// inherently single-child) and see the same dashboard the student sees: insight
// (streak + trend), attendance ring, P/L/A/E stats, monthly bar chart, colour-
// coded Month/Week calendar, and history — plus an informational risk banner for
// low attendance. Reuses fetchStudentAttendance(childId) (queries by student_id),
// so a linked child's data loads directly. Mirrors the web parent attendance page.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading } from '@/components/ui';
import { BarsChart } from '@/components/dashboard';
import { ChildSwitcher } from '@/components/ChildSwitcher';
import { useAuth } from '@/lib/auth';
import { useParentChild } from '@/lib/parentChild';
import { fetchStudentAttendance, computeInsights, monthlyRates, type AttRecord } from '@/lib/studentAttendanceActions';
import { ATT_META, type AttendanceStatus } from '@/lib/attendanceActions';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return s; } };
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function ParentAttendance() {
  const { session } = useAuth();
  const { children, selectedChildId, loading: kidsLoading } = useParentChild();
  const [activeId, setActiveId] = useState<string>('');
  const [records, setRecords] = useState<AttRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Default to the first child; follow the global selector when it picks a child.
  useEffect(() => {
    if (selectedChildId && selectedChildId !== 'all') setActiveId(selectedChildId);
    else if (!activeId && children.length) setActiveId(children[0].id);
  }, [selectedChildId, children]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    if (!activeId) { setLoading(false); return; }
    setLoading(true);
    setRecords(await fetchStudentAttendance(activeId));
    setLoading(false);
  }, [activeId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const ins = useMemo(() => computeInsights(records), [records]);
  const monthly = useMemo(() => monthlyRates(records), [records]);
  const activeChild = children.find((c) => c.id === activeId);
  const childName = activeChild?.name || 'Your child';

  if (kidsLoading) return <Screen scroll={false}><Loading label="Loading…" /></Screen>;

  if (children.length === 0) {
    return (
      <Screen>
        <Header />
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={30} color={C.gold} />
          <Text style={styles.emptyText}>Add a child from the Children page to track their attendance here.</Text>
        </View>
      </Screen>
    );
  }

  const trendMeta = ins.trend === 'improving' ? { label: 'Improving', color: C.success, arrow: '↑' }
    : ins.trend === 'declining' ? { label: 'Declining', color: C.red, arrow: '↓' }
    : { label: 'Steady', color: C.muted, arrow: '→' };
  const message = ins.atRisk ? 'Attendance needs attention — attending the next few lessons will turn the trend around.'
    : ins.streak >= 3 ? `Excellent consistency — that's a ${ins.streak}-lesson streak. Keep it going!`
    : ins.trend === 'improving' ? 'Attendance is trending up. Great momentum!'
    : ins.trend === 'declining' ? 'Attendance has dipped lately — a couple of consistent lessons will rebuild the streak.'
    : 'Attend consistently to build a strong attendance streak.';

  return (
    <Screen>
      <ChildSwitcher />
      <Header />

      {/* Dedicated single-child picker (attendance shows exactly one child) */}
      <View style={styles.pickRow}>
        {children.map((c) => {
          const on = c.id === activeId;
          return (
            <Pressable key={c.id} onPress={() => setActiveId(c.id)} style={[styles.pick, on ? styles.pickOn : styles.pickOff]}>
              <Text style={[styles.pickText, on && { color: C.white }]} numberOfLines={1}>{c.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <Loading label={`Loading ${childName}'s attendance…`} />
      ) : records.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={30} color={C.gold} />
          <Text style={styles.emptyText}>{childName}'s attendance will appear here once their teacher marks lessons.</Text>
        </View>
      ) : (
        <>
          {ins.atRisk ? (
            <View style={styles.riskCard}>
              <View style={styles.riskIcon}><Text style={styles.riskBang}>!</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.riskTitle}>{childName}'s attendance needs attention</Text>
                <Text style={styles.riskBody}>Attendance is {ins.rate}% with {ins.absent} absence{ins.absent !== 1 ? 's' : ''} recorded. Consider checking in with their teacher.</Text>
              </View>
            </View>
          ) : (
            <View style={styles.insightCard}>
              <View style={styles.insightRow}>
                <View style={styles.insightTile}><Text style={[styles.insightNum, { color: ins.streak > 0 ? C.gold : C.muted }]}>{ins.streak}</Text><Text style={styles.insightLabel}>lesson streak</Text></View>
                <View style={styles.insightTile}><Text style={[styles.insightNum, { color: trendMeta.color }]}>{trendMeta.arrow}</Text><Text style={styles.insightLabel}>{trendMeta.label}</Text></View>
              </View>
              <Text style={styles.insightMsg}>{message}</Text>
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.ringWrap}>
              <View style={[styles.ring, { borderColor: ins.rate >= 80 ? C.success : ins.rate >= 60 ? C.gold : C.red }]}>
                <Text style={[styles.ringPct, { color: ins.rate >= 80 ? C.success : ins.rate >= 60 ? C.gold : C.red }]}>{ins.rate}%</Text>
                <Text style={styles.ringLabel}>attendance</Text>
              </View>
            </View>
            <View style={styles.statGrid}>
              <StatCard value={ins.present} label="Present" color={ATT_META.present.color} />
              <StatCard value={ins.late} label="Late" color={ATT_META.late.color} />
              <StatCard value={ins.absent} label="Absent" color={ATT_META.absent.color} />
              <StatCard value={ins.excused} label="Excused" color={ATT_META.excused.color} />
            </View>
          </View>

          {monthly.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Monthly Attendance</Text>
              <BarsChart data={monthly} unit="%" />
            </View>
          ) : null}

          <AttendanceCalendar records={records} />

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Attendance History</Text>
            {records.slice(0, 40).map((r, i) => {
              const m = ATT_META[r.status];
              return (
                <View key={`${r.bookingId}-${i}`} style={styles.histRow}>
                  <View style={[styles.histDot, { backgroundColor: m.dot }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.histTitle} numberOfLines={1}>{r.courseTitle}</Text>
                    <Text style={styles.histDate}>{r.date ? fmtDate(r.date) : '—'}</Text>
                  </View>
                  <View style={[styles.histPill, { backgroundColor: m.bg }]}><Text style={[styles.histPillText, { color: m.color }]}>{m.label}</Text></View>
                </View>
              );
            })}
          </View>
        </>
      )}
      <View style={{ height: SPACE.section }} />
    </Screen>
  );
}

function Header() {
  return (
    <>
      <Text style={styles.eyebrow}>MY FAMILY</Text>
      <Text style={styles.h1}>Attendance</Text>
      <Text style={styles.sub}>Monitor each child's learning consistency and never miss a lesson update.</Text>
    </>
  );
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return <View style={styles.statCard}><Text style={[styles.statValue, { color }]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function AttendanceCalendar({ records }: { records: AttRecord[] }) {
  const [mode, setMode] = useState<'month' | 'week'>('month');
  const [anchor, setAnchor] = useState(new Date());
  const map: Record<string, AttendanceStatus> = {};
  records.forEach((r) => { if (r.date) map[r.date] = r.status; });
  const todayKey = keyOf(new Date());
  const shift = (dir: number) => setAnchor((a) => { const d = new Date(a); if (mode === 'month') d.setMonth(d.getMonth() + dir); else d.setDate(d.getDate() + dir * 7); return d; });

  let cells: (Date | null)[] = [];
  let title = '';
  if (mode === 'month') {
    const y = anchor.getFullYear(); const m = anchor.getMonth();
    const startWd = new Date(y, m, 1).getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    cells = [...Array(startWd).fill(null), ...Array.from({ length: dim }, (_, i) => new Date(y, m, i + 1))];
    title = anchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  } else {
    const ws = new Date(anchor); ws.setDate(anchor.getDate() - anchor.getDay());
    cells = Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(ws.getDate() + i); return d; });
    const we = new Date(ws); we.setDate(ws.getDate() + 6);
    title = `${ws.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${we.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Attendance Calendar</Text>
      <View style={styles.modeToggle}>
        {(['month', 'week'] as const).map((mo) => (
          <Pressable key={mo} onPress={() => setMode(mo)} style={[styles.modeBtn, mode === mo && styles.modeBtnOn]}>
            <Text style={[styles.modeText, mode === mo && { color: C.white }]}>{mo === 'month' ? 'Month' : 'Week'}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.calHead}>
        <Pressable onPress={() => shift(-1)} hitSlop={8} style={styles.calNav}><Ionicons name="chevron-back" size={18} color={C.ink} /></Pressable>
        <Text style={styles.calMonth}>{title}</Text>
        <Pressable onPress={() => shift(1)} hitSlop={8} style={styles.calNav}><Ionicons name="chevron-forward" size={18} color={C.ink} /></Pressable>
      </View>
      <View style={styles.calWeek}>{WD.map((w, i) => <Text key={i} style={styles.calWd}>{w}</Text>)}</View>
      <View style={styles.calGrid}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={styles.calCell} />;
          const st = map[keyOf(d)];
          const isToday = keyOf(d) === todayKey;
          const meta = st ? ATT_META[st] : null;
          return (
            <View key={i} style={styles.calCell}>
              <View style={[styles.calDay, meta && { backgroundColor: meta.bg }, isToday && { borderWidth: 2, borderColor: C.gold }]}>
                <Text style={[styles.calNum, meta && { color: meta.color, fontFamily: FONT.bodyBold }]}>{d.getDate()}</Text>
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((s) => (
          <View key={s} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: ATT_META[s].dot }]} /><Text style={styles.legendText}>{ATT_META[s].label}</Text></View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold, letterSpacing: 1.2, textAlign: 'center' },
  h1: { fontFamily: FONT.displayBold, fontSize: 28, color: C.ink, marginTop: 2, textAlign: 'center' },
  sub: { fontFamily: FONT.body, fontSize: 14, color: C.muted, marginTop: 4, marginBottom: SPACE.md, textAlign: 'center' },
  pickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: SPACE.md },
  pick: { borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 9, maxWidth: 180 },
  pickOn: { backgroundColor: C.forest },
  pickOff: { backgroundColor: C.white, borderWidth: 1, borderColor: C.borderSoft },
  pickText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.muted },
  empty: { alignItems: 'center', paddingVertical: SPACE.section, gap: 8 },
  emptyText: { fontFamily: FONT.body, fontSize: 13, color: C.muted, textAlign: 'center', paddingHorizontal: SPACE.lg },
  riskCard: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(220,38,38,0.06)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.2)', borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.md },
  riskIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  riskBang: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.white },
  riskTitle: { fontFamily: FONT.bodyBold, fontSize: 14, color: '#991B1B' },
  riskBody: { fontFamily: FONT.body, fontSize: 12, color: '#B45309', marginTop: 3, lineHeight: 18 },
  insightCard: { backgroundColor: C.cream, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginBottom: SPACE.md },
  insightRow: { flexDirection: 'row', gap: SPACE.sm },
  insightTile: { flex: 1, backgroundColor: C.white, borderRadius: RADIUS.md, paddingVertical: SPACE.md, alignItems: 'center', ...SHADOW.card },
  insightNum: { fontFamily: FONT.displayBold, fontSize: 24 },
  insightLabel: { fontFamily: FONT.body, fontSize: 11, color: C.muted, marginTop: 2 },
  insightMsg: { fontFamily: FONT.body, fontSize: 13, color: C.text, marginTop: SPACE.md, textAlign: 'center', lineHeight: 19 },
  card: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  cardTitle: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink, marginBottom: SPACE.md },
  ringWrap: { alignItems: 'center', marginBottom: SPACE.md },
  ring: { width: 130, height: 130, borderRadius: 65, borderWidth: 10, alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontFamily: FONT.displayBold, fontSize: 30 },
  ringLabel: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: SPACE.sm },
  statCard: { width: '48%', backgroundColor: C.cream, borderRadius: RADIUS.md, paddingVertical: SPACE.md, alignItems: 'center' },
  statValue: { fontFamily: FONT.displayBold, fontSize: 24 },
  statLabel: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 3 },
  modeToggle: { flexDirection: 'row', alignSelf: 'center', backgroundColor: C.cream, borderRadius: RADIUS.md, padding: 4, marginBottom: SPACE.md },
  modeBtn: { paddingHorizontal: 22, paddingVertical: 8, borderRadius: RADIUS.sm },
  modeBtnOn: { backgroundColor: C.forest },
  modeText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.muted },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.sm },
  calNav: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' },
  calMonth: { fontFamily: FONT.displayBold, fontSize: 15, color: C.ink },
  calWeek: { flexDirection: 'row' },
  calWd: { flex: 1, textAlign: 'center', fontFamily: FONT.bodyBold, fontSize: 10, color: C.faint, paddingVertical: 4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, padding: 2 },
  calDay: { borderRadius: 10, backgroundColor: 'rgba(201,162,39,0.03)', alignItems: 'center', justifyContent: 'center', minHeight: 40, paddingVertical: 6 },
  calNum: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.muted },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: SPACE.md, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontFamily: FONT.body, fontSize: 11, color: C.muted },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.borderSoft },
  histDot: { width: 11, height: 11, borderRadius: 6 },
  histTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  histDate: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  histPill: { borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 5 },
  histPillText: { fontFamily: FONT.bodyBold, fontSize: 12 },
});
