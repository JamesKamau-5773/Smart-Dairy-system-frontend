import { useMemo, useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import { resolveInviteClaimUrl } from '../../lib/staffOnboarding';

export default function InviteClaimPreview({
  invite,
  title = 'Account claim link',
  description = 'This link is issued by the server after the invitation is created.',
}) {
  const [copyState, setCopyState] = useState('idle');

  const claimUrl = useMemo(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return resolveInviteClaimUrl(invite, baseUrl);
  }, [invite]);

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
    <section className="rounded-2xl border border-ink/10 bg-surface-warm/35 p-4 ">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-brand">
            <Link2 size={12} /> {title}
          </p>
          <p className="text-sm leading-6 text-ink-muted">{description}</p>
        </div>

        {claimUrl && (
          <button type="button" onClick={handleCopy} className="btn-command relative inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold" aria-label="Copy claim link">
            {copyState === 'copied' ? <Check size={14} /> : <Copy size={14} />}
            {copyState === 'copied' ? 'Copied' : 'Copy link'}
            {copyState === 'copied' && <span role="status" className="absolute -top-9 right-0 rounded bg-emerald-700 px-2 py-1 text-[10px] text-white shadow">Copied!</span>}
          </button>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-ink/10 bg-white px-4 py-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Claim URL</div>
        <div className="mt-1 break-all font-mono text-sm tabular-nums text-brand">
          {claimUrl || 'Send the invitation to generate a secure claim link.'}
        </div>
      </div>

      {copyState === 'error' && (
        <p className="mt-3 text-xs font-medium text-danger">Copy failed. You can select and copy the link manually.</p>
      )}
    </section>
  );
}