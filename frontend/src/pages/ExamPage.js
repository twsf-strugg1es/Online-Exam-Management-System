import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import api from '../api';
import Button from '../components/Button';


function ExamPage() {
  const { id, attemptId: resumeAttemptId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [exam, setExam] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showBackConfirmModal, setShowBackConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [examEndTime, setExamEndTime] = useState(null);

  const handleBackClick = () => {
    setShowBackConfirmModal(true);
  };

  const handleConfirmBack = async () => {
    setShowBackConfirmModal(false);
    await handleSubmitExam();
    // Navigate back after submit is complete
    setTimeout(() => {
      navigate('/student-account');
    }, 500);
  };

  // Handle browser back button
  useEffect(() => {
    // Push a new history state to intercept back button
    window.history.pushState(null, null, window.location.pathname);

    const handlePopState = (event) => {
      event.preventDefault();
      setShowBackConfirmModal(true);
      // Push state again to prevent navigation
      window.history.pushState(null, null, window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  const startExam = useCallback(async () => {
    try {
      let response;

      if (resumeAttemptId) {
        // Resume an existing exam attempt
        response = await api.post(`/student/attempts/${resumeAttemptId}/resume`);
      } else {
        // Start a new exam attempt
        response = await api.post(`/student/exams/${id}/start`);
      }

      // Backend returns { exam: ExamForStudent, attempt: ExamAttempt }
      const examObj = response.data?.exam;
      const attemptObj = response.data?.attempt;

      setExam(examObj);
      setAttemptId(attemptObj?.id || null);

      // Set timer based on whether this is a new attempt or resuming
      if (examObj?.duration_minutes && attemptObj?.start_time) {
        // Calculate student's personal exam end time based on when they started + duration
        const attemptStartTime = new Date(attemptObj.start_time);
        const durationMs = examObj.duration_minutes * 60 * 1000;
        const studentExamEndTime = new Date(attemptStartTime.getTime() + durationMs);
        
        setExamEndTime(studentExamEndTime);
        
        // Calculate remaining seconds for initial display
        const now = new Date();
        const remaining = Math.floor((studentExamEndTime - now) / 1000);
        setTimeRemaining(Math.max(0, remaining));
      }

      const qList = examObj?.questions || [];
      setQuestions(qList);

      // Initialize answers object
      const initialAnswers = {};
      qList.forEach((q) => {
        initialAnswers[q.id] = null;
      });

      // Always try to fetch existing answers (both for new and resumed attempts)
      try {
        const answersResponse = await api.get(`/student/attempts/${attemptObj?.id}/answers`);
        const existingAnswers = {};
        answersResponse.data.forEach(answer => {
          existingAnswers[answer.question_id] = answer.answer_data;
        });
        setAnswers(existingAnswers);
      } catch (err) {
        // If no answers found, use empty/initial answers
        setAnswers(initialAnswers);
      }

      setLoading(false);
    } catch (err) {
      let errorMessage = 'Failed to start exam';
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        errorMessage = detail;
      } else if (Array.isArray(detail)) {
        errorMessage = detail[0]?.msg || errorMessage;
      } else if (detail && typeof detail === 'object') {
        errorMessage = detail.msg || detail.message || detail.error || errorMessage;
      } else if (err.response?.data?.message && typeof err.response.data.message === 'string') {
        errorMessage = err.response.data.message;
      }
      setError(errorMessage);
      setLoading(false);
    }
  }, [id, resumeAttemptId]);

  useEffect(() => {
    startExam();
  }, [startExam]);

  // Timer effect
  useEffect(() => {
    if (!examEndTime || results) return; // Don't run if exam is finished

    const timerInterval = setInterval(() => {
      const now = new Date();
      const remaining = Math.floor((examEndTime - now) / 1000);

      if (remaining <= 0) {
        // Time expired - auto-submit
        clearInterval(timerInterval);
        setSubmitting(true);
        api.post(`/student/attempts/${attemptId}/submit`)
          .then(async () => {
            setLoadingResults(true);
            const res = await api.get(`/student/attempts/${attemptId}/results`);
            setResults(res.data);
            setLoadingResults(false);
          })
          .catch(err => {
            setError('Exam time expired and auto-submission failed');
          })
          .finally(() => setSubmitting(false));
        return;
      }

      setTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [examEndTime, attemptId, results]);

  const handleAnswerChange = async (questionId, answer) => {
    // Update local state
    setAnswers({
      ...answers,
      [questionId]: answer,
    });

    // Auto-save answer
    if (attemptId) {
      setSaving(true);
      try {
        const response = await api.post(`/student/attempts/${attemptId}/save-answer`, {
          question_id: questionId,
          answer_data: answer,
        });
      } catch (err) {
        // Handle error silently
      } finally {
        setSaving(false);
      }
    }
  };

  const handleImageUpload = async (questionId, file) => {
    // Create a preview URL for the image
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        preview: e.target.result  // Base64 preview URL
      };
      handleAnswerChange(questionId, fileData);
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitExam = async () => {
    setShowSubmitModal(false);
    setSubmitting(true);
    try {
      const submitResponse = await api.post(`/student/attempts/${attemptId}/submit`);

      // Retry fetching results briefly in case of timing/commit delay
      setLoadingResults(true);
      const fetchWithRetry = async (retries = 3, delayMs = 350) => {
        for (let i = 0; i < retries; i++) {
          try {
            const res = await api.get(`/student/attempts/${attemptId}/results`);
            setResults(res.data);
            setLoadingResults(false);
            setSubmitting(false);
            return;
          } catch (e) {
            console.error(`Result fetch attempt ${i + 1} failed:`, e);
            const status = e?.response?.status;
            const retriable = status === 404 || status === 400; // not found or not submitted yet
            if (i === retries - 1 || !retriable) {
              let msg = 'Failed to fetch results';
              const detail = e?.response?.data?.detail;
              if (typeof detail === 'string') msg = detail;
              else if (Array.isArray(detail)) msg = detail[0]?.msg || msg;
              setError(msg);
              setLoadingResults(false);
              setSubmitting(false);
              return;
            }
            await new Promise((r) => setTimeout(r, delayMs));
          }
        }
      };
      await fetchWithRetry();
    } catch (err) {
      console.error('Submit exam error:', err);
      let errorMessage = 'Failed to submit exam';
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail[0]?.msg || 'Failed to submit exam';
        } else if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        }
      }
      setError(errorMessage);
      setSubmitting(false);
    }
  };

  // Helper to render results view
  const renderResults = () => {
    if (!results) return null;
    const attempt = results.attempt || {};
    const examFull = results.exam || {};
    const answersArr = attempt.answers || [];
    const answerMap = {};
    answersArr.forEach(a => { answerMap[a.question_id] = a.answer_data; });

    const correctCount = attempt.score || 0;
    const autoGradedCount = Array.isArray(examFull.questions)
      ? examFull.questions.filter(q => q.type === 'single_choice' || q.type === 'multi_choice').length
      : 0;

    const isCorrect = (q, studentAns) => {
      if (!q) return null;
      if (q.type === 'single_choice' || q.type === 'multi_choice') {
        const correct = q.correct_answers;
        if (correct == null) return null;
        const norm = v => Array.isArray(v) ? v.map(x => String(x)).sort() : [String(v)];
        const a = norm(correct);
        const b = norm(studentAns ?? []);
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) { if (a[i] !== b[i]) return false; }
        return true;
      }
      return null;
    };

    const fmtAns = v => {
      if (Array.isArray(v)) return v.join(', ');
      if (typeof v === 'object' && v !== null) {
        if (v.name) return `File: ${v.name}`;
        return JSON.stringify(v);
      }
      return v ?? '';
    };

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1>{examFull.title || 'Exam Results'}</h1>
          <h3 style={{ marginTop: 10, color: '#000000' }}>You got {correctCount} out of {autoGradedCount} auto-graded questions correct.</h3>
          <Button onClick={() => navigate('/student-account')} style={{ marginTop: '10px' }}>Back to Dashboard</Button>
        </div>
        <div style={styles.content}>
          <h2 style={{ marginBottom: '20px', color: '#0d6efd' }}>Answer Key</h2>
          {(examFull.questions || []).map((q, idx) => {
            const studentAns = answerMap[q.id];
            const correctFlag = isCorrect(q, studentAns);
            const studentDisplay = fmtAns(studentAns) || '—';
            const correctDisplay = fmtAns(q.correct_answers) || (q.type === 'text' ? 'N/A (text question)' : '—');
            return (
              <div key={q.id} style={{ ...styles.questionCard, padding: '20px' }}>
                <p style={{ fontWeight: 'bold', marginBottom: 8, color: '#000000' }}>Q{idx + 1}. {q.title}</p>
                <p style={{ margin: '4px 0', color: '#000000' }}>
                  <strong>Your answer:</strong>{' '}
                  <span style={correctFlag === true ? styles.correct : (correctFlag === false ? styles.incorrect : styles.neutral)}>
                    {studentDisplay}
                  </span>
                </p>
                <p style={{ margin: '4px 0', color: '#000000' }}>
                  <strong>Correct answer:</strong>{' '}
                  <span style={styles.correct}>{correctDisplay}</span>
                </p>
                {correctFlag === true && <p style={{ color: '#28a745', margin: '4px 0' }}>Correct</p>}
                {correctFlag === false && <p style={{ color: '#dc3545', margin: '4px 0' }}>Incorrect</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) return <div style={styles(theme).container}><p style={{ color: theme.primary }}>Loading...</p></div>;
  if (error) return <div style={styles(theme).container}><p style={styles(theme).error}>{error}</p><Button onClick={() => navigate('/student-account')}>Back to Dashboard</Button></div>;

  if (results) {
    return renderResults();
  }

  if (!exam) return <div style={styles(theme).container}><p style={{ color: theme.primary }}>Exam not found</p></div>;

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div style={styles(theme).container}>
      {/* Header */}
      <div style={styles(theme).header}>
        <div>
          <h1 style={{ margin: 0, color: theme.text, fontSize: '24px' }}>{exam.title}</h1>
          <Button
            onClick={handleBackClick}
            style={{
              marginTop: '10px',
              backgroundColor: 'transparent',
              color: theme.text,
              border: `1px solid ${theme.text}`,
              padding: '5px 10px',
              fontSize: '12px'
            }}
          >
            Back to Dashboard
          </Button>
        </div>
        <div style={styles(theme).headerRight}>
          {timeRemaining !== null && (
            <div style={{ ...styles(theme).timer, ...(timeRemaining < 60 ? styles(theme).timerWarning : {}) }}>
              Time Remaining: {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
            </div>
          )}
          <div style={styles(theme).progress}>Question {currentQuestionIndex + 1} of {questions.length}</div>
          {saving && <div style={styles(theme).saving}>Saving...</div>}
        </div>
      </div>

      {/* Question Card */}
      <div style={styles(theme).content}>
        {currentQuestion && (
          <div style={styles(theme).questionCard}>
            <h2 style={styles(theme).questionText}>Q{currentQuestionIndex + 1}. {currentQuestion.title}</h2>

            <div style={styles(theme).optionsContainer}>
              {currentQuestion.type === 'single_choice' && currentQuestion.options && (
                currentQuestion.options.map((opt, idx) => (
                  <label key={idx} style={styles(theme).optionLabel}>
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={opt}
                      checked={answers[currentQuestion.id] === opt}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      style={styles(theme).radio}
                    />
                    {opt}
                  </label>
                ))
              )}

              {currentQuestion.type === 'multi_choice' && currentQuestion.options && (
                currentQuestion.options.map((opt, idx) => {
                  const currentAns = answers[currentQuestion.id] || [];
                  return (
                    <label key={idx} style={styles(theme).optionLabel}>
                      <input
                        type="checkbox"
                        value={opt}
                        checked={currentAns.includes(opt)}
                        onChange={(e) => {
                          const val = e.target.value;
                          let newAns = [...currentAns];
                          if (e.target.checked) {
                            newAns.push(val);
                          } else {
                            newAns = newAns.filter(a => a !== val);
                          }
                          handleAnswerChange(currentQuestion.id, newAns);
                        }}
                        style={styles(theme).checkbox}
                      />
                      {opt}
                    </label>
                  );
                })
              )}

              {currentQuestion.type === 'text' && (
                <textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  rows={5}
                  style={{ ...styles(theme).textarea, width: '100%', padding: '10px', borderRadius: '4px' }}
                  placeholder="Type your answer here..."
                />
              )}

              {currentQuestion.type === 'image_upload' && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageUpload(currentQuestion.id, e.target.files[0]);
                      }
                    }}
                    style={{ marginBottom: '10px' }}
                  />
                  {answers[currentQuestion.id] && (
                    <div style={{ marginTop: '15px' }}>
                      <p style={{ fontSize: '14px', color: theme.secondary, marginBottom: '10px' }}>
                        <strong>Selected File:</strong> {answers[currentQuestion.id].name}
                      </p>
                      <p style={{ fontSize: '12px', color: theme.secondary, marginBottom: '10px' }}>
                        Size: {(answers[currentQuestion.id].size / 1024).toFixed(2)} KB
                      </p>
                      {answers[currentQuestion.id].preview && (
                        <div style={{
                          marginTop: '10px',
                          padding: '10px',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '4px',
                          backgroundColor: theme.inputBg,
                          maxWidth: '300px'
                        }}>
                          <p style={{ fontSize: '12px', color: theme.secondary, marginBottom: '8px' }}>Preview:</p>
                          <img
                            src={answers[currentQuestion.id].preview}
                            alt="preview"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '250px',
                              borderRadius: '4px'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={styles(theme).navigation}>
          <Button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            style={currentQuestionIndex === 0 ? styles(theme).disabledButton : styles(theme).navButton}
          >
            Previous
          </Button>

          {currentQuestionIndex < questions.length - 1 ? (
            <Button onClick={handleNext} style={styles(theme).navButton}>Next</Button>
          ) : (
            <Button onClick={() => setShowSubmitModal(true)} style={styles(theme).submitButton}>Submit Exam</Button>
          )}
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: theme.background,
            color: theme.text,
            borderRadius: '12px',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.3)',
            padding: '40px',
            maxWidth: '450px',
            width: '90%',
            border: `2px solid ${theme.primary}`
          }}>
            <h2 style={{ marginTop: 0, color: theme.primary }}>Submit Exam</h2>
            <p style={{ color: theme.text, marginBottom: '30px' }}>Are you sure you want to submit the exam? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => setShowSubmitModal(false)}
                style={{ backgroundColor: 'transparent', border: `2px solid ${theme.primary}`, color: theme.primary }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitExam} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Back Confirmation Modal */}
      {showBackConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: theme.background,
            color: theme.text,
            borderRadius: '12px',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.3)',
            padding: '40px',
            maxWidth: '450px',
            width: '90%',
            border: `2px solid ${theme.primary}`
          }}>
            <h2 style={{ marginTop: 0, color: theme.primary }}>Leave Exam?</h2>
            <p style={{ color: theme.text, marginBottom: '30px' }}>Are you sure you want to leave? Your exam will be submitted and your answers will be saved.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => setShowBackConfirmModal(false)}
                style={{ backgroundColor: 'transparent', border: `2px solid ${theme.primary}`, color: theme.primary }}
              >
                No, Continue
              </Button>
              <Button onClick={handleConfirmBack} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Yes, Submit & Leave'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = (theme) => ({
  container: {
    minHeight: '100vh',
    backgroundColor: theme.background,
    padding: '20px',
    fontFamily: 'Roboto, sans-serif',
  },
  header: {
    backgroundColor: theme.primary,
    padding: '20px',
    borderRadius: '8px',
    boxShadow: `0 4px 12px ${theme.primary}40`,
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '10px',
  },
  progress: {
    marginTop: '10px',
    color: '#000000',
    fontWeight: '500',
    fontSize: '14px',
  },
  saving: {
    color: '#000000',
    fontStyle: 'italic',
  },
  timer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '10px 15px',
    borderRadius: '4px',
    color: '#000000',
    fontWeight: '600',
    fontSize: '14px',
  },
  timerWarning: {
    backgroundColor: '#ff6b6b',
    color: '#ffffff',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  questionCard: {
    backgroundColor: theme.primary,
    padding: '30px',
    borderRadius: '8px',
    boxShadow: `0 8px 20px ${theme.primary}30`,
    marginBottom: '20px',
    transition: 'all 0.3s ease',
    fontFamily: 'Roboto, sans-serif',
  },
  questionText: {
    fontSize: '18px',
    marginBottom: '20px',
    lineHeight: '1.6',
    color: '#000000',
    fontWeight: '500',
    fontFamily: 'Roboto, sans-serif',
  },
  optionsContainer: {
    marginTop: '20px',
  },
  optionLabel: {
    display: 'block',
    padding: '12px',
    marginBottom: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '2px solid transparent',
    fontFamily: 'Roboto, sans-serif',
    color: '#000000',
  },
  radio: {
    marginRight: '10px',
    accentColor: '#000000',
  },
  checkbox: {
    marginRight: '10px',
    accentColor: '#000000',
  },
  textarea: {
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.inputBg,
    color: theme.inputText,
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
  },
  navButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: theme.primary,
    color: '#000000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    fontFamily: 'Roboto, sans-serif',
  },
  disabledButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: theme.secondary,
    cursor: 'not-allowed',
    color: theme.background,
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: 'bold',
    fontFamily: 'Roboto, sans-serif',
  },
  submitButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    fontFamily: 'Roboto, sans-serif',
  },
  error: {
    color: theme.danger,
    fontSize: '16px',
  },
});

export default ExamPage;



