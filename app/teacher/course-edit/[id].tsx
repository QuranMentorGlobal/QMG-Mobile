// app/teacher/course-edit/[id].tsx — edit an existing course (single-page editor,
// mirrors the web edit page: type & billing locked, core + type details editable).
import { useLocalSearchParams } from 'expo-router';
import { CourseEditor } from '@/components/CourseEditor';

export default function CourseEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CourseEditor courseId={String(id)} />;
}
