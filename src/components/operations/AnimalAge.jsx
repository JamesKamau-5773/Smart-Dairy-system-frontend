import { formatAge } from '../../lib/herdUtils';
import { herdCopy } from '../../i18n/herd';

/**
 * An animal's age ("3y 10m"), from the months the backend sent. When the backend sent none
 * (null), a dash, with "Age not recorded" for screen readers: never "0y 0m".
 */
export default function AnimalAge({ months }) {
  const text = formatAge(months);
  if (text) return text;
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{herdCopy.age.notRecorded}</span>
    </>
  );
}
