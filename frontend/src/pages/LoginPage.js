import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { HiMail, HiLockClosed } from 'react-icons/hi';

const colors = {
  white: '#ffffff',
  skyBlue: '#87ceeb',
  lightSkyBlue: '#b0e0e6',
  darkSkyBlue: '#4a90a4',
  yellow: '#ffd700',
  lightYellow: '#ffed4e',
  black: '#000000',
  darkGray: '#333333',
  gray: '#666666',
  lightGray: '#f5f5f5',
};

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
      // ... existing code ...
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
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.white, fontFamily: 'Roboto, sans-serif' }}>
        {/* Left Side - Login Form (Dark) */}
        <div style={{ flex: 1, backgroundColor: colors.black, color: colors.white, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', boxSizing: 'border-box', animation: 'slideInLeft 0.6s ease' }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            {/* Header */}
            <div style={{ marginBottom: '48px', textAlign: 'center', animation: 'fadeInDown 0.5s ease 0.2s both' }}>
              <h1 style={{ fontSize: '42px', fontWeight: 'bold', margin: '0 0 16px 0', color: colors.skyBlue, fontFamily: 'Roboto, sans-serif' }}>Student Login</h1>
              <p style={{ fontSize: '16px', color: colors.gray, margin: 0 }}>Hey enter your details to sign into your account</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ width: '100%', animation: 'fadeIn 0.5s ease 0.3s both' }}>
              {/* Email Field */}
              <div style={{ marginBottom: '16px', position: 'relative', animation: 'slideInUp 0.4s ease 0.4s both' }}>
                <HiMail style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: colors.skyBlue, fontSize: '20px' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: colors.darkGray,
                    border: 'none',
                    borderRadius: '25px',
                    paddingTop: '16px',
                    paddingBottom: '16px',
                    paddingLeft: '48px',
                    paddingRight: '16px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    color: colors.white,
                    outline: 'none',
                    transition: 'all 0.3s ease',
                  }}
                  placeholder="Enter your email"
                  onFocus={(e) => {
                    e.target.style.backgroundColor = '#444444';
                    e.target.style.boxShadow = '0 0 8px rgba(135, 206, 235, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.target.style.backgroundColor = colors.darkGray;
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Password Field */}
              <div style={{ marginBottom: '24px', position: 'relative', animation: 'slideInUp 0.4s ease 0.5s both' }}>
                <HiLockClosed style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: colors.skyBlue, fontSize: '20px' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: colors.darkGray,
                    border: 'none',
                    borderRadius: '25px',
                    paddingTop: '16px',
                    paddingBottom: '16px',
                    paddingLeft: '48px',
                    paddingRight: '16px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    color: colors.white,
                    outline: 'none',
                    transition: 'all 0.3s ease',
                  }}
                  placeholder="Enter your password"
                  onFocus={(e) => {
                    e.target.style.backgroundColor = '#444444';
                    e.target.style.boxShadow = '0 0 8px rgba(135, 206, 235, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.target.style.backgroundColor = colors.darkGray;
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
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: colors.skyBlue }}
                />
                <label htmlFor="saveLogin" style={{ marginLeft: '8px', color: colors.gray, cursor: 'pointer', fontSize: '14px' }}>
                  Remember
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(255, 0, 0, 0.1)', border: `1px solid ${colors.yellow}`, color: colors.yellow, borderRadius: '8px', fontSize: '14px', animation: 'slideInDown 0.4s ease' }}>
                  {error}
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  backgroundColor: colors.skyBlue,
                  color: colors.black,
                  fontWeight: 'bold',
                  fontSize: '16px',
                  paddingTop: '14px',
                  paddingBottom: '14px',
                  borderRadius: '25px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.3s ease',
                  animation: 'slideInUp 0.4s ease 0.7s both',
                }}
                onMouseEnter={(e) => !loading && (e.target.style.boxShadow = '0 8px 16px rgba(135, 206, 235, 0.4)') && (e.target.style.transform = 'scale(1.02)')}
                onMouseLeave={(e) => !loading && (e.target.style.boxShadow = 'none') && (e.target.style.transform = 'scale(1)')}
              >
                {loading ? 'LOGGING IN...' : 'LOGIN'}
              </button>
            </form>

            {/* Sign Up Link */}
            <p style={{ textAlign: 'center', marginTop: '32px', color: colors.gray, fontSize: '14px', animation: 'fadeIn 0.5s ease 0.8s both' }}>
              Not registered yet? 
              <Link to="/signup" style={{ color: colors.skyBlue, fontWeight: 'bold', textDecoration: 'none', cursor: 'pointer', transition: 'all 0.3s ease' }}
                onMouseEnter={(e) => {
                  e.target.style.color = colors.yellow;
                  e.target.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = colors.skyBlue;
                  e.target.style.textDecoration = 'none';
                }}
              >
                {' '}Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Right Side - Welcome (Sky Blue Gradient) */}
        <div style={{
          flex: 1,
          background: `linear-gradient(135deg, ${colors.skyBlue} 0%, ${colors.lightSkyBlue} 100%)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px',
          boxSizing: 'border-box',
          textAlign: 'center',
          color: colors.black,
          animation: 'slideInRight 0.6s ease',
        }}>
          <div style={{ maxWidth: '450px' }}>
            {/* Welcome Text */}
            <h2 style={{ fontSize: '48px', fontWeight: '300', margin: '0 0 24px 0', color: colors.black, fontFamily: 'Roboto, sans-serif', animation: 'fadeInDown 0.5s ease 0.3s both' }}>
              Welcome<br />to PorikkhaKori
            </h2>

            {/* Description */}
            <p style={{ fontSize: '16px', lineHeight: '1.6', color: colors.darkGray, margin: '0 0 48px 0', animation: 'fadeIn 0.5s ease 0.4s both' }}>
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
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: colors.black, animation: 'pulse 2s ease-in-out 0s infinite' }}></div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: colors.gray, animation: 'pulse 2s ease-in-out 0.3s infinite' }}></div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: colors.gray, animation: 'pulse 2s ease-in-out 0.6s infinite' }}></div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: colors.gray, animation: 'pulse 2s ease-in-out 0.9s infinite' }}></div>
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
