import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';
import Button from '../components/Button';

function AdminDashboard() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.background, fontFamily: 'Roboto, sans-serif' }}>
      {/* Sidebar - Using old sidebar for now */}
      <div style={{
        width: '280px',
        backgroundColor: theme.sidebarBg,
        color: theme.sidebarText,
        padding: '30px 20px',
        boxSizing: 'border-box',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto',
        borderRight: `1px solid ${theme.border}`,
      }}>
        <div style={{ marginBottom: '30px', textAlign: 'center', paddingBottom: '20px', borderBottom: `2px solid ${theme.border}` }}>
          <h2 style={{ color: theme.sidebarText, fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0', fontFamily: 'Roboto, sans-serif' }}>PorikkhaKori</h2>
          <p style={{ fontSize: '12px', color: theme.secondary, margin: 0 }}>Admin Portal</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <SidebarItem icon="📊" label="Dashboard" active={true} />
          <SidebarItem icon="📝" label="Questions" onClick={() => navigate('/admin-questions')} />
          <SidebarItem icon="📋" label="Exams" onClick={() => navigate('/admin-exams')} />
          <SidebarItem icon="👥" label="Students" onClick={() => navigate('/admin-students')} />
          <div style={{ borderTop: `2px solid ${theme.border}`, margin: '20px 0' }}></div>
          <SidebarItem icon="🚪" label="Logout" onClick={handleLogout} />
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ marginLeft: '280px', flex: 1, padding: '30px', backgroundColor: theme.background, color: theme.text }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '28px', color: theme.primary, margin: 0, fontFamily: 'Roboto, sans-serif', fontWeight: 'bold' }}>Welcome, Admin!</h1>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
          <StatCard icon="📝" count={exams.length} label="Exams" />
          <StatCard icon="👥" count={students.length} label="Students" />
          <StatCard icon="📚" count={questions.length} label="Questions" />
          <StatCard icon="✅" count="0" label="Pending" />
        </div>

        {/* Upload Section */}
        <div style={{ backgroundColor: theme.cardBg, borderRadius: '8px', padding: '20px', border: `2px solid ${theme.primary}`, marginBottom: '20px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '15px', color: theme.primary, fontFamily: 'Roboto, sans-serif' }}>Upload Questions</h2>
          <form onSubmit={handleFileUpload}>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".xlsx,.xls"
              style={{ marginBottom: '10px', display: 'block', width: '100%', color: theme.text }}
            />
            <Button type="submit" style={{ backgroundColor: theme.primary, color: '#fff', border: 'none' }}>
              Upload
            </Button>
          </form>
          {uploadMessage && <p style={{ marginTop: '10px', color: theme.primary }}>{uploadMessage}</p>}
        </div>
      </div>
    </div>
  );
}

// Helper component for sidebar items
function SidebarItem({ icon, label, active, onClick }) {
  const { theme } = useTheme();
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: active ? theme.primary : 'transparent',
        color: active ? '#fff' : theme.sidebarText,
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontFamily: 'Roboto, sans-serif',
        transition: 'all 0.3s ease',
        width: '100%',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = theme.hoverBg || 'rgba(255,255,255,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// Helper component for stat cards
function StatCard({ icon, count, label }) {
  const { theme } = useTheme();
  return (
    <div style={{
      backgroundColor: theme.cardBg,
      padding: '20px',
      borderRadius: '8px',
      border: `2px solid ${theme.primary}`,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>{icon}</div>
      <h3 style={{ margin: 0, fontSize: '28px', color: theme.primary, fontWeight: 'bold', fontFamily: 'Roboto, sans-serif' }}>{count}</h3>
      <p style={{ margin: 0, fontSize: '13px', color: theme.primary, fontFamily: 'Roboto, sans-serif' }}>{label}</p>
    </div>
  );
}

export default AdminDashboard;
