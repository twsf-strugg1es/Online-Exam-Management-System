import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
// import './App.css';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import ThemeSwitch from './components/ThemeSwitch';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OrgSignupPage from './pages/OrgSignupPage';
import OrganizationsPage from './pages/OrganizationsPage';
import AdminOrganizationPage from './pages/AdminOrganizationPage';
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
  const { user, isLoading, currentMembership, isStaff, isManager, isCandidate } = useAuth();
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
            ) : !currentMembership ? (
              <Navigate to="/organizations" replace />
            ) : isStaff ? (
              <Navigate to="/admin-questions" replace />
            ) : (
              <Navigate to="/student-account" replace />
            )
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signup/organization" element={<OrgSignupPage />} />
        <Route
          path="/organizations"
          element={user ? <OrganizationsPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin-organization"
          element={isManager ? <AdminOrganizationPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/exam/resume/:attemptId"
          element={
            isCandidate ? (
              <ExamPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/exam/:id"
          element={
            isCandidate ? (
              <ExamPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/evaluate/:attemptId"
          element={
            isStaff ? (
              <EvaluationPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/student-exams"
          element={
            isCandidate ? (
              <StudentExamsPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/exam-results/:attemptId"
          element={
            isCandidate ? (
              <StudentResultsPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/student-profile"
          element={
            isCandidate ? (
              <StudentProfilePage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/student-account"
          element={
            isCandidate ? (
              <StudentDashboard />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/admin-questions"
          element={
            isStaff ? (
              <AdminQuestionsPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/admin-exams"
          element={
            isStaff ? (
              <AdminExamsPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/admin-students"
          element={
            isStaff ? (
              <AdminStudentsPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/admin-evaluate/:attemptId"
          element={
            isStaff ? (
              <AdminEvaluatePage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/admin-evaluate-answers/:attemptId"
          element={
            isStaff ? (
              <AdminEvaluateAnswersPage />
            ) : (
              <Navigate to="/" replace />
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
