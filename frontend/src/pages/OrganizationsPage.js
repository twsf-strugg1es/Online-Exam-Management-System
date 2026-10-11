import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';
import Button from '../components/Button';

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  examiner: 'Examiner',
  candidate: 'Student',
};

const errorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join(', ');
  return fallback;
};

// Pick which organization to work in, join one with a code, or create a new one
function OrganizationsPage() {
  const { user, logout, refreshUser, selectOrganization, currentMembership } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const memberships = user?.memberships || [];

  const open = (organizationId) => {
    selectOrganization(organizationId);
    navigate('/');
  };

  const submit = async (e, request, fallbackError) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await request();
      await refreshUser();
      open(response.data.organization_id);
    } catch (err) {
      setError(errorMessage(err, fallbackError));
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = (e) =>
    submit(e, () => api.post('/organizations/join', { join_code: joinCode.trim() }), 'Could not join');

  const handleCreate = (e) =>
    submit(e, () => api.post('/organizations', { name: orgName.trim() }), 'Could not create the organization');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const styles = {
    page: { minHeight: '100vh', backgroundColor: theme.background, color: theme.text, fontFamily: 'Roboto, sans-serif', display: 'flex', justifyContent: 'center', padding: '48px 16px', boxSizing: 'border-box' },
    column: { width: '100%', maxWidth: '520px' },
    card: { backgroundColor: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '20px', marginBottom: '20px' },
    heading: { margin: '0 0 12px 0', fontSize: '18px', color: theme.text },
    orgButton: (active) => ({ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', marginBottom: '10px', borderRadius: '10px', border: `1px solid ${active ? theme.primary : theme.border}`, backgroundColor: theme.background, color: theme.text, cursor: 'pointer', fontSize: '15px', textAlign: 'left' }),
    role: { fontSize: '12px', color: theme.secondary, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '2px 10px' },
    row: { display: 'flex', gap: '10px' },
    input: { flex: 1, minWidth: 0, backgroundColor: theme.inputBg, color: theme.inputText, border: `1px solid ${theme.border}`, borderRadius: '24px', padding: '10px 16px', fontSize: '14px', outline: 'none' },
    hint: { color: theme.secondary, fontSize: '13px', margin: '0 0 12px 0' },
    error: { marginBottom: '16px', padding: '12px', border: `1px solid ${theme.danger}`, color: theme.danger, borderRadius: '8px', fontSize: '14px' },
  };

  return (
    <div style={styles.page}>
      <div style={styles.column}>
        <h1 style={{ color: theme.primary, margin: '0 0 6px 0' }}>Your organizations</h1>
        <p style={{ color: theme.secondary, margin: '0 0 24px 0' }}>
          Signed in as {user?.email} ·{' '}
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: theme.primary, cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>
            Log out
          </button>
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.card}>
          {memberships.length === 0 ? (
            <p style={{ margin: 0, color: theme.secondary }}>
              You're not part of any organization yet. Enter the join code your school or company gave you below.
            </p>
          ) : (
            memberships.map((m) => (
              <button
                key={m.organization_id}
                style={styles.orgButton(m.organization_id === currentMembership?.organization_id)}
                onClick={() => open(m.organization_id)}
              >
                <span>{m.organization_name}</span>
                <span style={styles.role}>{ROLE_LABELS[m.role] || m.role}</span>
              </button>
            ))
          )}
        </div>

        <form style={styles.card} onSubmit={handleJoin}>
          <h2 style={styles.heading}>Join with a code</h2>
          <div style={styles.row}>
            <input
              style={{ ...styles.input, letterSpacing: joinCode ? '2px' : 'normal' }}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. K7M2QX9P"
              required
            />
            <Button type="submit" disabled={busy} style={{ width: 'auto', padding: '10px 20px' }}>Join</Button>
          </div>
        </form>

        <form style={styles.card} onSubmit={handleCreate}>
          <h2 style={styles.heading}>Create an organization</h2>
          <p style={styles.hint}>For schools, coaching centers and companies that run their own exams. You'll be its owner.</p>
          <div style={styles.row}>
            <input
              style={styles.input}
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Organization name"
              minLength={2}
              required
            />
            <Button type="submit" disabled={busy} style={{ width: 'auto', padding: '10px 20px' }}>Create</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OrganizationsPage;
