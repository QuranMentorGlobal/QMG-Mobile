// components/MediaPickerButton.tsx — pick an image or video from the device and
// upload it to Supabase storage, returning the public URL via onPicked. Used by
// the course wizard/editor (thumbnail + lesson videos). URL paste stays available
// alongside it; if the picker isn't usable it fails gracefully with an alert.
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadToAttachments } from '@/lib/db';
import { C, FONT, RADIUS, SPACE } from '@/lib/theme';

export function MediaPickerButton({ kind, label, compact, onPicked }: {
  kind: 'image' | 'video'; label?: string; compact?: boolean; onPicked: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function pick() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', 'Allow media access to upload.'); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: kind === 'image' ? ['images'] : ['videos'], quality: kind === 'image' ? 0.8 : 1 });
      if (res.canceled || !res.assets[0]) return;
      const a = res.assets[0];
      setBusy(true);
      const ext = (a.fileName?.split('.').pop() || (kind === 'image' ? 'jpg' : 'mp4')).toLowerCase();
      const ct = kind === 'image' ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : `video/${ext === 'mov' ? 'quicktime' : ext}`;
      const url = await uploadToAttachments(a.uri, ct, ext);
      setBusy(false);
      if (url) onPicked(url); else Alert.alert('Upload failed', 'Try a smaller file or paste a link instead.');
    } catch { setBusy(false); Alert.alert('Upload failed', 'Please paste a link instead.'); }
  }
  if (compact) {
    return (
      <Pressable onPress={pick} disabled={busy} style={styles.compact}>
        {busy ? <ActivityIndicator size="small" color={C.accent2} /> : <Ionicons name="cloud-upload-outline" size={18} color={C.accent2} />}
      </Pressable>
    );
  }
  return (
    <Pressable onPress={pick} disabled={busy} style={styles.btn}>
      {busy ? <ActivityIndicator size="small" color={C.accent2} /> : <><Ionicons name="cloud-upload-outline" size={16} color={C.accent2} /><Text style={styles.text}>{label || 'Upload from device'}</Text></>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: C.border, backgroundColor: C.cream, borderRadius: RADIUS.md, paddingVertical: 11, marginBottom: SPACE.md },
  text: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.accent2 },
  compact: { width: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.cream, borderRadius: RADIUS.md },
});
