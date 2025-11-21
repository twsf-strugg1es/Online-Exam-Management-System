import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmModal from '../components/ConfirmModal';
import api from '../api';

function getPercentageColor(percentage) {
  if (percentage >= 80) return '#84cc16';
  if (percentage >= 70) return '#87ceeb';
  if (percentage >= 60) return '#fbbf24';
  return '#ff6b6b';
}

function AdminStudentsPage() {
  const { user, logout } = useAuth();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedStudentProfile, setSelectedStudentProfile] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStudentId, setDeleteStudentId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    let filtered = students;
    if (studentSearchQuery.trim()) {
      filtered = filtered.filter(s => 
        (s.email && s.email.toLowerCase().includes(studentSearchQuery.toLowerCase())) ||
        (s.full_name && s.full_name.toLowerCase().includes(studentSearchQuery.toLowerCase()))
      );
    }
    setFilteredStudents(filtered);
  }, [students, studentSearchQuery]);

  const fetchStudents = async () => {
    setStudentsError('');
    setStudentsLoading(true);
    try {
      const res = await api.get('/admin/students/');
      setStudents(res.data || []);
    } catch (err) {
      let msg = 'Failed to load students';
      if (err.response?.data?.detail) {
        msg = typeof err.response.data.detail === 'string' ? err.response.data.detail : msg;
      }
      setStudentsError(msg);
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleViewStudent = (student) => {
    setSelectedStudentProfile(student);
    setShowStudentModal(true);
  };

  const handleDeleteStudent = async (studentId) => {
    setShowDeleteModal(true);
    setDeleteStudentId(studentId);
  };

  const confirmDeleteStudent = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/students/${deleteStudentId}`);
      setDeleteMessage('Student deleted successfully');
      setShowDeleteModal(false);
      setDeleteStudentId(null);
      fetchStudents();
    } catch (err) {
      let msg = 'Failed to delete student';
      if (err.response?.data?.detail) {
        msg = typeof err.response.data.detail === 'string' ? err.response.data.detail : msg;
      }
      setDeleteMessage(msg);
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
            <h1 style={{ margin: '0 0 24px 0', color: '#87ceeb', fontSize: '28px', fontWeight: 'bold', fontFamily: 'Roboto, sans-serif' }}>Students Management</h1>
          </div>

          {/* Main Section */}
          <div style={{ backgroundColor: 'rgba(135, 206, 235, 0.05)', border: '2px solid #87ceeb', borderRadius: '8px', padding: '30px' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>Manage Students</h2>
            {deleteMessage && (
              <div style={{
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: deleteMessage.includes('success') ? 'rgba(132, 204, 22, 0.1)' : 'rgba(220, 53, 69, 0.1)',
                borderLeft: `4px solid ${deleteMessage.includes('success') ? '#84cc16' : '#dc3545'}`,
                color: deleteMessage.includes('success') ? '#84cc16' : '#ff6b6b',
                borderRadius: '4px',
                fontFamily: 'Roboto, sans-serif',
              }}>
                {deleteMessage}
              </div>
            )}
            
            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Search by email or name"
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #87ceeb',
                  backgroundColor: 'rgba(135, 206, 235, 0.1)',
                  color: '#87ceeb',
                  fontFamily: 'Roboto, sans-serif',
                }}
              />
            </div>

            {studentsLoading ? (
              <p style={{ color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>Loading students...</p>
            ) : studentsError ? (
              <p style={{ color: '#ff6b6b', fontFamily: 'Roboto, sans-serif' }}>{studentsError}</p>
            ) : filteredStudents.length === 0 ? (
              <p style={{ color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>No students found</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#87ceeb', color: '#000000' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Email</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Full Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Exam Candidate</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Overall Performance</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => (
                      <tr key={student.id} style={{ borderBottom: '1px solid #87ceeb' }}>
                        <td style={{ padding: '12px', color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>{student.email}</td>
                        <td style={{ padding: '12px', color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>{student.full_name || '-'}</td>
                        <td style={{ padding: '12px', color: '#87ceeb', fontFamily: 'Roboto, sans-serif' }}>{student.exam_candidate || '-'}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: getPercentageColor(student.overall),
                            color: '#000000',
                            fontWeight: 'bold',
                            display: 'inline-block',
                          }}>
                            {student.overall}%
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <button 
                            onClick={() => handleViewStudent(student)} 
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
                            onClick={() => handleDeleteStudent(student.id)} 
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
              </div>
            )}
          </div>

          {showStudentModal && selectedStudentProfile && (
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0, color: '#87ceeb' }}>Student Details</h2>
                  <button 
                    onClick={() => setShowStudentModal(false)} 
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '28px',
                      cursor: 'pointer',
                      color: '#87ceeb',
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ paddingBottom: '20px' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Email:</label>
                    <span style={{ color: '#ffffff' }}>{selectedStudentProfile.email}</span>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Full Name:</label>
                    <span style={{ color: '#ffffff' }}>{selectedStudentProfile.full_name || '-'}</span>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Gender:</label>
                    <span style={{ color: '#ffffff' }}>{selectedStudentProfile.gender || '-'}</span>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Exam Candidate:</label>
                    <span style={{ color: '#ffffff' }}>{selectedStudentProfile.exam_candidate || '-'}</span>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Overall Performance:</label>
                    <div style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      backgroundColor: getPercentageColor(selectedStudentProfile.overall),
                      color: '#000000',
                      fontWeight: 'bold',
                      display: 'inline-block',
                    }}>
                      {selectedStudentProfile.overall}%
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => setShowStudentModal(false)} 
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
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Student"
        message="Are you sure you want to delete this student? This action cannot be undone."
        onConfirm={confirmDeleteStudent}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeleteStudentId(null);
        }}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deleteLoading}
      />
    </div>
  );
}

export default AdminStudentsPage;
