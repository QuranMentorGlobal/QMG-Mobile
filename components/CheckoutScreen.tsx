// components/CheckoutScreen.tsx — checkout + payment (shared student/parent).
// Card payment posts to the production /api/payments/process (service-role, mock
// Stripe). 4000 0000 0000 0002 declines client-side, like the website.
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { processCardPayment, walletInitiate } from '@/lib/db';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';

type Method = 'card' | 'jazzcash' | 'easypaisa' | 'bank';
const METHODS: { key: Method; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap; manual?: boolean }[] = [
  { key: 'card', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, American Express', icon: 'card-outline' },
  { key: 'jazzcash', label: 'JazzCash', desc: 'Pay instantly with your JazzCash wallet', icon: 'wallet-outline' },
  { key: 'easypaisa', label: 'Easypaisa', desc: 'Pay instantly with your Easypaisa wallet', icon: 'wallet-outline' },
  { key: 'bank', label: 'Bank Transfer', desc: 'Transfer directly to our bank account', icon: 'business-outline', manual: true },
];
const TEST_CARDS = [
  { brand: 'Visa', num: '4242 4242 4242 4242', meta: 'Visa · Exp 12/28 · CVC 123', ok: true },
  { brand: 'Mastercard', num: '5555 5555 5555 4444', meta: 'Mastercard · Exp 12/28 · CVC 123', ok: true },
  { brand: 'Visa', num: '4000 0000 0000 0002', meta: 'Visa · Exp 12/28 · CVC 123', ok: false },
];
const brandOf = (n: string) => (n.startsWith('4') ? 'Visa' : n.startsWith('5') ? 'Mastercard' : 'Card');

export function CheckoutScreen({ bookingsPath }: { bookingsPath: string }) {
  const params = useLocalSearchParams<{ bookingId: string; amount: string; course: string; teacher: string; badge: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const amount = parseFloat(params.amount ?? '0');
  const isCourse = (params.badge ?? '').includes('COURSE');
  const badgeText = params.badge ?? (amount === 0 ? 'FREE TRIAL' : 'TRIAL CLASS');
  const email = session?.user?.email ?? '';

  const [method, setMethod] = useState<Method>('card');
  const [card, setCard] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [billEmail, setBillEmail] = useState(email);
  const [zip, setZip] = useState('');
  const [walletNumber, setWalletNumber] = useState('');
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'declined' | 'pending'>('form');
  const [err, setErr] = useState<string | null>(null);

  const last4 = useMemo(() => card.replace(/\s/g, '').slice(-4), [card]);

  async function pay() {
    setErr(null);
    if (method === 'bank') { setStep('pending'); return; }
    if (method === 'jazzcash' || method === 'easypaisa') {
      if (walletNumber.trim().length < 10) { setErr('Enter your wallet mobile number.'); return; }
      setStep('processing');
      const res = await walletInitiate({ bookingId: params.bookingId!, provider: method, amount, walletNumber: walletNumber.trim() });
      if (res.ok) setStep('pending');
      else { setErr(res.error ?? 'Could not initiate payment.'); setStep('form'); }
      return;
    }
    const raw = card.replace(/\s/g, '');
    if (raw.length < 12 || !name.trim()) { setErr('Enter a valid card number and cardholder name.'); return; }
    setStep('processing');
    if (raw === '4000000000000002') {
      await new Promise((r) => setTimeout(r, 1200));
      setStep('declined'); return;
    }
    const res = await processCardPayment({ bookingId: params.bookingId!, amount, brand: brandOf(raw), last4: raw.slice(-4), name: name.trim() });
    if (res.ok) setStep('success');
    else { setErr(res.error ?? 'Payment could not be processed.'); setStep('declined'); }
  }

  if (step === 'processing') {
    return <Screen scroll={false}><Loading label="Processing payment…" /></Screen>;
  }

  if (step === 'success') {
    return (
      <Screen>
        <LinearGradient colors={['#15402A', '#166534', '#3F5A1E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.successHero}>
          <View style={styles.successCheck}><Ionicons name="checkmark" size={32} color={C.white} /></View>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successSub}>Your booking is confirmed</Text>
        </LinearGradient>
        <View style={styles.successBody}>
          <SuccessRow k="Amount paid" v={`$${amount.toFixed(2)}`} bold />
          <SuccessRow k="Course" v={params.course ?? 'Trial Class'} bold />
          <SuccessRow k="Teacher" v={params.teacher ?? '—'} bold />
          <SuccessRow k="Card charged" v={`${brandOf(card.replace(/\s/g, ''))} •••• ${last4 || '----'}`} bold />
          <SuccessRow k="Receipt sent to" v={billEmail || email || '—'} bold />
          <View style={styles.ayah}>
            <Text style={styles.ayahArabic}>خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ</Text>
            <Text style={styles.ayahText}>"The best of you are those who learn the Quran and teach it."</Text>
          </View>
          <Pressable onPress={() => router.replace(`${bookingsPath}?tab=pending` as any)}>
            <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bookBtn}>
              <Text style={styles.bookText}>View My Bookings →</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (step === 'pending') {
    const isBank = method === 'bank';
    return (
      <Screen>
        <View style={styles.declined}>
          <View style={[styles.declinedIcon, { backgroundColor: C.gold }]}><Ionicons name={isBank ? 'business' : 'time'} size={30} color={C.ink} /></View>
          <Text style={styles.declinedTitle}>{isBank ? 'Booking Reserved' : 'Payment Initiated'}</Text>
          <Text style={styles.declinedSub}>
            {isBank
              ? 'Your trial is reserved as pending. Complete the bank transfer and our team will confirm your booking once received.'
              : `We've sent a payment request to your ${method === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} wallet. Approve it there — your booking confirms automatically once payment clears.`}
          </Text>
          <Pressable onPress={() => router.replace(`${bookingsPath}?tab=pending` as any)} style={styles.retryBtn}><Text style={styles.retryText}>View My Bookings</Text></Pressable>
        </View>
      </Screen>
    );
  }

  if (step === 'declined') {
    return (
      <Screen>
        <View style={styles.declined}>
          <View style={styles.declinedIcon}><Ionicons name="close" size={30} color={C.white} /></View>
          <Text style={styles.declinedTitle}>Payment Declined</Text>
          <Text style={styles.declinedSub}>{err || 'Your card was declined. Try a different card.'}</Text>
          <Pressable onPress={() => setStep('form')} style={styles.retryBtn}><Text style={styles.retryText}>Try Again</Text></Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Ionicons name="chevron-back" size={20} color={C.ink} /><Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.portalLabel}>PORTAL</Text>
          <Text style={styles.checkoutTitle}>Checkout</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="shield-checkmark" size={14} color={C.success} /><Text style={styles.secure}>Secure</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
        {METHODS.map((m) => {
          const on = method === m.key;
          return (
            <Pressable key={m.key} onPress={() => setMethod(m.key)} style={[styles.method, on && styles.methodOn]}>
              <View style={[styles.methodIcon, on && { backgroundColor: C.forest }]}><Ionicons name={m.icon} size={18} color={on ? C.white : C.accent2} /></View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.methodLabel}>{m.label}</Text>
                  {m.manual ? <View style={styles.manualPill}><Text style={styles.manualText}>MANUAL</Text></View> : null}
                </View>
                <Text style={styles.methodDesc}>{m.desc}</Text>
              </View>
              <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
            </Pressable>
          );
        })}
      </View>

      {method === 'card' ? (
        <>
          <View style={styles.testNotice}>
            <Ionicons name="information-circle-outline" size={18} color={C.indigo} />
            <View style={{ flex: 1 }}>
              <Text style={styles.testTitle}>Test Mode — No real payment</Text>
              <Text style={styles.testBody}>Use a test card below. No money will be charged.</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>QUICK FILL — TEST CARDS</Text>
            {TEST_CARDS.map((tc) => (
              <Pressable key={tc.num} onPress={() => { setCard(tc.num); setExp('12/28'); setCvc('123'); if (!name) setName('Awais Tahir'); }} style={styles.testCard}>
                <View style={styles.cardBrand}><Text style={styles.cardBrandText}>{tc.brand === 'Visa' ? 'VISA' : 'MC'}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.testNum}>{tc.num}</Text>
                  <Text style={styles.testMeta}>{tc.meta}</Text>
                </View>
                <View style={[styles.testTag, { backgroundColor: tc.ok ? C.tintGold : 'rgba(220,38,38,0.1)' }]}>
                  <Text style={[styles.testTagText, { color: tc.ok ? C.accent2 : C.red }]}>{tc.ok ? '✓ Succeeds' : '✗ Declines'}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Card Information</Text>
            <Text style={styles.fieldLabel}>CARD NUMBER</Text>
            <TextInput value={card} onChangeText={setCard} placeholder="1234 5678 9012 3456" placeholderTextColor={C.faint} keyboardType="number-pad" style={styles.input} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>EXPIRY DATE</Text>
                <TextInput value={exp} onChangeText={setExp} placeholder="MM / YY" placeholderTextColor={C.faint} style={styles.input} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>CVC</Text>
                <TextInput value={cvc} onChangeText={setCvc} placeholder="123" placeholderTextColor={C.faint} keyboardType="number-pad" style={styles.input} />
              </View>
            </View>
            <Text style={styles.fieldLabel}>CARDHOLDER NAME</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={C.faint} style={styles.input} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Billing Details</Text>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput value={billEmail} onChangeText={setBillEmail} placeholder="you@example.com" placeholderTextColor={C.faint} keyboardType="email-address" style={styles.input} />
            <Text style={styles.fieldLabel}>POSTCODE / ZIP</Text>
            <TextInput value={zip} onChangeText={setZip} placeholder="EC1A 1BB" placeholderTextColor={C.faint} style={styles.input} />
          </View>

          {err ? <Text style={styles.err}>{err}</Text> : null}

          <Pressable onPress={pay}>
            <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.payBtn}>
              <Text style={styles.payText}>Pay ${amount.toFixed(2)}</Text>
            </LinearGradient>
          </Pressable>
          <Text style={styles.ssl}>🔒 SSL Secured  ·  256-bit encryption  ·  PCI compliant</Text>
        </>
      ) : method === 'bank' ? (
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Bank Transfer</Text>
          <Text style={styles.methodDesc}>Reserve your trial now and transfer to our account. We confirm your booking once payment is received.</Text>
          <Pressable onPress={pay} style={{ marginTop: SPACE.md }}>
            <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.payBtn}>
              <Text style={styles.payText}>Reserve — ${amount.toFixed(2)}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>{method === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} Wallet</Text>
          <Text style={styles.methodDesc}>Enter your wallet mobile number. You'll approve the payment in your wallet app.</Text>
          <Text style={styles.fieldLabel}>WALLET MOBILE NUMBER</Text>
          <TextInput value={walletNumber} onChangeText={setWalletNumber} placeholder="03XX XXXXXXX" placeholderTextColor={C.faint} keyboardType="phone-pad" style={styles.input} />
          {err ? <Text style={styles.err}>{err}</Text> : null}
          <Pressable onPress={pay}>
            <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.payBtn}>
              <Text style={styles.payText}>Pay ${amount.toFixed(2)} with {method === 'jazzcash' ? 'JazzCash' : 'Easypaisa'}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {/* Order summary */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Order Summary</Text>
        <View style={styles.orderRow}>
          <View style={styles.orderIcon}><Ionicons name="book-outline" size={18} color={C.accent2} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderCourse}>{params.course ?? 'Trial Class'}</Text>
            <Text style={styles.orderTeacher}>with {params.teacher ?? '—'}</Text>
            <View style={styles.freeTrial}><Text style={styles.freeTrialText}>{badgeText}</Text></View>
          </View>
        </View>
        <View style={styles.summaryRow}><Text style={styles.rowK}>Subtotal</Text><Text style={styles.rowV}>${amount.toFixed(2)}</Text></View>
        <View style={styles.summaryRow}><Text style={styles.totalK}>Total</Text><Text style={styles.totalV}>${amount.toFixed(2)}</Text></View>
        <View style={styles.included}>
          <Text style={styles.includedTitle}>What's included:</Text>
          {(isCourse
            ? ['Lifetime access to course videos', 'Watch at your own pace', 'Direct messaging with teacher', 'Progress tracking']
            : ['Live 1-on-1 session with certified Qari', 'Session recording (coming soon)', 'Direct messaging with teacher', 'Progress tracking']
          ).map((x) => (
            <View key={x} style={styles.includedRow}><Ionicons name="checkmark" size={14} color={C.forest} /><Text style={styles.includedText}>{x}</Text></View>
          ))}
        </View>
        <Text style={styles.guarantee}>🛡 Money-back guarantee if teacher doesn't show up</Text>
        <Text style={styles.poweredBy}>Powered by <Text style={{ color: C.indigo, fontFamily: FONT.bodyBold }}>stripe</Text></Text>
      </View>
    </Screen>
  );
}

function SuccessRow({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return <View style={styles.successRow}><Text style={styles.successK}>{k}</Text><Text style={[styles.successV, bold && { fontFamily: FONT.bodyBold }]}>{v}</Text></View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACE.xs, marginBottom: SPACE.md, paddingBottom: SPACE.md, borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  cancel: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink },
  portalLabel: { fontFamily: FONT.bodyBold, fontSize: 10, color: C.gold, letterSpacing: 1 },
  checkoutTitle: { fontFamily: FONT.displayBold, fontSize: 20, color: C.ink },
  secure: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.success },
  card: { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  sectionLabel: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.muted, letterSpacing: 0.5, marginBottom: SPACE.md },
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: C.borderSoft, borderRadius: RADIUS.md, padding: SPACE.md, marginBottom: SPACE.sm },
  methodOn: { borderColor: C.gold, backgroundColor: C.tintGold },
  methodIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  methodDesc: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  manualPill: { backgroundColor: 'rgba(79,70,229,0.12)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  manualText: { fontFamily: FONT.bodyBold, fontSize: 9, color: C.indigo },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.borderSoft, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: C.gold },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.gold },
  testNotice: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.tintGold, borderRadius: RADIUS.md, padding: SPACE.md, marginBottom: SPACE.md },
  testTitle: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.indigo },
  testBody: { fontFamily: FONT.body, fontSize: 12, color: C.accent2, marginTop: 2 },
  testCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.cream, borderRadius: RADIUS.md, padding: 12, marginBottom: SPACE.sm },
  cardBrand: { width: 38, height: 26, borderRadius: 5, backgroundColor: '#1A1F71', alignItems: 'center', justifyContent: 'center' },
  cardBrandText: { fontFamily: FONT.bodyBold, fontSize: 10, color: C.white },
  testNum: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.ink },
  testMeta: { fontFamily: FONT.body, fontSize: 11, color: C.muted, marginTop: 2 },
  testTag: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  testTagText: { fontFamily: FONT.bodySemi, fontSize: 11 },
  cardSectionTitle: { fontFamily: FONT.displayBold, fontSize: 16, color: C.ink, marginBottom: SPACE.md },
  fieldLabel: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.muted, letterSpacing: 0.5, marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: C.borderSoft, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontFamily: FONT.body, fontSize: 15, color: C.ink, marginBottom: SPACE.sm },
  err: { color: C.red, fontFamily: FONT.bodyMed, fontSize: 13, marginBottom: SPACE.sm, textAlign: 'center' },
  payBtn: { borderRadius: RADIUS.md, paddingVertical: 16, alignItems: 'center' },
  payText: { fontFamily: FONT.bodyBold, fontSize: 17, color: C.white },
  ssl: { fontFamily: FONT.body, fontSize: 11, color: C.faint, textAlign: 'center', marginTop: SPACE.sm, marginBottom: SPACE.md },
  orderRow: { flexDirection: 'row', gap: 12, marginBottom: SPACE.md },
  orderIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.tintGold, alignItems: 'center', justifyContent: 'center' },
  orderCourse: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  orderTeacher: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  freeTrial: { alignSelf: 'flex-start', backgroundColor: C.tintGold, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  freeTrialText: { fontFamily: FONT.bodyBold, fontSize: 10, color: C.accent2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  rowK: { fontFamily: FONT.body, fontSize: 14, color: C.muted },
  rowV: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink },
  totalK: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  totalV: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink },
  included: { backgroundColor: C.cream, borderRadius: RADIUS.md, padding: SPACE.md, marginTop: SPACE.md },
  includedTitle: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.ink, marginBottom: 8 },
  includedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  includedText: { fontFamily: FONT.body, fontSize: 13, color: C.text },
  guarantee: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: SPACE.md, textAlign: 'center' },
  poweredBy: { fontFamily: FONT.body, fontSize: 12, color: C.faint, textAlign: 'center', marginTop: SPACE.sm },
  successHero: { borderRadius: RADIUS.xl, padding: SPACE.section, alignItems: 'center', marginTop: SPACE.sm, ...SHADOW.lg },
  successCheck: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center', marginBottom: SPACE.md },
  successTitle: { fontFamily: FONT.displayBold, fontSize: 26, color: C.white },
  successSub: { fontFamily: FONT.body, fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  successBody: { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.lg, marginTop: -SPACE.md, ...SHADOW.card },
  successRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  successK: { fontFamily: FONT.body, fontSize: 14, color: C.muted },
  successV: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink, flexShrink: 1, textAlign: 'right' },
  ayah: { backgroundColor: C.cream, borderRadius: RADIUS.md, padding: SPACE.md, marginTop: SPACE.md, alignItems: 'center' },
  ayahArabic: { fontFamily: FONT.body, fontSize: 17, color: C.forest, textAlign: 'center', marginBottom: 8 },
  ayahText: { fontFamily: FONT.body, fontSize: 13, color: C.muted, textAlign: 'center', fontStyle: 'italic' },
  bookBtn: { borderRadius: RADIUS.md, paddingVertical: 15, alignItems: 'center', marginTop: SPACE.lg },
  bookText: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.white },
  declined: { alignItems: 'center', paddingVertical: SPACE.section * 2 },
  declinedIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', marginBottom: SPACE.md },
  declinedTitle: { fontFamily: FONT.displayBold, fontSize: 22, color: C.ink },
  declinedSub: { fontFamily: FONT.body, fontSize: 14, color: C.muted, marginTop: 8, textAlign: 'center', paddingHorizontal: SPACE.lg, lineHeight: 20 },
  retryBtn: { marginTop: SPACE.lg, backgroundColor: C.forest, borderRadius: RADIUS.md, paddingHorizontal: SPACE.section, paddingVertical: 13 },
  retryText: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.white },
});
