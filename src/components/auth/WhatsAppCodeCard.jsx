import { useState } from 'react';
import { Check, Copy, MessageCircle } from 'lucide-react';
import { authCopy } from '../../i18n/auth.en';
import { displayPhone } from '../../lib/phone';

/**
 * The reverse-OTP hand-off shared by phone verification and password reset:
 * a button that opens WhatsApp with the code pre-filled, plus the code and
 * number in plain text for farmers who prefer to type it.
 *
 * The button is a real link opened in a new tab: mobile browsers block
 * window.open after an await, and a new tab keeps this page (and its polling)
 * alive while the farmer is in WhatsApp.
 */
export default function WhatsAppCodeCard({ waLink, messageText, whatsappNumber, buttonLabel, onOpen }) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the code is still on screen to read.
    }
  };

  return (
    <div className="space-y-4">
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onOpen}
        className="btn-command w-full gap-2 py-4 text-base"
      >
        <MessageCircle size={20} aria-hidden="true" /> {buttonLabel}
      </a>

      <div className="rounded-card border border-ink/10 bg-surface p-4">
        <p className="text-xs font-semibold text-ink-muted">{authCopy.verifyPhone.codeLabel}</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="font-mono text-2xl font-bold tracking-wider text-ink-900">{messageText}</span>
          <button type="button" onClick={copyCode} className="btn-ghost shrink-0 gap-1.5 text-sm">
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            <span aria-live="polite">{copied ? authCopy.common.copied : authCopy.common.copy}</span>
          </button>
        </div>
        {whatsappNumber && (
          <p className="mt-2 text-xs text-ink-muted">{authCopy.verifyPhone.codeManual(displayPhone(whatsappNumber))}</p>
        )}
      </div>
    </div>
  );
}
