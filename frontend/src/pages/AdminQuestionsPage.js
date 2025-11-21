import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmModal from '../components/ConfirmModal';
import api from '../api';

function AdminQuestionsPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('upload');
  const [file, setFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [questionTypeFilter, setQuestionTypeFilter] = useState('');
  const [complexityFilter, setComplexityFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteQuestionId, setDeleteQuestionId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    let filtered = questions;
    
    if (searchTerm) {
      filtered = filtered.filter(q => 
        q.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (questionTypeFilter) {
      filtered = filtered.filter(q => q.type === questionTypeFilter);
    }
    
    if (complexityFilter) {
      filtered = filtered.filter(q => q.complexity === complexityFilter);
    }
    
    setFilteredQuestions(filtered);
  }, [questions, searchTerm, questionTypeFilter, complexityFilter, tagFilter]);

  const fetchQuestions = async () => {
    try {
      const res = await api.get('/admin/questions/');
      setQuestions(res.data || []);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadMessage('Please select a file');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await api.post('/admin/upload-questions/', formData);
      setUploadMessage('Questions uploaded successfully');
      setFile(null);
      fetchQuestions();
    } catch (err) {
      let msg = 'Failed to upload questions';
      if (err.response?.data?.detail) {
        msg = typeof err.response.data.detail === 'string' ? err.response.data.detail : msg;
      }
      setUploadMessage(msg);
    }
  };

  const handlePreviewFile = async () => {
    if (!file) {
      setUploadMessage('Please select a file');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post('/admin/preview-questions/', formData);
      setPreviewData(res.data);
      setShowPreviewModal(true);
    } catch (err) {
      let msg = 'Failed to preview file';
      if (err.response?.data?.detail) {
        msg = typeof err.response.data.detail === 'string' ? err.response.data.detail : msg;
      }
      setUploadMessage(msg);
    }
  };

  const handleToggleSelectQuestion = (questionId) => {
    const newSelected = new Set(selectedQuestionIds);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestionIds(newSelected);
  };

  const handleSelectAllQuestions = () => {
    if (selectedQuestionIds.size === filteredQuestions.length) {
      // Deselect all
      setSelectedQuestionIds(new Set());
    } else {
      // Select all
      const allIds = new Set(filteredQuestions.map(q => q.id));
      setSelectedQuestionIds(allIds);
    }
  };

  const handleBulkDelete = () => {
    if (selectedQuestionIds.size === 0) {
      setUploadMessage('Please select at least one question to delete');
      return;
    }
    setShowBulkDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    setBulkDeleteLoading(true);
    try {
      const idsArray = Array.from(selectedQuestionIds);
      console.log('Bulk delete - Selected IDs:', idsArray);
      await api.post('/admin/questions/delete-bulk', {
        question_ids: idsArray
      });
      setUploadMessage(`${selectedQuestionIds.size} question(s) deleted successfully`);
      setShowBulkDeleteModal(false);
      setSelectedQuestionIds(new Set());
      fetchQuestions();
    } catch (err) {
      console.error('Bulk delete error:', err);
      let msg = 'Failed to delete questions';
      if (err.response?.data?.detail) {
        msg = typeof err.response.data.detail === 'string' ? err.response.data.detail : msg;
      }
      setUploadMessage(msg);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleViewQuestion = (question) => {
    setSelectedQuestion(question);
    setShowQuestionModal(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setQuestionTypeFilter('');
    setComplexityFilter('');
    setTagFilter('');
  };

  const handleDeleteQuestion = async (questionId) => {
    setShowDeleteModal(true);
    setDeleteQuestionId(questionId);
  };

  const confirmDeleteQuestion = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/questions/${deleteQuestionId}`);
      setUploadMessage('Question deleted successfully');
      setShowDeleteModal(false);
      setDeleteQuestionId(null);
      fetchQuestions();
    } catch (err) {
      let msg = 'Failed to delete question';
      if (err.response?.data?.detail) {
        msg = typeof err.response.data.detail === 'string' ? err.response.data.detail : msg;
      }
      setUploadMessage(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000000', fontFamily: 'Roboto, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: '280px', zIndex: 100 }}>
        <AdminSidebar user={user} onLogout={logout} />
      </div>

      {/* Main Content */}
      <div style={{ marginLeft: '280px', flex: 1, padding: '30px', overflow: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '30px' }}>
            <h1 style={{ margin: '0 0 24px 0', color: '#87ceeb', fontSize: '28px', fontWeight: 'bold', fontFamily: 'Roboto, sans-serif' }}>Questions Management</h1>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
            <button
              onClick={() => setActiveTab('upload')}
              style={{
                padding: '12px 24px',
                backgroundColor: activeTab === 'upload' ? '#87ceeb' : 'transparent',
                color: activeTab === 'upload' ? '#000000' : '#87ceeb',
                border: `2px solid #87ceeb`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontFamily: 'Roboto, sans-serif',
              }}
            >
              Upload Questions
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              style={{
                padding: '12px 24px',
                backgroundColor: activeTab === 'manage' ? '#87ceeb' : 'transparent',
                color: activeTab === 'manage' ? '#000000' : '#87ceeb',
                border: `2px solid #87ceeb`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontFamily: 'Roboto, sans-serif',
              }}
            >
              Manage Questions
            </button>
          </div>

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div style={{ backgroundColor: 'rgba(135, 206, 235, 0.05)', border: '2px solid #87ceeb', borderRadius: '8px', padding: '30px' }}>
              <h2 style={{ margin: '0 0 20px 0', color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>Upload Questions</h2>
              <form onSubmit={(e) => { e.preventDefault(); handleUpload(); }}>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".xlsx,.xls"
                  style={{ marginBottom: '20px', display: 'block', width: '100%', color: '#87ceeb' }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handlePreviewFile}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      backgroundColor: 'transparent',
                      color: '#87ceeb',
                      border: '2px solid #87ceeb',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontFamily: 'Roboto, sans-serif',
                    }}
                  >
                    Preview
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      backgroundColor: '#87ceeb',
                      color: '#000000',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontFamily: 'Roboto, sans-serif',
                    }}
                  >
                    Upload
                  </button>
                </div>
              </form>
              {uploadMessage && <p style={{ marginTop: '20px', color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>{uploadMessage}</p>}
            </div>
          )}

          {/* Manage Tab */}
          {activeTab === 'manage' && (
            <div style={{ backgroundColor: 'rgba(135, 206, 235, 0.05)', border: '2px solid #87ceeb', borderRadius: '8px', padding: '30px' }}>
              <h2 style={{ margin: '0 0 20px 0', color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>Manage Questions</h2>
              
              {/* Filter Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #87ceeb',
                    backgroundColor: 'rgba(135, 206, 235, 0.1)',
                    color: '#87ceeb',
                    fontFamily: 'Roboto, sans-serif',
                  }}
                />
                <select
                  value={questionTypeFilter}
                  onChange={(e) => setQuestionTypeFilter(e.target.value)}
                  style={{
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #87ceeb',
                    backgroundColor: 'rgba(135, 206, 235, 0.1)',
                    color: '#87ceeb',
                    fontFamily: 'Roboto, sans-serif',
                  }}
                >
                  <option value="">All Types</option>
                  <option value="single_choice">Single Choice</option>
                  <option value="multi_choice">Multi Choice</option>
                  <option value="text">Text</option>
                  <option value="image_upload">Image Upload</option>
                </select>
                <select
                  value={complexityFilter}
                  onChange={(e) => setComplexityFilter(e.target.value)}
                  style={{
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #87ceeb',
                    backgroundColor: 'rgba(135, 206, 235, 0.1)',
                    color: '#87ceeb',
                    fontFamily: 'Roboto, sans-serif',
                  }}
                >
                  <option value="">All Complexities</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <button
                  onClick={clearFilters}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#87ceeb',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontFamily: 'Roboto, sans-serif',
                  }}
                >
                  Clear Filters
                </button>
              </div>

              {/* Questions Table */}
              {filteredQuestions.length === 0 ? (
                <p style={{ color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>No questions found.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#87ceeb', color: '#000000' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedQuestionIds.size === filteredQuestions.length && filteredQuestions.length > 0}
                          onChange={handleSelectAllQuestions}
                          style={{ cursor: 'pointer' }}
                          title="Select all questions"
                        />
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Title</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Type</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Complexity</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuestions.map((q) => (
                      <tr key={q.id} style={{ borderBottom: '1px solid #87ceeb', backgroundColor: selectedQuestionIds.has(q.id) ? 'rgba(135, 206, 235, 0.15)' : 'transparent' }}>
                        <td style={{ padding: '12px' }}>
                          <input
                            type="checkbox"
                            checked={selectedQuestionIds.has(q.id)}
                            onChange={() => handleToggleSelectQuestion(q.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '12px', color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>{q.title}</td>
                        <td style={{ padding: '12px', color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>{q.type}</td>
                        <td style={{ padding: '12px', color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>{q.complexity}</td>
                        <td style={{ padding: '12px' }}>
                          <button
                            onClick={() => handleViewQuestion(q)}
                            style={{
                              backgroundColor: 'transparent',
                              color: '#87ceeb',
                              border: 'none',
                              cursor: 'pointer',
                              marginRight: '10px',
                              fontFamily: 'Roboto, sans-serif',
                            }}
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            style={{
                              backgroundColor: 'transparent',
                              color: '#ff6b6b',
                              border: 'none',
                              cursor: 'pointer',
                              fontFamily: 'Roboto, sans-serif',
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              
              {/* Bulk Delete Section */}
              {filteredQuestions.length > 0 && (
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>
                    {selectedQuestionIds.size} selected
                  </span>
                  {selectedQuestionIds.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#ff6b6b',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontFamily: 'Roboto, sans-serif',
                      }}
                    >
                      Delete Selected ({selectedQuestionIds.size})
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Question Modal */}
      {showQuestionModal && selectedQuestion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#000000',
            border: '2px solid #87ceeb',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflowY: 'auto',
            color: '#87ceeb',
            fontFamily: 'Roboto, sans-serif',
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#87ceeb' }}>{selectedQuestion.title}</h2>
            <p><strong>Type:</strong> {selectedQuestion.type}</p>
            <p><strong>Complexity:</strong> {selectedQuestion.complexity}</p>
            <p><strong>Description:</strong> {selectedQuestion.description}</p>
            <button
              onClick={() => setShowQuestionModal(false)}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#87ceeb',
                color: '#000000',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontFamily: 'Roboto, sans-serif',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewData && (
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
            backgroundColor: '#87ceeb',
            borderRadius: '12px',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.3)',
            padding: '40px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            fontFamily: 'Roboto, sans-serif',
          }}>
            <h2 style={{
              color: '#000000',
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '24px',
              marginTop: 0,
              fontFamily: 'Roboto, sans-serif',
            }}>
              File Preview - {previewData.count} Question(s)
            </h2>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}>
              {previewData.questions && previewData.questions.map((q, idx) => (
                <div key={idx} style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.08)',
                  padding: '16px',
                  borderRadius: '8px',
                  borderLeft: '4px solid #000000',
                }}>
                  <div style={{
                    color: '#000000',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                  }}>
                    <span>Q{idx + 1}. </span>
                    <span style={{ fontSize: '12px', backgroundColor: '#000000', color: '#87ceeb', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px' }}>
                      {q.type === 'single_choice' ? 'Single Choice' : q.type === 'multi_choice' ? 'Multi Choice' : q.type === 'text' ? 'Text' : 'Image Upload'}
                    </span>
                    <span style={{ fontSize: '12px', backgroundColor: '#333333', color: '#87ceeb', padding: '2px 8px', borderRadius: '4px', marginLeft: '4px' }}>
                      {q.complexity}
                    </span>
                  </div>
                  
                  <p style={{
                    color: '#000000',
                    fontSize: '15px',
                    fontWeight: '500',
                    margin: '8px 0',
                    lineHeight: '1.5',
                  }}>
                    {q.title}
                  </p>
                  
                  {/* Show options and answers only for single_choice and multi_choice */}
                  {(q.type === 'single_choice' || q.type === 'multi_choice') && q.options && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{
                        color: '#000000',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        marginBottom: '8px',
                      }}>
                        Options:
                      </div>
                      <ul style={{
                        margin: '0 0 12px 20px',
                        padding: 0,
                        color: '#000000',
                        fontSize: '13px',
                      }}>
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.type === 'single_choice' 
                            ? opt === q.correct_answers 
                            : Array.isArray(q.correct_answers) && q.correct_answers.includes(opt);
                          return (
                            <li key={optIdx} style={{
                              marginBottom: '6px',
                              padding: '4px 8px',
                              backgroundColor: isCorrect ? 'rgba(0, 200, 0, 0.15)' : 'transparent',
                              borderRadius: '4px',
                            }}>
                              {opt}
                              {isCorrect && (
                                <span style={{
                                  marginLeft: '8px',
                                  color: '#008000',
                                  fontWeight: 'bold',
                                  fontSize: '12px',
                                }}>
                                  ✓ Correct
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  
                  {/* Show message for text and image_upload types */}
                  {(q.type === 'text' || q.type === 'image_upload') && (
                    <div style={{
                      marginTop: '12px',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(0, 0, 0, 0.1)',
                      borderRadius: '4px',
                      color: '#000000',
                      fontSize: '13px',
                      fontStyle: 'italic',
                    }}>
                      {q.type === 'text' && '(Answer will be manually evaluated)'}
                      {q.type === 'image_upload' && '(Image upload - will be manually evaluated)'}
                    </div>
                  )}
                  
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(0, 0, 0, 0.2)',
                    fontSize: '12px',
                    color: '#333333',
                  }}>
                    Max Score: {q.max_score}
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '24px',
            }}>
              <button
                onClick={() => setShowPreviewModal(false)}
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
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#333333') && (e.target.style.borderColor = '#333333')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#000000') && (e.target.style.borderColor = '#000000')}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Question"
        message="Are you sure you want to delete this question? This action cannot be undone."
        onConfirm={confirmDeleteQuestion}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeleteQuestionId(null);
        }}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deleteLoading}
      />

      <ConfirmModal
        isOpen={showBulkDeleteModal}
        title="Delete Selected Questions"
        message={`Are you sure you want to delete ${selectedQuestionIds.size} question(s)? This action cannot be undone.`}
        onConfirm={confirmBulkDelete}
        onCancel={() => setShowBulkDeleteModal(false)}
        confirmText="Delete All"
        cancelText="Cancel"
        isLoading={bulkDeleteLoading}
      />
    </div>
  );
}

export default AdminQuestionsPage;
