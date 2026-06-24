import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../../services/api.service';
import {
  createPricingCatalogQuote,
  PricingCatalogVersionResponse,
  PricingSchemaField,
  QuoteResult,
} from '../../../services/pricing-catalogs.service';
import { PricingCatalogQuoteResultView } from './PricingCatalogQuoteResultView';
import { isValidNumber, QuoteFormValues } from './pricing-catalog-quote-dialog.utils';

interface Props {
  open: boolean;
  catalog: PricingCatalogVersionResponse | null;
  fields: PricingSchemaField[];
  onClose: () => void;
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

          {quoteResult ? <PricingCatalogQuoteResultView result={quoteResult} /> : null}
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
