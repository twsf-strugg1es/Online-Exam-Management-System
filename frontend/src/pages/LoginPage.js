import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';
import { HiMail, HiLockClosed } from 'react-icons/hi';
import Button from '../components/Button';


function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveLogin, setSaveLogin] = useState(false);
  const { login } = useAuth();
  const { theme } = useTheme();
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
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token } = response.data;

      localStorage.setItem('token', access_token);

      try {
        const userRes = await api.get('/me');
        const actualUser = {
          email: userRes.data.email,
          role: userRes.data.role,
          id: userRes.data.id,
        };

        login(access_token, actualUser, saveLogin);
        navigate('/');
      } catch (userErr) {
        localStorage.removeItem('token');
        throw userErr;
      }
    } catch (err) {
      let errorMessage = 'Login failed. Please try again.';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail.map(e => e.msg).join(', ');
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.background, fontFamily: 'Roboto, sans-serif' }}>
        {/* Left Side - Login Form */}
        <div style={{ flex: 1, backgroundColor: theme.background, color: theme.text, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', boxSizing: 'border-box', animation: 'slideInLeft 0.6s ease' }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            {/* Header */}
            <div style={{ marginBottom: '48px', textAlign: 'center', animation: 'fadeInDown 0.5s ease 0.2s both' }}>
              <h1 style={{ fontSize: '42px', fontWeight: 'bold', margin: '0 0 16px 0', color: theme.primary, fontFamily: 'Roboto, sans-serif' }}>Student Login</h1>
              <p style={{ fontSize: '16px', color: theme.secondary, margin: 0 }}>Hey enter your details to sign into your account</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ width: '100%', animation: 'fadeIn 0.5s ease 0.3s both' }}>
              {/* Email Field */}
              <div style={{ marginBottom: '16px', position: 'relative', animation: 'slideInUp 0.4s ease 0.4s both' }}>
                <HiMail style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: theme.primary, fontSize: '20px' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: theme.inputBg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '25px',
                    paddingTop: '16px',
                    paddingBottom: '16px',
                    paddingLeft: '48px',
                    paddingRight: '16px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    color: theme.inputText,
                    outline: 'none',
                    transition: 'all 0.3s ease',
                  }}
                  placeholder="Enter your email"
                  onFocus={(e) => {
                    e.target.style.borderColor = theme.primary;
                    e.target.style.boxShadow = `0 0 8px ${theme.primary}40`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = theme.border;
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Password Field */}
              <div style={{ marginBottom: '24px', position: 'relative', animation: 'slideInUp 0.4s ease 0.5s both' }}>
                <HiLockClosed style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: theme.primary, fontSize: '20px' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: theme.inputBg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '25px',
                    paddingTop: '16px',
                    paddingBottom: '16px',
                    paddingLeft: '48px',
                    paddingRight: '16px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    color: theme.inputText,
                    outline: 'none',
                    transition: 'all 0.3s ease',
                  }}
                  placeholder="Enter your password"
                  onFocus={(e) => {
                    e.target.style.borderColor = theme.primary;
                    e.target.style.boxShadow = `0 0 8px ${theme.primary}40`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = theme.border;
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Remember Me */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', animation: 'slideInUp 0.4s ease 0.6s both' }}>
                <input
                  type="checkbox"
                  id="saveLogin"
                  checked={saveLogin}
                  onChange={(e) => setSaveLogin(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: theme.primary }}
                />
                <label htmlFor="saveLogin" style={{ marginLeft: '8px', color: theme.secondary, cursor: 'pointer', fontSize: '14px' }}>
                  Remember
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(255, 0, 0, 0.1)', border: `1px solid ${theme.danger}`, color: theme.danger, borderRadius: '8px', fontSize: '14px', animation: 'slideInDown 0.4s ease' }}>
                  {error}
                </div>
              )}

              {/* Login Button */}
              {/* Login Button */}
              <Button
                type="submit"
                disabled={loading}
                style={{
                  animation: 'slideInUp 0.4s ease 0.7s both',
                }}
              >
                {loading ? 'LOGGING IN...' : 'LOGIN'}
              </Button>
            </form>

            {/* Sign Up Link */}
            <p style={{ textAlign: 'center', marginTop: '32px', color: theme.secondary, fontSize: '14px', animation: 'fadeIn 0.5s ease 0.8s both' }}>
              Not registered yet?
              <Link to="/signup" style={{ color: theme.primary, fontWeight: 'bold', textDecoration: 'none', cursor: 'pointer', transition: 'all 0.3s ease' }}
                onMouseEnter={(e) => {
                  e.target.style.color = theme.warning;
                  e.target.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = theme.primary;
                  e.target.style.textDecoration = 'none';
                }}
              >
                {' '}Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Right Side - Welcome (Gradient) */}
        <div style={{
          flex: 1,
          background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.info} 100%)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px',
          boxSizing: 'border-box',
          textAlign: 'center',
          color: '#ffffff',
          animation: 'slideInRight 0.6s ease',
        }}>
          <div style={{ maxWidth: '450px' }}>
            {/* Welcome Text */}
            <h2 style={{ fontSize: '48px', fontWeight: '300', margin: '0 0 24px 0', color: '#ffffff', fontFamily: 'Roboto, sans-serif', animation: 'fadeInDown 0.5s ease 0.3s both' }}>
              Welcome<br />to PorikkhaKori
            </h2>

            {/* Description */}
            <p style={{ fontSize: '16px', lineHeight: '1.6', color: 'rgba(255,255,255,0.9)', margin: '0 0 48px 0', animation: 'fadeIn 0.5s ease 0.4s both' }}>
              Discover, where excellence in education begins. Our dedicated team and innovative programs empower students to excel academically and personally. Join us for an inspiring educational journey!
            </p>

            {/* Illustration Placeholder */}
            <div style={{ marginBottom: '48px', display: 'flex', justifyContent: 'center', animation: 'bounce 1s ease-in-out 0.5s infinite' }}>
              <div style={{ fontSize: '120px', textAlign: 'center' }}>
                📚
              </div>
            </div>

            {/* Dots/Navigation */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffffff', animation: 'pulse 2s ease-in-out 0s infinite' }}></div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.5)', animation: 'pulse 2s ease-in-out 0.3s infinite' }}></div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.5)', animation: 'pulse 2s ease-in-out 0.6s infinite' }}></div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.5)', animation: 'pulse 2s ease-in-out 0.9s infinite' }}></div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(0);
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
}

export default LoginPage;



