import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';
import Button from '../components/Button';

// Register a new organization (school, coaching center, company) together with its owner's account
function OrgSignupPage() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ organizationName: '', fullName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      await api.post('/signup/organization', {
        organization_name: form.organizationName.trim(),
        full_name: form.fullName.trim(),
        email: form.email,
        password: form.password,
      });

      // Sign the new owner straight in
      const credentials = new URLSearchParams({ username: form.email, password: form.password });
      const tokenRes = await api.post('/token', credentials, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      localStorage.setItem('token', tokenRes.data.access_token);
      const me = await api.get('/me');
      login(tokenRes.data.access_token, me.data);
      navigate('/admin-organization');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === 'string' ? detail
          : Array.isArray(detail) ? detail.map((d) => d.msg).join(', ')
            : 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const input = {
    width: '100%',
    backgroundColor: theme.inputBg,
    color: theme.inputText,
    border: `1px solid ${theme.border}`,
    borderRadius: '24px',
    padding: '12px 16px',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
    marginBottom: '16px',
    fontFamily: 'Roboto, sans-serif',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.background, color: theme.text, fontFamily: 'Roboto, sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 16px', boxSizing: 'border-box' }}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '420px' }}>
        <h1 style={{ color: theme.primary, margin: '0 0 8px 0', fontSize: '34px' }}>Register your organization</h1>
        <p style={{ color: theme.secondary, margin: '0 0 28px 0' }}>
          Set up a space for your school, coaching center or company to run its own exams.
        </p>

        <input style={input} value={form.organizationName} onChange={update('organizationName')} placeholder="Organization name" minLength={2} required />
        <input style={input} value={form.fullName} onChange={update('fullName')} placeholder="Your full name" required />
        <input style={input} type="email" value={form.email} onChange={update('email')} placeholder="Your email" required />
        <input style={input} type="password" value={form.password} onChange={update('password')} placeholder="Password" required />
        <input style={input} type="password" value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="Confirm password" required />

        {error && (
          <div style={{ marginBottom: '16px', padding: '12px', border: `1px solid ${theme.danger}`, color: theme.danger, borderRadius: '8px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'CREATING...' : 'CREATE ORGANIZATION'}
        </Button>

        <p style={{ textAlign: 'center', marginTop: '24px', color: theme.secondary, fontSize: '14px' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: theme.primary, fontWeight: 'bold', textDecoration: 'none' }}>Log in</Link>
          {' '}and create an organization from there.
        </p>
      </form>
    </div>
  );
}

export default OrgSignupPage;
