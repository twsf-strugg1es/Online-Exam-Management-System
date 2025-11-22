import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';


function AdminEvaluatePage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [evaluationData, setEvaluationData] = useState({});
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    fetchAttemptDetails();
  }, [attemptId]);

  const fetchAttemptDetails = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.get(`/admin/exams/attempts/${attemptId}`);
      setAttempt(res.data.attempt);
      setAnswers(res.data.answers || []);
      
      // Initialize evaluation data with existing scores if any
      const initialData = {};
      (res.data.answers || []).forEach(answer => {
        initialData[answer.id] = {
          score: answer.score || 0,
          feedback: answer.feedback || '',
        };
      });
      setEvaluationData(initialData);
    } catch (err) {
      let msg = 'Failed to load attempt details';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          msg = err.response.data.detail;
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (answerId, score) => {
    setEvaluationData(prev => ({
      ...prev,
      [answerId]: {
        ...prev[answerId],
        score: parseInt(score) || 0,
      }
    }));
  };

  const handleFeedbackChange = (answerId, feedback) => {
    setEvaluationData(prev => ({
      ...prev,
      [answerId]: {
        ...prev[answerId],
        feedback: feedback,
      }
    }));
  };

  const handleSaveAndClose = async () => {
    setSaveMessage('');
    try {
      // Save all evaluations
      const updates = Object.keys(evaluationData).map(answerId => ({
        answer_id: answerId,
        score: evaluationData[answerId].score,
        feedback: evaluationData[answerId].feedback,
      }));

      await api.post(`/admin/exams/attempts/${attemptId}/evaluate`, {
        answers: updates
      });
      
      setSaveMessage('Evaluation saved successfully');
      setTimeout(() => {
        navigate('/admin-exams');
      }, 1500);
    } catch (err) {
      let msg = 'Failed to save evaluation';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          msg = err.response.data.detail;
        }
      }
      setSaveMessage(msg);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p>Loading evaluation details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <p style={{color: 'red'}}>{error}</p>
        <button onClick={() => navigate('/admin-exams')} style={styles.backButton}>Back to Exams</button>
      </div>
    );
  }

  return (
    <div style={styles.mainContainer}>
      <div style={styles.header}>
        <h1 style={{margin: '0'}}>Exam Evaluation</h1>
        <button onClick={() => navigate('/admin-exams')} style={styles.backHeaderButton}>Back</button>
      </div>

      <div style={styles.content}>
        <div style={styles.studentInfo}>
          <h2>{attempt?.student?.full_name || attempt?.student?.email}</h2>
          <p><strong>Email:</strong> {attempt?.student?.email}</p>
          <p><strong>Exam:</strong> {attempt?.exam?.title}</p>
          <p><strong>Submission Time:</strong> {attempt?.end_time ? new Date(attempt.end_time).toLocaleString() : '-'}</p>
        </div>

        {saveMessage && (
          <div style={{...styles.message, backgroundColor: saveMessage.includes('success') ? '#d4edda' : '#f8d7da'}}>
            {saveMessage}
          </div>
        )}

        <div style={styles.answersContainer}>
          <h3>Student Answers</h3>
          {answers.length === 0 ? (
            <p>No answers found</p>
          ) : (
            answers.map((answer, index) => (
              <div key={answer.id} style={styles.answerCard}>
                <div style={styles.questionHeader}>
                  <h4>Question {index + 1}: {answer.question?.title}</h4>
                  <span style={styles.questionType}>{answer.question?.type}</span>
                </div>

                <div style={styles.answerContent}>
                  <p><strong>Student Answer:</strong></p>
                  <div style={styles.studentAnswer}>
                    {answer.answer_text || (answer.uploaded_file && `🖼️ ${answer.uploaded_file}`)}
                  </div>
                </div>

                <div style={styles.correctAnswer}>
                  <p><strong>Correct Answer:</strong></p>
                  <div style={styles.correctAnswerText}>
                    {answer.question?.correct_answer}
                  </div>
                </div>

                <div style={styles.evaluationSection}>
                  <div style={styles.formGroup}>
                    <label>Score:</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={evaluationData[answer.id]?.score || 0}
                      onChange={(e) => handleScoreChange(answer.id, e.target.value)}
                      style={styles.scoreInput}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label>Feedback:</label>
                    <textarea
                      value={evaluationData[answer.id]?.feedback || ''}
                      onChange={(e) => handleFeedbackChange(answer.id, e.target.value)}
                      style={styles.feedbackInput}
                      placeholder="Enter feedback for this answer..."
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={styles.actionBar}>
          <button onClick={() => navigate('/admin-exams')} style={styles.cancelButton}>Cancel</button>
          <button onClick={handleSaveAndClose} style={styles.saveButton}>Save & Close</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  mainContainer: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  backHeaderButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  content: {
    flex: 1,
    padding: '40px',
    overflowY: 'auto',
  },
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  studentInfo: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  message: {
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px',
    color: '#155724',
  },
  answersContainer: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  answerCard: {
    borderLeft: '4px solid #007bff',
    padding: '20px',
    marginBottom: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
  },
  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  questionType: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
  },
  answerContent: {
    marginBottom: '15px',
  },
  studentAnswer: {
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    marginTop: '8px',
  },
  correctAnswer: {
    marginBottom: '15px',
  },
  correctAnswerText: {
    backgroundColor: '#e7f3ff',
    padding: '15px',
    borderRadius: '4px',
    border: '1px solid #b3d9ff',
    marginTop: '8px',
  },
  evaluationSection: {
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '4px',
    borderTop: '2px solid #ddd',
    marginTop: '15px',
  },
  formGroup: {
    marginBottom: '15px',
  },
  scoreInput: {
    width: '100%',
    padding: '10px',
    marginTop: '5px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  feedbackInput: {
    width: '100%',
    padding: '10px',
    marginTop: '5px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
    minHeight: '100px',
    fontFamily: 'Arial, sans-serif',
    resize: 'vertical',
  },
  actionBar: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  saveButton: {
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

export default AdminEvaluatePage;



