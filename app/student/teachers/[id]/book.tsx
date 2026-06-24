// app/student/teachers/[id]/book.tsx
import { BookingScreen } from '@/components/BookingScreen';
export default function StudentBook() { return <BookingScreen basePath="/student/teachers" checkoutPath="/student/checkout" bookingsPath="/student/bookings" />; }
