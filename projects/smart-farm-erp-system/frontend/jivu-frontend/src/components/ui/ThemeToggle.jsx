import React, { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [tone, setTone] = useState(() => {
    try { return localStorage.getItem('typographyTone') || 'soft'; } catch { return 'soft'; }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = tone;
    try { localStorage.setItem('typographyTone', tone); } catch {}
  }, [tone]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setTone('soft')}
        className={`text-sm ${tone === 'soft' ? 'btn-command font-ui' : 'btn-secondary'}`}
        aria-pressed={tone === 'soft'}
        title="Soft typography"
      >Soft</button>
      <button
        onClick={() => setTone('dense')}
        className={`text-sm ${tone === 'dense' ? 'btn-command font-ui' : 'btn-secondary'}`}
        aria-pressed={tone === 'dense'}
        title="Dense typography (higher contrast)"
      >Dense</button>
    </div>
  );
}
