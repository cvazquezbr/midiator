import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

// Route Protection
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

function App() {
  return (
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
