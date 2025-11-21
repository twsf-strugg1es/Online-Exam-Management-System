import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import api from '../api';

function AdminEvaluateAnswersPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [attemptData, setAttemptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [evaluations, setEvaluations] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [totalMarksAwarded, setTotalMarksAwarded] = useState(0);

  useEffect(() => {
    fetchAttemptData();
  }, [attemptId]);

  const fetchAttemptData = async () => {
    try {
      const res = await api.get(`/admin/evaluations/attempts/${attemptId}`);
      setAttemptData(res.data);
      
      // Initialize evaluations state and calculate total marks
      const initialEvals = {};
      let totalMarks = 0;
      
      res.data.answers.forEach(answer => {
        const questionMaxScore = answer.question_max_score || 1;
        initialEvals[answer.answer_id] = {
          is_correct: answer.score_awarded !== null && answer.score_awarded > 0,
          comment: answer.comment || '',
        };
        // Recalculate total marks from backend data (derived value)
        if (answer.is_evaluated && answer.score_awarded !== null) {
          totalMarks += answer.score_awarded;
        }
      });
      
      setEvaluations(initialEvals);
      setTotalMarksAwarded(totalMarks);
      setLoading(false);
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to load attempt details';
      setError(message);
      setLoading(false);
    }
  };

  const handleCorrectClick = (answerId) => {
    setEvaluations(prev => ({
      ...prev,
      [answerId]: {
        ...prev[answerId],
        is_correct: true,
      }
    }));
  };

  const handleIncorrectClick = (answerId) => {
    setEvaluations(prev => ({
      ...prev,
      [answerId]: {
        ...prev[answerId],
        is_correct: false,
      }
    }));
  };

  const handleCommentChange = (answerId, comment) => {
    setEvaluations(prev => ({
      ...prev,
      [answerId]: {
        ...prev[answerId],
        comment: comment.slice(0, 100), // Limit to 100 chars
      }
    }));
  };

  const handleSubmitEvaluation = async (answerId) => {
    if (!(answerId in evaluations)) {
      setError('Please select Correct or Incorrect for this answer');
      return;
    }

    setSubmitting(true);
    try {
      const evalData = evaluations[answerId];
      const response = await api.post(`/admin/evaluations/answers/${answerId}/submit`, {
        is_correct: evalData.is_correct,
        comment: evalData.comment,
      });

      setSuccessMessage('Answer evaluated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Refresh data from backend - this recalculates total marks from server
      await fetchAttemptData();
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to submit evaluation';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToExams = () => {
    navigate('/admin-exams');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000000', fontFamily: 'Roboto, sans-serif' }}>
        <div style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: '280px', zIndex: 100 }}>
          <AdminSidebar user={user} onLogout={logout} />
        </div>
        <div style={{ marginLeft: '280px', flex: 1, padding: '30px', overflow: 'auto' }}>
          <p style={{ color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000000', fontFamily: 'Roboto, sans-serif' }}>
        <div style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: '280px', zIndex: 100 }}>
          <AdminSidebar user={user} onLogout={logout} />
        </div>
        <div style={{ marginLeft: '280px', flex: 1, padding: '30px', overflow: 'auto' }}>
          <div style={{ backgroundColor: 'rgba(220, 53, 69, 0.1)', color: '#ff6b6b', padding: '15px', borderRadius: '4px', marginBottom: '20px', border: '1px solid #ff6b6b', fontFamily: 'Roboto, sans-serif' }}>{error}</div>
          <button onClick={handleBackToExams} style={{ padding: '10px 20px', backgroundColor: '#87ceeb', color: '#000000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', fontFamily: 'Roboto, sans-serif' }}>← Back to Exams</button>
        </div>
      </div>
    );
  }

  if (!attemptData) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000000', fontFamily: 'Roboto, sans-serif' }}>
        <div style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: '280px', zIndex: 100 }}>
          <AdminSidebar user={user} onLogout={logout} />
        </div>
        <div style={{ marginLeft: '280px', flex: 1, padding: '30px', overflow: 'auto' }}>
          <p style={{ color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>No data found</p>
          <button onClick={handleBackToExams} style={{ padding: '10px 20px', backgroundColor: '#87ceeb', color: '#000000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', fontFamily: 'Roboto, sans-serif' }}>← Back to Exams</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000000', fontFamily: 'Roboto, sans-serif' }}>
      <div style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: '280px', zIndex: 100 }}>
        <AdminSidebar user={user} onLogout={logout} />
      </div>

      <div style={{ marginLeft: '280px', flex: 1, padding: '30px', overflow: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h1 style={{ margin: '0', color: '#87ceeb', fontSize: '28px', fontWeight: 'bold', fontFamily: 'Roboto, sans-serif' }}>Evaluate Answers</h1>
              <button 
                onClick={handleBackToExams} 
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
                  transition: 'all 0.3s ease'
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
                ← Back to Exams
              </button>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div style={{ backgroundColor: 'rgba(132, 204, 22, 0.1)', color: '#84cc16', padding: '15px', borderRadius: '4px', marginBottom: '20px', border: '1px solid #84cc16', fontFamily: 'Roboto, sans-serif' }}>
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{ backgroundColor: 'rgba(220, 53, 69, 0.1)', color: '#ff6b6b', padding: '15px', borderRadius: '4px', marginBottom: '20px', border: '1px solid #ff6b6b', fontFamily: 'Roboto, sans-serif' }}>
              {error}
            </div>
          )}

          {/* Student and Exam Info */}
          <div style={{ backgroundColor: 'rgba(135, 206, 235, 0.05)', border: '2px solid #87ceeb', borderRadius: '8px', padding: '25px', marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '30px' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 20px 0', color: '#87ceeb', fontSize: '20px', fontWeight: 'bold', fontFamily: 'Roboto, sans-serif' }}>{attemptData.exam?.title}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '15px', borderRadius: '4px', borderLeft: '3px solid #87ceeb' }}>
                    <p style={{ margin: '0 0 8px 0', color: '#87ceeb', fontSize: '12px', fontWeight: '600', fontFamily: 'Roboto, sans-serif' }}>STUDENT NAME</p>
                    <p style={{ margin: '0', color: '#87ceeb', fontSize: '16px', fontWeight: 'bold', fontFamily: 'Roboto, sans-serif' }}>{attemptData.student?.full_name || 'N/A'}</p>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '15px', borderRadius: '4px', borderLeft: '3px solid #87ceeb' }}>
                    <p style={{ margin: '0 0 8px 0', color: '#87ceeb', fontSize: '12px', fontWeight: '600', fontFamily: 'Roboto, sans-serif' }}>STUDENT EMAIL</p>
                    <p style={{ margin: '0', color: '#87ceeb', fontSize: '14px', fontFamily: 'Roboto, sans-serif', wordBreak: 'break-all' }}>{attemptData.student?.email || 'N/A'}</p>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '15px', borderRadius: '4px', borderLeft: '3px solid #87ceeb' }}>
                    <p style={{ margin: '0 0 8px 0', color: '#87ceeb', fontSize: '12px', fontWeight: '600', fontFamily: 'Roboto, sans-serif' }}>SUBMITTED AT</p>
                    <p style={{ margin: '0', color: '#87ceeb', fontSize: '14px', fontFamily: 'Roboto, sans-serif' }}>{attemptData.submitted_at ? new Date(attemptData.submitted_at).toLocaleString() : 'N/A'}</p>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '15px', borderRadius: '4px', borderLeft: '3px solid #84cc16', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 8px 0', color: '#87ceeb', fontSize: '12px', fontWeight: '600', fontFamily: 'Roboto, sans-serif' }}>TOTAL MARKS AWARDED</p>
                    <p style={{ margin: '0', color: '#84cc16', fontSize: '24px', fontWeight: 'bold', fontFamily: 'Roboto, sans-serif' }}>{totalMarksAwarded}</p>
                    {attemptData.exam?.total_marks && <p style={{ margin: '5px 0 0 0', color: '#87ceeb', fontSize: '12px', fontFamily: 'Roboto, sans-serif' }}>out of {attemptData.exam.total_marks}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Answers to Evaluate */}
          <div>
            {attemptData.answers.length === 0 ? (
              <div style={{ backgroundColor: 'rgba(135, 206, 235, 0.05)', border: '2px solid #87ceeb', borderRadius: '8px', padding: '30px', textAlign: 'center' }}>
                <p style={{ color: '#87ceeb', fontSize: '16px', fontFamily: 'Roboto, sans-serif' }}>No text or image upload questions to evaluate</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {attemptData.answers.map((answer, index) => (
                  <div key={answer.answer_id} style={{ backgroundColor: 'rgba(135, 206, 235, 0.05)', border: '2px solid #87ceeb', borderRadius: '8px', padding: '25px', overflow: 'hidden' }}>
                    {/* Question Header */}
                    <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid rgba(135, 206, 235, 0.3)' }}>
                      <h3 style={{ margin: '0 0 8px 0', color: '#87ceeb', fontSize: '16px', fontWeight: 'bold', fontFamily: 'Roboto, sans-serif' }}>Question {index + 1}: {answer.question_title}</h3>
                      <span style={{ color: '#87ceeb', fontSize: '12px', fontFamily: 'Roboto, sans-serif' }}>Type: <strong>{answer.question_type === 'text' ? 'Text Answer' : 'Image Upload'}</strong></span>
                    </div>

                    {/* Answer Display */}
                    <div style={{ marginBottom: '25px' }}>
                      <p style={{ margin: '0 0 12px 0', color: '#87ceeb', fontSize: '12px', fontWeight: '600', fontFamily: 'Roboto, sans-serif', textTransform: 'uppercase' }}>Student's Answer</p>
                      {answer.question_type === 'text' && answer.answer_text ? (
                        <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '15px', borderRadius: '4px', borderLeft: '3px solid #87ceeb', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#87ceeb', fontFamily: 'Roboto, sans-serif', fontSize: '14px' }}>
                          {answer.answer_text}
                        </div>
                      ) : answer.question_type === 'image_upload' ? (
                        <div>
                          {answer.uploaded_file_name ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '4px', borderLeft: '3px solid #87ceeb' }}>
                              <div style={{ fontSize: '32px' }}>🖼️</div>
                              <div>
                                <p style={{ margin: '0 0 5px 0', fontWeight: '500', color: '#87ceeb', fontFamily: 'Roboto, sans-serif', wordBreak: 'break-word' }}>{answer.uploaded_file_name}</p>
                                <p style={{ margin: '0', fontSize: '12px', color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>Image Upload</p>
                              </div>
                            </div>
                          ) : (
                            <div style={{ padding: '15px', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '4px', color: '#87ceeb', fontStyle: 'italic', fontFamily: 'Roboto, sans-serif' }}>No image uploaded</div>
                          )}
                        </div>
                      ) : (
                        <div style={{ padding: '15px', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '4px', color: '#87ceeb', fontStyle: 'italic', fontFamily: 'Roboto, sans-serif' }}>No answer provided</div>
                      )}
                    </div>

                    {/* Evaluation Section */}
                    <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: '20px', borderRadius: '4px', borderLeft: '3px solid #87ceeb' }}>
                      <p style={{ margin: '0 0 15px 0', color: '#87ceeb', fontSize: '12px', fontWeight: '600', fontFamily: 'Roboto, sans-serif', textTransform: 'uppercase' }}>Evaluation</p>
                      
                      {/* Correct/Incorrect Buttons */}
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                        <button
                          onClick={() => handleCorrectClick(answer.answer_id)}
                          style={{
                            flex: 1,
                            padding: '12px 20px',
                            backgroundColor: evaluations[answer.answer_id]?.is_correct === true ? '#84cc16' : 'transparent',
                            color: evaluations[answer.answer_id]?.is_correct === true ? '#000000' : '#84cc16',
                            border: '2px solid #84cc16',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (evaluations[answer.answer_id]?.is_correct !== true) {
                              e.currentTarget.style.backgroundColor = 'rgba(132, 204, 22, 0.15)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (evaluations[answer.answer_id]?.is_correct !== true) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          ✓ Correct
                        </button>
                        <button
                          onClick={() => handleIncorrectClick(answer.answer_id)}
                          style={{
                            flex: 1,
                            padding: '12px 20px',
                            backgroundColor: evaluations[answer.answer_id]?.is_correct === false ? '#ff6b6b' : 'transparent',
                            color: evaluations[answer.answer_id]?.is_correct === false ? '#000000' : '#ff6b6b',
                            border: '2px solid #ff6b6b',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            fontFamily: 'Roboto, sans-serif',
                            transition: 'all 0.3s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (evaluations[answer.answer_id]?.is_correct !== false) {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 107, 107, 0.15)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (evaluations[answer.answer_id]?.is_correct !== false) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          ✗ Incorrect
                        </button>
                      </div>

                      {/* Comment Box */}
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#87ceeb', fontSize: '12px', fontWeight: '600', fontFamily: 'Roboto, sans-serif', textTransform: 'uppercase' }}>Feedback (max 100 characters)</label>
                        <textarea
                          value={evaluations[answer.answer_id]?.comment || ''}
                          onChange={(e) => handleCommentChange(answer.answer_id, e.target.value)}
                          placeholder="Add your feedback here..."
                          style={{
                            width: '100%',
                            padding: '12px',
                            marginBottom: '5px',
                            border: '1px solid #87ceeb',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                            color: '#87ceeb',
                            fontFamily: 'Roboto, sans-serif',
                            fontSize: '14px',
                            boxSizing: 'border-box',
                            resize: 'vertical',
                            minHeight: '80px',
                          }}
                          maxLength="100"
                        />
                        <small style={{ color: '#87ceeb', fontSize: '12px', fontFamily: 'Roboto, sans-serif' }}>{(evaluations[answer.answer_id]?.comment || '').length}/100</small>
                      </div>

                      {/* Submit Button */}
                      <button
                        onClick={() => handleSubmitEvaluation(answer.answer_id)}
                        disabled={submitting}
                        style={{
                          width: '100%',
                          padding: '12px 30px',
                          backgroundColor: submitting ? 'rgba(135, 206, 235, 0.3)' : '#87ceeb',
                          color: submitting ? 'rgba(135, 206, 235, 0.5)' : '#000000',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: submitting ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          fontFamily: 'Roboto, sans-serif',
                          transition: 'all 0.3s ease',
                          opacity: submitting ? 0.7 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (!submitting) {
                            e.currentTarget.style.transform = 'scale(1.02)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 206, 235, 0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!submitting) {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                          }
                        }}
                      >
                        {submitting ? 'Saving...' : (answer.is_evaluated ? 'Update Evaluation' : 'Submit Evaluation')}
                      </button>

                      {/* Already Evaluated Badge */}
                      {answer.is_evaluated && (
                        <div style={{ marginTop: '15px', padding: '10px 15px', backgroundColor: 'rgba(132, 204, 22, 0.1)', color: '#84cc16', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', fontFamily: 'Roboto, sans-serif', textAlign: 'center', border: '1px solid rgba(132, 204, 22, 0.3)' }}>
                          ✓ Already Evaluated
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminEvaluateAnswersPage;
