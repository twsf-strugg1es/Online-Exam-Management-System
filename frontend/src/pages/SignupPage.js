import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import api from '../api';
import Button from '../components/Button';

function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [examCandidate, setExamCandidate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    if (!gender) {
      setError('Gender is required');
      return;
    }

    if (!examCandidate) {
      setError('Exam candidate selection is required');
      return;
    }

    setLoading(true);

    try {
      await api.post('/signup', {
        email: email,
        password: password,
        full_name: fullName,
        gender: gender,
        exam_candidate: examCandidate,
        role: 'student',
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      let errorMessage = 'Signup failed. Please try again.';
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

  if (success) {
    return (
      <>
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.background, fontFamily: 'Roboto, sans-serif' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', boxSizing: 'border-box', animation: 'slideInLeft 0.6s ease' }}>
            <div style={{ maxWidth: '400px', textAlign: 'center', animation: 'fadeIn 0.5s ease 0.3s both' }}>
              <h2 style={{ color: theme.primary, marginBottom: '16px', fontSize: '32px', fontWeight: 'bold' }}>Signup Successful!</h2>
              <p style={{ color: theme.secondary, marginBottom: '10px' }}>Your account has been created successfully. Please log in.</p>
              <p style={{ color: theme.secondary, fontSize: '14px', fontStyle: 'italic' }}>Redirecting to login page...</p>
            </div>
          </div>
          <div style={{ flex: 1, background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.info} 100%)`, display: 'flex', justifyContent: 'center', alignItems: 'center', animation: 'slideInRight 0.6s ease' }}>
            <h2 style={{ color: '#ffffff', fontSize: '42px', fontWeight: '300', animation: 'fadeIn 0.5s ease 0.3s both' }}>Join PorikkhaKori</h2>
          </div>
        </div>
        <style>{`
          @keyframes slideInLeft {
            from { opacity: 0; transform: translateX(-50px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes slideInRight {
            from { opacity: 0; transform: translateX(50px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.background, fontFamily: 'Roboto, sans-serif' }}>
        {/* Left Side - Black Sidebar */}
        <div style={{ flex: 0.3, backgroundColor: theme.background, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', padding: '60px 40px', boxSizing: 'border-box', animation: 'slideInLeft 0.6s ease' }}>
          <div style={{ width: '100%' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 12px 0', color: theme.primary, fontFamily: 'Roboto, sans-serif', animation: 'fadeInDown 0.5s ease 0.2s both' }}>Create an account</h1>
            <p style={{ fontSize: '14px', color: theme.secondary, margin: 0, animation: 'fadeInDown 0.5s ease 0.3s both' }}>Join PorikkhaKori today</p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div style={{ flex: 0.7, backgroundColor: theme.background, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px 80px', boxSizing: 'border-box', overflowY: 'auto', animation: 'slideInRight 0.6s ease' }}>
          <div style={{ width: '100%', maxWidth: '600px' }}>
            {/* Form */}
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              {/* Full Name */}
              <div style={{ marginBottom: '24px', animation: 'slideInUp 0.4s ease 0.4s both' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    style={{
                      flex: 1,
                      backgroundColor: theme.inputBg,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '24px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      color: theme.inputText,
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      fontFamily: 'Roboto, sans-serif',
                    }}
                    placeholder="Enter your name"
                    onFocus={(e) => {
                      e.target.style.borderColor = theme.primary;
                      e.target.style.boxShadow = `0 0 12px ${theme.primary}40`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = theme.border;
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: '24px', animation: 'slideInUp 0.4s ease 0.45s both' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      flex: 1,
                      backgroundColor: theme.inputBg,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '24px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      color: theme.inputText,
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      fontFamily: 'Roboto, sans-serif',
                    }}
                    placeholder="Enter your email"
                    onFocus={(e) => {
                      e.target.style.borderColor = theme.primary;
                      e.target.style.boxShadow = `0 0 12px ${theme.primary}40`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = theme.border;
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Gender */}
              <div style={{ marginBottom: '24px', animation: 'slideInUp 0.4s ease 0.5s both' }}>
                <div style={{ position: 'relative' }}>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      backgroundColor: theme.inputBg,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '24px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      color: gender ? theme.inputText : theme.secondary,
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      appearance: 'none',
                      cursor: 'pointer',
                      fontFamily: 'Roboto, sans-serif',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = theme.primary;
                      e.target.style.boxShadow = `0 0 12px ${theme.primary}40`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = theme.border;
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: theme.primary, fontSize: '14px' }}>▼</div>
                </div>
              </div>

              {/* Exam Candidate */}
              <div style={{ marginBottom: '24px', animation: 'slideInUp 0.4s ease 0.55s both' }}>
                <div style={{ position: 'relative' }}>
                  <select
                    value={examCandidate}
                    onChange={(e) => setExamCandidate(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      backgroundColor: theme.inputBg,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '24px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      color: examCandidate ? theme.inputText : theme.secondary,
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      appearance: 'none',
                      cursor: 'pointer',
                      fontFamily: 'Roboto, sans-serif',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = theme.primary;
                      e.target.style.boxShadow = `0 0 12px ${theme.primary}40`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = theme.border;
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Select Exam Candidate</option>
                    <option value="SSC">SSC</option>
                    <option value="HSC">HSC</option>
                    <option value="Admission">Admission</option>
                  </select>
                  <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: theme.primary, fontSize: '14px' }}>▼</div>
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: '24px', animation: 'slideInUp 0.4s ease 0.6s both' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      flex: 1,
                      backgroundColor: theme.inputBg,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '24px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      color: theme.inputText,
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      fontFamily: 'Roboto, sans-serif',
                    }}
                    placeholder="Enter your password"
                    onFocus={(e) => {
                      e.target.style.borderColor = theme.primary;
                      e.target.style.boxShadow = `0 0 12px ${theme.primary}40`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = theme.border;
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '24px', animation: 'slideInUp 0.4s ease 0.65s both' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{
                      flex: 1,
                      backgroundColor: theme.inputBg,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '24px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      color: theme.inputText,
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      fontFamily: 'Roboto, sans-serif',
                    }}
                    placeholder="Confirm your password"
                    onFocus={(e) => {
                      e.target.style.borderColor = theme.primary;
                      e.target.style.boxShadow = `0 0 12px ${theme.primary}40`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = theme.border;
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div style={{ animation: 'slideInDown 0.4s ease', marginBottom: '20px', padding: '12px 14px', backgroundColor: 'rgba(255, 0, 0, 0.1)', borderLeft: `4px solid ${theme.danger}`, color: theme.danger, borderRadius: '4px', fontSize: '13px', fontFamily: 'Roboto, sans-serif' }}>
                  {error}
                </div>
              )}

              {/* Sign Up Button */}
              <Button
                type="submit"
                disabled={loading}
                style={{
                  animation: 'slideInUp 0.4s ease 0.7s both, buttonGlow 2s ease-in-out 1.1s infinite',
                }}
              >
                {loading ? 'CREATING ACCOUNT...' : 'SIGN UP'}
              </Button>
            </form>

            {/* Login Link */}
            <p style={{ textAlign: 'center', marginTop: '20px', color: theme.secondary, fontSize: '13px', animation: 'fadeIn 0.5s ease 0.8s both', fontFamily: 'Roboto, sans-serif' }}>
              Already have an account?
              <Link to="/login" style={{ color: theme.primary, fontWeight: 'bold', textDecoration: 'none', cursor: 'pointer', marginLeft: '4px', transition: 'all 0.3s ease' }}
                onMouseEnter={(e) => {
                  e.target.style.color = theme.warning;
                  e.target.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = theme.primary;
                  e.target.style.textDecoration = 'none';
                }}
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes buttonGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(135, 206, 235, 0.3), inset 0 0 20px rgba(135, 206, 235, 0.1); }
          50% { box-shadow: 0 0 30px rgba(135, 206, 235, 0.5), inset 0 0 25px rgba(135, 206, 235, 0.15); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        input::-webkit-calendar-picker-indicator {
          filter: invert(1) brightness(1.2);
          cursor: pointer;
        }
        input[type="date"]::-webkit-input-placeholder {
          color: #888888;
        }
        input[type="date"]::placeholder {
          color: #888888;
        }
        select option {
          background-color: #333333;
          color: #ffffff;
        }
      `}</style>
    </>
  );
}

export default SignupPage;



