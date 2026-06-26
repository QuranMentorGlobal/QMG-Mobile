// components/AuthField.tsx — icon text field with focus glow + password show/hide,
// used by the login and signup screens.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, FONT, RADIUS } from '@/lib/theme';

export function AuthField({ label, icon, secure, value, onChangeText, ...rest }: {
  label: string; icon: keyof typeof Ionicons.glyphMap; secure?: boolean;
  value: string; onChangeText: (t: string) => void;
} & TextInputProps) {
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.wrap, focus && styles.wrapFocus]}>
        <Ionicons name={icon} size={18} color={focus ? C.forest : C.muted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          placeholderTextColor={C.faint}
          secureTextEntry={secure && !show}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          {...rest}
        />
        {secure ? (
          <Pressable onPress={() => setShow((s) => !s)} hitSlop={8}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.muted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.ink, marginBottom: 6 },
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.borderSoft, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12 },
  wrapFocus: { borderColor: C.gold, backgroundColor: '#FFFDF8' },
  input: { flex: 1, fontFamily: FONT.body, fontSize: 15, color: C.ink, padding: 0 },
});
