import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Alert, Button } from './ui';
import { errorMessage } from '../utils';
import { useI18n } from '../i18n';

const DISMISSED_KEY = 'verifyBannerDismissed';

const readDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
};

// Shown on signed-in pages until the email is confirmed. Nothing is blocked; it can be
// dismissed for this visit.
export default function VerifyEmailBanner() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(readDismissed);
  const [state, setState] = useState(null); // null | 'sending' | 'sent' | error text

  if (!user || user.email_verified_at || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // only hidden until the next page load
    }
  };

  const resend = async () => {
    setState('sending');
    try {
      await api.post('/verify-email/resend');
      setState('sent');
    } catch (err) {
      setState(errorMessage(err));
    }
  };

  return (
    <Alert tone="info" className="mb-6" onClose={dismiss} title={t('Confirm your email address')}>
      <p>
        {state === 'sent'
          ? t('Sent. Check {{email}}, including the spam folder.', { email: user.email })
          : t('We sent a link to {{email}}. Confirming it lets you reset your password by email if you forget it.', { email: user.email })}
      </p>
      {state !== 'sent' && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button size="sm" variant="secondary" loading={state === 'sending'} onClick={resend}>{t('Send the link again')}</Button>
          {state && state !== 'sending' && <span className="text-danger">{state}</span>}
        </div>
      )}
    </Alert>
  );
}
