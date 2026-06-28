// lib/nav.ts
// ONE sidebar, configured per role — mirrors the web platform sidebar (items,
// order, and icons). Icons are the Ionicons equivalents of the web Lucide SVGs.

import type { Role } from '@/lib/supabase';
import type { Ionicons } from '@expo/vector-icons';

export interface NavItem {
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const PORTAL_LABEL: Record<Role, string> = {
  teacher: 'Teacher Portal',
  student: 'Student Portal',
  parent: 'Parent Portal',
  admin: 'Student Portal',
};

const teacherNav: NavItem[] = [
  { label: 'Dashboard', route: '/teacher/dashboard', icon: 'grid-outline' },
  { label: 'Courses', route: '/teacher/courses', icon: 'videocam-outline' },
  { label: 'Lessons', route: '/teacher/lessons', icon: 'book-outline' },
  { label: 'Bookings', route: '/teacher/bookings', icon: 'calendar-outline' },
  { label: 'Students', route: '/teacher/students', icon: 'people-outline' },
  { label: 'Attendance', route: '/teacher/attendance', icon: 'checkmark-done-outline' },
  { label: 'Earnings', route: '/teacher/earnings', icon: 'card-outline' },
  { label: 'Analytics', route: '/teacher/analytics', icon: 'bar-chart-outline' },
  { label: 'Messages', route: '/teacher/messages', icon: 'chatbubble-outline' },
  { label: 'Support', route: '/teacher/support', icon: 'headset-outline' },
  { label: 'Profile', route: '/teacher/profile', icon: 'person-outline' },
  { label: 'Help Center', route: '/teacher/help', icon: 'help-circle-outline' },
];

const studentNav: NavItem[] = [
  { label: 'Dashboard', route: '/student/dashboard', icon: 'grid-outline' },
  { label: 'Teachers', route: '/student/teachers', icon: 'search-outline' },
  { label: 'Bookings', route: '/student/bookings', icon: 'calendar-outline' },
  { label: 'Courses', route: '/student/courses', icon: 'videocam-outline' },
  { label: 'Lessons', route: '/student/lessons', icon: 'book-outline' },
  { label: 'Messages', route: '/student/messages', icon: 'chatbubble-outline' },
  { label: 'Attendance', route: '/student/attendance', icon: 'checkmark-done-outline' },
  { label: 'Billing', route: '/student/billing', icon: 'card-outline' },
  { label: 'Family', route: '/student/family', icon: 'people-outline' },
  { label: 'Support', route: '/student/support', icon: 'headset-outline' },
  { label: 'Profile', route: '/student/profile', icon: 'person-outline' },
];

const parentNav: NavItem[] = [
  { label: 'Dashboard', route: '/parent/dashboard', icon: 'grid-outline' },
  { label: 'Children', route: '/parent/children', icon: 'people-outline' },
  { label: 'Bookings', route: '/parent/bookings', icon: 'calendar-outline' },
  { label: 'Courses', route: '/parent/courses', icon: 'videocam-outline' },
  { label: 'Lessons', route: '/parent/lessons', icon: 'book-outline' },
  { label: 'Attendance', route: '/parent/attendance', icon: 'checkmark-done-outline' },
  { label: 'Progress', route: '/parent/progress', icon: 'bar-chart-outline' },
  { label: 'Billing', route: '/parent/billing', icon: 'card-outline' },
  { label: 'Teachers', route: '/parent/teachers', icon: 'search-outline' },
  { label: 'Messages', route: '/parent/messages', icon: 'chatbubble-outline' },
  { label: 'Support', route: '/parent/support', icon: 'headset-outline' },
  { label: 'Profile', route: '/parent/profile', icon: 'person-outline' },
];

export function navForRole(role: Role): NavItem[] {
  if (role === 'teacher') return teacherNav;
  if (role === 'parent') return parentNav;
  return studentNav; // student + admin
}

// Grouped sections (kept for any grouped drawer; the current shell renders flat).
export interface NavSection { title: string; items: NavItem[] }

function pick(items: NavItem[], labels: string[]): NavItem[] {
  return labels.map((l) => items.find((i) => i.label === l)).filter(Boolean) as NavItem[];
}

export function navSectionsForRole(role: Role): NavSection[] {
  const all = navForRole(role);
  if (role === 'teacher') {
    return [
      { title: 'MAIN', items: pick(all, ['Dashboard', 'Courses', 'Lessons', 'Bookings', 'Students', 'Attendance']) },
      { title: 'INSIGHTS', items: pick(all, ['Earnings', 'Analytics']) },
      { title: 'ACCOUNT', items: pick(all, ['Messages', 'Profile']) },
      { title: 'SUPPORT', items: pick(all, ['Support', 'Help Center']) },
    ];
  }
  if (role === 'parent') {
    return [
      { title: 'MAIN', items: pick(all, ['Dashboard', 'Children', 'Teachers', 'Bookings', 'Courses', 'Lessons', 'Attendance']) },
      { title: 'INSIGHTS', items: pick(all, ['Progress']) },
      { title: 'ACCOUNT', items: pick(all, ['Billing', 'Messages', 'Profile']) },
      { title: 'SUPPORT', items: pick(all, ['Support']) },
    ];
  }
  return [
    { title: 'MAIN', items: pick(all, ['Dashboard', 'Teachers', 'Bookings', 'Courses', 'Lessons', 'Attendance']) },
    { title: 'ACCOUNT', items: pick(all, ['Messages', 'Billing', 'Family', 'Profile']) },
    { title: 'SUPPORT', items: pick(all, ['Support']) },
  ];
}
