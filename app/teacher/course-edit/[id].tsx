// app/teacher/course-edit/[id].tsx — edit an existing course via the in-app wizard.
import { useLocalSearchParams } from 'expo-router';
import { CourseWizard } from '@/components/CourseWizard';

export default function CourseEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CourseWizard mode="edit" courseId={id} />;
}
