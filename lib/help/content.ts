// src/lib/help/content.ts
// ────────────────────────────────────────────────────────────────────────────
// QMG Knowledge Base — Content (single source of truth)
// ────────────────────────────────────────────────────────────────────────────
// Role-based: Student, Teacher, Parent. (No admin content — platform users only.)
//
// Structure:
//   ROLE_HUBS  → the three top-level Help Centers (student/teacher/parent)
//   CATEGORIES → groups of articles within a role
//   ARTICLES   → full step-by-step documentation for every feature
//
// ADD A NEW ARTICLE  → append to ARTICLES (assign role + category). No redesign.
// ADD A NEW CATEGORY → append to CATEGORIES.
// ────────────────────────────────────────────────────────────────────────────

export type HelpRole = 'student' | 'teacher' | 'parent'

export interface HelpStep { title: string; body: string }
export interface HelpFaq { q: string; a: string }

export interface HelpArticle {
  slug: string
  title: string
  summary: string
  role: HelpRole
  category: string          // category slug (within the role)
  overview: string
  steps?: HelpStep[]
  faqs?: HelpFaq[]
  troubleshooting?: HelpFaq[]
  related?: string[]        // article slugs (same role)
  popular?: boolean
  isNew?: boolean
  updatedAt: string
  tags?: string[]
}

export interface HelpCategory {
  slug: string
  role: HelpRole
  title: string
  description: string
  icon: string              // PlatformUI Icon key
  order: number
}

export interface RoleHub {
  role: HelpRole
  title: string
  blurb: string
  icon: string
  accent: string
}

// ── ROLE HUBS (the three big cards on /platform/help) ────────────────────────

export const ROLE_HUBS: RoleHub[] = [
  { role: 'student', title: 'Student Help Center', blurb: 'Find teachers, book lessons, attend classes, manage billing, and track your Quran learning.', icon: 'BookOpen', accent: '#16A34A' },
  { role: 'teacher', title: 'Teacher Help Center', blurb: 'Get verified, build courses, manage bookings and schedules, and handle earnings and payouts.', icon: 'Studio', accent: '#B8952A' },
  { role: 'parent',  title: 'Parent Help Center',  blurb: 'Add children, monitor their progress and attendance, manage billing, and message teachers.', icon: 'Children', accent: '#6366F1' },
]

export function getRoleHub(role: HelpRole): RoleHub | undefined {
  return ROLE_HUBS.find(h => h.role === role)
}

// ── CATEGORIES ───────────────────────────────────────────────────────────────

export const CATEGORIES: HelpCategory[] = [
  // STUDENT
  { slug: 'student-getting-started', role: 'student', title: 'Getting Started', description: 'Account setup, your profile, and the dashboard.', icon: 'Star', order: 1 },
  { slug: 'student-finding-teachers', role: 'student', title: 'Finding Teachers', description: 'Browse, compare, and choose the right teacher.', icon: 'Search', order: 2 },
  { slug: 'student-courses-bookings', role: 'student', title: 'Courses & Bookings', description: 'Trials, live classes, recorded courses, and how to book.', icon: 'Studio', order: 3 },
  { slug: 'student-lessons', role: 'student', title: 'Attending Lessons', description: 'Join live lessons and use the classroom.', icon: 'Lessons', order: 4 },
  { slug: 'student-billing', role: 'student', title: 'Billing & Payments', description: 'Payment methods, wallets, subscriptions, and invoices.', icon: 'Billing', order: 5 },
  { slug: 'student-communication', role: 'student', title: 'Messaging & Notifications', description: 'Chat with teachers and stay updated.', icon: 'Messages', order: 6 },
  { slug: 'student-progress', role: 'student', title: 'Progress & Reports', description: 'Track your Hifz, Tajweed, and attendance.', icon: 'Analytics', order: 7 },
  { slug: 'student-support', role: 'student', title: 'Support', description: 'Get help and open tickets.', icon: 'Support', order: 8 },

  // TEACHER
  { slug: 'teacher-getting-started', role: 'teacher', title: 'Getting Started', description: 'Account setup, your teaching profile, and the dashboard.', icon: 'Star', order: 1 },
  { slug: 'teacher-verification', role: 'teacher', title: 'Verification', description: 'Get approved to teach on the platform.', icon: 'Verification', order: 2 },
  { slug: 'teacher-courses', role: 'teacher', title: 'Course Studio', description: 'Create trial, live, recorded, and program courses.', icon: 'Studio', order: 3 },
  { slug: 'teacher-bookings', role: 'teacher', title: 'Bookings & Schedule', description: 'Manage requests, lessons, and your availability.', icon: 'Bookings', order: 4 },
  { slug: 'teacher-earnings', role: 'teacher', title: 'Earnings & Payouts', description: 'Track income, set up payouts, and withdraw.', icon: 'Money', order: 5 },
  { slug: 'teacher-analytics', role: 'teacher', title: 'Analytics', description: 'Understand your performance metrics.', icon: 'Analytics', order: 6 },
  { slug: 'teacher-communication', role: 'teacher', title: 'Messaging & Notifications', description: 'Communicate with students and parents.', icon: 'Messages', order: 7 },
  { slug: 'teacher-support', role: 'teacher', title: 'Support', description: 'Get help and open tickets.', icon: 'Support', order: 8 },

  // PARENT
  { slug: 'parent-getting-started', role: 'parent', title: 'Getting Started', description: 'Account setup, your profile, and the dashboard.', icon: 'Star', order: 1 },
  { slug: 'parent-children', role: 'parent', title: 'Managing Children', description: 'Add children and manage their accounts.', icon: 'Children', order: 2 },
  { slug: 'parent-progress', role: 'parent', title: 'Progress & Reports', description: 'Monitor each child\'s learning and attendance.', icon: 'Analytics', order: 3 },
  { slug: 'parent-booking', role: 'parent', title: 'Teachers & Booking', description: 'Find teachers and book lessons for your children.', icon: 'Search', order: 4 },
  { slug: 'parent-billing', role: 'parent', title: 'Billing & Payments', description: 'Payment methods, wallets, and invoices.', icon: 'Billing', order: 5 },
  { slug: 'parent-communication', role: 'parent', title: 'Messaging & Notifications', description: 'Message teachers and stay updated.', icon: 'Messages', order: 6 },
  { slug: 'parent-support', role: 'parent', title: 'Support', description: 'Get help and open tickets.', icon: 'Support', order: 7 },
]

// ── ARTICLES ─────────────────────────────────────────────────────────────────

export const ARTICLES: HelpArticle[] = [

  // ══════════════════════════ STUDENT ══════════════════════════

  {
    slug: 'student-registration', role: 'student', category: 'student-getting-started',
    title: 'Creating Your Student Account',
    summary: 'Sign up as a student and reach your dashboard.',
    overview: 'As a student, your account gives you access to teachers, courses, live lessons, billing, and progress tracking. The role you choose at signup is permanent, so make sure you select Student.',
    steps: [
      { title: 'Open the Sign Up page', body: 'From the homepage or login screen, click Sign Up.' },
      { title: 'Select the Student role', body: 'Choose "Student — I want to learn". This is permanent and cannot be changed later, so choose carefully.' },
      { title: 'Enter your details', body: 'Provide your first name, last name, email, a password (at least 8 characters), and your country.' },
      { title: 'Agree and create', body: 'Accept the Terms of Service and create your account. You can also use "Sign up with Google" for a faster signup.' },
      { title: 'Sign in', body: 'Log in to land on your Student Dashboard.' },
    ],
    faqs: [
      { q: 'Can I change my role to Teacher or Parent later?', a: 'No. Your role is fixed at signup. If you chose the wrong one, register a new account with the correct role.' },
      { q: 'Do I need to verify my email?', a: 'You can start using your account right away. Some features may prompt you to confirm your email.' },
    ],
    related: ['student-profile', 'student-dashboard'],
    popular: true, updatedAt: '2026-06-21',
    tags: ['signup','register','account','student','create'],
  },
  {
    slug: 'student-dashboard', role: 'student', category: 'student-getting-started',
    title: 'Using Your Dashboard',
    summary: 'Understand the student dashboard at a glance.',
    overview: 'Your dashboard is the home of your learning. It surfaces your upcoming lessons, active courses, recent activity, progress highlights, and quick links to book or message teachers.',
    steps: [
      { title: 'Open Dashboard', body: 'Click Dashboard in the sidebar (it loads by default after login).' },
      { title: 'Review upcoming lessons', body: 'See your next scheduled lessons and join them when they go live.' },
      { title: 'Check progress highlights', body: 'View your Hifz/Tajweed levels, streak, and attendance summary.' },
      { title: 'Use quick actions', body: 'Jump to Find Teachers, Courses, or Messages from the dashboard.' },
    ],
    related: ['student-progress-tracking', 'student-find-teachers'],
    updatedAt: '2026-06-20',
    tags: ['dashboard','home','overview'],
  },
  {
    slug: 'student-profile', role: 'student', category: 'student-getting-started',
    title: 'Setting Up Your Profile',
    summary: 'Complete your profile and set learning preferences.',
    overview: 'A complete profile helps teachers tailor lessons to you. Your profile page shows a completeness percentage and lets you set your name, photo, contact details, country, and learning levels.',
    steps: [
      { title: 'Open Profile', body: 'Click Profile in the sidebar or your avatar in the top bar.' },
      { title: 'Add personal information', body: 'Enter your name, profile photo, and contact details.' },
      { title: 'Set your learning levels', body: 'Set your current Hifz and Tajweed levels and any learning goals so teachers know where to start.' },
      { title: 'Save', body: 'Click Save Profile. Your completeness percentage updates automatically.' },
    ],
    related: ['student-registration', 'student-progress-tracking'],
    updatedAt: '2026-06-21',
    tags: ['profile','photo','levels','settings','completeness'],
  },
  {
    slug: 'student-find-teachers', role: 'student', category: 'student-finding-teachers',
    title: 'Finding and Choosing a Teacher',
    summary: 'Browse teachers and pick the right fit.',
    overview: 'The Teachers page lets you browse certified Quran teachers. You can review their specializations, languages, experience, rates, and intro videos before booking a trial or course.',
    steps: [
      { title: 'Open Teachers', body: 'Click Teachers in the sidebar.' },
      { title: 'Browse and filter', body: 'Look through teacher cards and use filters to narrow by what matters to you.' },
      { title: 'Open a teacher profile', body: 'Click a teacher to see their full profile, courses, intro video, and reviews.' },
      { title: 'Start with a trial or course', body: 'Book a trial lesson to test fit, or enrol directly in a course.' },
    ],
    faqs: [
      { q: 'Are all teachers verified?', a: 'Teachers complete a verification process before appearing to students, which checks their qualifications.' },
    ],
    related: ['student-trial-lessons', 'student-enrollment'],
    popular: true, updatedAt: '2026-06-20',
    tags: ['teachers','browse','find','choose','filter'],
  },
  {
    slug: 'student-enrollment', role: 'student', category: 'student-courses-bookings',
    title: 'Enrolling in a Course',
    summary: 'Enrol in live, recorded, or program courses.',
    overview: 'Courses come in several types. Live courses bill monthly as a subscription. Recorded courses are a one-time purchase you watch at your own pace. Long-term programs can be paid upfront or in installments. Enrolling always ends at a checkout where you choose a payment method.',
    steps: [
      { title: 'Find a course', body: 'Open a teacher and view their available courses, or browse Courses in your sidebar.' },
      { title: 'Choose your plan', body: 'For live courses pick a monthly tier; for recorded courses choose the access option; for programs choose upfront or installments.' },
      { title: 'Go to checkout', body: 'Confirm your selection to reach the checkout screen.' },
      { title: 'Select a payment method', body: 'Choose Card, Mobile Wallet (JazzCash/Easypaisa), or Bank Transfer.' },
      { title: 'Confirm enrollment', body: 'Complete payment. The course then appears under Courses in your portal.' },
    ],
    related: ['student-trial-lessons', 'student-payment-methods', 'student-billing-overview'],
    popular: true, updatedAt: '2026-06-21',
    tags: ['enrol','enroll','course','subscribe','checkout','book'],
  },
  {
    slug: 'student-trial-lessons', role: 'student', category: 'student-courses-bookings',
    title: 'Booking a Trial Lesson',
    summary: 'Try a teacher with a one-time trial before committing.',
    overview: 'A trial lesson is a single session — free or low-cost — that lets you experience a teacher before subscribing to a live course. After a good trial, you can convert to a monthly subscription.',
    steps: [
      { title: 'Open a teacher profile', body: 'From Teachers, open the teacher you want to try.' },
      { title: 'Choose the trial option', body: 'Select the trial class and pick an available date and time.' },
      { title: 'Confirm the booking', body: 'Complete any required payment to confirm. Free trials confirm immediately.' },
      { title: 'Attend', body: 'Join from your Lessons page at the scheduled time.' },
    ],
    related: ['student-enrollment', 'student-join-lesson'],
    updatedAt: '2026-06-20',
    tags: ['trial','taster','free lesson','book'],
  },
  {
    slug: 'student-recorded-courses', role: 'student', category: 'student-courses-bookings',
    title: 'Buying and Watching Recorded Courses',
    summary: 'Self-paced video courses you buy once.',
    overview: 'Recorded courses are pre-recorded video libraries. You buy once and watch anytime; access may be lifetime or time-limited depending on the course.',
    steps: [
      { title: 'Find a recorded course', body: 'Open a teacher and choose a recorded course, or browse Courses.' },
      { title: 'Purchase access', body: 'Complete a one-time payment at checkout to unlock the videos.' },
      { title: 'Watch at your pace', body: 'Open Courses in your sidebar and play the lessons anytime.' },
    ],
    related: ['student-enrollment'], updatedAt: '2026-06-19',
    tags: ['recorded','video','self-paced','watch','course'],
  },
  {
    slug: 'student-bookings', role: 'student', category: 'student-courses-bookings',
    title: 'Managing Your Bookings',
    summary: 'View, track, and manage your booked lessons.',
    overview: 'The Bookings page lists everything you have booked — trials, live lessons, and courses — with their status (upcoming, completed, cancelled). Use it to keep track of what is scheduled.',
    steps: [
      { title: 'Open Bookings', body: 'Click Bookings in the sidebar.' },
      { title: 'Filter by status', body: 'Switch between upcoming, completed, and cancelled bookings.' },
      { title: 'Open a booking', body: 'Click a booking to see details and any actions available.' },
    ],
    related: ['student-join-lesson', 'student-enrollment'],
    updatedAt: '2026-06-19',
    tags: ['bookings','manage','status','upcoming'],
  },
  {
    slug: 'student-join-lesson', role: 'student', category: 'student-lessons',
    title: 'Joining a Live Lesson',
    summary: 'Enter the video classroom for your scheduled lesson.',
    overview: 'Live lessons are real-time 1-on-1 video sessions with your teacher. When a lesson is about to start, a Join button appears on your Lessons page.',
    steps: [
      { title: 'Open Lessons', body: 'Click Lessons in the sidebar.' },
      { title: 'Find the live lesson', body: 'Shortly before the start time, a Join button becomes available.' },
      { title: 'Join the classroom', body: 'Click Join to enter the secure video room. Allow camera and microphone access when prompted.' },
      { title: 'After the lesson', body: 'The lesson is marked completed and counts toward your progress.' },
    ],
    troubleshooting: [
      { q: 'The Join button is greyed out', a: 'Join opens just before the scheduled time. If it should be live, refresh the page.' },
      { q: 'My camera or mic is not working', a: 'Check your browser permissions for camera and microphone, then rejoin.' },
    ],
    related: ['student-bookings'], popular: true, updatedAt: '2026-06-21',
    tags: ['live','join','video','classroom','lesson'],
  },
  {
    slug: 'student-billing-overview', role: 'student', category: 'student-billing',
    title: 'Understanding Billing',
    summary: 'Subscriptions, course access, invoices, and history in one place.',
    overview: 'Your Billing page brings together your subscriptions, course access, invoices, and full payment history. Live courses bill monthly; recorded courses and programs are one-time or installment payments.',
    steps: [
      { title: 'Open Billing', body: 'Click Billing in the sidebar.' },
      { title: 'Review the tabs', body: 'Browse Overview, Subscriptions, Course Access, Invoices, and History.' },
      { title: 'Manage subscriptions', body: 'See active monthly subscriptions and their next billing dates.' },
      { title: 'Download invoices', body: 'Open the Invoices tab to view and keep records of payments.' },
    ],
    related: ['student-payment-methods', 'student-wallets'],
    popular: true, updatedAt: '2026-06-21',
    tags: ['billing','invoice','subscription','history','access'],
  },
  {
    slug: 'student-payment-methods', role: 'student', category: 'student-billing',
    title: 'Payment Methods',
    summary: 'Pay by card, mobile wallet, or bank transfer.',
    overview: 'At checkout you choose how to pay. Muddarris supports card payments, mobile wallets (JazzCash and Easypaisa), and bank transfer. You can pick a different method on each checkout.',
    steps: [
      { title: 'Reach checkout', body: 'Enrol in a course or book a lesson to reach the checkout screen.' },
      { title: 'Pick a method', body: 'Choose Card, Mobile Wallet, or Bank Transfer.' },
      { title: 'Complete payment', body: 'Card payments confirm instantly. Bank transfer reserves your spot until the payment is confirmed.' },
    ],
    related: ['student-wallets', 'student-billing-overview'],
    updatedAt: '2026-06-21',
    tags: ['payment','card','wallet','bank transfer','checkout'],
  },
  {
    slug: 'student-wallets', role: 'student', category: 'student-billing',
    title: 'Paying with JazzCash or Easypaisa',
    summary: 'Use a mobile wallet to pay for lessons.',
    overview: 'Mobile wallet payments let you pay using JazzCash or Easypaisa. You enter your wallet mobile number and confirm the payment in your wallet app. Amounts are converted to PKR at the current rate.',
    steps: [
      { title: 'Choose a wallet', body: 'At checkout, select JazzCash or Easypaisa.' },
      { title: 'Enter your number', body: 'Type the mobile number registered with your wallet.' },
      { title: 'Confirm in your app', body: 'Approve the payment in your wallet app, then return to the platform.' },
    ],
    troubleshooting: [
      { q: 'My payment is pending', a: 'Wallet payments confirm once your provider notifies us. If it stays pending, check your wallet app and contact support with your reference.' },
    ],
    related: ['student-payment-methods'], isNew: true, updatedAt: '2026-06-21',
    tags: ['jazzcash','easypaisa','wallet','mobile','pkr'],
  },
  {
    slug: 'student-messaging', role: 'student', category: 'student-communication',
    title: 'Messaging Your Teacher',
    summary: 'Chat with teachers in real time.',
    overview: 'The Messages page is a real-time chat with your teachers. You can send text, attachments, and voice notes, and see when messages are read.',
    steps: [
      { title: 'Open Messages', body: 'Click Messages in the sidebar or the message icon in the top bar.' },
      { title: 'Select a conversation', body: 'Choose a teacher to open your chat with them.' },
      { title: 'Send a message', body: 'Type your message or attach a file, then send.' },
    ],
    related: ['student-notifications'], updatedAt: '2026-06-20',
    tags: ['message','chat','inbox','attachment','voice note'],
  },
  {
    slug: 'student-notifications', role: 'student', category: 'student-communication',
    title: 'Notifications',
    summary: 'Stay updated on bookings, lessons, and messages.',
    overview: 'Notifications keep you informed about booking confirmations, upcoming lessons, payments, and new messages. The bell icon in the top bar shows your unread count.',
    steps: [
      { title: 'Open the bell', body: 'Click the bell icon in the top bar to see recent notifications.' },
      { title: 'Open a notification', body: 'Click one to jump to the related page; it is marked read.' },
      { title: 'Mark all read', body: 'Use "Mark all read" to clear your unread count.' },
    ],
    related: ['student-messaging'], updatedAt: '2026-06-19',
    tags: ['notification','alert','bell','reminder'],
  },
  {
    slug: 'student-progress-tracking', role: 'student', category: 'student-progress',
    title: 'Tracking Your Progress',
    summary: 'See your Hifz, Tajweed, attendance, and streak.',
    overview: 'Progress tracking shows how you are advancing — Hifz and Tajweed levels, lessons completed, your attendance rate, current streak, and achievement badges.',
    steps: [
      { title: 'Open your Dashboard', body: 'Your progress highlights appear on the dashboard.' },
      { title: 'Review your levels', body: 'Check your Hifz and Tajweed progress bars and named levels.' },
      { title: 'Watch your streak', body: 'Keep attending lessons to build and maintain your streak.' },
    ],
    related: ['student-profile'], updatedAt: '2026-06-21',
    tags: ['progress','hifz','tajweed','attendance','streak','badges'],
  },
  {
    slug: 'student-support', role: 'student', category: 'student-support',
    title: 'Getting Support',
    summary: 'Open a ticket or report an issue.',
    overview: 'If the Knowledge Base does not answer your question, the Support page lets you open a ticket, report an issue, or contact the team, and track replies in one place.',
    steps: [
      { title: 'Open Support', body: 'Click Support in the sidebar.' },
      { title: 'Create a ticket', body: 'Click New Ticket, describe your issue clearly, and submit.' },
      { title: 'Track replies', body: 'Check the status and responses on the same page.' },
    ],
    related: ['student-messaging'], updatedAt: '2026-06-20',
    tags: ['support','ticket','help','issue','contact'],
  },

  // ══════════════════════════ TEACHER ══════════════════════════

  {
    slug: 'teacher-registration', role: 'teacher', category: 'teacher-getting-started',
    title: 'Creating Your Teacher Account',
    summary: 'Sign up as a teacher and reach your dashboard.',
    overview: 'A teacher account lets you create courses, accept bookings, teach live lessons, and earn. The role you choose at signup is permanent, so select Teacher.',
    steps: [
      { title: 'Open Sign Up', body: 'From the homepage or login, click Sign Up.' },
      { title: 'Select the Teacher role', body: 'Choose "Teacher — I want to teach". This is permanent.' },
      { title: 'Enter your details', body: 'Provide your name, email, password, and country, then accept the Terms.' },
      { title: 'Sign in and verify', body: 'Log in, then complete Verification before you can appear to students.' },
    ],
    faqs: [
      { q: 'Can I teach immediately after signing up?', a: 'You must complete and pass Verification first. Until then, students cannot see or book you.' },
    ],
    related: ['teacher-verification', 'teacher-profile'],
    popular: true, updatedAt: '2026-06-21',
    tags: ['signup','register','teacher','account'],
  },
  {
    slug: 'teacher-profile', role: 'teacher', category: 'teacher-getting-started',
    title: 'Building Your Teaching Profile',
    summary: 'Present yourself professionally to students.',
    overview: 'Your teaching profile is what students see when choosing a teacher. It includes your photo, bio, specializations, languages, experience, and rates. A strong profile wins more bookings.',
    steps: [
      { title: 'Open Profile', body: 'Click Profile in the sidebar.' },
      { title: 'Add personal information', body: 'Add your name, photo, and contact details.' },
      { title: 'Set rates and experience', body: 'Enter your hourly and trial rates, years of experience, and teaching background.' },
      { title: 'Choose specializations', body: 'Select the courses you teach. Note: changing specializations may require re-verification.' },
      { title: 'Set available days', body: 'Mark which days you are available for lessons.' },
      { title: 'Save', body: 'Save your profile to update what students see.' },
    ],
    troubleshooting: [
      { q: 'My profile is locked for editing', a: 'Editing pauses while your application is under review or pending re-verification after a major change. It unlocks once approved.' },
    ],
    related: ['teacher-verification', 'teacher-create-course'],
    updatedAt: '2026-06-21',
    tags: ['profile','rates','specialization','availability','bio'],
  },
  {
    slug: 'teacher-dashboard', role: 'teacher', category: 'teacher-getting-started',
    title: 'Using Your Dashboard',
    summary: 'See bookings, earnings, and activity at a glance.',
    overview: 'Your dashboard summarises upcoming lessons, pending booking requests, recent earnings, and key stats so you can run your teaching day from one screen.',
    steps: [
      { title: 'Open Dashboard', body: 'It loads by default after login, or click Dashboard in the sidebar.' },
      { title: 'Review requests and lessons', body: 'See pending booking requests and your upcoming lessons.' },
      { title: 'Check earnings snapshot', body: 'View recent earnings and balances; open Earnings for detail.' },
    ],
    related: ['teacher-bookings', 'teacher-earnings'],
    updatedAt: '2026-06-20',
    tags: ['dashboard','home','overview'],
  },
  {
    slug: 'teacher-verification', role: 'teacher', category: 'teacher-verification',
    title: 'Completing Verification',
    summary: 'Get approved to teach and appear to students.',
    overview: 'Verification protects students and ensures every teacher is qualified. You submit your experience, specializations, an intro video, a government ID, and optionally an Ijazah certificate. Our team reviews within 24–48 hours.',
    steps: [
      { title: 'Open Verification', body: 'Click Verification in the sidebar.' },
      { title: 'Complete your details', body: 'Add experience, specializations, teaching languages, and rates.' },
      { title: 'Upload documents', body: 'Upload a profile photo, a short intro video, and your government ID. Add your Ijazah certificate if you have one.' },
      { title: 'Submit for review', body: 'Agree to the terms and submit. Track your status on the same page.' },
    ],
    faqs: [
      { q: 'How long does it take?', a: 'Usually 24–48 hours after all required documents are submitted.' },
      { q: 'Is my ID kept private?', a: 'Yes. Documents are stored securely and used only for verification.' },
    ],
    troubleshooting: [
      { q: 'My application was returned', a: 'Check the feedback on the Verification page, fix the noted items, and resubmit.' },
    ],
    related: ['teacher-profile', 'teacher-create-course'],
    popular: true, updatedAt: '2026-06-21',
    tags: ['verify','verification','ijazah','id','intro video','approve'],
  },
  {
    slug: 'teacher-create-course', role: 'teacher', category: 'teacher-courses',
    title: 'Creating a Course in Course Studio',
    summary: 'Build trial, live, recorded, or program courses.',
    overview: 'Course Studio is where you create everything students can book. There are four course types — Trial Class, Live Monthly, Recorded Course, and Long-Term Program — each with its own billing model and booking flow.',
    steps: [
      { title: 'Open Course Studio', body: 'Click Courses in the sidebar, then New Course.' },
      { title: 'Choose a course type', body: 'Pick Trial, Live Monthly, Recorded, or Long-Term Program. This sets how it bills.' },
      { title: 'Configure billing', body: 'Live: set lessons per month and price. Recorded: set free/paid and access duration. Program: set upfront or installments.' },
      { title: 'Add details', body: 'Add a title, description, thumbnail, and content.' },
      { title: 'Publish', body: 'Publish the course so students can find and book it.' },
    ],
    related: ['teacher-manage-courses', 'teacher-enrollments'],
    popular: true, updatedAt: '2026-06-21',
    tags: ['course','studio','create','live','recorded','program','trial'],
  },
  {
    slug: 'teacher-manage-courses', role: 'teacher', category: 'teacher-courses',
    title: 'Managing and Editing Courses',
    summary: 'Update, publish, unpublish, or remove courses.',
    overview: 'From Course Studio you can manage every course you have created — edit details, change pricing, publish or unpublish, and review enrollment stats per course.',
    steps: [
      { title: 'Open Course Studio', body: 'Click Courses in the sidebar.' },
      { title: 'Select a course', body: 'Open the course you want to manage.' },
      { title: 'Edit or toggle status', body: 'Update details or publish/unpublish. Unpublished courses are hidden from students.' },
    ],
    related: ['teacher-create-course', 'teacher-enrollments'],
    updatedAt: '2026-06-20',
    tags: ['course','edit','manage','publish','unpublish'],
  },
  {
    slug: 'teacher-enrollments', role: 'teacher', category: 'teacher-courses',
    title: 'Viewing Course Enrollments',
    summary: 'See who has enrolled in your courses.',
    overview: 'Each course shows its enrolled students so you can track demand and follow up. Use this to understand which courses are performing.',
    steps: [
      { title: 'Open a course', body: 'In Course Studio, open a course.' },
      { title: 'View enrollments', body: 'Check the list of enrolled students and counts.' },
    ],
    related: ['teacher-manage-courses', 'teacher-analytics-overview'],
    updatedAt: '2026-06-19',
    tags: ['enrollment','students','course'],
  },
  {
    slug: 'teacher-bookings', role: 'teacher', category: 'teacher-bookings',
    title: 'Managing Bookings and Requests',
    summary: 'Accept requests and track scheduled lessons.',
    overview: 'The Bookings page shows incoming booking requests and your confirmed lessons. Respond to requests promptly to keep students engaged and protect your ranking.',
    steps: [
      { title: 'Open Bookings', body: 'Click Bookings in the sidebar.' },
      { title: 'Review requests', body: 'See pending requests with student and course details.' },
      { title: 'Confirm or manage', body: 'Confirm bookings and track upcoming, completed, and cancelled lessons.' },
    ],
    related: ['teacher-schedule', 'teacher-conduct-lesson'],
    popular: true, updatedAt: '2026-06-20',
    tags: ['bookings','requests','accept','schedule'],
  },
  {
    slug: 'teacher-schedule', role: 'teacher', category: 'teacher-bookings',
    title: 'Setting Your Availability',
    summary: 'Control which days you can be booked.',
    overview: 'Your availability determines when students can book you. Set available days on your profile so booking requests match the times you can teach.',
    steps: [
      { title: 'Open Profile', body: 'Click Profile in the sidebar.' },
      { title: 'Set available days', body: 'In the Available Days section, mark the days you can teach.' },
      { title: 'Save', body: 'Save so your availability is reflected in booking.' },
    ],
    related: ['teacher-bookings', 'teacher-profile'],
    updatedAt: '2026-06-19',
    tags: ['availability','schedule','days','calendar'],
  },
  {
    slug: 'teacher-conduct-lesson', role: 'teacher', category: 'teacher-bookings',
    title: 'Conducting a Live Lesson',
    summary: 'Start and teach your scheduled video lesson.',
    overview: 'When a lesson is due, you join the same secure video room as your student. Lessons completed count toward the student\'s progress and your earnings.',
    steps: [
      { title: 'Open Bookings or Dashboard', body: 'Find the lesson that is about to start.' },
      { title: 'Join the classroom', body: 'Click Join shortly before the start time and allow camera/microphone access.' },
      { title: 'Teach and complete', body: 'Conduct the lesson. When finished, it is marked completed.' },
    ],
    troubleshooting: [
      { q: 'Student did not show up', a: 'Wait a few minutes and message them. Attendance is reflected in the lesson status.' },
    ],
    related: ['teacher-bookings'], updatedAt: '2026-06-21',
    tags: ['live','lesson','join','video','teach'],
  },
  {
    slug: 'teacher-earnings', role: 'teacher', category: 'teacher-earnings',
    title: 'Understanding Your Earnings',
    summary: 'Available, pending, monthly, and lifetime earnings.',
    overview: 'Your Earnings page shows your available balance, pending balance, monthly and lifetime earnings, and payout history. Muddarris takes a commission per lesson; the remainder is yours.',
    steps: [
      { title: 'Open Earnings', body: 'Click Earnings in the sidebar.' },
      { title: 'Review balances', body: 'Compare available vs pending balance and monthly totals.' },
      { title: 'Open the Payouts tab', body: 'See past and pending payouts and request a new one.' },
    ],
    related: ['teacher-payout-settings', 'teacher-request-payout'],
    popular: true, updatedAt: '2026-06-21',
    tags: ['earnings','balance','commission','income'],
  },
  {
    slug: 'teacher-payout-settings', role: 'teacher', category: 'teacher-earnings',
    title: 'Setting Up Payouts',
    summary: 'Add a bank account or mobile wallet to get paid.',
    overview: 'Before requesting a payout, set up how you want to be paid. Choose Bank Account or Mobile Wallet and enter your account holder name and details. More methods (Stripe Connect, Wise, Payoneer) are coming.',
    steps: [
      { title: 'Open Payout Settings', body: 'From Earnings or your Profile, open Payout Settings.' },
      { title: 'Choose a method', body: 'Select Bank Account or Mobile Wallet.' },
      { title: 'Enter details', body: 'Add the account holder name and banking or wallet details.' },
      { title: 'Save', body: 'Save your settings; you can now request payouts.' },
    ],
    related: ['teacher-request-payout', 'teacher-earnings'],
    updatedAt: '2026-06-21',
    tags: ['payout','bank','wallet','settings'],
  },
  {
    slug: 'teacher-request-payout', role: 'teacher', category: 'teacher-earnings',
    title: 'Requesting a Payout',
    summary: 'Withdraw your available balance.',
    overview: 'Once you have an available balance and a saved payout method, you can request a payout. An admin reviews and approves it, then marks it paid. Track each request in your payout history.',
    steps: [
      { title: 'Open Earnings → Payouts', body: 'Ensure your payout method is set up first.' },
      { title: 'Request a payout', body: 'Click Request Payout and enter an amount up to your available balance.' },
      { title: 'Track status', body: 'Follow approval and payment status in your payout history.' },
    ],
    troubleshooting: [
      { q: 'Request Payout is disabled', a: 'You need an available balance above zero and a saved payout method.' },
    ],
    related: ['teacher-payout-settings', 'teacher-earnings'],
    updatedAt: '2026-06-21',
    tags: ['payout','withdraw','request','approve'],
  },
  {
    slug: 'teacher-analytics-overview', role: 'teacher', category: 'teacher-analytics',
    title: 'Reading Your Analytics',
    summary: 'Understand students, earnings, and performance metrics.',
    overview: 'Analytics shows your key metrics — total students, monthly earnings, completion rate, trial conversion, teaching hours, ratings, and bookings — so you can see what is working and grow.',
    steps: [
      { title: 'Open Analytics', body: 'Click Analytics in the sidebar.' },
      { title: 'Review primary KPIs', body: 'Check students, earnings, completion rate, and trial conversion.' },
      { title: 'Review secondary KPIs', body: 'See teaching hours, total earnings, average rating, and total bookings.' },
    ],
    related: ['teacher-earnings', 'teacher-enrollments'],
    updatedAt: '2026-06-20',
    tags: ['analytics','metrics','kpi','performance','rating'],
  },
  {
    slug: 'teacher-messaging', role: 'teacher', category: 'teacher-communication',
    title: 'Messaging Students and Parents',
    summary: 'Communicate in real time with quick templates.',
    overview: 'The Messages page lets you chat with students and parents. You can send text, attachments, and voice notes, and use quick-message templates for common updates like homework and reminders.',
    steps: [
      { title: 'Open Messages', body: 'Click Messages in the sidebar or the message icon in the top bar.' },
      { title: 'Select a conversation', body: 'Pick a student or parent to chat with.' },
      { title: 'Use quick templates', body: 'Insert a template (Homework, Progress, Reminder, Notes, Goal) and send.' },
    ],
    related: ['teacher-notifications'], updatedAt: '2026-06-20',
    tags: ['message','chat','templates','attachment'],
  },
  {
    slug: 'teacher-notifications', role: 'teacher', category: 'teacher-communication',
    title: 'Notifications',
    summary: 'Stay updated on bookings, lessons, and messages.',
    overview: 'Notifications alert you to new booking requests, upcoming lessons, payments, and messages. The bell icon in the top bar shows your unread count.',
    steps: [
      { title: 'Open the bell', body: 'Click the bell icon in the top bar.' },
      { title: 'Act on notifications', body: 'Open one to jump to the relevant page, or mark all read.' },
    ],
    related: ['teacher-messaging'], updatedAt: '2026-06-19',
    tags: ['notification','alert','bell','reminder'],
  },
  {
    slug: 'teacher-support', role: 'teacher', category: 'teacher-support',
    title: 'Getting Support',
    summary: 'Open a ticket or report an issue.',
    overview: 'The Support page lets you open a ticket, report an issue, or contact the team, and track replies in one place.',
    steps: [
      { title: 'Open Support', body: 'Click Support in the sidebar.' },
      { title: 'Create a ticket', body: 'Click New Ticket, describe your issue, and submit.' },
      { title: 'Track replies', body: 'Check status and responses on the same page.' },
    ],
    related: ['teacher-messaging'], updatedAt: '2026-06-20',
    tags: ['support','ticket','help','issue'],
  },

  // ══════════════════════════ PARENT ══════════════════════════

  {
    slug: 'parent-registration', role: 'parent', category: 'parent-getting-started',
    title: 'Creating Your Parent Account',
    summary: 'Sign up as a parent and reach your dashboard.',
    overview: 'A parent account lets you add children, book lessons for them, monitor their progress, and manage billing. The role you choose at signup is permanent, so select Parent.',
    steps: [
      { title: 'Open Sign Up', body: 'From the homepage or login, click Sign Up.' },
      { title: 'Select the Parent role', body: 'Choose "Parent — my child learns". This is permanent.' },
      { title: 'Enter your details', body: 'Provide your name, email, password, and country, then accept the Terms.' },
      { title: 'Sign in', body: 'Log in to reach your Parent Dashboard, then add your children.' },
    ],
    faqs: [
      { q: 'Can I change my role later?', a: 'No. Roles are permanent. Register a new account if you chose the wrong one.' },
    ],
    related: ['parent-add-child', 'parent-dashboard'],
    popular: true, updatedAt: '2026-06-21',
    tags: ['signup','register','parent','account'],
  },
  {
    slug: 'parent-dashboard', role: 'parent', category: 'parent-getting-started',
    title: 'Using Your Dashboard',
    summary: 'See your children and family activity at a glance.',
    overview: 'Your dashboard summarises your children, their upcoming lessons, and recent activity, with quick links to add a child, view progress, or message teachers.',
    steps: [
      { title: 'Open Dashboard', body: 'It loads by default after login, or click Dashboard.' },
      { title: 'Review your children', body: 'See each child and their upcoming lessons.' },
      { title: 'Use quick actions', body: 'Jump to Children, Progress, Teachers, or Messages.' },
    ],
    related: ['parent-add-child', 'parent-progress'],
    updatedAt: '2026-06-20',
    tags: ['dashboard','home','overview','family'],
  },
  {
    slug: 'parent-profile', role: 'parent', category: 'parent-getting-started',
    title: 'Setting Up Your Profile',
    summary: 'Complete your profile and contact details.',
    overview: 'Your profile holds your name, photo, contact details, and country, which help teachers and staff recognise you and schedule your children\'s lessons. A completeness percentage shows what is left.',
    steps: [
      { title: 'Open Profile', body: 'Click Profile in the sidebar or your avatar in the top bar.' },
      { title: 'Add personal information', body: 'Enter your name, photo, and contact details.' },
      { title: 'Add contact & location', body: 'Set your country and contact info for scheduling.' },
      { title: 'Save', body: 'Click Save Profile to update your details.' },
    ],
    related: ['parent-registration', 'parent-add-child'],
    updatedAt: '2026-06-21',
    tags: ['profile','photo','contact','settings','completeness'],
  },
  {
    slug: 'parent-add-child', role: 'parent', category: 'parent-children',
    title: 'Adding a Child',
    summary: 'Link a child to your account.',
    overview: 'The Children page is where you add and manage your children. You can link an existing child account by email or create a new child profile, then book lessons and track progress for each.',
    steps: [
      { title: 'Open Children', body: 'Click Children in the sidebar.' },
      { title: 'Click Add Child', body: 'Use the Add Child button.' },
      { title: 'Link or create', body: 'Link an existing child by their email, or create a new child profile with their details.' },
      { title: 'Confirm', body: 'The child now appears on your Children page with their stats.' },
    ],
    faqs: [
      { q: 'How many children can I add?', a: 'You can add multiple children and manage each one separately.' },
    ],
    related: ['parent-manage-children', 'parent-progress'],
    popular: true, updatedAt: '2026-06-21',
    tags: ['child','children','add','link','create'],
  },
  {
    slug: 'parent-manage-children', role: 'parent', category: 'parent-children',
    title: 'Managing Your Children',
    summary: 'View, update, and remove children.',
    overview: 'On the Children page, each child has a card with their stats, attendance, and quick actions to view progress, book a lesson, or remove the child from your account.',
    steps: [
      { title: 'Open Children', body: 'Click Children in the sidebar.' },
      { title: 'Use the card actions', body: 'On each child card use View Progress, Book, or Remove.' },
      { title: 'Remove if needed', body: 'Removing a child unlinks them from your account; confirm when prompted.' },
    ],
    related: ['parent-add-child', 'parent-child-detail'],
    updatedAt: '2026-06-20',
    tags: ['child','manage','remove','card'],
  },
  {
    slug: 'parent-progress', role: 'parent', category: 'parent-progress',
    title: 'Monitoring Progress (All Children)',
    summary: 'See every child\'s progress in one place.',
    overview: 'The Progress page gives a family overview — combined totals plus a summary card for each child with stats, Hifz/Tajweed bars, attendance, and streak. Click a child to open their full report.',
    steps: [
      { title: 'Open Progress', body: 'Click Progress in the sidebar.' },
      { title: 'Review family totals', body: 'See combined lessons this month, total completed, and upcoming.' },
      { title: 'Open a child', body: 'Click a child\'s card to open their detailed progress page.' },
    ],
    related: ['parent-child-detail', 'parent-reports'],
    popular: true, updatedAt: '2026-06-21',
    tags: ['progress','children','overview','hifz','tajweed','attendance'],
  },
  {
    slug: 'parent-child-detail', role: 'parent', category: 'parent-progress',
    title: 'Viewing a Child\'s Detailed Progress',
    summary: 'Full report for one child.',
    overview: 'A child\'s detail page shows their stat tiles (this month, total done, upcoming, streak), Hifz and Tajweed levels with named stages, achievements, upcoming lessons, and a printable report.',
    steps: [
      { title: 'Open a child', body: 'From Progress or Children, click View Progress on a child.' },
      { title: 'Review the report', body: 'Check stats, levels, achievements, and upcoming lessons.' },
      { title: 'Print if needed', body: 'Use Print Progress Report for a printable summary, or Book a Lesson.' },
    ],
    related: ['parent-progress', 'parent-reports'],
    updatedAt: '2026-06-21',
    tags: ['child','detail','progress','report','achievements'],
  },
  {
    slug: 'parent-reports', role: 'parent', category: 'parent-progress',
    title: 'Printing Progress Reports',
    summary: 'Generate a printable report for a child.',
    overview: 'You can produce a printable progress report summarising lessons completed, attendance, streak, and Hifz/Tajweed levels — useful for records or sharing.',
    steps: [
      { title: 'Open a child\'s detail page', body: 'From Progress, open a child.' },
      { title: 'Print the report', body: 'Click Print Progress Report to generate a printable summary.' },
    ],
    related: ['parent-child-detail'], updatedAt: '2026-06-20',
    tags: ['report','print','download','progress'],
  },
  {
    slug: 'parent-find-teachers', role: 'parent', category: 'parent-booking',
    title: 'Finding Teachers for Your Child',
    summary: 'Browse and choose teachers.',
    overview: 'The Teachers page lets you browse certified teachers, review their specializations, languages, experience, and intro videos, and pick the right fit for your child.',
    steps: [
      { title: 'Open Teachers', body: 'Click Teachers in the sidebar.' },
      { title: 'Browse and open profiles', body: 'Review teacher cards and open profiles for full details.' },
      { title: 'Choose a teacher', body: 'Start with a trial or enrol your child in a course.' },
    ],
    related: ['parent-book-lesson'], updatedAt: '2026-06-20',
    tags: ['teachers','browse','find','choose'],
  },
  {
    slug: 'parent-book-lesson', role: 'parent', category: 'parent-booking',
    title: 'Booking a Lesson for Your Child',
    summary: 'Book trials and courses on behalf of a child.',
    overview: 'You book lessons for your children the same way students do — choose a teacher or course, select a plan, pick a payment method, and confirm. The lesson is linked to the chosen child.',
    steps: [
      { title: 'Choose a teacher or course', body: 'From Teachers, open a teacher and pick a trial or course. You can also use the Book action on a child\'s card.' },
      { title: 'Select the child', body: 'Make sure the booking is for the correct child.' },
      { title: 'Pick a payment method', body: 'Choose Card, Mobile Wallet, or Bank Transfer at checkout.' },
      { title: 'Confirm', body: 'Complete payment to confirm the booking.' },
    ],
    related: ['parent-find-teachers', 'parent-billing-overview'],
    popular: true, updatedAt: '2026-06-21',
    tags: ['book','lesson','child','trial','course','checkout'],
  },
  {
    slug: 'parent-billing-overview', role: 'parent', category: 'parent-billing',
    title: 'Understanding Billing',
    summary: 'Subscriptions, invoices, and payment history.',
    overview: 'Your Billing page shows your subscriptions, course access, invoices, and payment history across all your children\'s lessons. Live courses bill monthly; recorded courses and programs are one-time or installments.',
    steps: [
      { title: 'Open Billing', body: 'Click Billing in the sidebar.' },
      { title: 'Review the tabs', body: 'Browse Overview, Subscriptions, Course Access, Invoices, and History.' },
      { title: 'Download invoices', body: 'Open the Invoices tab to keep records.' },
    ],
    related: ['parent-payment-methods', 'parent-wallets'],
    popular: true, updatedAt: '2026-06-21',
    tags: ['billing','invoice','subscription','history'],
  },
  {
    slug: 'parent-payment-methods', role: 'parent', category: 'parent-billing',
    title: 'Payment Methods',
    summary: 'Pay by card, mobile wallet, or bank transfer.',
    overview: 'At checkout you choose how to pay. Muddarris supports card payments, mobile wallets (JazzCash and Easypaisa), and bank transfer. You can choose a different method each time.',
    steps: [
      { title: 'Reach checkout', body: 'Book a lesson or enrol your child in a course.' },
      { title: 'Pick a method', body: 'Choose Card, Mobile Wallet, or Bank Transfer.' },
      { title: 'Complete payment', body: 'Card confirms instantly; bank transfer reserves the spot until confirmed.' },
    ],
    related: ['parent-wallets', 'parent-billing-overview'],
    updatedAt: '2026-06-21',
    tags: ['payment','card','wallet','bank transfer','checkout'],
  },
  {
    slug: 'parent-wallets', role: 'parent', category: 'parent-billing',
    title: 'Paying with JazzCash or Easypaisa',
    summary: 'Use a mobile wallet to pay.',
    overview: 'Mobile wallet payments let you pay using JazzCash or Easypaisa. Enter your wallet mobile number and confirm in your wallet app. Amounts are converted to PKR at the current rate.',
    steps: [
      { title: 'Choose a wallet', body: 'At checkout, select JazzCash or Easypaisa.' },
      { title: 'Enter your number', body: 'Type the mobile number registered with your wallet.' },
      { title: 'Confirm in your app', body: 'Approve the payment in your wallet, then return to the platform.' },
    ],
    troubleshooting: [
      { q: 'Payment shows pending', a: 'It confirms once your provider notifies us. If it stays pending, check your wallet app and contact support with your reference.' },
    ],
    related: ['parent-payment-methods'], isNew: true, updatedAt: '2026-06-21',
    tags: ['jazzcash','easypaisa','wallet','mobile','pkr'],
  },
  {
    slug: 'parent-messaging', role: 'parent', category: 'parent-communication',
    title: 'Messaging Teachers',
    summary: 'Chat with your child\'s teachers.',
    overview: 'The Messages page lets you chat with your children\'s teachers in real time — send text, attachments, and voice notes, and see when messages are read.',
    steps: [
      { title: 'Open Messages', body: 'Click Messages in the sidebar or the message icon in the top bar.' },
      { title: 'Select a conversation', body: 'Choose a teacher to chat with.' },
      { title: 'Send a message', body: 'Type or attach a file, then send.' },
    ],
    related: ['parent-notifications'], updatedAt: '2026-06-20',
    tags: ['message','chat','teacher','attachment'],
  },
  {
    slug: 'parent-notifications', role: 'parent', category: 'parent-communication',
    title: 'Notifications',
    summary: 'Stay updated on your children\'s lessons and messages.',
    overview: 'Notifications keep you informed about bookings, upcoming lessons, payments, and messages for your children. The bell icon in the top bar shows your unread count.',
    steps: [
      { title: 'Open the bell', body: 'Click the bell icon in the top bar.' },
      { title: 'Act on notifications', body: 'Open one to jump to the related page, or mark all read.' },
    ],
    related: ['parent-messaging'], updatedAt: '2026-06-19',
    tags: ['notification','alert','bell','reminder'],
  },
  {
    slug: 'parent-support', role: 'parent', category: 'parent-support',
    title: 'Getting Support',
    summary: 'Open a ticket or report an issue.',
    overview: 'The Support page lets you open a ticket, report an issue, or contact the team, and track replies in one place.',
    steps: [
      { title: 'Open Support', body: 'Click Support in the sidebar.' },
      { title: 'Create a ticket', body: 'Click New Ticket, describe your issue, and submit.' },
      { title: 'Track replies', body: 'Check status and responses on the same page.' },
    ],
    related: ['parent-messaging'], updatedAt: '2026-06-20',
    tags: ['support','ticket','help','issue'],
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

export function categoriesForRole(role: HelpRole): HelpCategory[] {
  return CATEGORIES.filter(c => c.role === role).sort((a, b) => a.order - b.order)
}

export function articlesForRole(role: HelpRole): HelpArticle[] {
  return ARTICLES.filter(a => a.role === role)
}

export function articlesInCategory(categorySlug: string): HelpArticle[] {
  return ARTICLES.filter(a => a.category === categorySlug)
}

export function getArticle(role: HelpRole, slug: string): HelpArticle | undefined {
  return ARTICLES.find(a => a.role === role && a.slug === slug)
}

export function getCategory(slug: string): HelpCategory | undefined {
  return CATEGORIES.find(c => c.slug === slug)
}

export function popularArticles(role: HelpRole): HelpArticle[] {
  return articlesForRole(role).filter(a => a.popular)
}

export function recentArticles(role: HelpRole, limit = 6): HelpArticle[] {
  return [...articlesForRole(role)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit)
}

export function newFeatureGuides(role: HelpRole): HelpArticle[] {
  return articlesForRole(role).filter(a => a.isNew)
}

export function searchArticles(query: string, role: HelpRole): HelpArticle[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const terms = q.split(/\s+/)
  return articlesForRole(role)
    .map(a => {
      const haystack = [
        a.title, a.summary, a.overview,
        ...(a.tags ?? []),
        ...(a.steps ?? []).flatMap(s => [s.title, s.body]),
        ...(a.faqs ?? []).flatMap(f => [f.q, f.a]),
        getCategory(a.category)?.title ?? '',
      ].join(' ').toLowerCase()
      const score = terms.reduce((s, t) => s + (haystack.includes(t) ? 1 : 0), 0)
      return { a, score }
    })
    .filter(x => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .map(x => x.a)
}

export function relatedArticles(article: HelpArticle): HelpArticle[] {
  return (article.related ?? [])
    .map(slug => getArticle(article.role, slug))
    .filter(Boolean) as HelpArticle[]
}
