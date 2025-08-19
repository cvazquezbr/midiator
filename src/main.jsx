import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Existing Providers
import { TemplateProvider } from './context/TemplateContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx'; // This is for Google Drive
import ErrorBoundary from './components/ErrorBoundary.jsx';

// New Auth Provider for Application Users
import { UserAuthContextProvider } from './context/UserAuthContext.jsx';

import './index.css';
import App from './App.jsx';

// The Google Client ID from the environment variable, exposed by Vite
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!googleClientId) {
  // This will show a warning in the browser console if the env var is missing.
  console.warn("VITE_GOOGLE_CLIENT_ID environment variable not set. Google Sign-In will not work.");
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={googleClientId}>
        <BrowserRouter>
          <UserAuthContextProvider>
            {/* This AuthProvider is for the Google Drive API, not user authentication */}
            <AuthProvider>
              <TemplateProvider>
                <App />
              </TemplateProvider>
            </AuthProvider>
          </UserAuthContextProvider>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
