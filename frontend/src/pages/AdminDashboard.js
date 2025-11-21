import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const colors = {
  white: '#ffffff',
  black: '#000000',
  skyBlue: '#87ceeb',
  darkGray: '#333333',
  gray: '#666666',
  lightGray: '#f5f5f5',
};

function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [examsError, setExamsError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  useEffect(() => {
    fetchExams();
    fetchQuestions();
    fetchStudents();
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
        msg = typeof err.response.data.detail === 'string' ? err.response.data.detail : msg;
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
      //
    }
  };

  const fetchStudents = async () => {
    setStudentsLoading(true);
    try {
      const res = await api.get('/admin/students/');
      setStudents(res.data || []);
    } catch (err) {
      //
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setUploadMessage('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/admin/questions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadMessage(res.data.message || 'Questions uploaded successfully');
      setFile(null);
      fetchQuestions();
    } catch (err) {
      let msg = 'Upload failed';
      if (err.response?.data?.detail) {
        msg = typeof err.response.data.detail === 'string' ? err.response.data.detail : msg;
      }
      setUploadMessage(msg);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.black, fontFamily: 'Roboto, sans-serif' }}>
      {/* Sidebar */}
      <div style={{
        width: '280px',
        backgroundColor: colors.skyBlue,
        color: colors.black,
        padding: '30px 20px',
        boxSizing: 'border-box',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto',
      }}>
        {/* Logo Section */}
        <div style={{ marginBottom: '30px', textAlign: 'center', paddingBottom: '20px', borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: colors.black, fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0', fontFamily: 'Roboto, sans-serif' }}>PorikkhaKori</h2>
          <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', margin: 0 }}>Admin Portal</p>
        </div>

        {/* Menu Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <SidebarItem icon="📊" label="Dashboard" active={true} />
          <SidebarItem icon="📝" label="Questions" />
          <SidebarItem icon="📋" label="Exams" />
          <SidebarItem icon="👥" label="Students" />
          <SidebarItem icon="✅" label="Evaluations" />
          <div style={{ borderTop: '2px solid rgba(0,0,0,0.2)', margin: '20px 0' }}></div>
          <SidebarItem icon="⚙️" label="Settings" />
          <SidebarItem icon="👤" label="Profile" />
          <SidebarItem icon="🚪" label="Logout" onClick={handleLogout} />
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ marginLeft: '280px', flex: 1, padding: '30px', backgroundColor: colors.black }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '28px', color: colors.skyBlue, margin: 0, fontFamily: 'Roboto, sans-serif', fontWeight: 'bold' }}>Welcome, Admin!</h1>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search..."
              style={{
                padding: '10px 15px',
                borderRadius: '8px',
                border: `1px solid ${colors.skyBlue}`,
                width: '200px',
                fontFamily: 'Roboto, sans-serif',
                backgroundColor: 'rgba(135, 206, 235, 0.1)',
                color: colors.white,
              }}
              onFocus={(e) => e.target.style.backgroundColor = 'rgba(135, 206, 235, 0.2)'}
              onBlur={(e) => e.target.style.backgroundColor = 'rgba(135, 206, 235, 0.1)'}
            />
            <button style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: colors.skyBlue }}>🔔</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: colors.skyBlue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: colors.black }}>A</div>
              <div>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '13px', color: colors.skyBlue }}>Admin</p>
                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(135, 206, 235, 0.7)' }}>{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
          <StatCard icon="📝" count={exams.length} label="Exams" />
          <StatCard icon="👥" count={students.length} label="Students" />
          <StatCard icon="📚" count={questions.length} label="Questions" />
          <StatCard icon="✅" count="3" label="Completed" />
        </div>

        {/* Sections Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Upload Questions Section */}
          <div style={{ backgroundColor: 'rgba(135, 206, 235, 0.05)', borderRadius: '8px', padding: '20px', border: `2px solid ${colors.skyBlue}` }}>
            <h2 style={{ marginTop: 0, marginBottom: '15px', color: colors.skyBlue, fontFamily: 'Roboto, sans-serif' }}>Upload Questions</h2>
            <form onSubmit={handleFileUpload}>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".xlsx,.xls"
                style={{ marginBottom: '10px', display: 'block', width: '100%', color: colors.skyBlue }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: 'transparent',
                    border: `2px solid ${colors.skyBlue}`,
                    color: colors.skyBlue,
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
                    padding: '10px',
                    backgroundColor: colors.skyBlue,
                    color: colors.black,
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
            {uploadMessage && <p style={{ marginTop: '10px', color: colors.skyBlue, fontSize: '13px' }}>{uploadMessage}</p>}
          </div>
        </div>

        {/* Students Section */}
        <div style={{ backgroundColor: 'rgba(135, 206, 235, 0.05)', borderRadius: '8px', padding: '20px', marginTop: '20px', border: `2px solid ${colors.skyBlue}` }}>
          <h2 style={{ marginTop: 0, marginBottom: '15px', color: colors.skyBlue, fontFamily: 'Roboto, sans-serif' }}>Students</h2>
          {studentsLoading ? (
            <p style={{ color: colors.skyBlue }}>Loading...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: colors.skyBlue, color: colors.black }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 'bold' }}>Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 'bold' }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 'bold' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 'bold' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.slice(0, 5).map((student) => (
                    <tr key={student.id} style={{ borderBottom: `1px solid ${colors.skyBlue}` }}>
                      <td style={{ padding: '12px', fontSize: '13px', color: colors.skyBlue }}>{student.full_name || 'N/A'}</td>
                      <td style={{ padding: '12px', fontSize: '13px', color: colors.white }}>{student.email}</td>
                      <td style={{ padding: '12px', fontSize: '13px', color: colors.white }}>Active</td>
                      <td style={{ padding: '12px' }}>
                        <button style={{ background: 'none', border: 'none', color: colors.skyBlue, cursor: 'pointer', fontSize: '16px' }}>👁️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button style={{ color: colors.skyBlue, fontSize: '13px', marginTop: '10px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none' }}>See all &gt;&gt;</button>
        </div>
      </div>
    </div>
  );

  function SidebarItem({ icon, label, active, onClick }) {
    return (
      <div
        onClick={onClick}
        style={{
          padding: '12px 16px',
          borderRadius: '6px',
          backgroundColor: active ? 'rgba(0,0,0,0.2)' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: colors.black,
          fontSize: '14px',
          fontWeight: active ? 'bold' : 'normal',
          transition: 'all 0.2s',
          fontFamily: 'Roboto, sans-serif',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.15)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = active ? 'rgba(0,0,0,0.2)' : 'transparent'}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </div>
    );
  }

  function StatCard({ icon, count, label }) {
    return (
      <div style={{
        backgroundColor: 'rgba(135, 206, 235, 0.05)',
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
        border: `2px solid ${colors.skyBlue}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
      }}>
        <div style={{ fontSize: '32px' }}>{icon}</div>
        <h3 style={{ margin: 0, fontSize: '28px', color: colors.skyBlue, fontWeight: 'bold', fontFamily: 'Roboto, sans-serif' }}>{count}</h3>
        <p style={{ margin: 0, fontSize: '13px', color: colors.skyBlue, fontFamily: 'Roboto, sans-serif' }}>{label}</p>
      </div>
    );
  }
}

export default AdminDashboard;
