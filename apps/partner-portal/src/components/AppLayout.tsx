import { AppBar, Box, Button, MenuItem, Select, SelectChangeEvent, Stack, Toolbar, Typography, } from '@mui/material';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AppLayoutProps {
  children: ReactNode;
}

function isActivePath(pathname: string, target: string): boolean {
  return pathname === target;
}

function getLanguageValue(language: string): string {
  return language.startsWith('de') ? 'de' : 'en';
}

export function AppLayout({ children }: AppLayoutProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();

  const changeLanguage = async (event: SelectChangeEvent): Promise<void> => {
    await i18n.changeLanguage(event.target.value);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h3" sx={{ flexGrow: 1, color: 'common.white' }}>
            {t('app.title')}
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              component={RouterLink}
              to="/profile"
              sx={{
                color: 'common.white',
                textDecoration: isActivePath(location.pathname, '/profile') ? 'underline' : 'none',
              }}
            >
              {t('nav.profile')}
            </Button>

            <Button
              component={RouterLink}
              to="/pricing"
              sx={{
                color: 'common.white',
                textDecoration: isActivePath(location.pathname, '/pricing') ? 'underline' : 'none',
              }}
            >
              {t('nav.pricing')}
            </Button>

            <Select
              value={getLanguageValue(i18n.language)}
              onChange={changeLanguage}
              size="small"
              sx={{
                color: 'common.white',
                minWidth: 84,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.6)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'common.white',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'common.white',
                },
                '& .MuiSvgIcon-root': {
                  color: 'common.white',
                },
              }}
            >
              <MenuItem value="de">DE</MenuItem>
              <MenuItem value="en">EN</MenuItem>
            </Select>

            {user && (
              <Button onClick={logout} sx={{ color: 'common.white' }}>
                {t('nav.logout')}
              </Button>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: 960, mx: 'auto', p: { xs: 2, md: 4 } }}>{children}</Box>
    </Box>
  );
}
