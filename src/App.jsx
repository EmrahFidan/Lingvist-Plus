import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LingvistFlashcard from './components/LingvistFlashcard';
import MinimalSideNav from './components/MinimalSideNav';
import AddDataPage from './pages/AddDataPage';
import ManageDataPage from './pages/ManageDataPage';
import SettingsPage from './pages/SettingsPage';
import GamePage from './pages/GamePage';
import AuthPage from './components/Auth/AuthPage';
import { Box, IconButton, CircularProgress } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { useAuth } from './contexts/AuthContext';
import useSettingsStore from './stores/useSettingsStore';

function App() {
  const [sideNavOpen, setSideNavOpen] = useState(window.innerWidth > 768);
  const { user, loading } = useAuth();
  const checkDailyReset = useSettingsStore((state) => state.checkDailyReset);

  // Uygulama başladığında günlük sıfırlamayı kontrol et
  useEffect(() => {
    if (user) {
      checkDailyReset();
    }
  }, [user, checkDailyReset]);

  const handleSideNavToggle = () => {
    setSideNavOpen(!sideNavOpen);
  };

  // Loading durumunda spinner göster
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Kullanıcı giriş yapmamışsa auth sayfasına yönlendir
  if (!user) {
    return (
      <Layout>
        <AuthPage />
      </Layout>
    );
  }

  return (
    <Layout>
      <MinimalSideNav
        open={sideNavOpen}
        onToggle={handleSideNavToggle}
      />

      {/* Menu Toggle Button - Always Visible */}
      {!sideNavOpen && (
        <IconButton
          onClick={handleSideNavToggle}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 1300,
            backgroundColor: 'background.paper',
            color: 'primary.main',
            boxShadow: 2,
            '&:hover': {
              backgroundColor: 'rgba(96, 165, 250, 0.1)',
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Ana İçerik */}
      <Box
        component="main"
        sx={{
          ml: sideNavOpen ? '280px' : '0px',
          transition: 'margin-left 0.3s ease',
          minHeight: '100vh',
          '@media (max-width: 768px)': {
            ml: 0,
          }
        }}
      >
        <Routes>
          <Route path="/" element={<LingvistFlashcard />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/add-data" element={<AddDataPage />} />
          <Route path="/manage-data" element={<ManageDataPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Box>
    </Layout>
  );
}

export default App;