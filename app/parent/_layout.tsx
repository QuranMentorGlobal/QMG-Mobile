// app/parent/_layout.tsx
import { RoleTabs } from '@/components/RoleTabs';

export default function ParentLayout() {
  return (
    <RoleTabs
      role="parent"
      tabs={[
        { name: 'dashboard', title: 'Home', icon: 'grid-outline' },
        { name: 'children', title: 'Children', icon: 'people-outline' },
        { name: 'profile', title: 'Profile', icon: 'person-outline' },
      ]}
    />
  );
}
