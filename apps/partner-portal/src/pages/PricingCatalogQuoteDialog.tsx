import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../services/api.service';
import {
  createPricingCatalogQuote,
  PricingCatalogVersionResponse,
  PricingSchemaField,
  QuoteResult,
} from '../services/pricing-catalogs.service';

type QuoteFormValues = {
  positionKey: string;
  quantity: string;
};

interface Props {
  open: boolean;
  catalog: PricingCatalogVersionResponse | null;
  fields: PricingSchemaField[];
  onClose: () => void;
}

function formatCents(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value / 100);
}

function isValidNumber(value: string): boolean {
  return Number.isFinite(Number(value));
}

function calculateTotalSurchargeCents(result: QuoteResult): number {
  return result.lines.reduce(
    (sum, line) =>
      sum +
      line.appliedSurcharges.reduce(
        (surchargeSum, surcharge) => surchargeSum + surcharge.amountCents,
        0,
      ),
    0,
  );
}

export function PricingCatalogQuoteDialog(props: Props): JSX.Element {
  const { open, catalog, onClose } = props;
  const { t } = useTranslation();

  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  const defaultValues = useMemo<QuoteFormValues>(
    () => ({
      positionKey: catalog?.positions[0]?.key ?? '',
      quantity: '1',
    }),
    [catalog?.positions],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuoteFormValues>({
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setQuoteResult(null);
      setQuoteError(null);
    }
  }, [defaultValues, open, reset]);

  const closeDialog = (): void => {
    if (calculating) {
      return;
    }

    setQuoteResult(null);
    setQuoteError(null);
    reset(defaultValues);
    onClose();
  };

  const onSubmit = async (formValues: QuoteFormValues): Promise<void> => {
    if (!catalog) {
      return;
    }

    setCalculating(true);
    setQuoteError(null);
    setQuoteResult(null);

    try {
      const result = await createPricingCatalogQuote(catalog.id, {
        lines: [
          {
            positionKey: formValues.positionKey,
            quantity: Number(formValues.quantity),
          },
        ],
      });

      setQuoteResult(result);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : t('pricing.quote.messages.failed');
      setQuoteError(message);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="md">
      <DialogTitle>{t('pricing.quote.title')}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {!catalog || catalog.positions.length === 0 ? (
            <Alert severity="info">{t('pricing.quote.empty')}</Alert>
          ) : (
            <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label={t('pricing.quote.fields.position')}
                  fullWidth
                  defaultValue={defaultValues.positionKey}
                  {...register('positionKey', { required: t('validation.required') })}
                  error={!!errors.positionKey}
                  helperText={errors.positionKey?.message}
                  disabled={calculating}
                >
                  {catalog.positions.map((position) => (
                    <MenuItem key={position.key} value={position.key}>
                      {position.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  type="number"
                  label={t('pricing.quote.fields.quantity')}
                  fullWidth
                  inputProps={{
                    min: 1,
                    step: 1,
                  }}
                  {...register('quantity', {
                    required: t('validation.required'),
                    min: {
                      value: 1,
                      message: t('pricing.positionDialog.validation.min', { min: 1 }),
                    },
                    validate: (value) => {
                      const numberValue = Number(value);

                      if (!isValidNumber(value)) {
                        return t('pricing.positionDialog.validation.invalidNumber');
                      }

                      if (!Number.isInteger(numberValue)) {
                        return t('pricing.quote.validation.integer');
                      }

                      return true;
                    },
                  })}
                  error={!!errors.quantity}
                  helperText={errors.quantity?.message}
                  disabled={calculating}
                />
              </Stack>

              <Button
                variant="contained"
                onClick={handleSubmit(onSubmit)}
                disabled={calculating}
                sx={{ alignSelf: 'flex-start' }}
              >
                {calculating ? t('pricing.quote.calculating') : t('pricing.quote.calculate')}
              </Button>
            </>
          )}

          {quoteError ? <Alert severity="error">{quoteError}</Alert> : null}

          {quoteResult ? <QuoteResultView result={quoteResult} /> : null}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button variant="text" onClick={closeDialog} disabled={calculating}>
          {t('pricing.quote.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function QuoteResultView(props: { result: QuoteResult }): JSX.Element {
  const { result } = props;
  const { t } = useTranslation();

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h3">{t('pricing.quote.result.title')}</Typography>

        <Stack spacing={1}>
          <ResultRow
            label={t('pricing.quote.result.subtotalNet')}
            value={formatCents(result.totals.netCents)}
          />
          <ResultRow
            label={t('pricing.quote.result.surcharge')}
            value={formatCents(calculateTotalSurchargeCents(result))}
          />
          <ResultRow
            label={t('pricing.quote.result.discount')}
            value={formatCents(result.totals.discountCents)}
          />
          <Divider />
          <ResultRow
            label={t('pricing.quote.result.totalNet')}
            value={formatCents(result.totals.netCents)}
          />
          <ResultRow
            label={t('pricing.quote.result.vat')}
            value={formatCents(result.totals.vatCents)}
          />
          <ResultRow
            label={t('pricing.quote.result.totalGross')}
            value={formatCents(result.totals.grossCents)}
            strong
          />
        </Stack>

        {result.lines.length > 0 ? (
          <Stack spacing={1}>
            <Typography variant="h4">{t('pricing.quote.result.lines')}</Typography>
            {result.lines.map((line) => (
              <Paper key={line.positionKey} variant="outlined" sx={{ p: 1.5 }}>
                <Stack spacing={0.5}>
                  <Typography variant="body1">{line.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('pricing.quote.result.lineSummary', {
                      quantity: line.quantity,
                      net: formatCents(line.netCents),
                      gross: formatCents(line.grossCents),
                    })}
                  </Typography>
                </Stack>
              </Paper>
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}

function ResultRow(props: { label: string; value: string; strong?: boolean }): JSX.Element {
  const { label, value, strong = false } = props;

  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" fontWeight={strong ? 700 : 400}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={strong ? 700 : 400}>
        {value}
      </Typography>
    </Stack>
  );
}
