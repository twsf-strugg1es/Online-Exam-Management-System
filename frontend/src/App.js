import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
// import './App.css';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import ThemeSwitch from './components/ThemeSwitch';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminQuestionsPage from './pages/AdminQuestionsPage';
import AdminExamsPage from './pages/AdminExamsPage';
import AdminStudentsPage from './pages/AdminStudentsPage';
import AdminEvaluatePage from './pages/AdminEvaluatePage';
import AdminEvaluateAnswersPage from './pages/AdminEvaluateAnswersPage';
import StudentDashboard from './pages/StudentDashboard';
import ExamPage from './pages/ExamPage';
import EvaluationPage from './pages/EvaluationPage';
import StudentExamsPage from './pages/StudentExamsPage';
import StudentResultsPage from './pages/StudentResultsPage';
import StudentProfilePage from './pages/StudentProfilePage';
import ComponentShowcase from './components/ComponentShowcase';
import NotebookDemo from './pages/NotebookDemo';
function App() {
  const { user, isLoading } = useAuth();
  const { theme, toggleTheme, themeName } = useTheme();

  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: theme.background,
        fontSize: '16px',
        color: theme.text,
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="App" style={{ backgroundColor: theme.background, color: theme.text, minHeight: '100vh' }}>
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
      }}>
        <ThemeSwitch
          checked={themeName === 'dark'}
          onChange={toggleTheme}
        />
      </div>
      <Routes>
        <Route
          path="/"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : user.role === 'admin' ? (
              <Navigate to="/admin-questions" replace />
            ) : user.role === 'student' ? (
              <Navigate to="/student-account" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/exam/resume/:attemptId"
          element={
            user && user.role === 'student' ? (
              <ExamPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/exam/:id"
          element={
            user && user.role === 'student' ? (
              <ExamPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/evaluate/:attemptId"
          element={
            user && user.role === 'admin' ? (
              <EvaluationPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/student-exams"
          element={
            user && user.role === 'student' ? (
              <StudentExamsPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/exam-results/:attemptId"
          element={
            user && user.role === 'student' ? (
              <StudentResultsPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/student-profile"
          element={
            user && user.role === 'student' ? (
              <StudentProfilePage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/student-account"
          element={
            user && user.role === 'student' ? (
              <StudentDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin-questions"
          element={
            user && user.role === 'admin' ? (
              <AdminQuestionsPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin-exams"
          element={
            user && user.role === 'admin' ? (
              <AdminExamsPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin-students"
          element={
            user && user.role === 'admin' ? (
              <AdminStudentsPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin-evaluate/:attemptId"
          element={
            user && user.role === 'admin' ? (
              <AdminEvaluatePage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin-evaluate-answers/:attemptId"
          element={
            user && user.role === 'admin' ? (
              <AdminEvaluateAnswersPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/showcase" element={<ComponentShowcase />} />
        <Route path="/notebook-demo" element={<NotebookDemo />} />
      </Routes>
    </div>
  );
}

export default App;
