import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import AuthLayout from '../components/AuthLayout';
import { Alert, Button, Checkbox, Field, Input } from '../components/ui';
import { errorMessage } from '../utils';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveLogin, setSaveLogin] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/token', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);

      try {
        const userRes = await api.get('/me');
        login(access_token, userRes.data, saveLogin);
        navigate('/');
      } catch (userErr) {
        localStorage.removeItem('token');
        throw userErr;
      }
    } catch (err) {
      setError(errorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Log in"
      subtitle="Students, teachers and recruiters all sign in here."
      footer={
        <>
          <p>
            New here? <Link to="/signup" className="link">Create a student account</Link>
          </p>
          <p>
            Running exams for a school or company? <Link to="/signup/organization" className="link">Register your organization</Link>
          </p>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <Checkbox checked={saveLogin} onChange={setSaveLogin}>Keep me signed in on this device</Checkbox>

        {error && <Alert tone="danger">{error}</Alert>}

        <Button type="submit" size="lg" loading={loading} className="w-full">
          Log in
        </Button>
      </form>
    </AuthLayout>
  );
}

export default LoginPage;
