// components/Price.tsx
// <Price usd={10} /> — renders a USD amount in the viewer's local currency, e.g.
// "PKR 2,783 · ≈ $10", with an optional approx-USD tail. Falls back to "$10.00"
// until the currency loads or when it's USD. RN port of the web <Price>. Display
// only — never changes what is charged (USD is the accounting currency).

import { Text, type TextStyle, type StyleProp } from 'react-native';
import { useDisplayCurrency } from '@/lib/pricing/useDisplayCurrency';
import { formatCurrency } from '@/lib/pricing/currency';

export function Price({
  usd,
  approx = true,
  style,
  approxStyle,
}: {
  usd: number | null | undefined;
  approx?: boolean;
  style?: StyleProp<TextStyle>;
  approxStyle?: StyleProp<TextStyle>;
}) {
  const { currency, ready, format } = useDisplayCurrency();
  const n = Number(usd) || 0;
  const showLocal = ready && currency !== 'usd';
  return (
    <Text style={style}>
      {showLocal ? format(n) : formatCurrency(n, 'usd')}
      {showLocal && approx ? (
        <Text style={[{ opacity: 0.7, fontWeight: '500', fontSize: 12 }, approxStyle]}> · ≈ {formatCurrency(n, 'usd')}</Text>
      ) : null}
    </Text>
  );
}
