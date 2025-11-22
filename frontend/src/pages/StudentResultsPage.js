import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StudentSidebar from '../components/StudentSidebar';
import api from '../api';
import Button from '../components/Button';


export default function StudentResultsPage() {
  const { attemptId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadResults();
  }, [attemptId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/student/attempts/${attemptId}/evaluated-results`);
      setResult(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load results');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <div style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: '280px', zIndex: 100 }}>
          <StudentSidebar user={user} onLogout={logout} />
        </div>
        <div style={{ marginLeft: '280px', flex: 1, padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <div style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: '280px', zIndex: 100 }}>
          <StudentSidebar user={user} onLogout={logout} />
        </div>
        <div style={{ marginLeft: '280px', flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <p style={styles.error}>{error}</p>
          <Button onClick={() => navigate('/student-exams')}>Back</Button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <div style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: '280px', zIndex: 100 }}>
          <StudentSidebar user={user} onLogout={logout} />
        </div>
        <div style={{ marginLeft: '280px', flex: 1, padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>No results found</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Fixed Sidebar */}
      <div style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: '280px', zIndex: 100 }}>
        <StudentSidebar user={user} onLogout={logout} />
      </div>

      {/* Header */}
      <div style={{ marginLeft: '280px', backgroundColor: 'white', padding: '30px 40px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h1>{result.exam_title}</h1>
        <div style={styles.scoreBoard}>
          <div style={styles.scoreBox}>
            <h2 style={styles.percentage}>{result.percentage}%</h2>
            <p>Your Score</p>
          </div>
          <div style={styles.detailsBox}>
            <p><strong>Points:</strong> {result.score} / {result.total_possible_score}</p>
            <p><strong>Teacher:</strong> {result.published_by}</p>
            <p><strong>Submitted:</strong> {new Date(result.submitted_at).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ marginLeft: '280px', flex: 1, padding: '40px', overflowY: 'auto' }}>
          <h2 style={{ marginBottom: '20px' }}>Detailed Feedback</h2>

          {result.answers_with_evaluations.map((answer, idx) => {
            const evaluation = answer.evaluation;
            const hasEvaluation = evaluation !== null && evaluation !== undefined;

            return (
              <div key={answer.id} style={styles.answerCard}>
                <div style={styles.answerHeader}>
                  <h3>Q{idx + 1}. {answer.question_title}</h3>
                  {hasEvaluation && (
                    <div style={styles.evaluationBadge}>
                      {evaluation.is_correct === true && (
                        <span style={styles.correctBadge}>✓ Correct</span>
                      )}
                      {evaluation.is_correct === false && (
                        <span style={styles.wrongBadge}>✗ Wrong</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Display answer */}
                <div style={styles.answerContent}>
                  <p><strong>Your Answer:</strong></p>
                  {answer.question_type === 'image_upload' && typeof answer.answer_data === 'object' && answer.answer_data.name ? (
                    <div style={styles.fileDisplay}>
                      <p>📁 {answer.answer_data.name}</p>
                      <p style={styles.fileSize}>{Math.round(answer.answer_data.size / 1024)} KB</p>
                    </div>
                  ) : Array.isArray(answer.answer_data) ? (
                    <p style={styles.answerText}>{answer.answer_data.join(', ')}</p>
                  ) : (
                    <p style={styles.answerText}>{answer.answer_data || '(No answer provided)'}</p>
                  )}
                </div>

                {/* Display teacher feedback only if evaluation exists */}
                {hasEvaluation && (
                  <div style={styles.feedbackBox}>
                    <h4>Teacher Feedback</h4>
                    {evaluation.comment && (
                      <div style={styles.commentBox}>
                        <p>{evaluation.comment}</p>
                      </div>
                    )}
                    {evaluation.score_awarded !== null && evaluation.score_awarded !== undefined && (
                      <p><strong>Points Awarded:</strong> {evaluation.score_awarded}</p>
                    )}
                    {!evaluation.comment && evaluation.score_awarded === null && (
                      <p style={styles.noComment}>No additional feedback provided</p>
                    )}
                  </div>
                )}

              </div>
            );
          })}
      </div>

      {/* Footer Button */}
      <div style={{ marginLeft: '280px', textAlign: 'center', padding: '30px', backgroundColor: 'white', borderTop: '1px solid #eee' }}>
        <Button onClick={() => navigate('/student-exams')} style={{ padding: '12px 24px', fontSize: '16px' }}>
          Back to My Exams
        </Button>
      </div>
    </div>
  );
}

const styles = {
  scoreBoard: {
    display: 'flex',
    gap: '30px',
    marginTop: '25px',
    alignItems: 'center',
  },
  scoreBox: {
    backgroundColor: '#f0f8ff',
    border: '3px solid #007bff',
    borderRadius: '8px',
    padding: '30px',
    textAlign: 'center',
    minWidth: '150px',
  },
  percentage: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#007bff',
    margin: '0 0 10px 0',
  },
  detailsBox: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: '20px',
    borderRadius: '8px',
    borderLeft: '4px solid #007bff',
  },
  answerCard: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '20px',
    borderLeft: '4px solid #ddd',
  },
  answerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  evaluationBadge: {
    display: 'flex',
    gap: '10px',
  },
  correctBadge: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '6px 12px',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  wrongBadge: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '6px 12px',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  pendingBadge: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    padding: '6px 12px',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  answerContent: {
    backgroundColor: '#f9f9f9',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  answerText: {
    margin: '10px 0 0 0',
    color: '#333',
    fontSize: '15px',
  },
  fileDisplay: {
    margin: '10px 0 0 0',
    padding: '10px',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
  },
  fileSize: {
    fontSize: '12px',
    color: '#666',
    margin: '5px 0 0 0',
  },
  feedbackBox: {
    backgroundColor: '#f0f8ff',
    padding: '15px',
    borderRadius: '4px',
    borderLeft: '4px solid #007bff',
  },
  commentBox: {
    backgroundColor: 'white',
    padding: '12px',
    borderRadius: '4px',
    marginTop: '10px',
    marginBottom: '10px',
    fontStyle: 'italic',
    borderLeft: '3px solid #28a745',
  },
  noComment: {
    color: '#666',
    fontStyle: 'italic',
  },
  pendingFeedback: {
    backgroundColor: '#fffbf0',
    padding: '15px',
    borderRadius: '4px',
    borderLeft: '4px solid #ff9800',
    color: '#8b4513',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  backButton: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  error: {
    color: '#dc3545',
    padding: '15px',
    backgroundColor: '#f8d7da',
    borderRadius: '4px',
  },
};



