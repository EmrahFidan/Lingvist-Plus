import { Box, Typography, Slider, Button, Paper, Snackbar, Alert, Grid } from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';
import useSettingsStore from '../stores/useSettingsStore';
import { themes } from '../theme/themes';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SettingsPage = () => {
  const {
    targetGoal,
    setTargetGoal,
    theme,
    setTheme
  } = useSettingsStore();

  const { logout, user } = useAuth();

  const [sliderValue, setSliderValue] = useState(targetGoal);
  const [maxCards, setMaxCards] = useState(200);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const handleSliderChange = (event, newValue) => {
    setSliderValue(newValue);
  };

  const handleSave = () => {
    setTargetGoal(sliderValue);
    setSnackbarOpen(true);
  };

  const handleThemeClick = (themeName) => {
    setTheme(themeName);
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h3" gutterBottom sx={{ color: 'text.primary', mb: 4, textAlign: 'center', fontWeight: 'bold' }}>
        Ayarlar
      </Typography>

      {/* Kullanıcı Bilgisi ve Çıkış */}
      <Paper sx={{ p: 3, backgroundColor: 'background.paper', borderRadius: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Hoş geldin,
            </Typography>
            <Typography variant="h6" sx={{ color: 'text.primary' }}>
              {user?.displayName || user?.email}
            </Typography>
          </Box>
          <Button
            onClick={handleLogout}
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
          >
            Çıkış Yap
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 4, backgroundColor: 'background.paper', borderRadius: 3 }}>
        <Typography variant="h6" sx={{ color: 'text.secondary', mb: 3, textAlign: 'center' }}>
          Günlük Kart Hedefi
        </Typography>

        {/* Hedef Değeri Gösterimi */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
            {sliderValue}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            kart / gün
          </Typography>
        </Box>

        {/* Slider */}
        <Box sx={{ px: 3, mb: 4 }}>
          <Slider
            value={sliderValue}
            onChange={handleSliderChange}
            min={1}
            max={maxCards}
            step={1}
            marks={[
              { value: 1, label: '1' },
              { value: 50, label: '50' },
              { value: 100, label: '100' },
              { value: 150, label: '150' },
              { value: 200, label: '200' }
            ]}
            valueLabelDisplay="auto"
            sx={{
              color: 'secondary.main',
              '& .MuiSlider-thumb': {
                width: 24,
                height: 24,
                backgroundColor: 'secondary.main',
                '&:hover': {
                  boxShadow: '0 0 0 8px rgba(96, 165, 250, 0.16)',
                },
              },
              '& .MuiSlider-track': {
                backgroundColor: 'secondary.main',
                border: 'none',
                height: 8,
              },
              '& .MuiSlider-rail': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                height: 8,
              },
              '& .MuiSlider-mark': {
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                width: 3,
                height: 3,
              },
              '& .MuiSlider-markActive': {
                backgroundColor: 'secondary.main',
              },
            }}
          />
        </Box>

        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          fullWidth
          sx={{ py: 1.5 }}
        >
          Kaydet
        </Button>
      </Paper>

      {/* Tema Seçimi */}
      <Paper sx={{ p: 4, backgroundColor: 'background.paper', borderRadius: 3, mt: 4 }}>
        <Typography variant="h6" sx={{ color: 'text.secondary', mb: 3, textAlign: 'center' }}>
          Tema Seçimi
        </Typography>

        <Grid container spacing={2} justifyContent="center">
          {Object.entries(themes).map(([key, themeData]) => (
            <Grid item xs={6} sm={4} md={2.4} key={key}>
              <Box
                onClick={() => handleThemeClick(key)}
                sx={{
                  position: 'relative',
                  borderRadius: 2,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: theme === key ? '3px solid' : '2px solid',
                  borderColor: theme === key ? 'primary.main' : 'rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    borderColor: 'primary.main',
                  }
                }}
              >
                {/* Tema Önizleme */}
                <Box
                  sx={{
                    height: 100,
                    background: `linear-gradient(135deg, ${themeData.colors.background} 0%, ${themeData.colors.paper} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {theme === key && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ccc9dc',
                        fontSize: '14px',
                      }}
                    >
                      ✓
                    </Box>
                  )}
                </Box>

                {/* Tema İsmi */}
                <Box
                  sx={{
                    p: 1.5,
                    backgroundColor: themeData.colors.sidebar,
                    textAlign: 'center',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.primary',
                      fontWeight: theme === key ? 'bold' : 'normal',
                      fontSize: '0.75rem',
                    }}
                  >
                    {themeData.name}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Snackbar Bildirimi */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        TransitionProps={{
          enter: true,
          exit: true,
        }}
        sx={{
          '& .MuiSnackbar-root': {
            top: '24px',
            right: '24px',
          }
        }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          sx={{
            width: '100%',
            boxShadow: 3,
          }}
        >
          Günlük kart hedefi güncellendi: {sliderValue} kart
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsPage;
