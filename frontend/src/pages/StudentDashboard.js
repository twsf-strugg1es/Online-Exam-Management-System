import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StudentSidebar from '../components/StudentSidebar';
import api from '../api';

function StudentDashboard() {
  const { user, logout } = useAuth();
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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000000', fontFamily: 'Roboto, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: '280px', zIndex: 100 }}>
        <StudentSidebar user={user} onLogout={logout} />
      </div>

      {/* Main Content */}
      <div style={{ marginLeft: '280px', flex: 1, padding: '30px', overflow: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '30px', animation: 'fadeInDown 0.6s ease' }}>
            <h1 style={{ margin: '0 0 24px 0', color: '#87ceeb', fontSize: '28px', fontWeight: 'bold', fontFamily: 'Roboto, sans-serif' }}>Available Exams</h1>
          </div>

          {loading ? (
            <p style={{ color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>Loading exams...</p>
          ) : error ? (
            <p style={{ color: '#ff6b6b', fontFamily: 'Roboto, sans-serif', padding: '15px', backgroundColor: 'rgba(220, 53, 69, 0.1)', borderLeft: '4px solid #dc3545', borderRadius: '4px' }}>{error}</p>
          ) : (
            <>
              <h2 style={{ color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>Available Exams</h2>
              {exams.length === 0 ? (
                <p style={{ color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>No exams available at the moment.</p>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '20px',
                  marginTop: '20px',
                }}>
                  {exams.map((exam, index) => {
                    // Determine exam status
                    let statusColor = '#87ceeb';
                    let statusText = 'Active';
                    let buttonDisabled = false;
                    let buttonColor = '#87ceeb';
                    
                    if (exam.is_expired) {
                      statusColor = '#ff6b6b';
                      statusText = 'Expired';
                      buttonDisabled = true;
                      buttonColor = '#999999';
                    } else if (exam.is_upcoming) {
                      statusColor = '#fbbf24';
                      statusText = 'Upcoming';
                      buttonDisabled = true;
                      buttonColor = '#999999';
                    }
                    
                    return (
                    <div 
                      key={exam.id} 
                      style={{
                        backgroundColor: 'rgba(135, 206, 235, 0.1)',
                        border: '1px solid #87ceeb',
                        padding: '20px',
                        borderRadius: '8px',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 2px 8px rgba(135, 206, 235, 0.1)',
                        animation: `slideInUp 0.5s ease ${index * 0.1}s both`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(135, 206, 235, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(135, 206, 235, 0.1)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ color: '#87ceeb', margin: '0' }}>{exam.title}</h3>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: statusColor,
                          color: statusColor === '#fbbf24' ? '#000000' : '#ffffff',
                          fontFamily: 'Roboto, sans-serif',
                        }}>{statusText}</span>
                      </div>
                      <p style={{ color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}><strong>Start Time:</strong> {new Date(exam.start_time).toLocaleString()}</p>
                      <p style={{ color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}><strong>End Time:</strong> {new Date(exam.end_time).toLocaleString()}</p>
                      <p style={{ color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}><strong>Duration:</strong> {exam.duration_minutes} minutes</p>
                      <button
                        onClick={() => !buttonDisabled && handleStartExam(exam.id)}
                        disabled={buttonDisabled}
                        style={{
                          marginTop: '15px',
                          padding: '10px 20px',
                          backgroundColor: buttonColor,
                          color: buttonDisabled ? '#666666' : '#000000',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: buttonDisabled ? 'not-allowed' : 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          width: '100%',
                          fontFamily: 'Roboto, sans-serif',
                          transition: 'all 0.3s ease',
                          opacity: buttonDisabled ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (!buttonDisabled) {
                            e.currentTarget.style.transform = 'scale(1.02)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 206, 235, 0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {exam.is_expired ? 'Exam Expired' : exam.is_upcoming ? 'Not Started Yet' : 'Start Exam'}
                      </button>
                    </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
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
  );
}

export default StudentDashboard;
