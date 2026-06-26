// app/teacher/course-new.tsx — create a course with the 3-step wizard.
// Optional ?type= preselects the course type from the overview empty-state CTA.
import { useLocalSearchParams } from 'expo-router';
import { CourseWizard } from '@/components/CourseWizard';
import type { ProductType } from '@/lib/coursesActions';

export default function CourseNew() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const initialType = (['trial', 'live', 'recorded', 'program'].includes(type ?? '') ? type : undefined) as ProductType | undefined;
  return <CourseWizard mode="create" initialType={initialType} />;
}
