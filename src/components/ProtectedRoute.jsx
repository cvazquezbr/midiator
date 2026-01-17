import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';
import LoadingDialog from './LoadingDialog';

/**
 * A component to protect routes that require authentication.
 * It checks the user's authentication state from UserAuthContext.
 *
 * If the user is authenticated, it renders the child route (`Outlet`).
 * If the user is not authenticated, it redirects them to the /login page.
 * If the authentication state is still loading, it shows a loading indicator.
 */
const ProtectedRoute = () => {
  const { user, loading } = useUserAuth();
  const location = useLocation();

  if (loading) {
    // Show a full-screen loading indicator while checking for an active session.
    return <LoadingDialog open={true} title="Verificando sessão..." description="Aguarde um momento." />;
  }

  if (!user) {
    // Pass the current location to the login page so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render the child routes defined within this protected route.
  return <Outlet />;
};

export default ProtectedRoute;
