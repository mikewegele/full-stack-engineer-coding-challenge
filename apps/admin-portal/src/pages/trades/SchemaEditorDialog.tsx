import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../components/button/AppButton';
import { TradeConfigResponse } from '../../services/trades.service';

type SchemaEditorDialogProps = {
  trade: TradeConfigResponse | null;
  open: boolean;
  onClose: () => void;
};

export function SchemaEditorDialog(props: SchemaEditorDialogProps): JSX.Element {
  const { trade, open, onClose } = props;
  const { t } = useTranslation();

  if (!trade) {
    return <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" />;
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Stack spacing={0.5}>
          <Typography variant="h2">
            {t('trades.schemaEditor.heading', { trade: trade.trade })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {trade.displayName}
          </Typography>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent>
        <Stack spacing={2}>
          <Alert severity="info">{t('trades.schemaEditor.emptyState')}</Alert>

          <AppButton
            label={t('trades.schemaEditor.addField')}
            variant="outlined"
            onClick={() => undefined}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <AppButton label={t('trades.schemaEditor.cancel')} variant="text" onClick={onClose} />
        <AppButton label={t('trades.schemaEditor.save')} onClick={() => undefined} />
      </DialogActions>
    </Dialog>
  );
}
