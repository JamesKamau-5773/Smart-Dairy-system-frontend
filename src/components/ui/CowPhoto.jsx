import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { useDataSaver } from '../../hooks/useDataSaver';
import { commonCopy } from '../../i18n/common';

/**
 * A cow photo that respects data saver: when it's on, the photo isn't downloaded until the
 * farmer taps "Show photo". `fallback` renders when there is no photo at all.
 */
export default function CowPhoto({ src, alt, size, fallback = null, className = 'h-full w-full object-cover' }) {
  const [dataSaver] = useDataSaver();
  const [revealed, setRevealed] = useState(false);

  if (!src) return fallback;

  if (dataSaver && !revealed) {
    return (
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-brand hover:bg-brand-50"
        title={commonCopy.photo.dataSaverHint}
      >
        <ImageOff size={size > 70 ? 20 : 16} aria-hidden="true" />
        <span className="text-[10px] font-semibold leading-tight">{commonCopy.photo.show}</span>
      </button>
    );
  }

  return <img src={src} alt={alt} width={size} height={size} loading="lazy" decoding="async" className={className} />;
}
