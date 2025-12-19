import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from 'react-i18next';

import MainLayout from '../components/layout/Layout';
import AuthLayout from '../components/layout/AuthLayout';

import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import ProjectsPage from '../pages/ProjectsPage';
import ProjectDetailPage from '../pages/ProjectDetailPage';
import TranscriptionsPage from '../pages/TranscriptionsPage';
import TranscriptionDetailPage from '../pages/TranscriptionDetailPage';
import AnalysisPage from '../pages/AnalysisPage';
import DocumentsPage from '../pages/DocumentsPage';
import ProfilePage from '../pages/ProfilePage';
import QualitativeAnalysisPage from '../pages/QualitativeAnalysisPage';
import TermsPage from '../pages/TermsPage';
import PrivacyPage from '../pages/PrivacyPage';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { t } = useTranslation();
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">{t('loading')}</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
      
      <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
      <Route path="/register" element={<AuthLayout><RegisterPage /></AuthLayout>} />
      <Route path="/terms" element={<AuthLayout><TermsPage /></AuthLayout>} />
      <Route path="/privacy" element={<AuthLayout><PrivacyPage /></AuthLayout>} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <MainLayout><DashboardPage /></MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/projects" element={
        <ProtectedRoute>
          <MainLayout><ProjectsPage /></MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/projects/:id" element={
        <ProtectedRoute>
          <MainLayout><ProjectDetailPage /></MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/transcriptions" element={
        <ProtectedRoute>
          <MainLayout><TranscriptionsPage /></MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/transcriptions/:id" element={
        <ProtectedRoute>
          <MainLayout><TranscriptionDetailPage /></MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/analysis/:id" element={
        <ProtectedRoute>
          <MainLayout><AnalysisPage /></MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/documents" element={
        <ProtectedRoute>
          <MainLayout><DocumentsPage /></MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute>
          <MainLayout><ProfilePage /></MainLayout>
        </ProtectedRoute>
      } />

<Route path="/projects/:projectId/analysis" element={<QualitativeAnalysisPage />}/>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
