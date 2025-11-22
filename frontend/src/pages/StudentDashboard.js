import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import StudentSidebar from '../components/StudentSidebar';
import api from '../api';
import Button from '../components/Button';

function StudentDashboard() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchExams();
  }, [navigate]);

  const fetchExams = async () => {
    try {
      const response = await api.get('/student/exams/');
      setExams(response.data);
      setError('');
      setLoading(false);
    } catch (err) {
      let errorMessage = 'Failed to load exams';
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail[0]?.msg || 'Failed to load exams';
        } else if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        }
      }
      console.error('Error fetching exams:', err);
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleStartExam = async (examId) => {
    try {
      // Check if student has an unfinished attempt for this exam
      const response = await api.get('/student/unfinished-attempts/');
      const unfinishedAttempt = response.data.find(attempt => attempt.exam_id === examId);

      if (unfinishedAttempt) {
        // Resume existing attempt instead of starting new one
        navigate(`/exam/resume/${unfinishedAttempt.id}`);
      } else {
        // Start new exam
        navigate(`/exam/${examId}`);
      }
    } catch (err) {
      // If checking for unfinished attempts fails, just start new exam
      console.error('Error checking for unfinished attempts:', err);
      navigate(`/exam/${examId}`);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.background, color: theme.text, fontFamily: 'Roboto, sans-serif' }}>
      {/* Sidebar */}
      <StudentSidebar user={user} onLogout={logout} />

      {/* Main Content */}
      <div style={{ marginLeft: '70px', flex: 1, padding: '30px', overflow: 'auto', transition: 'margin-left 0.3s ease' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '30px', animation: 'fadeInDown 0.6s ease' }}>
            <h1 style={{ margin: '0 0 24px 0', color: theme.primary, fontSize: '28px', fontWeight: 'bold', fontFamily: 'Roboto, sans-serif' }}>Available Exams</h1>
          </div>

          {loading ? (
            <p style={{ color: theme.text, fontFamily: 'Roboto, sans-serif' }}>Loading exams...</p>
          ) : error ? (
            <p style={{ color: theme.danger, fontFamily: 'Roboto, sans-serif', padding: '15px', backgroundColor: 'rgba(220, 53, 69, 0.1)', borderLeft: `4px solid ${theme.danger}`, borderRadius: '4px' }}>{error}</p>
          ) : (
            <>
              <h2 style={{ color: theme.primary, fontFamily: 'Roboto, sans-serif' }}>Available Exams</h2>
              {exams.length === 0 ? (
                <p style={{ color: theme.text, fontFamily: 'Roboto, sans-serif' }}>No exams available at the moment.</p>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '20px',
                  marginTop: '20px',
                }}>
                  {exams.map((exam, index) => {
                    // Determine exam status
                    let statusColor = theme.primary;
                    let statusText = 'Active';
                    let buttonDisabled = false;
                    let buttonColor = theme.primary;

                    if (exam.is_expired) {
                      statusColor = theme.danger;
                      statusText = 'Expired';
                      buttonDisabled = true;
                      buttonColor = theme.secondary;
                    } else if (exam.is_upcoming) {
                      statusColor = theme.warning;
                      statusText = 'Upcoming';
                      buttonDisabled = true;
                      buttonColor = theme.secondary;
                    }

                    return (
                      <div
                        key={exam.id}
                        style={{
                          backgroundColor: theme.cardBg,
                          border: `1px solid ${theme.border}`,
                          padding: '20px',
                          borderRadius: '8px',
                          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                          animation: `slideInUp 0.5s ease ${index * 0.1}s both`,
                          color: theme.text
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                          e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0) scale(1)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                          <h3 style={{ color: theme.primary, margin: '0' }}>{exam.title}</h3>
                          <span style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            backgroundColor: statusColor,
                            color: '#ffffff',
                            fontFamily: 'Roboto, sans-serif',
                          }}>{statusText}</span>
                        </div>
                        <p style={{ color: theme.text, fontFamily: 'Roboto, sans-serif' }}><strong>Start Time:</strong> {new Date(exam.start_time).toLocaleString()}</p>
                        <p style={{ color: theme.text, fontFamily: 'Roboto, sans-serif' }}><strong>End Time:</strong> {new Date(exam.end_time).toLocaleString()}</p>
                        <p style={{ color: theme.text, fontFamily: 'Roboto, sans-serif' }}><strong>Duration:</strong> {exam.duration_minutes} minutes</p>
                        <Button
                          onClick={() => !buttonDisabled && handleStartExam(exam.id)}
                          disabled={buttonDisabled}
                          style={{
                            marginTop: '15px',
                            backgroundColor: buttonColor,
                            color: '#ffffff',
                            opacity: buttonDisabled ? 0.6 : 1,
                          }}
                        >
                          {exam.is_expired ? 'Exam Expired' : exam.is_upcoming ? 'Not Started Yet' : 'Start Exam'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <style>{`
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
      `}</style>
      </div>
    </div>
  );
}

export default StudentDashboard;

