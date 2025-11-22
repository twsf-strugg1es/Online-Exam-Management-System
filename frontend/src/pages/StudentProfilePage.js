import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import StudentSidebar from '../components/StudentSidebar';
import api from '../api';
import Button from '../components/Button';


function StudentProfilePage() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
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
        <p style={{ color: '#0d6efd', fontSize: '16px' }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.background, fontFamily: 'Roboto, sans-serif' }}>
        {/* Sidebar */}
      <StudentSidebar user={user} onLogout={logout} />

        {/* Main Content */}
        <div style={{ marginLeft: '70px', flex: 1, padding: '30px', overflow: 'auto' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ backgroundColor: 'rgba(135, 206, 235, 0.05)', border: '2px solid #0d6efd', borderRadius: '8px', padding: '30px', transition: 'all 0.3s ease', boxShadow: '0 4px 12px rgba(135, 206, 235, 0.1)', animation: 'fadeInDown 0.6s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ margin: 0, color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>My Profile</h2>
                {!editMode && !showPasswordChange && (
                  <Button
                    onClick={() => setEditMode(true)}
                  >
                    Edit Profile
                  </Button>
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
                      <h3 style={{ color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>Edit Profile Information</h3>
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#0d6efd' }}>Full Name:</label>
                        <input
                          type="text"
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleInputChange}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #0d6efd',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(135, 206, 235, 0.1)',
                            color: '#0d6efd',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#0d6efd';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(135, 206, 235, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.15)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#0d6efd';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.1)';
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#0d6efd' }}>Gender:</label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleInputChange}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #0d6efd',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(135, 206, 235, 0.1)',
                            color: '#0d6efd',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#0d6efd';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(135, 206, 235, 0.3)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#0d6efd';
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
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#0d6efd' }}>Exam Candidate:</label>
                        <select
                          name="exam_candidate"
                          value={formData.exam_candidate}
                          onChange={handleInputChange}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #0d6efd',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(135, 206, 235, 0.1)',
                            color: '#0d6efd',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#0d6efd';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(135, 206, 235, 0.3)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#0d6efd';
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
                        <Button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          style={{ flex: 1 }}
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button
                          onClick={() => setEditMode(false)}
                          style={{ flex: 1 }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : showPasswordChange ? (
                    <div style={{ marginBottom: '20px', animation: 'fadeIn 0.3s ease' }}>
                      <h3 style={{ color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>Change Password</h3>
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#0d6efd' }}>Current Password:</label>
                        <input
                          type="password"
                          name="old_password"
                          value={passwordData.old_password}
                          onChange={handlePasswordChange}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #0d6efd',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(135, 206, 235, 0.1)',
                            color: '#0d6efd',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#0d6efd';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(135, 206, 235, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.15)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#0d6efd';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.1)';
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#0d6efd' }}>New Password:</label>
                        <input
                          type="password"
                          name="new_password"
                          value={passwordData.new_password}
                          onChange={handlePasswordChange}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #0d6efd',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(135, 206, 235, 0.1)',
                            color: '#0d6efd',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#0d6efd';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(135, 206, 235, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.15)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#0d6efd';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.1)';
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#0d6efd' }}>Confirm New Password:</label>
                        <input
                          type="password"
                          name="confirm_password"
                          value={passwordData.confirm_password}
                          onChange={handlePasswordChange}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #0d6efd',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(135, 206, 235, 0.1)',
                            color: '#0d6efd',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#0d6efd';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(135, 206, 235, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.15)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#0d6efd';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.1)';
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <Button
                          onClick={handleChangePassword}
                          disabled={saving}
                          style={{ flex: 1 }}
                        >
                          {saving ? 'Updating...' : 'Update Password'}
                        </Button>
                        <Button
                          onClick={() => setShowPasswordChange(false)}
                          style={{ flex: 1 }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '20px', animation: 'fadeIn 0.3s ease' }}>
                      <div style={{ marginBottom: '25px' }}>
                        <h3 style={{ color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>Account Information</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(135, 206, 235, 0.3)', color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>
                          <span style={{ fontWeight: 'bold' }}>Email:</span>
                          <span>{profile.email}</span>
                        </div>
                      </div>

                      <div style={{ marginBottom: '25px' }}>
                        <h3 style={{ color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>Personal Information</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(135, 206, 235, 0.3)', color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>
                          <span style={{ fontWeight: 'bold' }}>Full Name:</span>
                          <span>{profile.full_name || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(135, 206, 235, 0.3)', color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>
                          <span style={{ fontWeight: 'bold' }}>Gender:</span>
                          <span>{profile.gender || '-'}</span>
                        </div>
                      </div>

                      <div style={{ marginBottom: '25px' }}>
                        <h3 style={{ color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>Exam Information</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(135, 206, 235, 0.3)', color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>
                          <span style={{ fontWeight: 'bold' }}>Exam Candidate:</span>
                          <span>{profile.exam_candidate || '-'}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <Button
                          onClick={() => setShowPasswordChange(true)}
                          style={{ flex: 1 }}
                        >
                          Change Password
                        </Button>
                        <Button
                          onClick={() => navigate(-1)}
                          style={{ flex: 1 }}
                        >
                          Back
                        </Button>
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



