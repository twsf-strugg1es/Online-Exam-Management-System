import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmModal from '../components/ConfirmModal';
import api from '../api';
import Button from '../components/Button';


function getPercentageColor(percentage) {
  if (percentage >= 80) return '#84cc16';
  if (percentage >= 70) return '#0d6efd';
  if (percentage >= 60) return '#fbbf24';
  return '#ff6b6b';
}

function AdminStudentsPage() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.background, fontFamily: 'Roboto, sans-serif' }}>
      {/* Sidebar */}
      <AdminSidebar user={user} onLogout={logout} />

      {/* Main Content */}
      <div style={{ marginLeft: '70px', flex: 1, padding: '30px', overflow: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '30px' }}>
            <h1 style={{ margin: '0 0 24px 0', color: '#0d6efd', fontSize: '28px', fontWeight: 'bold', fontFamily: 'Roboto, sans-serif' }}>Students Management</h1>
          </div>

          {/* Main Section */}
          <div style={{ backgroundColor: 'rgba(135, 206, 235, 0.05)', border: '2px solid #0d6efd', borderRadius: '8px', padding: '30px' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>Manage Students</h2>
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
                  border: '1px solid #0d6efd',
                  backgroundColor: 'rgba(135, 206, 235, 0.1)',
                  color: '#0d6efd',
                  fontFamily: 'Roboto, sans-serif',
                }}
              />
            </div>

            {studentsLoading ? (
              <p style={{ color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>Loading students...</p>
            ) : studentsError ? (
              <p style={{ color: '#ff6b6b', fontFamily: 'Roboto, sans-serif' }}>{studentsError}</p>
            ) : filteredStudents.length === 0 ? (
              <p style={{ color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>No students found</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0d6efd', color: '#000000' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Email</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Full Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Exam Candidate</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Overall Performance</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => (
                      <tr key={student.id} style={{ borderBottom: '1px solid #0d6efd' }}>
                        <td style={{ padding: '12px', color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>{student.email}</td>
                        <td style={{ padding: '12px', color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>{student.full_name || '-'}</td>
                        <td style={{ padding: '12px', color: '#0d6efd', fontFamily: 'Roboto, sans-serif' }}>{student.exam_candidate || '-'}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: getPercentageColor(student.overall),
                            color: '#000000',
                            fontWeight: 'bold',
                            display: 'inline-block',
                            marginBottom: '5px'
                          }}>
                            {student.overall}%
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Button
                            onClick={() => handleViewStudent(student)}
                            style={{
                              backgroundColor: 'transparent',
                              color: '#0d6efd',
                              border: 'none',
                              marginRight: '10px',
                              padding: '4px 8px',
                              fontSize: '14px'
                            }}
                          >
                            View
                          </Button>
                          <Button
                            onClick={() => handleDeleteStudent(student.id)}
                            style={{
                              backgroundColor: 'transparent',
                              color: '#ff6b6b',
                              border: 'none',
                              padding: '4px 8px',
                              fontSize: '14px'
                            }}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
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
            padding: '30px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '600px',
            border: '2px solid #0d6efd',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <h2 style={{ color: '#0d6efd', marginTop: 0, fontFamily: 'Roboto, sans-serif' }}>Student Details</h2>
            <p style={{ color: '#0d6efd' }}><strong>Email:</strong> {selectedStudentProfile.email}</p>
            <p style={{ color: '#0d6efd' }}><strong>Full Name:</strong> {selectedStudentProfile.full_name}</p>
            <p style={{ color: '#0d6efd' }}><strong>Exam Candidate:</strong> {selectedStudentProfile.exam_candidate}</p>

            <Button
              onClick={() => setShowStudentModal(false)}
              style={{ marginTop: '20px' }}
            >
              Close
            </Button>
          </div>
        </div>
      )}

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



