import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import AuthLayout from '../components/AuthLayout';
import { Alert, PageLoader } from '../components/ui';
import { errorMessage } from '../utils';
import { useI18n } from '../i18n';

// Opened from the confirmation email (/verify-email/:token); works signed in or not
function VerifyEmailPage() {
  const { token } = useParams();
  const { user, refreshUser } = useAuth();
  const { t } = useI18n();
  const [result, setResult] = useState(null); // { ok, text }

  useEffect(() => {
    let cancelled = false;
    api.post('/verify-email', { token })
      .then(async (res) => {
        if (user) await refreshUser(); // hides the banner straight away
        if (!cancelled) setResult({ ok: true, text: t('{{email}} is confirmed.', { email: res.data.email }) });
      })
      .catch((err) => !cancelled && setResult({ ok: false, text: errorMessage(err) }));
    return () => { cancelled = true; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps -- run once per link

  return (
    <AuthLayout
      title={t('Confirm email')}
      footer={<p><Link to={user ? '/' : '/login'} className="link">{user ? t('Continue to TestKori') : t('Log in')}</Link></p>}
    >
      {!result ? <PageLoader /> : <Alert tone={result.ok ? 'success' : 'danger'}>{result.text}</Alert>}
    </AuthLayout>
  );
}

export default VerifyEmailPage;
