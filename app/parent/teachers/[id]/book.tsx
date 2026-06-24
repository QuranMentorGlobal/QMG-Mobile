// app/parent/teachers/[id]/book.tsx
import { BookingScreen } from '@/components/BookingScreen';
export default function ParentBook() { return <BookingScreen basePath="/parent/teachers" checkoutPath="/parent/checkout" bookingsPath="/parent/bookings" />; }
