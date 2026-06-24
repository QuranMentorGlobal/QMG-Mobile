// app/teacher/_layout.tsx
import { RoleTabs } from '@/components/RoleTabs';

export default function TeacherLayout() {
  return (
    <RoleTabs
      role="teacher"
      tabs={[
        { name: 'dashboard', title: 'Home', icon: 'grid-outline' },
        { name: 'bookings', title: 'Bookings', icon: 'calendar-outline' },
        { name: 'profile', title: 'Profile', icon: 'person-outline' },
      ]}
    />
  );
}
