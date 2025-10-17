import React from 'react';
import LoginPage from '../../src/pages/LoginPage';
import { AuthProvider } from '../../src/context/UserAuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { SettingsProvider } from '../../src/context/SettingsContext';

const LoginTest = () => {
  return (
    <GoogleOAuthProvider clientId="test">
      <AuthProvider>
        <SettingsProvider>
          <LoginPage />
        </SettingsProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
};

export default LoginTest;