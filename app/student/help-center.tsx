// app/student/help-center.tsx
import { useLocalSearchParams } from 'expo-router';
import { Screen, PageTitle } from '@/components/ui';
import { HelpCenter } from '@/components/HelpCenter';

export default function StudentHelpCenter() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  return (
    <Screen scroll={false}>
      <PageTitle title="Help Center" subtitle="Guides, answers, and how-tos" />
      <HelpCenter role="student" initialSlug={slug} />
    </Screen>
  );
}
