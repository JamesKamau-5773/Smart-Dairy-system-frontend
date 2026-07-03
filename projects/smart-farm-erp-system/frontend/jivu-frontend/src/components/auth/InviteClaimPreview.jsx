import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Link2, RefreshCw } from 'lucide-react';

function createPreviewToken() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().replace(/-/g, '');
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export default function InviteClaimPreview({
  title = 'Invite Claim Preview',
  description = 'Generate a claim link before sending the invite so you can review it and share it with confidence.',
  claimPath = '/claim-account',
}) {
  const [token, setToken] = useState('');
  const [copyState, setCopyState] = useState('idle');

  const claimUrl = useMemo(() => {
    if (!token) return '';

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}${claimPath}?token=${token}`;
  }, [claimPath, token]);

  useEffect(() => {
    setToken(createPreviewToken());
  }, []);

  const handleGenerate = () => {
    setToken(createPreviewToken());
    setCopyState('idle');
  };

  const handleCopy = async () => {
    if (!claimUrl) return;

    try {
      await navigator.clipboard.writeText(claimUrl);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      setCopyState('error');
      window.setTimeout(() => setCopyState('idle'), 1800);
    }
  };

  return (
    <section className="rounded-2xl border border-ink/10 bg-surface-warm/35 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-brand">
            <Link2 size={12} /> {title}
          </p>
          <p className="text-sm leading-6 text-ink-muted">{description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleGenerate} className="btn-secondary inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold">
            <RefreshCw size={14} /> Regenerate
          </button>
          <button type="button" onClick={handleCopy} className="btn-command inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold">
            {copyState === 'copied' ? <Check size={14} /> : <Copy size={14} />}
            {copyState === 'copied' ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="rounded-xl border border-ink/10 bg-white px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Draft token</div>
          <div className="mt-1 break-all font-mono text-sm text-ink-strong">{token || 'Generating...'}</div>
        </div>

        <div className="rounded-xl border border-ink/10 bg-white px-4 py-3 lg:min-w-[280px]">
          <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Claim URL</div>
          <div className="mt-1 break-all font-mono text-sm text-brand">{claimUrl || 'Generating...'}</div>
        </div>
      </div>

      {copyState === 'error' && (
        <p className="mt-3 text-xs font-medium text-danger">Copy failed. You can select and copy the link manually.</p>
      )}
    </section>
  );
}