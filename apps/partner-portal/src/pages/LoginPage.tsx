import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LoginForm {
  email: string;
  password: string;
}

export function LoginPage(): JSX.Element {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ defaultValues: { email: '', password: '' } });

  const onSubmit = async (values: LoginForm): Promise<void> => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      await login(values.email, values.password);
      navigate('/pricing');
    } catch {
      setSubmitError(t('login.errors.invalidCredentials'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 420, width: '100%' }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h1">{t('login.heading')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('login.subheading')}
            </Typography>
          </Stack>

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2}>
              <TextField
                label={t('login.email')}
                type="email"
                fullWidth
                {...register('email', {
                  required: t('login.errors.required') ?? '',
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: t('login.errors.email'),
                  },
                })}
                error={!!errors.email}
                helperText={errors.email?.message}
              />

              <TextField
                label={t('login.password')}
                type="password"
                fullWidth
                {...register('password', {
                  required: t('login.errors.required') ?? '',
                })}
                error={!!errors.password}
                helperText={errors.password?.message}
              />

              {submitError ? <Alert severity="error">{submitError}</Alert> : null}

              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? t('login.submitting') : t('login.submit')}
              </Button>

              <Typography variant="caption" color="text.secondary">
                {t('login.hint')}
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
