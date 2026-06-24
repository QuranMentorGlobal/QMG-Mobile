// app/student/_layout.tsx
import { RoleTabs } from '@/components/RoleTabs';

export default function StudentLayout() {
  return (
    <RoleTabs
      role="student"
      tabs={[
        { name: 'dashboard', title: 'Home', icon: 'grid-outline' },
        { name: 'teachers', title: 'Teachers', icon: 'search-outline' },
        { name: 'bookings', title: 'Bookings', icon: 'calendar-outline' },
        { name: 'profile', title: 'Profile', icon: 'person-outline' },
      ]}
    />
  );
}
