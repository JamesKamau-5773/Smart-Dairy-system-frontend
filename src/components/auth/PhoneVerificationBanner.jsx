import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AlertBanner from '../ui/AlertBanner';
import { getPhonePrompt } from '../../lib/authState';
import { authCopy } from '../../i18n/auth';

const { phoneBanner: copy } = authCopy;
const DISMISS_KEY = 'maziwa_phone_banner_dismissed';

const CONTENT = {
  add: { title: copy.titleAdd, message: copy.messageAdd, action: copy.actionAdd },
  verify: { title: copy.titleVerify, message: copy.messageVerify, action: copy.actionVerify },
};

function wasDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Nudges signed-in users whose account has no verified phone (account_flags,
 * AUTH_API_CONTRACT §2.2). Dismissing hides it until the next app session, so
 * it reminds without nagging on every page.
 */
export default function PhoneVerificationBanner() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(wasDismissed);
  const prompt = getPhonePrompt(currentUser);

  if (!prompt || dismissed) return null;
  const content = CONTENT[prompt];

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Storage blocked: it shows again on the next page load.
    }
  };

  return (
    <div className="px-4 pt-4 sm:px-6 md:px-8">
      <AlertBanner
        type="warning"
        compact
        title={content.title}
        message={content.message}
        action={{ label: content.action, onClick: () => navigate('/verify-phone') }}
        onDismiss={dismiss}
      />
    </div>
  );
}
