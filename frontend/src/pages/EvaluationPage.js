import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

export default function EvaluationPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(null);
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [evaluations, setEvaluations] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadResults();
  }, [attemptId, attempt?.id]); // Re-load when attempt ID changes

  const loadResults = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/attempts/${attemptId}/results`);
      
      // The backend already calculates the final score with evaluations
      // Just use the score from the response directly
      setAttempt(response.data.attempt);
      setExam(response.data.exam);
      
      const answersData = response.data.attempt.answers || [];
      setAnswers(answersData);
      
      // Load existing evaluations
      const evals = {};
      for (const answer of answersData) {
        try {
          const evalResp = await api.get(`/admin/answers/${answer.id}/evaluation`);
          if (evalResp.data) {
            evals[answer.id] = evalResp.data;
          }
        } catch (e) {
          // No evaluation yet
        }
      }
      
      setEvaluations(evals);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load results');
      setLoading(false);
    }
  };

  const handleSaveResults = async () => {
    try {
      setSaving(true);
      // Reload the latest data from backend to ensure accurate scores
      await loadResults();
      alert('Results saved successfully!');
      navigate(-1);
    } catch (err) {
      setError('Failed to save results');
      setSaving(false);
    }
  };

  const handleEvaluate = async (answerId, data) => {
    try {
      setSaving(true);
      await api.post(`/admin/answers/${answerId}/evaluate`, data);
      // Refresh evaluations
      const evalResp = await api.get(`/admin/answers/${answerId}/evaluation`);
      setEvaluations({
        ...evaluations,
        [answerId]: evalResp.data,
      });
      
      // Reload attempt data to get updated score from backend
      const response = await api.get(`/admin/attempts/${attemptId}/results`);
      setAttempt(response.data.attempt);
      
      setSaving(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save evaluation');
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={styles.container}><p>Loading...</p></div>;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <p style={styles.error}>{error}</p>
        <button onClick={() => navigate(-1)} style={styles.button}>Go Back</button>
      </div>
    );
  }

  if (!attempt || !exam) {
    return <div style={styles.container}><p>No data found</p></div>;
  }

  // Calculate percentage
  const percentage = attempt.total_possible_score && attempt.total_possible_score > 0
    ? ((attempt.score / attempt.total_possible_score) * 100).toFixed(2)
    : 0;

  const studentEmail = attempt.student_email || 'Unknown Student';
  const publisherEmail = exam.publisher_email || 'Unknown Teacher';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>{exam.title}</h1>
        <div style={styles.headerInfo}>
          <p><strong>Student:</strong> {studentEmail}</p>
          <p><strong>Score:</strong> {attempt.score} / {attempt.total_possible_score}</p>
          <p><strong>Percentage:</strong> {percentage}%</p>
        </div>
      </div>

      <div style={styles.content}>
        {answers
          .filter(answer => {
            const question = exam.questions?.find(q => q.id === answer.question_id);
            // Only show text and image_upload questions for evaluation
            return question?.type === 'text' || question?.type === 'image_upload';
          })
          .map((answer, idx) => {
          const question = exam.questions?.find(q => q.id === answer.question_id);
          const evaluation = evaluations[answer.id];

          return (
            <div key={answer.id} style={styles.answerCard}>
              <h3>Q{idx + 1}. {question?.title || 'Unknown Question'}</h3>
              
              {/* Display answer based on type */}
              <div style={styles.answerSection}>
                <p><strong>Student Answer:</strong></p>
                {question?.type === 'image_upload' && typeof answer.answer_data === 'object' && answer.answer_data.name ? (
                  <div>
                    <p>📁 File: {answer.answer_data.name}</p>
                    <p>Size: {Math.round(answer.answer_data.size / 1024)} KB</p>
                    <p style={{ color: '#666', fontSize: '13px', marginTop: '10px' }}>
                      <em>Image uploaded by student. Click below to download or view the original file.</em>
                    </p>
                    {/* Placeholder for image - student would need to download to view */}
                    <div style={styles.imagePreview}>
                      <div style={styles.imagePlaceholder}>
                        🖼️ Image Upload
                      </div>
                    </div>
                  </div>
                ) : question?.type === 'text' ? (
                  <p style={styles.textAnswer}>{answer.answer_data || '(No answer provided)'}</p>
                ) : Array.isArray(answer.answer_data) ? (
                  <p>{answer.answer_data.join(', ')}</p>
                ) : (
                  <p>{answer.answer_data || '(No answer provided)'}</p>
                )}
              </div>

              {/* Evaluation form */}
              <div style={styles.evaluationSection}>
                <h4>Your Evaluation</h4>
                
                {/* Right/Wrong buttons */}
                <div style={styles.buttonGroup}>
                  <button
                    style={{
                      ...styles.button,
                      backgroundColor: evaluation?.is_correct === true ? '#28a745' : '#e0e0e0',
                      color: evaluation?.is_correct === true ? 'white' : '#333',
                    }}
                    onClick={() => {
                      // Auto-award full marks if correct
                      handleEvaluate(answer.id, { 
                        is_correct: true,
                        score_awarded: question?.max_score || 1
                      });
                    }}
                    disabled={saving}
                  >
                    ✓ Correct
                  </button>
                  <button
                    style={{
                      ...styles.button,
                      backgroundColor: evaluation?.is_correct === false ? '#dc3545' : '#e0e0e0',
                      color: evaluation?.is_correct === false ? 'white' : '#333',
                    }}
                    onClick={() => {
                      // Auto-award 0 marks if wrong
                      handleEvaluate(answer.id, { 
                        is_correct: false,
                        score_awarded: 0
                      });
                    }}
                    disabled={saving}
                  >
                    ✗ Wrong
                  </button>
                </div>

                {/* Comment input */}
                <div style={styles.formGroup}>
                  <label>Comment (max 100 characters):</label>
                  <textarea
                    rows={3}
                    maxLength={100}
                    defaultValue={evaluation?.comment || ''}
                    placeholder="Add feedback for this answer..."
                    onChange={(e) => {
                      const newComment = e.target.value;
                      if (newComment.length <= 100) {
                        handleEvaluate(answer.id, { comment: newComment });
                      }
                    }}
                    style={styles.textarea}
                  />
                  <small>{(evaluation?.comment || '').length}/100 characters</small>
                </div>

                {/* Score input - now optional, auto-set by Correct/Wrong buttons */}
                <div style={styles.formGroup}>
                  <label>Score Awarded (auto-set by buttons above):</label>
                  <input
                    type="number"
                    min="0"
                    max={question?.max_score || 1}
                    step="0.5"
                    value={evaluation?.score_awarded ?? ''}
                    placeholder={`Max: ${question?.max_score || 1}`}
                    onChange={(e) => {
                      const score = e.target.value ? parseFloat(e.target.value) : null;
                      if (score === null || (score >= 0 && score <= (question?.max_score || 1))) {
                        handleEvaluate(answer.id, { score_awarded: score });
                      }
                    }}
                    style={styles.input}
                  />
                  <small>Or manually enter score if needed</small>
                </div>

                {evaluation && (
                  <p style={styles.evalStatus}>✓ Evaluation saved</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button 
          onClick={handleSaveResults} 
          style={{...styles.saveButton, backgroundColor: '#28a745'}}
          disabled={saving}
        >
          Save Results & Close
        </button>
        <button onClick={() => navigate(-1)} style={styles.backButton}>Back to Attempts</button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  header: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  headerInfo: {
    marginTop: '15px',
    color: '#666',
  },
  headerInfo: {
    marginTop: '15px',
    color: '#666',
  },
  content: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  answerCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '20px',
    border: '1px solid #e0e0e0',
  },
  answerSection: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
  },
  evaluationSection: {
    marginTop: '20px',
    paddingTop: '15px',
    borderTop: '1px solid #e0e0e0',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px',
  },
  button: {
    flex: 1,
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.3s',
  },
  formGroup: {
    marginBottom: '15px',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    resize: 'vertical',
  },
  imagePreview: {
    marginTop: '15px',
    padding: '10px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  imagePlaceholder: {
    width: '100%',
    height: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    border: '2px dashed #ccc',
    borderRadius: '4px',
    fontSize: '48px',
    color: '#999',
    fontWeight: 'bold',
  },
  textAnswer: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: '1.6',
  },
  input: {
    width: '150px',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  evalStatus: {
    color: '#28a745',
    fontWeight: 'bold',
    marginTop: '10px',
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
  saveButton: {
    padding: '12px 24px',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  error: {
    color: '#dc3545',
    padding: '15px',
    backgroundColor: '#f8d7da',
    borderRadius: '4px',
  },
};
