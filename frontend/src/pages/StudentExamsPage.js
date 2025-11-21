import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StudentSidebar from '../components/StudentSidebar';
import api from '../api';

export default function StudentExamsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exams, setExams] = useState([]);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const response = await api.get('/student/completed-exams/');
      setExams(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load exams');
      setLoading(false);
    }
  };

  const calculateOverallPercentage = () => {
    if (exams.length === 0) return 0;
    const totalPercentage = exams.reduce((sum, exam) => sum + (exam.percentage || 0), 0);
    return Math.round(totalPercentage / exams.length);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000000', fontFamily: 'Roboto, sans-serif' }}>
        <div style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: '280px', zIndex: 100 }}>
          <StudentSidebar user={user} onLogout={logout} />
        </div>
        <div style={{ marginLeft: '280px', flex: 1, padding: '30px', overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <p style={{ color: '#87ceeb', fontSize: '16px' }}>Loading...</p>
        </div>
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
        <div style={{ marginLeft: '280px', flex: 1, padding: '30px', overflow: 'auto' }}

>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ color: '#87ceeb', fontSize: '28px', fontWeight: 'bold', marginBottom: '10px' }}>My Exam Results</h1>
          <p style={{ color: '#87ceeb', fontSize: '14px', marginBottom: '30px' }}>View your completed exams and teacher evaluations</p>

          {error && (
            <div style={{
              backgroundColor: 'rgba(220, 53, 69, 0.1)',
              color: '#ff6b6b',
              padding: '15px',
              borderRadius: '4px',
              marginBottom: '20px',
              border: '1px solid #ff6b6b',
              fontFamily: 'Roboto, sans-serif',
            }}>
              <p>{error}</p>
            </div>
          )}

          {exams.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <div style={{
                padding: '30px',
                borderRadius: '8px',
                textAlign: 'center',
                backgroundColor: 'rgba(135, 206, 235, 0.1)',
                border: '2px solid #87ceeb',
              }}>
                <div style={{ fontSize: '14px', color: '#87ceeb', fontWeight: '600', marginBottom: '10px', fontFamily: 'Roboto, sans-serif' }}>Overall Performance</div>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#87ceeb', margin: '10px 0', fontFamily: 'Roboto, sans-serif' }}>{calculateOverallPercentage()}%</div>
                <div style={{ color: '#87ceeb', fontSize: '14px', margin: '5px 0 0 0', fontFamily: 'Roboto, sans-serif' }}>Average of {exams.length} completed exam{exams.length > 1 ? 's' : ''}</div>
              </div>
            </div>
          )}

          {exams.length === 0 ? (
            <div style={{
              backgroundColor: 'rgba(135, 206, 235, 0.1)',
              border: '2px solid #87ceeb',
              padding: '40px',
              borderRadius: '8px',
              textAlign: 'center',
            }}>
              <p style={{ color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>You haven't completed any exams yet.</p>
              <button
                onClick={() => navigate('/student-account')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#87ceeb',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  marginTop: '20px',
                  fontFamily: 'Roboto, sans-serif',
                }}
              >
                Back to Dashboard
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
              marginTop: '30px',
            }}>
              {exams.map((exam, index) => (
                <div key={exam.id} style={{
                  backgroundColor: 'rgba(135, 206, 235, 0.1)',
                  border: '1px solid #87ceeb',
                  padding: '25px',
                  borderRadius: '8px',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <h3 style={{ margin: '0', fontSize: '18px', color: '#87ceeb', flex: 1, fontFamily: 'Roboto, sans-serif' }}>{exam.exam_title}</h3>
                    <div
                      style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        color: '#000000',
                        minWidth: '70px',
                        textAlign: 'center',
                        backgroundColor: getPercentageColor(exam.percentage),
                      }}
                    >
                      {exam.percentage}%
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                    <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '12px', borderRadius: '4px', borderLeft: '3px solid #87ceeb' }}>
                      <span style={{ display: 'block', fontSize: '12px', color: '#87ceeb', marginBottom: '5px', fontFamily: 'Roboto, sans-serif' }}>Score</span>
                      <span style={{ display: 'block', fontSize: '18px', fontWeight: 'bold', color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>
                        {exam.score} / {exam.total_possible_score}
                      </span>
                    </div>
                    <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '12px', borderRadius: '4px', borderLeft: '3px solid #87ceeb' }}>
                      <span style={{ display: 'block', fontSize: '12px', color: '#87ceeb', marginBottom: '5px', fontFamily: 'Roboto, sans-serif' }}>Submitted</span>
                      <span style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>
                        {new Date(exam.end_time).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/exam-results/${exam.id}`)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#87ceeb',
                      color: '#000000',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease',
                      fontFamily: 'Roboto, sans-serif',
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
                    View Details & Feedback
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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
    `}</style>
    </>
  );
}

function getPercentageColor(percentage) {
  if (percentage >= 80) return '#84cc16';
  if (percentage >= 70) return '#87ceeb';
  if (percentage >= 60) return '#fbbf24';
  return '#ff6b6b';
}
