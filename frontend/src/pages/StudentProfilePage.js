import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import AppShell from '../components/AppShell';
import { Alert, Button, Card, CardHeader, Field, Input, PageHeader, PageLoader, Select } from '../components/ui';
import { ROLE_LABELS, errorMessage } from '../utils';

// Account settings for anyone signed in: name, gender and password
function StudentProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [details, setDetails] = useState({ full_name: '', gender: '' });
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [detailsMessage, setDetailsMessage] = useState(null);
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [saving, setSaving] = useState(null); // 'details' | 'password'

  useEffect(() => {
    api.get('/profile/student')
      .then((res) => {
        setProfile(res.data);
        setDetails({ full_name: res.data.full_name || '', gender: res.data.gender || '' });
      })
      .catch((err) => setDetailsMessage({ tone: 'danger', text: errorMessage(err, 'Failed to load your profile') }));
  }, []);

  const saveDetails = async (e) => {
    e.preventDefault();
    setDetailsMessage(null);
    setSaving('details');
    try {
      const res = await api.put('/profile/student', { full_name: details.full_name.trim(), gender: details.gender || null });
      setProfile(res.data);
      await refreshUser(); // the name shows in the sidebar
      setDetailsMessage({ tone: 'success', text: 'Saved' });
    } catch (err) {
      setDetailsMessage({ tone: 'danger', text: errorMessage(err, 'Could not save') });
    } finally {
      setSaving(null);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage(null);
    if (passwords.new_password.length < 6) {
      setPasswordMessage({ tone: 'danger', text: 'The new password must be at least 6 characters.' });
      return;
    }
    if (passwords.new_password !== passwords.confirm_password) {
      setPasswordMessage({ tone: 'danger', text: 'The new passwords do not match.' });
      return;
    }
    setSaving('password');
    try {
      await api.post('/profile/change-password', { old_password: passwords.old_password, new_password: passwords.new_password });
      setPasswords({ old_password: '', new_password: '', confirm_password: '' });
      setPasswordMessage({ tone: 'success', text: 'Password changed' });
    } catch (err) {
      setPasswordMessage({ tone: 'danger', text: errorMessage(err, 'Could not change the password') });
    } finally {
      setSaving(null);
    }
  };

  if (!profile && !detailsMessage) return <AppShell width="narrow"><PageLoader /></AppShell>;

  const unchanged = profile && details.full_name === (profile.full_name || '') && details.gender === (profile.gender || '');

  return (
    <AppShell width="narrow">
      <PageHeader title="Account" description="Your name is what examiners see on your results." />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Personal details" />
          <form onSubmit={saveDetails} className="space-y-5 p-5">
            <Field label="Email" hint="Your email is your login and can't be changed here.">
              <Input value={profile?.email || ''} disabled />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name" htmlFor="fullName">
                <Input id="fullName" value={details.full_name} onChange={(e) => setDetails({ ...details, full_name: e.target.value })} required />
              </Field>
              <Field label="Gender" htmlFor="gender" optional>
                <Select id="gender" value={details.gender} onChange={(e) => setDetails({ ...details, gender: e.target.value })}>
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
            </div>
            {detailsMessage && <Alert tone={detailsMessage.tone}>{detailsMessage.text}</Alert>}
            <div className="flex justify-end">
              <Button type="submit" loading={saving === 'details'} disabled={unchanged}>Save changes</Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Password" />
          <form onSubmit={changePassword} className="space-y-5 p-5">
            <Field label="Current password" htmlFor="oldPassword">
              <Input id="oldPassword" type="password" autoComplete="current-password" value={passwords.old_password} onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })} required />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="New password" htmlFor="newPassword" hint="At least 6 characters.">
                <Input id="newPassword" type="password" autoComplete="new-password" value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} required />
              </Field>
              <Field label="Confirm new password" htmlFor="confirmPassword">
                <Input id="confirmPassword" type="password" autoComplete="new-password" value={passwords.confirm_password} onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })} required />
              </Field>
            </div>
            {passwordMessage && <Alert tone={passwordMessage.tone}>{passwordMessage.text}</Alert>}
            <div className="flex justify-end">
              <Button type="submit" variant="secondary" loading={saving === 'password'}>Change password</Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Organizations" description="Switch between them from the sidebar." />
          <ul className="divide-y divide-line">
            {(user?.memberships || []).map((m) => (
              <li key={m.organization_id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{m.organization_name}</span>
                <span className="text-muted">{ROLE_LABELS[m.role]}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}

export default StudentProfilePage;
