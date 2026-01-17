import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';
import LoadingDialog from './LoadingDialog';

/**
 * A component to protect routes that require admin privileges.
 * It builds on the idea of ProtectedRoute but adds a role check.
 */
const AdminRoute = () => {
  const { user, loading } = useUserAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingDialog open={true} title="Verificando permissões..." description="Aguarde um momento." />;
  }

  // First, check if there is a user. If not, they can't be an admin.
  // Redirect to login.
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Then, check if the logged-in user has the 'admin' role.
  if (user.role !== 'admin') {
    // If the user is logged in but not an admin, redirect them to the home page.
    // It's often better to redirect than to show a "Forbidden" error.
    return <Navigate to="/" replace />;
  }

  // If authenticated and is an admin, render the child routes.
  return <Outlet />;
};

export default AdminRoute;
