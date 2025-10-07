import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Context
import { CampaignProvider } from './context/CampaignContext';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import PromptsPage from './pages/PromptsPage';

// Route Protection
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

function App() {
  return (
    <CampaignProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected Routes for standard users */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
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
    </CampaignProvider>
  );
}

export default App;
