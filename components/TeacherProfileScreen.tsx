// components/TeacherProfileScreen.tsx
// Teacher Profile — mirrors the web teacher/profile page: all sections, trust tiers,
// completion, and the Category-A (instant) vs Category-B (re-verification) save flow.
// File uploads (photo/video/ID/Ijazah) open the web for now (no native picker in this build).
import { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading, Avatar } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import * as DocumentPicker from 'expo-document-picker';
import { fetchTeacherProfile, saveTeacherProfile, saveNotifyPrefs, updatePassword, uploadVerificationDoc, type TeacherProfileData } from '@/lib/db';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';
import { MediaPickerButton } from '@/components/MediaPickerButton';

const COUNTRIES = ['Pakistan', 'United Kingdom', 'United States', 'UAE', 'Saudi Arabia', 'Canada', 'Australia', 'Bangladesh', 'India', 'Other'];
const SPECIALIZATIONS = ['Noorani Qaida', 'Tajweed', 'Hifz', 'Tafseer', 'Islamic Studies', 'Ijazah'];
const LANGUAGES = ['English', 'Urdu', 'Arabic', 'Pashto', 'Bengali', 'French', 'Turkish'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Trust-sensitive (Category B) → re-verification when an approved teacher edits.
const SENSITIVE_KEYS = ['firstName', 'lastName', 'phone', 'country', 'languages', 'specializations', 'yearsExp', 'photoUrl', 'videoUrl', 'idDocUrl', 'ijazahDocUrl'];

function arr(v: any) { return Array.isArray(v) ? [...v].map(String).sort().join('|') : String(v ?? ''); }

export function TeacherProfileScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const uid = session?.user?.id ?? '';
  const email = session?.user?.email ?? '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [d, setD] = useState<TeacherProfileData | null>(null);
  const [orig, setOrig] = useState<Record<string, any>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSensitive, setPendingSensitive] = useState<string[]>([]);
  const [countryOpen, setCountryOpen] = useState(false);
  const [docBusy, setDocBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    const data = await fetchTeacherProfile(uid);
    if (data) {
      setD(data);
      setOrig({
        firstName: data.firstName, lastName: data.lastName, phone: data.phone, country: data.country,
        bio: data.bio, welcome: data.welcome, photoUrl: data.photoUrl, videoUrl: data.videoUrl,
        idDocUrl: data.idDocUrl, ijazahDocUrl: data.ijazahDocUrl, yearsExp: data.yearsExp,
        specializations: data.specializations, languages: data.languages, availableDays: data.availableDays,
        hourlyRate: data.hourlyRate, trialRate: data.trialRate,
      });
    }
    setLoading(false);
  }, [uid]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isReadOnly = d?.status === 'pending' || d?.status === 'pending_review';

  async function pickDoc(kind: 'id' | 'ijazah') {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      setDocBusy(kind);
      const ext = (a.name?.split('.').pop() || 'pdf').toLowerCase();
      const ct = a.mimeType || (ext === 'pdf' ? 'application/pdf' : 'image/jpeg');
      const path = await uploadVerificationDoc(a.uri, ct, ext);
      setDocBusy(null);
      if (path) { set(kind === 'id' ? 'idDocUrl' : 'ijazahDocUrl', path); Alert.alert('Uploaded', 'Document uploaded securely.'); }
      else Alert.alert('Upload failed', 'Please try again.');
    } catch { setDocBusy(null); Alert.alert('Upload failed', 'Please try again.'); }
  }

  function set<K extends keyof TeacherProfileData>(k: K, v: TeacherProfileData[K]) {
    setD((p) => (p ? { ...p, [k]: v } : p));
  }
  function toggleIn(list: string[], v: string, k: keyof TeacherProfileData) {
    set(k as any, (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]) as any);
  }

  const completion = useMemo(() => {
    if (!d) return 0;
    const items = [!!d.photoUrl, !!d.bio, !!d.country, !!d.phone, !!d.yearsExp, d.specializations.length > 0, d.languages.length > 0,
      d.availableDays.length > 0, !!d.hourlyRate, !!d.videoUrl, !!d.idDocUrl,
      d.flags.email_verified, d.flags.phone_verified, d.flags.identity_verified, d.flags.quran_mentor_verified];
    return Math.round((items.filter(Boolean).length / items.length) * 100);
  }, [d]);

  const tierCount = d ? [(d.flags.email_verified && d.flags.phone_verified), d.flags.identity_verified, d.flags.quran_mentor_verified, d.flags.ijazah_verified].filter(Boolean).length : 0;

  function changedSensitive(): string[] {
    if (!d) return [];
    const cur: Record<string, any> = d;
    return SENSITIVE_KEYS.filter((k) => arr(cur[k]) !== arr(orig[k]));
  }
  function anyChange(): boolean {
    if (!d) return false;
    const keys = [...SENSITIVE_KEYS, 'bio', 'welcome', 'hourlyRate', 'trialRate', 'availableDays'];
    return keys.some((k) => arr((d as any)[k]) !== arr(orig[k]));
  }

  function onSave() {
    if (isReadOnly || !d) return;
    if (!anyChange()) { Alert.alert('No changes to save.'); return; }
    const sens = changedSensitive();
    if (d.status === 'approved' && sens.length > 0) { setPendingSensitive(sens); setConfirmOpen(true); return; }
    commit(false, []);
  }

  async function commit(reverify: boolean, sens: string[]) {
    if (!d) return;
    setConfirmOpen(false); setSaving(true);
    const res = await saveTeacherProfile({
      uid, tpId: d.tpId, reverify, changedFields: sens,
      firstName: d.firstName, lastName: d.lastName, gender: d.gender, country: d.country, phone: d.phone,
      bio: d.bio, welcome: d.welcome, photoUrl: d.photoUrl, yearsExp: d.yearsExp,
      specializations: d.specializations, languages: d.languages, availableDays: d.availableDays,
      hourlyRate: d.hourlyRate, trialRate: d.trialRate, videoUrl: d.videoUrl, idDocUrl: d.idDocUrl, ijazahDocUrl: d.ijazahDocUrl,
    });
    setSaving(false);
    if (!res.ok) { Alert.alert('Could not save', res.error ?? ''); return; }
    setOrig({ firstName: d.firstName, lastName: d.lastName, phone: d.phone, country: d.country, bio: d.bio, welcome: d.welcome,
      photoUrl: d.photoUrl, videoUrl: d.videoUrl, idDocUrl: d.idDocUrl, ijazahDocUrl: d.ijazahDocUrl, yearsExp: d.yearsExp,
      specializations: d.specializations, languages: d.languages, availableDays: d.availableDays, hourlyRate: d.hourlyRate, trialRate: d.trialRate });
    if (reverify) set('status', 'pending_review');
    Alert.alert(reverify ? 'Submitted for re-verification' : 'Profile updated',
      reverify ? 'Saved — your profile is queued for re-verification and temporarily hidden from new students. Existing bookings continue.' : 'Your changes are live.');
  }

  if (loading || !d) return <Screen scroll={false}><Loading label="Loading profile…" /></Screen>;

  const banner = bannerFor(d.status, d.rejectionReason);

  return (
    <Screen>
      <Text style={styles.h1}>My Profile</Text>
      <Text style={styles.sub}>One place to manage your public profile, credentials and trust.</Text>

      <Pressable style={styles.outlineBtn} onPress={() => Linking.openURL(`https://muddarris.com/platform/teachers/${uid}`)}>
        <Ionicons name="globe-outline" size={16} color={C.forest} />
        <Text style={styles.outlineBtnText}>View public profile</Text>
      </Pressable>

      {(d.status === 'approved' || d.status === 'pending_review' || d.status === 'rejected') && (
        <Pressable onPress={onSave} disabled={saving || isReadOnly} style={{ marginBottom: SPACE.md }}>
          <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.saveBtn, (saving || isReadOnly) && { opacity: 0.6 }]}>
            <Ionicons name="save-outline" size={16} color={C.ink} />
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save changes'}</Text>
          </LinearGradient>
        </Pressable>
      )}

      <View style={[styles.banner, { backgroundColor: banner.bg }]}>
        <Ionicons name={banner.icon} size={20} color={banner.c} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, { color: banner.c }]}>{banner.t}</Text>
          <Text style={styles.bannerSub}>{banner.s}</Text>
        </View>
      </View>

      {/* VERIFICATION & TRUST */}
      <Section icon="shield-checkmark-outline" title="Verification & Trust">
        <View style={styles.compRow}>
          <Text style={styles.compLabel}>Profile Completion</Text>
          <Text style={styles.compPct}>{completion}%</Text>
        </View>
        <View style={styles.barTrack}><LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.barFill, { width: `${completion}%` }]} /></View>
        <Text style={styles.compNote}>{tierCount} of 4 trust tiers verified. A complete, verified profile ranks higher and earns more bookings.</Text>

        <Text style={[styles.subhead, { marginTop: SPACE.md }]}>Trust indicators</Text>
        {[
          { k: 'email_verified', l: 'Email Verified' }, { k: 'phone_verified', l: 'Phone Verified' },
          { k: 'identity_verified', l: 'Identity Verified' }, { k: 'quran_mentor_verified', l: 'Qualification Verified' },
          { k: 'ijazah_verified', l: 'Ijazah Verified' }, { k: '_video', l: 'Video Verified' },
        ].map((row) => {
          const ok = row.k === '_video' ? !!d.videoUrl && d.status === 'approved' : !!(d.flags as any)[row.k];
          return (
            <View key={row.l} style={styles.trustRow}>
              <Ionicons name={ok ? 'checkmark-circle' : 'time-outline'} size={16} color={ok ? C.success : '#C2B79A'} />
              <Text style={[styles.trustLabel, { color: ok ? C.ink : C.muted, fontFamily: ok ? FONT.bodyBold : FONT.body }]}>{row.l}</Text>
              {!ok ? <Text style={styles.pending}>Pending</Text> : null}
            </View>
          );
        })}
        <View style={styles.badgeRow}>
          <View style={styles.miniBadge}><Ionicons name="ribbon-outline" size={12} color={C.gold} /><Text style={styles.miniBadgeText}>Top Rated Teacher</Text></View>
          <View style={styles.miniBadge}><Ionicons name="shield-checkmark-outline" size={12} color={C.forest} /><Text style={styles.miniBadgeText}>Verified Teacher</Text></View>
        </View>
      </Section>

      {/* PERSONAL */}
      <Section icon="person-outline" title="Personal Information" sensitive readOnly={isReadOnly}>
        <View style={styles.photoRow}>
          <Avatar uri={d.photoUrl} name={`${d.firstName} ${d.lastName}`} size={72} />
          {isReadOnly ? (
            <View style={[styles.goldOutline, { opacity: 0.5 }]}>
              <Ionicons name="cloud-upload-outline" size={15} color={C.accent2} />
              <Text style={styles.goldOutlineText}>Locked during review</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <MediaPickerButton kind="image" label={d.photoUrl ? 'Change photo' : 'Upload photo'} onPicked={(url) => set('photoUrl', url)} />
            </View>
          )}
        </View>
        <Lbl>First name</Lbl><Inp value={d.firstName} onChangeText={(v) => set('firstName', v)} editable={!isReadOnly} />
        <Lbl>Last name</Lbl><Inp value={d.lastName} onChangeText={(v) => set('lastName', v)} editable={!isReadOnly} />
        <Lbl>Phone / WhatsApp</Lbl><Inp value={d.phone} onChangeText={(v) => set('phone', v)} editable={!isReadOnly} keyboardType="phone-pad" />
        <Lbl>Country</Lbl>
        <Pressable style={styles.select} disabled={isReadOnly} onPress={() => setCountryOpen(true)}>
          <Text style={[styles.selectText, !d.country && { color: C.faint }]}>{d.country || 'Select…'}</Text>
          <Ionicons name="chevron-down" size={18} color={C.muted} />
        </Pressable>
      </Section>

      {/* PUBLIC PROFILE (instant) */}
      <Section icon="globe-outline" title="Public Profile">
        <Lbl>Bio</Lbl>
        <Inp value={d.bio} onChangeText={(v) => set('bio', v)} editable={!isReadOnly} multiline placeholder="Tell students about your background, qualifications and teaching style…" />
        <Lbl>Welcome message</Lbl>
        <Inp value={d.welcome} onChangeText={(v) => set('welcome', v)} editable={!isReadOnly} placeholder="A short greeting students see first" />
        <Text style={styles.note}>These update instantly and stay live — no review needed.</Text>
      </Section>

      {/* PROFESSIONAL (sensitive) */}
      <Section icon="school-outline" title="Professional Information" sensitive readOnly={isReadOnly}>
        <Lbl>Years of experience</Lbl>
        <Inp value={d.yearsExp} onChangeText={(v) => set('yearsExp', v)} editable={!isReadOnly} keyboardType="number-pad" />
        <Lbl>Specializations</Lbl>
        <Chips items={SPECIALIZATIONS} selected={d.specializations} disabled={isReadOnly} onToggle={(v) => toggleIn(d.specializations, v, 'specializations')} />
      </Section>

      {/* QUALIFICATIONS & IJAZAH (sensitive) */}
      <Section icon="ribbon-outline" title="Qualifications & Ijazah" sensitive readOnly={isReadOnly} status={d.flags.ijazah_verified ? 'verified' : undefined}>
        <Lbl>Do you have Ijazah?</Lbl>
        <View style={styles.dualRow}>
          <Pressable style={{ flex: 1 }} disabled={isReadOnly} onPress={() => set('ijazah', true)}>
            {d.ijazah
              ? <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dualBtn}><Text style={styles.dualOn}>Yes, I have Ijazah</Text></LinearGradient>
              : <View style={[styles.dualBtn, styles.dualOff]}><Text style={styles.dualOffText}>Yes, I have Ijazah</Text></View>}
          </Pressable>
          <Pressable style={{ flex: 1 }} disabled={isReadOnly} onPress={() => set('ijazah', false)}>
            <View style={[styles.dualBtn, !d.ijazah ? { backgroundColor: C.forest } : styles.dualOff]}>
              <Text style={!d.ijazah ? styles.dualOn : styles.dualOffText}>No Ijazah</Text>
            </View>
          </Pressable>
        </View>
        <Lbl>Ijazah certificate</Lbl>
        <Pressable style={[styles.docBtn, (isReadOnly || docBusy === 'ijazah') && { opacity: 0.5 }]} disabled={isReadOnly || docBusy === 'ijazah'} onPress={() => pickDoc('ijazah')}>
          <Ionicons name="document-text-outline" size={15} color={C.ink} />
          <Text style={styles.docText}>{docBusy === 'ijazah' ? 'Uploading…' : d.ijazahDocUrl ? 'Uploaded Ijazah' : 'Upload Ijazah'}</Text>
        </Pressable>
      </Section>

      {/* IDENTITY (sensitive) */}
      <Section icon="document-text-outline" title="Identity Documents" sensitive readOnly={isReadOnly} status={d.flags.identity_verified ? 'verified' : undefined}>
        <Text style={styles.note}>Stored privately and used only for verification. Never shown publicly.</Text>
        <Pressable style={[styles.docBtn, (isReadOnly || docBusy === 'id') && { opacity: 0.5 }]} disabled={isReadOnly || docBusy === 'id'} onPress={() => pickDoc('id')}>
          <Ionicons name="cloud-upload-outline" size={15} color={C.ink} />
          <Text style={styles.docText}>{docBusy === 'id' ? 'Uploading…' : d.idDocUrl ? 'Uploaded ID' : 'Upload Government ID'}</Text>
        </Pressable>
      </Section>

      {/* LANGUAGES (sensitive) */}
      <Section icon="language-outline" title="Languages" sensitive readOnly={isReadOnly}>
        <Chips items={LANGUAGES} selected={d.languages} disabled={isReadOnly} onToggle={(v) => toggleIn(d.languages, v, 'languages')} />
      </Section>

      {/* INTRO VIDEO (sensitive) */}
      <Section icon="videocam-outline" title="Intro Video" sensitive readOnly={isReadOnly}>
        {isReadOnly ? (
          <View style={[styles.goldOutline, { opacity: 0.5 }]}>
            <Ionicons name="videocam-outline" size={15} color={C.accent2} />
            <Text style={styles.goldOutlineText}>Locked during review</Text>
          </View>
        ) : (
          <MediaPickerButton kind="video" label={d.videoUrl ? 'Replace intro video' : 'Upload intro video'} onPicked={(url) => set('videoUrl', url)} />
        )}
        {d.videoUrl ? <Text style={[styles.note, { marginTop: 8 }]}>Uploaded video</Text> : null}
      </Section>

      {/* AVAILABILITY & RATES (instant) */}
      <Section icon="calendar-outline" title="Availability & Rates">
        <Lbl>Available days</Lbl>
        <Chips items={DAYS} selected={d.availableDays} disabled={isReadOnly} onToggle={(v) => toggleIn(d.availableDays, v, 'availableDays')} />
        <View style={{ height: SPACE.md }} />
        <Lbl>Hourly rate (USD)</Lbl><Inp value={d.hourlyRate} onChangeText={(v) => set('hourlyRate', v)} editable={!isReadOnly} keyboardType="number-pad" />
        <Lbl>Trial rate (USD)</Lbl><Inp value={d.trialRate} onChangeText={(v) => set('trialRate', v)} editable={!isReadOnly} keyboardType="number-pad" />
        <Text style={styles.note}>Availability and rates update instantly.</Text>
      </Section>

      {/* SECURITY */}
      <Section icon="lock-closed-outline" title="Security"><SecuritySection email={email} /></Section>

      {/* NOTIFICATIONS */}
      <Section icon="notifications-outline" title="Notifications"><NotificationsSection uid={uid} initial={d.notify} /></Section>

      {/* SETTINGS */}
      <Section icon="settings-outline" title="Settings">
        <View style={styles.kv}><Text style={styles.kvLabel}>Account email</Text><Text style={styles.kvValue}>{email}</Text></View>
        <View style={[styles.kv, { borderTopWidth: 1, borderTopColor: C.borderSoft, marginTop: 10, paddingTop: 12 }]}><Text style={styles.kvLabel}>Account type</Text><Text style={[styles.kvValue, { color: C.gold }]}>Teacher</Text></View>
      </Section>

      {/* Country picker */}
      <Modal visible={countryOpen} transparent animationType="fade" onRequestClose={() => setCountryOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setCountryOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select country</Text>
            {COUNTRIES.map((c) => (
              <Pressable key={c} style={styles.modalRow} onPress={() => { set('country', c); setCountryOpen(false); }}>
                <Text style={[styles.modalRowText, d.country === c && { color: C.forest, fontFamily: FONT.bodyBold }]}>{c}</Text>
                {d.country === c ? <Ionicons name="checkmark" size={18} color={C.forest} /> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Confirm re-verification */}
      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Confirm re-verification</Text>
            <Text style={styles.confirmBody}>
              You changed trust-sensitive details ({pendingSensitive.join(', ')}). Saving sends your profile for a quick admin re-verification and temporarily hides you from new students. Existing students, lessons and earnings are unaffected.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.confirmCancel} onPress={() => setConfirmOpen(false)}><Text style={styles.confirmCancelText}>Cancel</Text></Pressable>
              <Pressable onPress={() => commit(true, pendingSensitive)}>
                <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.confirmOk}><Text style={styles.confirmOkText}>Save & submit</Text></LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

// ── Section wrapper ──
function Section({ icon, title, sensitive, status, readOnly, children }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; sensitive?: boolean; status?: 'verified'; readOnly?: boolean; children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}><Ionicons name={icon} size={17} color={C.gold} /></View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {status === 'verified' ? <View style={styles.verifiedPill}><Ionicons name="checkmark-circle" size={12} color={C.success} /><Text style={styles.verifiedText}>Verified</Text></View>
          : sensitive ? <View style={styles.reviewPill}><Ionicons name="shield-checkmark-outline" size={12} color={C.accent2} /><Text style={styles.reviewText}>Requires review</Text></View> : null}
      </View>
      {sensitive ? (
        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={15} color={C.gold} />
          <Text style={styles.noteBoxText}>Changes here require admin review before they become publicly visible and will temporarily pause new bookings until re-verification is complete. Existing students, lessons and earnings are unaffected.</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

function Lbl({ children }: { children: React.ReactNode }) { return <Text style={styles.label}>{children}</Text>; }
function Inp(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput {...props} placeholderTextColor={C.faint} style={[styles.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, props.editable === false && { opacity: 0.6 }]} />;
}
function Chips({ items, selected, onToggle, disabled }: { items: string[]; selected: string[]; onToggle: (v: string) => void; disabled?: boolean }) {
  return (
    <View style={styles.chipsWrap}>
      {items.map((it) => {
        const on = selected.includes(it);
        return (
          <Pressable key={it} disabled={disabled} onPress={() => onToggle(it)}>
            {on ? (
              <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chip}>
                <Ionicons name="checkmark-circle" size={14} color="#fff" /><Text style={styles.chipOnText}>{it}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.chip, styles.chipOff, disabled && { opacity: 0.6 }]}>
                <View style={styles.chipDot} /><Text style={styles.chipOffText}>{it}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function SecuritySection({ email }: { email: string }) {
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [busy, setBusy] = useState(false);
  async function change() {
    if (pw.length < 8) return Alert.alert('Password must be at least 8 characters.');
    if (pw !== pw2) return Alert.alert('Passwords do not match.');
    setBusy(true);
    const res = await updatePassword(pw);
    setBusy(false);
    if (!res.ok) return Alert.alert('Could not update', res.error ?? '');
    setPw(''); setPw2(''); Alert.alert('Password updated.');
  }
  return (
    <View>
      <Text style={styles.note}>Signed in as <Text style={{ fontFamily: FONT.bodyBold, color: C.ink }}>{email}</Text></Text>
      <Lbl>New password</Lbl><Inp value={pw} onChangeText={setPw} secureTextEntry placeholder="At least 8 characters" />
      <Lbl>Confirm new password</Lbl><Inp value={pw2} onChangeText={setPw2} secureTextEntry />
      <Pressable onPress={change} disabled={busy} style={[styles.darkBtn, busy && { opacity: 0.6 }]}>
        <Ionicons name="lock-closed-outline" size={15} color="#fff" /><Text style={styles.darkBtnText}>{busy ? 'Updating…' : 'Update password'}</Text>
      </Pressable>
    </View>
  );
}

function NotificationsSection({ uid, initial }: { uid: string; initial: TeacherProfileData['notify'] }) {
  const [prefs, setPrefs] = useState(initial);
  const [busy, setBusy] = useState(false);
  const rows: [keyof typeof prefs, string][] = [
    ['notify_bookings', 'New bookings & lesson reminders'], ['notify_messages', 'New messages'],
    ['notify_payouts', 'Payouts & earnings'], ['notify_marketing', 'Tips & product updates'],
  ];
  async function save() { setBusy(true); const ok = await saveNotifyPrefs(uid, prefs); setBusy(false); Alert.alert(ok ? 'Preferences saved.' : 'Saved locally.'); }
  return (
    <View>
      {rows.map(([k, l]) => (
        <View key={k} style={styles.notifRow}>
          <Text style={styles.notifLabel}>{l}</Text>
          <Switch value={prefs[k]} onValueChange={(v) => setPrefs((p) => ({ ...p, [k]: v }))} trackColor={{ true: C.forest, false: '#D8D2C4' }} thumbColor="#fff" />
        </View>
      ))}
      <Pressable onPress={save} disabled={busy} style={{ marginTop: SPACE.sm }}>
        <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.saveBtn, busy && { opacity: 0.6 }]}>
          <Ionicons name="save-outline" size={15} color={C.ink} /><Text style={styles.saveText}>{busy ? 'Saving…' : 'Save preferences'}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function bannerFor(status: string, reason: string): { c: string; bg: string; icon: keyof typeof Ionicons.glyphMap; t: string; s: string } {
  if (status === 'approved') return { c: '#15803D', bg: '#DCFCE7', icon: 'checkmark-circle', t: 'Your profile is live to students', s: 'Editing trust-sensitive sections sends them for a quick admin re-verification.' };
  if (status === 'pending') return { c: '#B45309', bg: '#FEF3C7', icon: 'time-outline', t: 'Under review', s: "Our team is verifying your application. You'll be notified once approved." };
  if (status === 'pending_review') return { c: '#B45309', bg: '#FEF3C7', icon: 'shield-checkmark-outline', t: 'Pending re-verification', s: "You're temporarily hidden from new students. Existing students, lessons and earnings continue as normal." };
  if (status === 'rejected') return { c: '#B91C1C', bg: '#FEE2E2', icon: 'close-circle-outline', t: 'Changes needed', s: reason || 'Please review the feedback and resubmit.' };
  return { c: '#8A6A16', bg: '#FBF3DE', icon: 'alert-circle-outline', t: 'Complete your profile to go live', s: 'Fill in the sections below, then submit for verification to start receiving students.' };
}

const styles = StyleSheet.create({
  h1: { fontFamily: FONT.displayBold, fontSize: 26, color: C.ink, textAlign: 'center', marginTop: SPACE.sm },
  sub: { fontFamily: FONT.body, fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: SPACE.lg, lineHeight: 20 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: C.forest, borderRadius: RADIUS.md, paddingVertical: 13, backgroundColor: C.white, marginBottom: SPACE.sm },
  outlineBtnText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.forest },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.md, paddingVertical: 14 },
  saveText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.lg },
  bannerTitle: { fontFamily: FONT.bodyBold, fontSize: 14 },
  bannerSub: { fontFamily: FONT.body, fontSize: 12, color: '#6B5A2A', marginTop: 3, lineHeight: 17 },

  section: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  sectionHead: { alignItems: 'center', gap: 8, paddingBottom: SPACE.md, borderBottomWidth: 1, borderBottomColor: C.borderSoft, marginBottom: SPACE.md },
  sectionIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink, textAlign: 'center' },
  reviewPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FBF3DE', borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  reviewText: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.accent2 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#DCFCE7', borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  verifiedText: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.success },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FBF3DE', borderWidth: 1, borderColor: '#EADFBE', borderRadius: RADIUS.md, padding: 12, marginBottom: SPACE.md },
  noteBoxText: { flex: 1, fontFamily: FONT.body, fontSize: 12, color: '#6B5A2A', lineHeight: 17 },

  compRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  compLabel: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },
  compPct: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.gold },
  barTrack: { height: 10, borderRadius: 999, backgroundColor: '#EFEAE0', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  compNote: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 17 },
  subhead: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink, marginBottom: 8 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  trustLabel: { fontSize: 14 },
  pending: { marginLeft: 'auto', fontFamily: FONT.bodySemi, fontSize: 12, color: '#B45309' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACE.md },
  miniBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: C.borderSoft, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5 },
  miniBadgeText: { fontFamily: FONT.bodySemi, fontSize: 11, color: C.ink },

  photoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginBottom: SPACE.md },
  goldOutline: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: C.gold, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start' },
  goldOutlineText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.accent2 },
  label: { fontFamily: FONT.bodyBold, fontSize: 13, color: '#3D3D3D', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: C.white, borderWidth: 1, borderColor: C.borderSoft, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontFamily: FONT.body, fontSize: 15, color: C.ink },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.white, borderWidth: 1, borderColor: C.borderSoft, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 13 },
  selectText: { fontFamily: FONT.body, fontSize: 15, color: C.ink },
  note: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 17 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  chipOff: { backgroundColor: C.cream, borderWidth: 1.5, borderColor: '#D9CFB6' },
  chipDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#C9BD9E' },
  chipOnText: { fontFamily: FONT.bodySemi, fontSize: 14, color: '#fff' },
  chipOffText: { fontFamily: FONT.bodySemi, fontSize: 14, color: '#3D3D3D' },

  dualRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  dualBtn: { borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  dualOff: { backgroundColor: C.cream, borderWidth: 1, borderColor: '#D9CFB6' },
  dualOn: { fontFamily: FONT.bodyBold, fontSize: 14, color: '#fff' },
  dualOffText: { fontFamily: FONT.bodyBold, fontSize: 14, color: '#3D3D3D' },
  docBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: C.borderSoft, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 11, alignSelf: 'flex-start' },
  docText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.ink },

  darkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.ink, borderRadius: RADIUS.md, paddingVertical: 12, marginTop: SPACE.md, alignSelf: 'flex-start', paddingHorizontal: 20 },
  darkBtnText: { fontFamily: FONT.bodyBold, fontSize: 14, color: '#fff' },
  notifRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  notifLabel: { fontFamily: FONT.body, fontSize: 14, color: C.ink, flex: 1 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kvLabel: { fontFamily: FONT.body, fontSize: 14, color: C.muted },
  kvValue: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink, maxWidth: '60%', textAlign: 'right' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: SPACE.lg },
  modalCard: { backgroundColor: C.white, borderRadius: RADIUS.lg, padding: SPACE.md, maxHeight: '70%' },
  modalTitle: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink, marginBottom: SPACE.sm },
  modalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  modalRowText: { fontFamily: FONT.body, fontSize: 15, color: C.ink },
  confirmCard: { backgroundColor: C.white, borderRadius: RADIUS.lg, padding: SPACE.lg },
  confirmTitle: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink, marginBottom: 8 },
  confirmBody: { fontFamily: FONT.body, fontSize: 13, color: C.muted, lineHeight: 19, marginBottom: SPACE.md },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  confirmCancel: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: RADIUS.md, backgroundColor: C.cream },
  confirmCancelText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },
  confirmOk: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: RADIUS.md },
  confirmOkText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },
});
