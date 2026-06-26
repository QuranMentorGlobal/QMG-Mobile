// app/teacher/course-new.tsx — create a new course via the in-app wizard.
import { useLocalSearchParams } from 'expo-router';
import { CourseWizard } from '@/components/CourseWizard';
import type { ProductType } from '@/lib/coursesActions';

export default function CourseNew() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const valid = ['trial', 'live', 'recorded', 'program'];
  const initialType = (type && valid.includes(type) ? type : undefined) as ProductType | undefined;
  return <CourseWizard mode="create" initialType={initialType} />;
}
