import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import AuthLayout from '../components/AuthLayout';
import { Alert, Button } from '../components/ui';
import { errorMessage } from '../utils';
import { useI18n } from '../i18n';

// From the link in a waitlist email. It takes a press, not just a visit: mail scanners open
// links in advance, and that mustn't unsubscribe anyone.
function WaitlistUnsubscribePage() {
  const { token } = useParams();
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const unsubscribe = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/waitlist/unsubscribe', { token });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={done ? t("You're off the list") : t('Stop Fairpaper emails')}
      label="Waitlist"
      subtitle={done ? null : t("You joined the Fairpaper launch waitlist. Unsubscribe and we won't email you about the launch.")}
      footer={<p><Link to="/waitlist" className="link">{t('Changed your mind? Join again')}</Link></p>}
    >
      {done ? (
        <Alert tone="success">{t("Done. We won't email you about the launch.")}</Alert>
      ) : (
        <div className="space-y-5">
          {error && <Alert tone="danger">{error}</Alert>}
          <Button size="lg" loading={loading} className="w-full" onClick={unsubscribe}>{t('Unsubscribe')}</Button>
        </div>
      )}
    </AuthLayout>
  );
}

export default WaitlistUnsubscribePage;
