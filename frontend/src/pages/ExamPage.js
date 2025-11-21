import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

function ExamPage() {
  const { id, attemptId: resumeAttemptId } = useParams();
  const navigate = useNavigate();
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
    console.log('Back button clicked');
    setShowBackConfirmModal(true);
  };

  const handleConfirmBack = async () => {
    console.log('Confirm back clicked, submitting exam and navigating...');
    setShowBackConfirmModal(false);
    await handleSubmitExam();
    // Navigate back after submit is complete
    setTimeout(() => {
      navigate('/');
    }, 500);
  };

  // Handle browser back button
  useEffect(() => {
    // Push a new history state to intercept back button
    window.history.pushState(null, null, window.location.pathname);

    const handlePopState = (event) => {
      event.preventDefault();
      console.log('Browser back button clicked');
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
      if (examObj?.duration_minutes) {
        let remainingSeconds;
        
        if (resumeAttemptId) {
          // For resumed attempt, use the time_remaining_seconds calculated by backend
          // This accounts for time already elapsed since the attempt started
          remainingSeconds = examObj.time_remaining_seconds || 0;
          console.log('=== RESUMING EXAM ===');
          console.log('  Remaining seconds from backend:', remainingSeconds);
        } else {
          // For new attempt, use full duration
          remainingSeconds = examObj.duration_minutes * 60;
          console.log('=== NEW EXAM ===');
          console.log('  Duration minutes:', examObj.duration_minutes);
          console.log('  Duration seconds:', remainingSeconds);
        }
        
        setTimeRemaining(remainingSeconds);
        // Set examEndTime to current time + remaining for countdown
        setExamEndTime(new Date(Date.now() + remainingSeconds * 1000));
      } else {
        console.warn('duration_minutes not found in response:', examObj);
      }
      
      const qList = examObj?.questions || [];
      setQuestions(qList);

      // Initialize answers object
      const initialAnswers = {};
      qList.forEach((q) => {
        initialAnswers[q.id] = null;
      });
      
      // If resuming, fetch existing answers
      if (resumeAttemptId) {
        try {
          const answersResponse = await api.get(`/student/attempts/${resumeAttemptId}/answers`);
          const existingAnswers = {};
          answersResponse.data.forEach(answer => {
            existingAnswers[answer.question_id] = answer.answer_data;
          });
          setAnswers(existingAnswers);
        } catch (err) {
          console.error('Failed to fetch existing answers:', err);
        }
      } else {
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
        console.log('Time expired! Auto-submitting exam...');
        setSubmitting(true);
        api.post(`/student/attempts/${attemptId}/submit`)
          .then(async () => {
            setLoadingResults(true);
            const res = await api.get(`/student/attempts/${attemptId}/results`);
            setResults(res.data);
            setLoadingResults(false);
          })
          .catch(err => {
            console.error('Auto-submit failed:', err);
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
        await api.post(`/student/attempts/${attemptId}/save-answer`, {
          question_id: questionId,
          answer_data: answer,
        });
      } catch (err) {
        console.error('Failed to save answer:', err);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleImageUpload = async (questionId, file) => {
    // Store file metadata only (preview would be too large to store)
    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    };
    
    handleAnswerChange(questionId, fileData);
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
      console.log('Submitting exam with attemptId:', attemptId);
      const submitResponse = await api.post(`/student/attempts/${attemptId}/submit`);
      console.log('Submit response:', submitResponse.data);
      
      // Retry fetching results briefly in case of timing/commit delay
      setLoadingResults(true);
      const fetchWithRetry = async (retries = 3, delayMs = 350) => {
        for (let i = 0; i < retries; i++) {
          try {
            console.log(`Fetching results, attempt ${i + 1}/${retries}`);
            const res = await api.get(`/student/attempts/${attemptId}/results`);
            console.log('Results fetched:', res.data);
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
    // User-requested display: treat attempt.score as number of correct answers.
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
      return null; // text questions not auto-graded
    };

    const fmtAns = v => {
      if (Array.isArray(v)) return v.join(', ');
      if (typeof v === 'object' && v !== null) {
        // For file objects or file data objects
        if (v.name) return `File: ${v.name}`;
        return JSON.stringify(v);
      }
      return v ?? '';
    };

    return (
      <>
        <style>
          {`
            @keyframes fadeInDown {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideInUp {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }
          `}
        </style>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1>{examFull.title || 'Exam Results'}</h1>
            <h3 style={{ marginTop: 10, color: '#000000' }}>You got {correctCount} out of {autoGradedCount} auto-graded questions correct.</h3>
          </div>
          <div style={styles.content}>
            <h2 style={{ marginBottom: '20px', color: '#87ceeb' }}>Answer Key</h2>
            {(examFull.questions || []).map((q, idx) => {
              const studentAns = answerMap[q.id];
              const correctFlag = isCorrect(q, studentAns);
              const studentDisplay = fmtAns(studentAns) || '—';
              const correctDisplay = fmtAns(q.correct_answers) || (q.type === 'text' ? 'N/A (text question)' : '—');
              return (
                <div key={q.id} style={{ ...styles.questionCard, padding: '20px', animation: `slideInUp 0.5s ease ${idx * 0.1}s both` }}>
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
                  {correctFlag === null && <p style={{ color: '#6c757d', margin: '4px 0' }}>Not auto-graded</p>}
                </div>
              );
            })}
            <div style={{ textAlign: 'center', marginTop: 30 }}>
              <button 
                onClick={() => navigate('/')} 
                style={styles.button}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#b0e0e6';
                  e.target.style.transform = 'scale(1.02)';
                  e.target.style.boxShadow = '0 4px 12px rgba(135, 206, 235, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#87ceeb';
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <>
        <style>
          {`
            @keyframes fadeInDown {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideInUp {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }
          `}
        </style>
        <div style={styles.container}>
          <p>Loading...</p>
        </div>
      </>
    );
  }

  if (loadingResults) {
    return (
      <>
        <style>
          {`
            @keyframes fadeInDown {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideInUp {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }
          `}
        </style>
        <div style={styles.container}>
          <div style={styles.resultCard}>
            <h2>Submission complete</h2>
            <p>Preparing your results...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>
          {`
            @keyframes fadeInDown {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideInUp {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }
          `}
        </style>
        <div style={styles.container}>
          <p style={styles.error}>{error}</p>
          <button 
            onClick={() => navigate('/')} 
            style={styles.button}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#b0e0e6';
              e.target.style.transform = 'scale(1.02)';
              e.target.style.boxShadow = '0 4px 12px rgba(135, 206, 235, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#87ceeb';
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </>
    );
  }

  // If results are available, render results page
  if (results) {
    return renderResults();
  }

  const currentQuestion = questions && questions.length > 0 ? questions[currentQuestionIndex] : undefined;

  if (!currentQuestion) {
    return (
      <>
        <style>
          {`
            @keyframes fadeInDown {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideInUp {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }
          `}
        </style>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1>{exam?.title}</h1>
          </div>
          <div style={styles.content}>
            <p style={styles.error}>No questions available for this exam.</p>
            <button 
              onClick={() => navigate('/')} 
              style={styles.button}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#b0e0e6';
                e.target.style.transform = 'scale(1.02)';
                e.target.style.boxShadow = '0 4px 12px rgba(135, 206, 235, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#87ceeb';
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>
        {`
          @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}
      </style>
      <div style={styles.container}>
      <div style={styles.header}>
        <h1>{exam?.title}</h1>
        <div style={styles.headerRight}>
          <div style={styles.progress}>
            Question {currentQuestionIndex + 1} of {questions.length}
            {saving && <span style={styles.saving}> (Saving...)</span>}
          </div>
          {timeRemaining !== null && (
            <div style={{...styles.timer, ...(timeRemaining < 60 ? styles.timerWarning : {})}}>
              {(() => {
                const hours = Math.floor(timeRemaining / 3600);
                const mins = Math.floor((timeRemaining % 3600) / 60);
                const secs = timeRemaining % 60;
                if (hours > 0) {
                  return `⏱️ Time: ${hours}h ${mins}m ${secs}s`;
                } else {
                  return `⏱️ Time: ${mins}:${String(secs).padStart(2, '0')}`;
                }
              })()}
            </div>
          )}
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.questionCard}>
          <div style={{ marginBottom: '20px', fontSize: '12px', fontWeight: '500', color: '#87ceeb', letterSpacing: '1px', textTransform: 'uppercase' }}>MULTIPLE CHOICE</div>
          <h3 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px', color: '#000000', lineHeight: '1.4' }}>Question {currentQuestionIndex + 1}</h3>
          <p style={styles.questionText}>{currentQuestion.title}</p>

          <div style={styles.optionsContainer}>
            {currentQuestion.type === 'single_choice' && Array.isArray(currentQuestion.options) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                {currentQuestion.options.map((option, index) => {
                  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                  const isSelected = answers[currentQuestion.id] === option;
                  const bgColor = isSelected ? 'rgba(135, 206, 235, 0.15)' : 'rgba(255, 255, 255, 0.9)';
                  const borderColor = isSelected ? '#87ceeb' : 'rgba(0, 0, 0, 0.1)';
                  
                  return (
                    <label 
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '16px',
                        backgroundColor: bgColor,
                        border: `2px solid ${borderColor}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        fontFamily: 'Roboto, sans-serif',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.2)';
                        e.currentTarget.style.borderColor = '#87ceeb';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 206, 235, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = bgColor;
                        e.currentTarget.style.borderColor = borderColor;
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={option}
                        checked={isSelected}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        style={{ display: 'none' }}
                      />
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '6px',
                        backgroundColor: isSelected ? '#87ceeb' : '#000000',
                        color: isSelected ? '#000000' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        flexShrink: 0,
                        transition: 'all 0.3s ease',
                        fontFamily: 'Roboto, sans-serif',
                      }}>
                        {letters[index]}
                      </div>
                      <span style={{ color: '#000000', fontWeight: '500', fontSize: '14px', fontFamily: 'Roboto, sans-serif' }}>{option}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'multi_choice' && Array.isArray(currentQuestion.options) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                {currentQuestion.options.map((option, index) => {
                  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                  const isSelected = Array.isArray(answers[currentQuestion.id]) && answers[currentQuestion.id].includes(option);
                  const bgColor = isSelected ? 'rgba(135, 206, 235, 0.15)' : 'rgba(255, 255, 255, 0.9)';
                  const borderColor = isSelected ? '#87ceeb' : 'rgba(0, 0, 0, 0.1)';
                  
                  return (
                    <label 
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '16px',
                        backgroundColor: bgColor,
                        border: `2px solid ${borderColor}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        fontFamily: 'Roboto, sans-serif',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.2)';
                        e.currentTarget.style.borderColor = '#87ceeb';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 206, 235, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = bgColor;
                        e.currentTarget.style.borderColor = borderColor;
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <input
                        type="checkbox"
                        value={option}
                        checked={isSelected}
                        onChange={(e) => {
                          const currentAnswers = Array.isArray(answers[currentQuestion.id])
                            ? answers[currentQuestion.id]
                            : [];
                          const newAnswers = e.target.checked
                            ? [...currentAnswers, option]
                            : currentAnswers.filter((a) => a !== option);
                          handleAnswerChange(currentQuestion.id, newAnswers);
                        }}
                        style={{ display: 'none' }}
                      />
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '6px',
                        backgroundColor: isSelected ? '#87ceeb' : '#000000',
                        color: isSelected ? '#000000' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        flexShrink: 0,
                        transition: 'all 0.3s ease',
                        fontFamily: 'Roboto, sans-serif',
                      }}>
                        {letters[index]}
                      </div>
                      <span style={{ color: '#000000', fontWeight: '500', fontSize: '14px', fontFamily: 'Roboto, sans-serif' }}>{option}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'text' && (
              <div>
                <textarea
                  rows={4}
                  style={{ width: '100%', padding: '10px', fontSize: '16px' }}
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder="Type your answer here..."
                />
              </div>
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
                {answers[currentQuestion.id] && typeof answers[currentQuestion.id] === 'object' && (
                  <div>
                    <p>Uploaded file: {answers[currentQuestion.id].name}</p>
                    <p>Size: {Math.round(answers[currentQuestion.id].size / 1024)} KB</p>
                  </div>
                )}
                <p style={{ fontSize: '14px', color: '#666' }}>
                  Please upload an image file (JPG, PNG, etc.)
                </p>
              </div>
            )}
          </div>
        </div>

        <div style={styles.navigation}>
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            style={{
              ...styles.navButton,
              ...(currentQuestionIndex === 0 ? styles.disabledButton : {}),
            }}
            onMouseEnter={(e) => !currentQuestionIndex === 0 && (e.target.style.transform = 'scale(1.02)') && (e.target.style.boxShadow = '0 4px 12px rgba(135, 206, 235, 0.4)')}
            onMouseLeave={(e) => (e.target.style.transform = 'scale(1)') && (e.target.style.boxShadow = 'none')}
          >
            Previous
          </button>
          
          {currentQuestionIndex < questions.length - 1 ? (
            <button 
              onClick={handleNext} 
              style={styles.navButton}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.02)';
                e.target.style.boxShadow = '0 4px 12px rgba(135, 206, 235, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Next
            </button>
          ) : (
            <button 
              onClick={() => setShowSubmitModal(true)}
              style={{
                ...styles.submitButton,
                ...(submitting ? styles.disabledSubmitButton : {}),
              }}
              disabled={submitting}
              onMouseEnter={(e) => !submitting && (e.target.style.backgroundColor = '#333333') && (e.target.style.color = '#87ceeb') && (e.target.style.boxShadow = '0 4px 12px rgba(135, 206, 235, 0.4)')}
              onMouseLeave={(e) => !submitting && (e.target.style.backgroundColor = '#000000') && (e.target.style.color = '#87ceeb') && (e.target.style.boxShadow = 'none')}
            >
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          )}
        </div>
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
          animation: 'fadeIn 0.3s ease',
          fontFamily: 'Roboto, sans-serif',
        }}>
          <div style={{
            backgroundColor: '#87ceeb',
            borderRadius: '12px',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.3)',
            padding: '40px',
            maxWidth: '450px',
            width: '90%',
            animation: 'slideInUp 0.4s ease',
            fontFamily: 'Roboto, sans-serif',
          }}>
            <h2 style={{
              color: '#000000',
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '16px',
              marginTop: 0,
              fontFamily: 'Roboto, sans-serif',
            }}>Submit Exam</h2>
            <p style={{
              color: '#000000',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '30px',
              fontFamily: 'Roboto, sans-serif',
            }}>Are you sure you want to submit the exam? This action cannot be undone.</p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setShowSubmitModal(false)}
                style={{
                  padding: '10px 24px',
                  backgroundColor: 'transparent',
                  color: '#000000',
                  border: '2px solid #000000',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  fontFamily: 'Roboto, sans-serif',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#000000';
                  e.target.style.color = '#87ceeb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#000000';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitExam}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#000000',
                  color: '#87ceeb',
                  border: '2px solid #000000',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  fontFamily: 'Roboto, sans-serif',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#333333';
                  e.target.style.borderColor = '#333333';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#000000';
                  e.target.style.borderColor = '#000000';
                }}
              >
                Submit
              </button>
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
          animation: 'fadeIn 0.3s ease',
          fontFamily: 'Roboto, sans-serif',
        }}>
          <div style={{
            backgroundColor: '#87ceeb',
            borderRadius: '12px',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.3)',
            padding: '40px',
            maxWidth: '450px',
            width: '90%',
            animation: 'slideInUp 0.4s ease',
            fontFamily: 'Roboto, sans-serif',
          }}>
            <h2 style={{
              color: '#000000',
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '16px',
              marginTop: 0,
              fontFamily: 'Roboto, sans-serif',
            }}>Leave Exam?</h2>
            <p style={{
              color: '#000000',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '30px',
              fontFamily: 'Roboto, sans-serif',
            }}>Are you sure you want to leave? Your exam will be submitted and your answers will be saved.</p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setShowBackConfirmModal(false)}
                style={{
                  padding: '10px 24px',
                  backgroundColor: 'transparent',
                  color: '#000000',
                  border: '2px solid #000000',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  fontFamily: 'Roboto, sans-serif',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#000000';
                  e.target.style.color = '#87ceeb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#000000';
                }}
              >
                No, Continue
              </button>
              <button
                onClick={handleConfirmBack}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#000000',
                  color: '#87ceeb',
                  border: '2px solid #000000',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  fontFamily: 'Roboto, sans-serif',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#333333';
                  e.target.style.borderColor = '#333333';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#000000';
                  e.target.style.borderColor = '#000000';
                }}
              >
                Yes, Submit & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#000000',
    padding: '20px',
    fontFamily: 'Roboto, sans-serif',
  },
  header: {
    backgroundColor: '#87ceeb',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(135, 206, 235, 0.3)',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    animation: 'fadeInDown 0.6s ease',
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
  content: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  questionCard: {
    backgroundColor: '#87ceeb',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 8px 20px rgba(135, 206, 235, 0.2)',
    marginBottom: '20px',
    animation: 'slideInUp 0.5s ease',
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
  },
  radio: {
    marginRight: '10px',
    accentColor: '#000000',
  },
  checkbox: {
    marginRight: '10px',
    accentColor: '#000000',
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    animation: 'slideInUp 0.5s ease 0.2s both',
  },
  navButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#87ceeb',
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
    backgroundColor: '#666666',
    cursor: 'not-allowed',
    color: '#ffffff',
  },
  submitButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#000000',
    color: '#87ceeb',
    border: '2px solid #87ceeb',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    fontFamily: 'Roboto, sans-serif',
  },
  disabledSubmitButton: {
    backgroundColor: '#666666',
    cursor: 'not-allowed',
    color: '#ffffff',
    border: 'none',
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#87ceeb',
    color: '#000000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    fontFamily: 'Roboto, sans-serif',
  },
  resultCard: {
    backgroundColor: '#87ceeb',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 8px 20px rgba(135, 206, 235, 0.3)',
    textAlign: 'center',
    maxWidth: '500px',
    margin: '50px auto',
    animation: 'slideInUp 0.5s ease',
    fontFamily: 'Roboto, sans-serif',
  },
  score: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#000000',
    margin: '20px 0',
  },
  error: {
    color: '#ff6b6b',
    padding: '10px',
    backgroundColor: '#000000',
    borderRadius: '4px',
    marginBottom: '20px',
    border: '1px solid #ff6b6b',
    fontFamily: 'Roboto, sans-serif',
  },
  correct: {
    color: '#28a745',
  },
  incorrect: {
    color: '#dc3545',
  },
  neutral: {
    color: '#6c757d',
  },
  timer: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#000000',
    padding: '10px 15px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '4px',
    border: '2px solid #000000',
    animation: 'pulse 2s ease-in-out infinite',
    fontFamily: 'Roboto, sans-serif',
  },
  timerWarning: {
    color: '#dc3545',
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    borderColor: '#dc3545',
  },
};

export default ExamPage;
