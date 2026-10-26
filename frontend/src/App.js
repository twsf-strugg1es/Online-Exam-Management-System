import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { PageLoader } from './components/ui';
import DesktopOnly from './components/DesktopOnly';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OrgSignupPage from './pages/OrgSignupPage';
import OrganizationsPage from './pages/OrganizationsPage';
import AdminQuestionsPage from './pages/AdminQuestionsPage';
import AdminExamsPage from './pages/AdminExamsPage';
import ExamFormPage from './pages/ExamFormPage';
import ExamResultsPage from './pages/ExamResultsPage';
import IntegrityReportPage from './pages/IntegrityReportPage';
import AdminStudentsPage from './pages/AdminStudentsPage';
import AdminOrganizationPage from './pages/AdminOrganizationPage';
import AdminEvaluateAnswersPage from './pages/AdminEvaluateAnswersPage';
import StudentDashboard from './pages/StudentDashboard';
import ExamPage from './pages/ExamPage';
import StudentExamsPage from './pages/StudentExamsPage';
import StudentResultsPage from './pages/StudentResultsPage';
import StudentProfilePage from './pages/StudentProfilePage';

function App() {
  const { user, isLoading, currentMembership, isStaff, isManager, isCandidate } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-paper"><PageLoader /></div>;
  }

  // Pages for one kind of member; anyone else goes back to the root, which routes them
  const only = (allowed, element) => (allowed ? element : <Navigate to="/" replace />);

  return (
    <DesktopOnly>
    <Routes>
      <Route
        path="/"
        element={
          !user ? <Navigate to="/login" replace />
            : !currentMembership ? <Navigate to="/organizations" replace />
              : isStaff ? <Navigate to="/admin-exams" replace />
                : <Navigate to="/student-account" replace />
        }
      />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to="/" replace /> : <SignupPage />} />
      <Route path="/signup/organization" element={<OrgSignupPage />} />
      <Route path="/organizations" element={user ? <OrganizationsPage /> : <Navigate to="/login" replace />} />
      <Route path="/profile" element={only(currentMembership, <StudentProfilePage />)} />

      {/* Staff */}
      <Route path="/admin-exams" element={only(isStaff, <AdminExamsPage />)} />
      <Route path="/admin-exams/new" element={only(isStaff, <ExamFormPage />)} />
      <Route path="/admin-exams/:examId" element={only(isStaff, <ExamResultsPage />)} />
      <Route path="/admin-integrity/:attemptId" element={only(isStaff, <IntegrityReportPage />)} />
      <Route path="/admin-evaluate-answers/:attemptId" element={only(isStaff, <AdminEvaluateAnswersPage />)} />
      <Route path="/admin-questions" element={only(isStaff, <AdminQuestionsPage />)} />
      <Route path="/admin-students" element={only(isStaff, <AdminStudentsPage />)} />
      <Route path="/admin-organization" element={only(isManager, <AdminOrganizationPage />)} />

      {/* Students */}
      <Route path="/student-account" element={only(isCandidate, <StudentDashboard />)} />
      <Route path="/exam/:id" element={only(isCandidate, <ExamPage />)} />
      <Route path="/exam/resume/:attemptId" element={only(isCandidate, <ExamPage />)} />
      <Route path="/student-exams" element={only(isCandidate, <StudentExamsPage />)} />
      <Route path="/exam-results/:attemptId" element={only(isCandidate, <StudentResultsPage />)} />
      <Route path="/student-profile" element={<Navigate to="/profile" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </DesktopOnly>
  );
}

export default App;
