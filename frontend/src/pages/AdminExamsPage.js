import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmModal from '../components/ConfirmModal';
import api from '../api';
import Button from '../components/Button';


function AdminExamsPage() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('create');
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [examsError, setExamsError] = useState('');
  const [examMessage, setExamMessage] = useState('');
  const [questions, setQuestions] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteExamId, setDeleteExamId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [examForm, setExamForm] = useState({
    title: '',
    start_time: '',
    end_time: '',
    duration_minutes: '',
    target_candidates: '',
  });
  const [selectedExamForEvaluation, setSelectedExamForEvaluation] = useState(null);
  const [examAttempts, setExamAttempts] = useState([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptsError, setAttemptsError] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [filteredAttempts, setFilteredAttempts] = useState([]);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);

  // Filter attempts based on search
  useEffect(() => {
    let filtered = examAttempts;
    if (studentSearchQuery.trim()) {
      filtered = filtered.filter(a =>
        (a.student?.email && a.student.email.toLowerCase().includes(studentSearchQuery.toLowerCase())) ||
        (a.student?.full_name && a.student.full_name.toLowerCase().includes(studentSearchQuery.toLowerCase()))
      );
    }
    setFilteredAttempts(filtered);
  }, [examAttempts, studentSearchQuery]);

  // Fetch exams and questions on mount
  useEffect(() => {
    fetchExams();
    fetchQuestions();
  }, []);

  const fetchExams = async () => {
    setExamsError('');
    setExamsLoading(true);
    try {
      const res = await api.get('/admin/exams/');
      setExams(res.data);
    } catch (err) {
      let msg = 'Failed to load exams';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          msg = err.response.data.detail;
        }
      }
      setExamsError(msg);
    } finally {
      setExamsLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await api.get('/admin/questions/');
      setQuestions(res.data || []);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    }
  };

  const fetchExamAttempts = async (examId) => {
    setAttemptsError('');
    setAttemptsLoading(true);
    try {
      const res = await api.get(`/admin/exams/${examId}/attempts`);
      setExamAttempts(res.data || []);
    } catch (err) {
      let msg = 'Failed to load exam attempts';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          msg = err.response.data.detail;
        }
      }
      setAttemptsError(msg);
    } finally {
      setAttemptsLoading(false);
    }
  };

  const handleEvaluateClick = (attemptId) => {
    navigate(`/admin-evaluate-answers/${attemptId}`);
  };

  const handleExamInputChange = (e) => {
    const { name, value } = e.target;
    setExamForm(prev => ({ ...prev, [name]: value }));
  };

  const handleQuestionToggle = (questionId) => {
    setSelectedQuestionIds(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleCreateExam = async () => {
    if (!examForm.title || !examForm.start_time || !examForm.end_time || !examForm.duration_minutes || !examForm.target_candidates) {
      setExamMessage('Please fill in all required fields');
      return;
    }

    if (selectedQuestionIds.length === 0) {
      setExamMessage('Please select at least one question');
      return;
    }

    try {
      await api.post('/admin/exams/', {
        ...examForm,
        duration_minutes: parseInt(examForm.duration_minutes),
        question_ids: selectedQuestionIds,
      });
      setExamMessage('Exam created successfully');
      setExamForm({
        title: '',
        start_time: '',
        end_time: '',
        duration_minutes: '',
        target_candidates: '',
      });
      setSelectedQuestionIds([]);
      fetchExams();
    } catch (err) {
      let msg = 'Failed to create exam';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          msg = err.response.data.detail;
        }
      }
      setExamMessage(msg);
    }
  };

  const handlePublish = async (examId) => {
    setExamMessage('');
    try {
      await api.post(`/admin/exams/${examId}/publish`);
      setExamMessage('Exam published successfully');
      await fetchExams();
    } catch (err) {
      let msg = 'Failed to publish exam';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          msg = err.response.data.detail;
        }
      }
      setExamMessage(msg);
    }
  };

  const handleUnpublish = async (examId) => {
    setExamMessage('');
    try {
      await api.post(`/admin/exams/${examId}/unpublish`);
      setExamMessage('Exam unpublished successfully');
      await fetchExams();
    } catch (err) {
      let msg = 'Failed to unpublish exam';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          msg = err.response.data.detail;
        }
      }
      setExamMessage(msg);
    }
  };

  const handleDeleteExam = async (examId) => {
    setShowDeleteModal(true);
    setDeleteExamId(examId);
  };

  const confirmDeleteExam = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/exams/${deleteExamId}`);
      setExamMessage('Exam deleted successfully');
      setShowDeleteModal(false);
      setDeleteExamId(null);
      await fetchExams();
    } catch (err) {
      let msg = 'Failed to delete exam';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          msg = err.response.data.detail;
        }
      }
      setExamMessage(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.background, fontFamily: 'Roboto, sans-serif' }}>
      {/* Sidebar */}
      <AdminSidebar user={user} onLogout={logout} />

      {/* Main Content */}
      <div style={{ marginLeft: '70px', flex: 1, padding: '30px', overflow: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '30px' }}>
            <h1 style={{ margin: '0 0 24px 0', color: '#0d6efd', fontSize: '28px', fontWeight: 'bold', fontFamily: 'Roboto, sans-serif' }}>Exams Management</h1>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
            <button
              onClick={() => setActiveTab('create')}
              style={{
                padding: '12px 24px',
                backgroundColor: activeTab === 'create' ? '#0d6efd' : 'transparent',
                color: activeTab === 'create' ? '#000000' : '#0d6efd',
                border: `2px solid #0d6efd`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontFamily: 'Roboto, sans-serif',
              }}
            >
              Create Exam
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              style={{
                padding: '12px 24px',
                backgroundColor: activeTab === 'manage' ? '#0d6efd' : 'transparent',
                color: activeTab === 'manage' ? '#000000' : '#0d6efd',
                border: `2px solid #0d6efd`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontFamily: 'Roboto, sans-serif',
              }}
            >
              Manage Exams
            </button>
            <button
              onClick={() => setActiveTab('evaluation')}
              style={{
                padding: '12px 24px',
                backgroundColor: activeTab === 'evaluation' ? '#0d6efd' : 'transparent',
                color: activeTab === 'evaluation' ? '#000000' : '#0d6efd',
                border: `2px solid #0d6efd`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontFamily: 'Roboto, sans-serif',
              }}
            >
              Exam Evaluation
            </button>
          </div>

          {activeTab === 'create' && (
            <div style={{ backgroundColor: 'rgba(135, 206, 235, 0.05)', border: '2px solid #0d6efd', borderRadius: '8px', padding: '30px' }}>
              <h2 style={{ margin: '0 0 20px 0', color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>Create Exam</h2>
              {examMessage && (
                <div style={{
                  marginBottom: '20px',
                  padding: '15px',
                  backgroundColor: examMessage.includes('success') ? 'rgba(132, 204, 22, 0.1)' : 'rgba(220, 53, 69, 0.1)',
                  borderLeft: `4px solid ${examMessage.includes('success') ? '#84cc16' : '#dc3545'}`,
                  color: examMessage.includes('success') ? '#84cc16' : '#ff6b6b',
                  borderRadius: '4px',
                  fontFamily: 'Roboto, sans-serif',
                }}>
                  {examMessage}
                </div>
              )}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#0d6efd' }}>Exam Title:</label>
                <input
                  type="text"
                  name="title"
                  value={examForm.title}
                  onChange={handleExamInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #0d6efd',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(135, 206, 235, 0.1)',
                    color: '#0d6efd',
                    fontFamily: 'Roboto, sans-serif',
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#0d6efd' }}>Start Time:</label>
                <input
                  type="datetime-local"
                  name="start_time"
                  value={examForm.start_time}
                  onChange={handleExamInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #0d6efd',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(135, 206, 235, 0.1)',
                    color: '#0d6efd',
                    fontFamily: 'Roboto, sans-serif',
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#0d6efd' }}>End Time:</label>
                <input
                  type="datetime-local"
                  name="end_time"
                  value={examForm.end_time}
                  onChange={handleExamInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #0d6efd',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(135, 206, 235, 0.1)',
                    color: '#0d6efd',
                    fontFamily: 'Roboto, sans-serif',
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#0d6efd' }}>Duration (minutes):</label>
                <input
                  type="number"
                  name="duration_minutes"
                  value={examForm.duration_minutes}
                  onChange={handleExamInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #0d6efd',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(135, 206, 235, 0.1)',
                    color: '#0d6efd',
                    fontFamily: 'Roboto, sans-serif',
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#0d6efd' }}>Target Candidates (Required):</label>
                <select
                  name="target_candidates"
                  value={examForm.target_candidates}
                  onChange={handleExamInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #0d6efd',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(135, 206, 235, 0.1)',
                    color: '#0d6efd',
                    fontFamily: 'Roboto, sans-serif',
                  }}
                >
                  <option value="">-- Select Target Candidates --</option>
                  <option value="SSC">SSC</option>
                  <option value="HSC">HSC</option>
                  <option value="Admission">Admission</option>
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#0d6efd' }}>Select Questions:</label>
                <div style={{
                  border: '1px solid #0d6efd',
                  padding: '15px',
                  borderRadius: '4px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  backgroundColor: 'rgba(135, 206, 235, 0.05)',
                }}>
                  {questions.length === 0 ? (
                    <p style={{ color: '#0d6efd' }}>No questions available</p>
                  ) : (
                    questions.map(q => (
                      <div key={q.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        <input
                          type="checkbox"
                          checked={selectedQuestionIds.includes(q.id)}
                          onChange={() => handleQuestionToggle(q.id)}
                        />
                        <label style={{ marginLeft: '8px', color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>{q.title} ({q.type})</label>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <Button onClick={handleCreateExam} style={{ marginTop: '20px' }}>Create Exam</Button>
            </div>
          )}

          {activeTab === 'evaluation' && (
            <div style={{ backgroundColor: 'rgba(135, 206, 235, 0.05)', border: '2px solid #0d6efd', borderRadius: '8px', padding: '30px' }}>
              <h2 style={{ margin: '0 0 20px 0', color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>Exam Evaluation</h2>
              {examMessage && (
                <div style={{
                  marginBottom: '20px',
                  padding: '15px',
                  backgroundColor: examMessage.includes('success') ? 'rgba(132, 204, 22, 0.1)' : 'rgba(220, 53, 69, 0.1)',
                  borderLeft: `4px solid ${examMessage.includes('success') ? '#84cc16' : '#dc3545'}`,
                  color: examMessage.includes('success') ? '#84cc16' : '#ff6b6b',
                  borderRadius: '4px',
                  fontFamily: 'Roboto, sans-serif',
                }}>
                  {examMessage}
                </div>
              )}

              {!selectedExamForEvaluation ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                  gap: '20px',
                  marginTop: '20px',
                }}>
                  {exams.length === 0 ? (
                    <p style={{ color: '#0d6efd' }}>No exams available</p>
                  ) : (
                    exams.map(exam => (
                      <div
                        key={exam.id}
                        onClick={() => {
                          setSelectedExamForEvaluation(exam);
                          fetchExamAttempts(exam.id);
                        }}
                        style={{
                          backgroundColor: 'rgba(135, 206, 235, 0.1)',
                          border: '1px solid #0d6efd',
                          padding: '20px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <h3 style={{ color: '#0d6efd', margin: '0 0 10px 0' }}>{exam.title}</h3>
                        <p style={{ color: '#0d6efd', margin: '5px 0' }}><strong>Questions:</strong> {exam.question_count || 0}</p>
                        <p style={{ color: '#0d6efd', fontSize: '12px', margin: '5px 0' }}>Click to view student attempts</p>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div>
                  <Button onClick={() => setSelectedExamForEvaluation(null)} style={{
                    marginBottom: '20px',
                    fontSize: '14px',
                    padding: '10px 20px'
                  }}>← Back to Exams</Button>
                  <h3 style={{ color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>{selectedExamForEvaluation.title} - Student Attempts</h3>

                  <div style={{ marginBottom: '20px', marginTop: '20px' }}>
                    <input
                      type="text"
                      placeholder="Search students by email or name"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #0d6efd',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(135, 206, 235, 0.1)',
                        color: '#0d6efd',
                        fontFamily: 'Roboto, sans-serif',
                      }}
                    />
                  </div>

                  {attemptsLoading ? (
                    <p style={{ color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>Loading attempts...</p>
                  ) : attemptsError ? (
                    <p style={{ color: '#ff6b6b', fontFamily: 'Roboto, sans-serif' }}>{attemptsError}</p>
                  ) : filteredAttempts.length === 0 ? (
                    <p style={{ color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>No student attempts found</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#0d6efd', color: '#000000' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Student Email</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Student Name</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Submission Time</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Evaluated</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAttempts.map(attempt => {
                            return (
                              <tr key={attempt.id} style={{ borderBottom: '1px solid #0d6efd' }}>
                                <td style={{ padding: '12px', color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>{attempt.student?.email || attempt.student_email || '-'}</td>
                                <td style={{ padding: '12px', color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>{attempt.student?.full_name || attempt.student_name || '-'}</td>
                                <td style={{ padding: '12px', color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>{attempt.end_time ? new Date(attempt.end_time).toLocaleString() : '-'}</td>
                                <td style={{ padding: '12px' }}>
                                  <div style={{
                                    width: '20px',
                                    height: '20px',
                                    backgroundColor: attempt.score !== null ? '#84cc16' : '#fbbf24'
                                  }}></div>
                                </td>
                                <td style={{ padding: '12px' }}>
                                  <Button onClick={() => handleEvaluateClick(attempt.id)} style={{
                                    padding: '8px 16px',
                                    fontSize: '12px',
                                  }}>Evaluate</Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'manage' && (
            <div style={{ backgroundColor: 'rgba(135, 206, 235, 0.05)', border: '2px solid #0d6efd', borderRadius: '8px', padding: '30px' }}>
              <h2 style={{ margin: '0 0 20px 0', color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>Manage Exams</h2>
              {examMessage && (
                <div style={{
                  marginBottom: '20px',
                  padding: '15px',
                  backgroundColor: examMessage.includes('success') ? 'rgba(132, 204, 22, 0.1)' : 'rgba(220, 53, 69, 0.1)',
                  borderLeft: `4px solid ${examMessage.includes('success') ? '#84cc16' : '#dc3545'}`,
                  color: examMessage.includes('success') ? '#84cc16' : '#ff6b6b',
                  borderRadius: '4px',
                  fontFamily: 'Roboto, sans-serif',
                }}>
                  {examMessage}
                </div>
              )}
              {examsLoading ? (
                <p style={{ color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>Loading exams...</p>
              ) : examsError ? (
                <p style={{ color: '#ff6b6b', fontFamily: 'Roboto, sans-serif' }}>{examsError}</p>
              ) : exams.length === 0 ? (
                <p style={{ color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>No exams available</p>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                  gap: '20px',
                  marginTop: '20px',
                }}>
                  {exams.map(exam => (
                    <div key={exam.id} style={{
                      backgroundColor: 'rgba(135, 206, 235, 0.1)',
                      border: '1px solid #0d6efd',
                      padding: '20px',
                      borderRadius: '8px',
                    }}>
                      <h3 style={{ color: '#0d6efd', margin: '0 0 10px 0' }}>{exam.title}</h3>
                      <p style={{ color: '#0d6efd', margin: '5px 0' }}><strong>Status:</strong> {exam.is_published ? 'Published' : 'Draft'}</p>
                      <p style={{ color: '#0d6efd', margin: '5px 0' }}><strong>Questions:</strong> {exam.question_count || 0}</p>
                      <p style={{ color: '#0d6efd', margin: '5px 0' }}><strong>Start:</strong> {new Date(exam.start_time).toLocaleString()}</p>
                      <p style={{ color: '#0d6efd', margin: '5px 0' }}><strong>End:</strong> {new Date(exam.end_time).toLocaleString()}</p>
                      <p style={{ color: '#0d6efd', margin: '5px 0' }}><strong>Duration:</strong> {exam.duration_minutes} minutes</p>
                      <div style={{
                        display: 'flex',
                        gap: '10px',
                        marginTop: '15px',
                      }}>
                        {!exam.is_published ? (
                          <Button onClick={() => handlePublish(exam.id)} style={{
                            flex: 1,
                            padding: '8px',
                            fontSize: '14px',
                          }}>Publish</Button>
                        ) : (
                          <Button onClick={() => handleUnpublish(exam.id)} style={{
                            flex: 1,
                            padding: '8px',
                            fontSize: '14px',
                          }}>Unpublish</Button>
                        )}
                        <Button onClick={() => handleDeleteExam(exam.id)} style={{
                          flex: 1,
                          padding: '8px',
                          fontSize: '14px',
                        }}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Exam"
        message="Are you sure you want to delete this exam? This action cannot be undone."
        onConfirm={confirmDeleteExam}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeleteExamId(null);
        }}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deleteLoading}
      />
    </div>
  );
}

export default AdminExamsPage;



