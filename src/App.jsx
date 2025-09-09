import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { toast } from 'sonner';

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

// Utils
import { savePersona } from './utils/personaState';

function App() {
  useEffect(() => {
    const migrateOldPersona = async () => {
      const MIGRATION_KEY = 'persona_migration_v2_done';
      if (localStorage.getItem(MIGRATION_KEY)) {
        return;
      }

      const storedData = localStorage.getItem('campaignPrompt');
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          // Check for a valid persona object to migrate
          if (parsedData && parsedData.persona && parsedData.persona.nome) {
            console.log("Found old persona data. Attempting to migrate...");

            // The persona data is nested inside the 'persona' key
            const personaToMigrate = parsedData.persona;

            // Use the 'nome' from inside the persona object as the top-level name
            await savePersona(personaToMigrate.nome, personaToMigrate);

            toast.success("Sua persona antiga foi migrada para o novo sistema com sucesso!");
            console.log("Persona migration successful.");
          }
        } catch (e) {
          console.error("Could not parse old campaign prompt for migration, or migration failed.", e);
        } finally {
          // Set the flag regardless of success to prevent retrying on corrupted data or failed saves.
          localStorage.setItem(MIGRATION_KEY, 'true');
        }
      } else {
        // No old data found, so we can set the flag and not check again.
        localStorage.setItem(MIGRATION_KEY, 'true');
      }
    };

    migrateOldPersona();
  }, []); // Empty dependency array ensures this runs only once on mount

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
