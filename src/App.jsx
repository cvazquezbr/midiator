import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner'; // Keep toaster accessible at the top level

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

// Route Protection
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// The old content of App.jsx is now in HomePage.jsx.
// This component now only serves as the main router.

function App() {
  return (
    <>
      {/* The Toaster from sonner should be available on all pages */}
      {/* It's also in the original App, so maybe it's duplicated. Let's keep it here for now. */}
      {/* <Toaster richColors position="top-center" /> */}
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected Routes for standard users */}
        {/* The ProtectedRoute component will handle the auth check */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          {/* Other protected routes for standard users can be added here */}
        </Route>

        {/* Protected Routes for admin users */}
        {/* The AdminRoute component will handle the auth and role check */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/users" element={<AdminDashboardPage />} />
          {/* Other admin-only routes can be added here */}
        </Route>

        {/* Fallback for non-matching routes */}
        <Route path="*" element={
          <div style={{ padding: '2rem' }}>
            <h1>404 - Page Not Found</h1>
          </div>
        } />
      </Routes>
    </>
  );
}

export default App;
