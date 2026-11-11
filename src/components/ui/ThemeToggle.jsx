import { useEffect, useState } from 'react';
import { commonCopy } from '../../i18n/common';

/** Soft / Dense typography switch in the profile menu; remembered on this device. */
export default function ThemeToggle() {
  const [tone, setTone] = useState(() => {
    try { return localStorage.getItem('typographyTone') || 'soft'; } catch { return 'soft'; }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = tone;
    try { localStorage.setItem('typographyTone', tone); } catch { /* blocked storage: the choice lasts this visit */ }
  }, [tone]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setTone('soft')}
        className={`text-sm ${tone === 'soft' ? 'btn-command font-ui' : 'btn-secondary'}`}
        aria-pressed={tone === 'soft'}
        title={commonCopy.density.softHint}
      >{commonCopy.density.soft}</button>
      <button
        onClick={() => setTone('dense')}
        className={`text-sm ${tone === 'dense' ? 'btn-command font-ui' : 'btn-secondary'}`}
        aria-pressed={tone === 'dense'}
        title={commonCopy.density.denseHint}
      >{commonCopy.density.dense}</button>
    </div>
  );
}
