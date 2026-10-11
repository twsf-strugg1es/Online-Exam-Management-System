import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import AuthLayout from '../components/AuthLayout';
import { Alert, Button, Field, Input, Select } from '../components/ui';
import { errorMessage } from '../utils';

// Student signup. A join code (typed, or carried in a /signup?code=... link) adds them to an organization.
function SignupPage() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    gender: '',
    joinCode: (searchParams.get('code') || '').toUpperCase(),
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const codeFromLink = Boolean(searchParams.get('code'));

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/signup', {
        email: form.email,
        password: form.password,
        full_name: form.fullName.trim(),
        gender: form.gender || null,
        join_code: form.joinCode.trim() || null,
      });

      // Sign the new student straight in
      const credentials = new URLSearchParams({ username: form.email, password: form.password });
      const tokenRes = await api.post('/token', credentials, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      localStorage.setItem('token', tokenRes.data.access_token);
      const me = await api.get('/me');
      login(tokenRes.data.access_token, me.data);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err, 'Signup failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your student account"
      subtitle={codeFromLink
        ? "You've been invited to join an organization. Your join code is already filled in."
        : 'Use the join code your school, coaching center or employer gave you.'}
      footer={<p>Already have an account? <Link to="/login" className="link">Log in</Link></p>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Full name" htmlFor="fullName">
          <Input id="fullName" autoComplete="name" value={form.fullName} onChange={update('fullName')} required autoFocus />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={update('email')} required />
        </Field>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Join code" htmlFor="joinCode" optional>
            <Input
              id="joinCode"
              value={form.joinCode}
              onChange={(e) => setForm({ ...form, joinCode: e.target.value.toUpperCase() })}
              className="font-mono tracking-widest"
              placeholder="K7M2QX9P"
              autoComplete="off"
            />
          </Field>
          <Field label="Gender" htmlFor="gender" optional>
            <Select id="gender" value={form.gender} onChange={update('gender')}>
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </Select>
          </Field>
        </div>
        <Field label="Password" htmlFor="password" hint="At least 6 characters.">
          <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={update('password')} required />
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword">
          <Input id="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={update('confirmPassword')} required />
        </Field>

        {error && <Alert tone="danger">{error}</Alert>}

        <Button type="submit" size="lg" loading={loading} className="w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}

export default SignupPage;
