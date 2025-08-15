import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TemplateProvider } from './context/TemplateContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <TemplateProvider>
          <App />
        </TemplateProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
