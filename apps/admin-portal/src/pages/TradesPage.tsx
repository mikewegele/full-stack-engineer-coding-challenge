import {
  Alert,
  Box,
  Chip,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../services/api.service';
import { listTrades, TradeConfigResponse } from '../services/trades.service';
import { AppButton } from '../components/button/AppButton';
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';
import { SchemaEditorDialog } from './trades/SchemaEditorDialog';

/**
 * Read-only trade list. Shows the *current* state of each trade's pricing
 * schema (read from `metadata.pricingSchema`, the temporary holding spot
 * until the candidate adds a typed `pricingSchema` column on TradeConfig).
 *
 * The candidate's job is to:
 *   1. Add a typed `pricingSchema` field to TradeConfig (backend).
 *   2. Add `PATCH /trades/:trade` (ADMIN) that updates it.
 *   3. Add a structured editor UI here (or a child route) for managing the
 *      schema's fields (name, type, required, min/max, enum values, dependsOn).
 *   4. Surface validation errors from the backend in the UI.
 */
export function TradesPage(): JSX.Element {
  const { t } = useTranslation();
  const [trades, setTrades] = useState<TradeConfigResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<TradeConfigResponse | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    listTrades()
      .then(setTrades)
      .catch((err: unknown) => {
        const message = err instanceof ApiError ? err.message : t('trades.loadFailed');
        setError(message);
      });
  }, [t]);

  const updateTrade = useCallback(
    (updatedTrade: TradeConfigResponse): void => {
      setTrades(
        (current) =>
          current?.map((trade) => (trade.trade === updatedTrade.trade ? updatedTrade : trade)) ??
          null,
      );

      setSelectedTrade(null);
      setSuccessMessage(t('trades.schemaEditor.saveSuccess'));
    },
    [t],
  );

  const closeSuccessMessage = useCallback((): void => {
    setSuccessMessage(null);
  }, []);

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!trades) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="text" width={240} height={48} />
        <Skeleton variant="rounded" height={320} />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h1">{t('trades.heading')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('trades.subheading')}
        </Typography>
      </Stack>

      {trades.length === 0 ? (
        <Paper sx={{ p: 4 }}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {t('trades.emptyState')}
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>{t('trades.columns.code')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('trades.columns.displayName')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">
                    {t('trades.columns.isActive')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    {t('trades.columns.fieldCount')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    {t('trades.columns.action')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trades.map((trade) => (
                  <TableRow key={trade.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {trade.trade}
                      </Typography>
                    </TableCell>
                    <TableCell>{trade.displayName}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={trade.isActive ? '✓' : '—'}
                        size="small"
                        color={trade.isActive ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">{countSchemaFields(trade.pricingSchema)}</TableCell>
                    <TableCell align="right">
                      <AppButton
                        label={t('trades.actions.editSchema')}
                        variant="outlined"
                        size="small"
                        startIcon={<ModeEditOutlineOutlinedIcon />}
                        onClick={() => setSelectedTrade(trade)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      <SchemaEditorDialog
        trade={selectedTrade}
        open={selectedTrade !== null}
        onClose={() => setSelectedTrade(null)}
        onSaved={updateTrade}
      />
      <Snackbar
        open={successMessage !== null}
        autoHideDuration={2000}
        onClose={closeSuccessMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={closeSuccessMessage}>
          {successMessage}
        </Alert>
      </Snackbar>

      {/*
        TODO (candidate): per-trade detail / edit view goes here. Suggested:
        click a row → opens a side panel or child route at /trades/:code
        with the structured schema editor.
      */}
      <Box />
    </Stack>
  );
}

/**
 * Reads `metadata.pricingSchema.fields[]` if present and returns the field
 * count. Returns 0 if no schema is configured yet.
 *
 * Exported for testing — see TradesPage.spec.ts.
 */
export function countSchemaFields(pricingSchema: unknown): number {
  const schema = pricingSchema as { fields?: unknown[] } | null | undefined;

  if (!schema || !Array.isArray(schema.fields)) {
    return 0;
  }

  return schema.fields.length;
}
