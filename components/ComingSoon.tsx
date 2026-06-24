// components/ComingSoon.tsx
// Clean placeholder for nav destinations still being built natively. Honest about
// where the feature lives today, with a button to open it on the website.

import { Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Screen } from '@/components/ui';
import { C, FONT, RADIUS, SPACE } from '@/lib/theme';

export function ComingSoon({
  title,
  icon = 'construct-outline',
  webPath,
}: {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  webPath?: string;
}) {
  return (
    <Screen scroll={false}>
      <View style={styles.wrap}>
        <View style={styles.badge}>
          <Ionicons name={icon} size={34} color={C.gold} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>
          This screen is coming to the app soon. For now you can use it on the website — everything stays in sync.
        </Text>
        {webPath ? (
          <View style={{ width: '100%', marginTop: SPACE.lg }}>
            <Button
              title="Open on website"
              onPress={() => Linking.openURL(`https://www.quranmentorglobal.com${webPath}`)}
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl },
  badge: { width: 78, height: 78, borderRadius: 39, backgroundColor: 'rgba(201,162,39,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: SPACE.lg },
  title: { fontFamily: FONT.displayBold, fontSize: 22, color: C.ink, textAlign: 'center' },
  body: { fontFamily: FONT.body, fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 10, lineHeight: 21, maxWidth: 300 },
});
