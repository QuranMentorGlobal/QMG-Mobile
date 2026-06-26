// app/teacher/course-recordings/[id].tsx — manage a course's videos / recordings.
// Add by pasting a YouTube/Vimeo/MP4 link OR uploading a video from the device,
// set a title + duration, and delete existing entries. Mirrors the web page.
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { fetchCourseForRecordings, fetchCourseLessons, addCourseLesson, deleteCourseLesson, uploadCourseVideo, type CourseMeta, type CourseLesson } from '@/lib/recordingsActions';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';

export default function CourseRecordings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const uid = session?.user?.id ?? '';
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<CourseMeta | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id || !uid) return;
    const c = await fetchCourseForRecordings(id, uid);
    if (!c) { setLoading(false); return; }
    setCourse(c);
    setLessons(await fetchCourseLessons(id));
    setLoading(false);
  }, [id, uid]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isLive = course?.product_type === 'live';
  const noun = isLive ? 'Recording' : 'Video';

  async function pickVideo() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', 'Allow media access to upload a video.'); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
      if (res.canceled || !res.assets[0]) return;
      const a = res.assets[0];
      setUploading(true);
      const fname = a.fileName || `video-${Date.now()}.mp4`;
      const url = await uploadCourseVideo(a.uri, fname);
      setUploading(false);
      if (url) { setVideoUrl(url); setUploadName(fname); if (!title.trim()) setTitle(fname.replace(/\.[^.]+$/, '')); }
      else Alert.alert('Upload failed', 'Try a smaller file or paste a link instead.');
    } catch { setUploading(false); Alert.alert('Upload failed', 'Could not upload. Paste a link instead.'); }
  }

  async function add() {
    if (!title.trim() || !id) return;
    setSaving(true);
    const ok = await addCourseLesson({ courseId: id, title, videoUrl, duration: Number(duration), sortOrder: lessons.length });
    setSaving(false);
    if (ok) { setTitle(''); setVideoUrl(''); setDuration(''); setUploadName(''); setLessons(await fetchCourseLessons(id)); }
    else Alert.alert('Could not add', 'Please try again.');
  }

  function confirmDelete(l: CourseLesson) {
    Alert.alert('Delete?', `Remove "${l.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { if (await deleteCourseLesson(l.id) && id) setLessons(await fetchCourseLessons(id)); } },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={G.dark} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}><Ionicons name="chevron-back" size={24} color={C.white} /></Pressable>
            <Text style={styles.headerTitle}>{isLive ? 'Class Recordings' : 'Course Videos'}</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? <Loading label="Loading…" /> : !course ? (
        <View style={styles.empty}><Ionicons name="lock-closed-outline" size={28} color={C.gold} /><Text style={styles.emptyText}>Course not found.</Text></View>
      ) : (
        <View style={{ padding: SPACE.md }}>
          <Text style={styles.courseSub}>{isLive ? 'Upload recordings' : 'Manage the video lessons'} for {course.title}.</Text>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Add a {noun}</Text>
            <Text style={styles.label}>TITLE</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder={`${noun} title`} placeholderTextColor={C.faint} style={styles.input} />
            <Text style={styles.label}>VIDEO</Text>
            <TextInput value={videoUrl} onChangeText={(t) => { setVideoUrl(t); setUploadName(''); }} placeholder="Paste a YouTube, Vimeo or MP4 link" placeholderTextColor={C.faint} style={styles.input} autoCapitalize="none" />
            <Pressable onPress={pickVideo} disabled={uploading} style={styles.uploadBtn}>
              {uploading ? <ActivityIndicator color={C.accent2} size="small" /> : <><Ionicons name="cloud-upload-outline" size={16} color={C.accent2} /><Text style={styles.uploadText}>Upload from device</Text></>}
            </Pressable>
            {uploadName ? <Text style={styles.uploadedNote}>✓ {uploadName} uploaded</Text> : null}
            <Text style={styles.hint}>For long lectures a YouTube/Vimeo link is fastest.</Text>
            <Text style={styles.label}>DURATION (MINS)</Text>
            <TextInput value={duration} onChangeText={setDuration} placeholder="Mins" placeholderTextColor={C.faint} keyboardType="number-pad" style={styles.input} />
            <Pressable onPress={add} disabled={saving || uploading || !title.trim()} style={{ opacity: !title.trim() ? 0.5 : 1 }}>
              <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtn}>
                <Text style={styles.addText}>{saving ? 'Adding…' : `+ Add ${noun}`}</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {lessons.length === 0 ? (
            <View style={styles.empty}><Ionicons name="videocam-outline" size={30} color={C.gold} /><Text style={styles.emptyText}>No {noun.toLowerCase()}s added yet.</Text></View>
          ) : lessons.map((l, i) => (
            <View key={l.id} style={styles.row}>
              <View style={styles.num}><Text style={styles.numText}>{i + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{l.title}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>{l.video_url || 'No URL'}{l.duration_mins ? ` · ${l.duration_mins} min` : ''}</Text>
              </View>
              <Pressable onPress={() => confirmDelete(l)} style={styles.delBtn}><Text style={styles.delText}>Delete</Text></Pressable>
            </View>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.sm, paddingVertical: 10 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.white, fontFamily: FONT.bodyBold, fontSize: 17 },
  courseSub: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginBottom: SPACE.md },
  formCard: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  formTitle: { fontFamily: FONT.displayBold, fontSize: 16, color: C.ink, marginBottom: SPACE.sm },
  label: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.muted, letterSpacing: 0.5, marginTop: SPACE.sm, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: C.borderSoft, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 11, fontFamily: FONT.body, fontSize: 14, color: C.ink },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: C.border, backgroundColor: C.cream, borderRadius: RADIUS.md, paddingVertical: 11, marginTop: SPACE.sm },
  uploadText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.accent2 },
  uploadedNote: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.forest, marginTop: 6 },
  hint: { fontFamily: FONT.body, fontSize: 11, color: C.faint, marginTop: 6 },
  addBtn: { borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', marginTop: SPACE.md },
  addText: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.white },
  empty: { alignItems: 'center', paddingVertical: SPACE.section, gap: 8 },
  emptyText: { fontFamily: FONT.body, fontSize: 13, color: C.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  num: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.accent2 },
  rowTitle: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },
  rowMeta: { fontFamily: FONT.body, fontSize: 11, color: C.muted, marginTop: 2 },
  delBtn: { backgroundColor: 'rgba(220,38,38,0.08)', borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 7 },
  delText: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.red },
});
