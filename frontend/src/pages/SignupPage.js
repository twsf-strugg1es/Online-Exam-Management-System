import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

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
  inputBorder: '#000000',
};

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
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.skyBlue, fontFamily: 'Roboto, sans-serif' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', boxSizing: 'border-box', animation: 'slideInLeft 0.6s ease' }}>
            <div style={{ maxWidth: '400px', textAlign: 'center', animation: 'fadeIn 0.5s ease 0.3s both' }}>
              <h2 style={{ color: colors.skyBlue, marginBottom: '16px', fontSize: '32px', fontWeight: 'bold' }}>Signup Successful!</h2>
              <p style={{ color: colors.gray, marginBottom: '10px' }}>Your account has been created successfully. Please log in.</p>
              <p style={{ color: colors.gray, fontSize: '14px', fontStyle: 'italic' }}>Redirecting to login page...</p>
            </div>
          </div>
          <div style={{ flex: 1, backgroundColor: colors.skyBlue, display: 'flex', justifyContent: 'center', alignItems: 'center', animation: 'slideInRight 0.6s ease' }}>
            <h2 style={{ color: colors.black, fontSize: '42px', fontWeight: '300', animation: 'fadeIn 0.5s ease 0.3s both' }}>Join PorikkhaKori</h2>
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
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.skyBlue, fontFamily: 'Roboto, sans-serif' }}>
        {/* Left Side - Black Sidebar */}
        <div style={{ flex: 0.3, backgroundColor: colors.black, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', padding: '60px 40px', boxSizing: 'border-box', animation: 'slideInLeft 0.6s ease' }}>
          <div style={{ width: '100%' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 12px 0', color: colors.skyBlue, fontFamily: 'Roboto, sans-serif', animation: 'fadeInDown 0.5s ease 0.2s both' }}>Create an account</h1>
            <p style={{ fontSize: '14px', color: colors.gray, margin: 0, animation: 'fadeInDown 0.5s ease 0.3s both' }}>Join PorikkhaKori today</p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div style={{ flex: 0.7, backgroundColor: colors.skyBlue, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px 80px', boxSizing: 'border-box', overflowY: 'auto', animation: 'slideInRight 0.6s ease' }}>
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
                      backgroundColor: '#444444',
                      border: 'none',
                      borderRadius: '24px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      color: colors.white,
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      fontFamily: 'Roboto, sans-serif',
                    }}
                    placeholder="Enter your name"
                    onFocus={(e) => {
                      e.target.style.backgroundColor = '#555555';
                      e.target.style.boxShadow = '0 0 12px rgba(135, 206, 235, 0.3)';
                    }}
                    onBlur={(e) => {
                      e.target.style.backgroundColor = '#444444';
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
                      backgroundColor: '#444444',
                      border: 'none',
                      borderRadius: '24px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      color: colors.white,
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      fontFamily: 'Roboto, sans-serif',
                    }}
                    placeholder="Enter your email"
                    onFocus={(e) => {
                      e.target.style.backgroundColor = '#555555';
                      e.target.style.boxShadow = '0 0 12px rgba(135, 206, 235, 0.3)';
                    }}
                    onBlur={(e) => {
                      e.target.style.backgroundColor = '#444444';
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
                      backgroundColor: '#444444',
                      border: 'none',
                      borderRadius: '24px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      color: gender ? colors.white : '#888888',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      appearance: 'none',
                      cursor: 'pointer',
                      fontFamily: 'Roboto, sans-serif',
                    }}
                    onFocus={(e) => {
                      e.target.style.backgroundColor = '#555555';
                      e.target.style.boxShadow = '0 0 12px rgba(135, 206, 235, 0.3)';
                    }}
                    onBlur={(e) => {
                      e.target.style.backgroundColor = '#444444';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#87ceeb', fontSize: '14px' }}>▼</div>
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
                      backgroundColor: '#444444',
                      border: 'none',
                      borderRadius: '24px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      color: examCandidate ? colors.white : '#888888',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      appearance: 'none',
                      cursor: 'pointer',
                      fontFamily: 'Roboto, sans-serif',
                    }}
                    onFocus={(e) => {
                      e.target.style.backgroundColor = '#555555';
                      e.target.style.boxShadow = '0 0 12px rgba(135, 206, 235, 0.3)';
                    }}
                    onBlur={(e) => {
                      e.target.style.backgroundColor = '#444444';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Select Exam Candidate</option>
                    <option value="SSC">SSC</option>
                    <option value="HSC">HSC</option>
                    <option value="Admission">Admission</option>
                  </select>
                  <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#87ceeb', fontSize: '14px' }}>▼</div>
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
                      backgroundColor: '#444444',
                      border: 'none',
                      borderRadius: '24px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      color: colors.white,
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      fontFamily: 'Roboto, sans-serif',
                    }}
                    placeholder="Enter your password"
                    onFocus={(e) => {
                      e.target.style.backgroundColor = '#555555';
                      e.target.style.boxShadow = '0 0 12px rgba(135, 206, 235, 0.3)';
                    }}
                    onBlur={(e) => {
                      e.target.style.backgroundColor = '#444444';
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
                      backgroundColor: '#444444',
                      border: 'none',
                      borderRadius: '24px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      color: colors.white,
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      fontFamily: 'Roboto, sans-serif',
                    }}
                    placeholder="Confirm your password"
                    onFocus={(e) => {
                      e.target.style.backgroundColor = '#555555';
                      e.target.style.boxShadow = '0 0 12px rgba(135, 206, 235, 0.3)';
                    }}
                    onBlur={(e) => {
                      e.target.style.backgroundColor = '#444444';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div style={{ animation: 'slideInDown 0.4s ease', marginBottom: '20px', padding: '12px 14px', backgroundColor: 'rgba(255, 0, 0, 0.1)', borderLeft: '4px solid #ffd700', color: '#ffd700', borderRadius: '4px', fontSize: '13px', fontFamily: 'Roboto, sans-serif' }}>
                  {error}
                </div>
              )}

              {/* Sign Up Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  backgroundColor: colors.black,
                  color: colors.skyBlue,
                  fontWeight: 'bold',
                  fontSize: '16px',
                  border: 'none',
                  borderRadius: '28px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.3s ease',
                  animation: 'slideInUp 0.4s ease 0.7s both, buttonGlow 2s ease-in-out 1.1s infinite',
                  fontFamily: 'Roboto, sans-serif',
                  letterSpacing: '1px',
                }}
                onMouseEnter={(e) => !loading && (e.target.style.boxShadow = '0 0 30px rgba(135, 206, 235, 0.6), 0 8px 20px rgba(135, 206, 235, 0.5), inset 0 0 20px rgba(135, 206, 235, 0.15)') && (e.target.style.transform = 'scale(1.02)')}
                onMouseLeave={(e) => !loading && (e.target.style.transform = 'scale(1)', e.target.style.boxShadow = '0 0 20px rgba(135, 206, 235, 0.3), inset 0 0 20px rgba(135, 206, 235, 0.1)')}
              >
                {loading ? 'CREATING ACCOUNT...' : 'SIGN UP'}
              </button>
            </form>

            {/* Login Link */}
            <p style={{ textAlign: 'center', marginTop: '20px', color: colors.white, fontSize: '13px', animation: 'fadeIn 0.5s ease 0.8s both', fontFamily: 'Roboto, sans-serif' }}>
              Already have an account? 
              <Link to="/login" style={{ color: colors.black, fontWeight: 'bold', textDecoration: 'none', cursor: 'pointer', marginLeft: '4px', transition: 'all 0.3s ease' }}
                onMouseEnter={(e) => e.target.style.color = colors.darkGray}
                onMouseLeave={(e) => e.target.style.color = colors.black}
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
