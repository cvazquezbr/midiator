import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import PromptsPage from './pages/PromptsPage';
import ConfigPage from './pages/ConfigPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ChangePasswordPage from './pages/ChangePasswordPage';

// Route Protection
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />

        {/* Protected Routes for standard users */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/campaigns/:campaignId" element={<HomePage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
        </Route>

        {/* Protected Routes for admin users */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/users" element={<AdminDashboardPage />} />
          <Route path="/admin/prompts" element={<PromptsPage />} />
        </Route>

        {/* Fallback for non-matching routes */}
        <Route path="*" element={
          <div style={{ padding: '2rem' }}>
            <h1>404 - Page Not Found</h1>
          </div>
        } />
      </Routes>
  );
}

export default App;
