import Money from '../../ui/Money';
import { signedAmount } from '../../../lib/ledgerRecord';

/**
 * A record's amount with its currency, signed by its type ("−KES 53,786.69").
 * tone: 'signed' colours a negative with the theme's negative-money token (the table);
 *       'neutral' keeps the text colour, so only the minus shows the direction (the phone list).
 */
export default function LedgerAmount({ tx, tone = 'signed', className = 'text-body-strong' }) {
  const amount = signedAmount(tx);
  if (amount === null) return <Money amount={tx.amount} cents="plain" className={className} />;
  return <Money amount={amount} tone={tone === 'signed' ? 'signed' : null} cents="plain" className={className} />;
}
