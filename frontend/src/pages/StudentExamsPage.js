import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import StudentSidebar from '../components/StudentSidebar';
import api from '../api';
import Button from '../components/Button';


export default function StudentExamsPage() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
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
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.background, fontFamily: 'Roboto, sans-serif' }}>
      <StudentSidebar user={user} onLogout={logout} />
        <div style={{ marginLeft: '70px', flex: 1, padding: '30px', overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <p style={{ color: '#0d6efd', fontSize: '16px' }}>Loading...</p>
        </div>
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
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ color: '#0d6efd', fontSize: '28px', fontWeight: 'bold', marginBottom: '10px' }}>My Exam Results</h1>
            <p style={{ color: '#0d6efd', fontSize: '14px', marginBottom: '30px' }}>View your completed exams and teacher evaluations</p>

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
                  border: '2px solid #0d6efd',
                }}>
                  <div style={{ fontSize: '14px', color: '#0d6efd', fontWeight: '600', marginBottom: '10px', fontFamily: 'Roboto, sans-serif' }}>Overall Performance</div>
                  <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#0d6efd', margin: '10px 0', fontFamily: 'Roboto, sans-serif' }}>{calculateOverallPercentage()}%</div>
                  <div style={{ color: '#0d6efd', fontSize: '14px', margin: '5px 0 0 0', fontFamily: 'Roboto, sans-serif' }}>Average of {exams.length} completed exam{exams.length > 1 ? 's' : ''}</div>
                </div>
              </div>
            )}

            {exams.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <p style={{ color: '#0d6efd', fontSize: '18px', marginBottom: '20px' }}>You haven't completed any exams yet.</p>
                <Button
                  onClick={() => navigate('/student-account')}
                >
                  Back to Dashboard
                </Button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '20px' }}>
                {exams.map(exam => (
                  <div key={exam.id} style={{
                    backgroundColor: 'rgba(135, 206, 235, 0.1)',
                    border: '1px solid #0d6efd',
                    borderRadius: '8px',
                    padding: '20px',
                  }}>
                    <h3 style={{ color: '#0d6efd', margin: '0 0 10px 0' }}>{exam.title}</h3>
                    <p style={{ color: '#0d6efd', margin: '5px 0' }}><strong>Score:</strong> {exam.score} / {exam.total_score}</p>
                    <p style={{ color: '#0d6efd', margin: '5px 0' }}><strong>Percentage:</strong> {exam.percentage}%</p>
                    <p style={{ color: '#0d6efd', margin: '5px 0' }}><strong>Date:</strong> {new Date(exam.submitted_at).toLocaleDateString()}</p>
                    <Button
                      onClick={() => navigate(`/exam-results/${exam.id}`)}
                      style={{ width: '100%', marginTop: '15px' }}
                    >
                      View Details & Feedback
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}



