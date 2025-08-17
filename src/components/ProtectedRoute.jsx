import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
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

  if (loading) {
    // Show a full-screen loading indicator while checking for an active session.
    return <LoadingDialog open={true} title="Verificando sessão..." description="Aguarde um momento." />;
  }

  if (!user) {
    // The `replace` prop is used to replace the current entry in the history stack,
    // so the user won't be able to navigate back to the protected route after logging in.
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the child routes defined within this protected route.
  return <Outlet />;
};

export default ProtectedRoute;
