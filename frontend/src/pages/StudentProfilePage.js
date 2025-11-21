import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StudentSidebar from '../components/StudentSidebar';
import api from '../api';

function StudentProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    gender: '',
    exam_candidate: '',
  });
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/profile/student');
      setProfile(response.data);
      setFormData({
        full_name: response.data.full_name || '',
        gender: response.data.gender || '',
        exam_candidate: response.data.exam_candidate || '',
      });
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setError('');
    setSuccess('');
    try {
      setSaving(true);
      await api.put('/profile/student', formData);
      setSuccess('Profile updated successfully!');
      setEditMode(false);
      loadProfile();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    if (passwordData.new_password.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      await api.post('/profile/change-password', {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      });
      
      setSuccess('Password changed successfully!');
      setShowPasswordChange(false);
      setPasswordData({
        old_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000000', fontFamily: 'Roboto, sans-serif', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: '#87ceeb', fontSize: '16px' }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000000', fontFamily: 'Roboto, sans-serif' }}>
        {/* Sidebar */}
        <div style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: '280px', zIndex: 100 }}>
          <StudentSidebar user={user} onLogout={logout} />
        </div>

        {/* Main Content */}
        <div style={{ marginLeft: '280px', flex: 1, padding: '30px', overflow: 'auto' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ backgroundColor: 'rgba(135, 206, 235, 0.05)', border: '2px solid #87ceeb', borderRadius: '8px', padding: '30px', transition: 'all 0.3s ease', boxShadow: '0 4px 12px rgba(135, 206, 235, 0.1)', animation: 'fadeInDown 0.6s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ margin: 0, color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>My Profile</h2>
                {!editMode && !showPasswordChange && (
                  <button 
                    onClick={() => setEditMode(true)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#87ceeb',
                      color: '#000000',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      fontFamily: 'Roboto, sans-serif',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 206, 235, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              {error && (
                <div style={{
                  backgroundColor: 'rgba(220, 53, 69, 0.1)',
                  color: '#ff6b6b',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '20px',
                  borderLeft: '4px solid #dc3545',
                  fontFamily: 'Roboto, sans-serif',
                  animation: 'slideInDown 0.4s ease',
                }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{
                  backgroundColor: 'rgba(132, 204, 22, 0.1)',
                  color: '#84cc16',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '20px',
                  borderLeft: '4px solid #84cc16',
                  fontFamily: 'Roboto, sans-serif',
                  animation: 'slideInDown 0.4s ease',
                }}>
                  {success}
                </div>
              )}

              {profile && (
                <>
                  {editMode ? (
                    <div style={{ marginBottom: '20px', animation: 'fadeIn 0.3s ease' }}>
                      <h3 style={{ color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>Edit Profile Information</h3>
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#87ceeb' }}>Full Name:</label>
                        <input
                          type="text"
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleInputChange}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #87ceeb',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(135, 206, 235, 0.1)',
                            color: '#87ceeb',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#87ceeb';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(135, 206, 235, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.15)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#87ceeb';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.1)';
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#87ceeb' }}>Gender:</label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleInputChange}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #87ceeb',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(135, 206, 235, 0.1)',
                            color: '#87ceeb',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#87ceeb';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(135, 206, 235, 0.3)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#87ceeb';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <option value="">-- Select Gender --</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#87ceeb' }}>Exam Candidate:</label>
                        <select
                          name="exam_candidate"
                          value={formData.exam_candidate}
                          onChange={handleInputChange}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #87ceeb',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(135, 206, 235, 0.1)',
                            color: '#87ceeb',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#87ceeb';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(135, 206, 235, 0.3)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#87ceeb';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <option value="">-- Select Exam Candidate --</option>
                          <option value="SSC">SSC</option>
                          <option value="HSC">HSC</option>
                          <option value="Admission">Admission</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: '#87ceeb',
                            color: '#000000',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.02)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 206, 235, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={() => setEditMode(false)}
                          style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: 'transparent',
                            color: '#87ceeb',
                            border: '1px solid #87ceeb',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#87ceeb';
                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.1)';
                            e.currentTarget.style.transform = 'scale(1.02)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#87ceeb';
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : showPasswordChange ? (
                    <div style={{ marginBottom: '20px', animation: 'fadeIn 0.3s ease' }}>
                      <h3 style={{ color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>Change Password</h3>
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#87ceeb' }}>Current Password:</label>
                        <input
                          type="password"
                          name="old_password"
                          value={passwordData.old_password}
                          onChange={handlePasswordChange}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #87ceeb',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(135, 206, 235, 0.1)',
                            color: '#87ceeb',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#87ceeb';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(135, 206, 235, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.15)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#87ceeb';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.1)';
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#87ceeb' }}>New Password:</label>
                        <input
                          type="password"
                          name="new_password"
                          value={passwordData.new_password}
                          onChange={handlePasswordChange}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #87ceeb',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(135, 206, 235, 0.1)',
                            color: '#87ceeb',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#87ceeb';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(135, 206, 235, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.15)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#87ceeb';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.1)';
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#87ceeb' }}>Confirm New Password:</label>
                        <input
                          type="password"
                          name="confirm_password"
                          value={passwordData.confirm_password}
                          onChange={handlePasswordChange}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #87ceeb',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(135, 206, 235, 0.1)',
                            color: '#87ceeb',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#87ceeb';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(135, 206, 235, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.15)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#87ceeb';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.1)';
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button
                          onClick={handleChangePassword}
                          disabled={saving}
                          style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: '#87ceeb',
                            color: '#000000',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.02)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 206, 235, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {saving ? 'Updating...' : 'Update Password'}
                        </button>
                        <button
                          onClick={() => setShowPasswordChange(false)}
                          style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: 'transparent',
                            color: '#87ceeb',
                            border: '1px solid #87ceeb',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#87ceeb';
                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.1)';
                            e.currentTarget.style.transform = 'scale(1.02)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#87ceeb';
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '20px', animation: 'fadeIn 0.3s ease' }}>
                      <div style={{ marginBottom: '25px' }}>
                        <h3 style={{ color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>Account Information</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(135, 206, 235, 0.3)', color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>
                          <span style={{ fontWeight: 'bold' }}>Email:</span>
                          <span>{profile.email}</span>
                        </div>
                      </div>

                      <div style={{ marginBottom: '25px' }}>
                        <h3 style={{ color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>Personal Information</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(135, 206, 235, 0.3)', color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>
                          <span style={{ fontWeight: 'bold' }}>Full Name:</span>
                          <span>{profile.full_name || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(135, 206, 235, 0.3)', color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>
                          <span style={{ fontWeight: 'bold' }}>Gender:</span>
                          <span>{profile.gender || '-'}</span>
                        </div>
                      </div>

                      <div style={{ marginBottom: '25px' }}>
                        <h3 style={{ color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>Exam Information</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(135, 206, 235, 0.3)', color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>
                          <span style={{ fontWeight: 'bold' }}>Exam Candidate:</span>
                          <span>{profile.exam_candidate || '-'}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button
                          onClick={() => setShowPasswordChange(true)}
                          style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: '#fbbf24',
                            color: '#000000',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.02)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(251, 191, 36, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          Change Password
                        </button>
                        <button
                          onClick={() => navigate(-1)}
                          style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: 'transparent',
                            color: '#87ceeb',
                            border: '1px solid #87ceeb',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#87ceeb';
                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.1)';
                            e.currentTarget.style.transform = 'scale(1.02)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#87ceeb';
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
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
      `}</style>
    </>
  );
}

export default StudentProfilePage;
