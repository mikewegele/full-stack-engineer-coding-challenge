import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../components/button/AppButton';
import { If } from '../../components/helper/If';
import { ApiError } from '../../services/api.service';
import {
  PricingSchemaField,
  PricingSchemaFieldType,
  TradeConfigResponse,
  updateTradeConfig,
} from '../../services/trades.service';

interface Props {
  trade: TradeConfigResponse | null;
  open: boolean;
  onClose: () => void;
  onSaved: (trade: TradeConfigResponse) => void;
}

const fieldTypes: PricingSchemaFieldType[] = ['string', 'number', 'boolean', 'enum'];

function parseOptionalNumber(value: string): number | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }

  return Number(value);
}

function parseEnumValues(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function SchemaEditorDialog(props: Props): JSX.Element {
  const { trade, open, onClose, onSaved } = props;
  const { t } = useTranslation();
  const [fields, setFields] = useState<PricingSchemaField[]>([]);
  const [enumValueInputs, setEnumValueInputs] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validationError = useMemo((): string | null => {
    const names = fields.map((field) => field.name.trim());

    if (names.some((name) => name.length === 0)) {
      return t('trades.schemaEditor.validation.emptyName');
    }

    const uniqueNames = new Set(names);

    if (uniqueNames.size !== names.length) {
      return t('trades.schemaEditor.validation.duplicateName');
    }

    const invalidNumberField = fields.find(
      (field) =>
        field.type === 'number' &&
        field.min !== undefined &&
        field.max !== undefined &&
        field.min > field.max,
    );

    if (invalidNumberField) {
      return t('trades.schemaEditor.validation.invalidNumberRange');
    }

    const invalidEnumField = fields.find(
      (field) => field.type === 'enum' && (!field.values || field.values.length === 0),
    );

    if (invalidEnumField) {
      return t('trades.schemaEditor.validation.emptyEnumValues');
    }

    return null;
  }, [fields, t]);

  useEffect(() => {
    if (!trade) {
      setFields([]);
      setEnumValueInputs({});
      setError(null);
      return;
    }

    const initialFields = trade.pricingSchema?.fields ?? [];

    setFields(initialFields);
    setEnumValueInputs(
      Object.fromEntries(
        initialFields.map((field, index) => [index, (field.values ?? []).join(', ')]),
      ),
    );
    setError(null);
  }, [trade]);

  const addField = useCallback((): void => {
    setFields((current) => [
      ...current,
      {
        name: '',
        type: 'string',
        required: false,
      },
    ]);
  }, []);

  const updateField = useCallback((index: number, patch: Partial<PricingSchemaField>): void => {
    setFields((current) =>
      current.map((field, fieldIndex) => (fieldIndex === index ? { ...field, ...patch } : field)),
    );
  }, []);

  const updateFieldType = useCallback(
    (index: number, type: PricingSchemaFieldType): void => {
      updateField(index, {
        type,
        min: undefined,
        max: undefined,
        values: type === 'enum' ? [] : undefined,
      });

      if (type === 'enum') {
        setEnumValueInputs((current) => ({
          ...current,
          [index]: '',
        }));
        return;
      }

      setEnumValueInputs((current) => {
        const next = { ...current };
        delete next[index];
        return next;
      });
    },
    [updateField],
  );

  const updateEnumValues = useCallback(
    (index: number, value: string): void => {
      setEnumValueInputs((current) => ({
        ...current,
        [index]: value,
      }));

      updateField(index, {
        values: parseEnumValues(value),
      });
    },
    [updateField],
  );

  const removeField = useCallback((index: number): void => {
    setFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index));

    setEnumValueInputs((current) =>
      Object.fromEntries(
        Object.entries(current)
          .filter(([key]) => Number(key) !== index)
          .map(([key, value]) => {
            const numericKey = Number(key);

            return [numericKey > index ? numericKey - 1 : numericKey, value];
          }),
      ),
    );
  }, []);

  const save = useCallback(async (): Promise<void> => {
    if (!trade) {
      return;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await updateTradeConfig(trade.trade, {
        pricingSchema: {
          fields,
        },
      });

      onSaved(updated);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : t('trades.schemaEditor.saveFailed');
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [fields, onClose, onSaved, t, trade, validationError]);

  if (!trade) {
    return <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" />;
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
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
          <If condition={error !== null}>
            <Alert severity="error">{error}</Alert>
          </If>

          <If condition={error === null && validationError !== null}>
            <Alert severity="warning">{validationError}</Alert>
          </If>

          <If condition={fields.length === 0}>
            <Alert severity="info">{t('trades.schemaEditor.emptyState')}</Alert>
          </If>

          <If condition={fields.length > 0}>
            <Stack spacing={2}>
              {fields.map((field, index) => (
                <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <Stack
                      direction={{ xs: 'column', md: 'row' }}
                      spacing={2}
                      alignItems={{ xs: 'stretch', md: 'center' }}
                    >
                      <TextField
                        label={t('trades.schemaEditor.fields.name')}
                        value={field.name}
                        onChange={(event) => updateField(index, { name: event.target.value })}
                        fullWidth
                      />

                      <TextField
                        select
                        label={t('trades.schemaEditor.fields.type')}
                        value={field.type}
                        onChange={(event) =>
                          updateFieldType(index, event.target.value as PricingSchemaFieldType)
                        }
                        fullWidth
                      >
                        {fieldTypes.map((type) => (
                          <MenuItem key={type} value={type}>
                            {t(`trades.schemaEditor.fieldTypes.${type}`)}
                          </MenuItem>
                        ))}
                      </TextField>

                      <TextField
                        select
                        label={t('trades.schemaEditor.fields.required')}
                        value={field.required ? 'true' : 'false'}
                        onChange={(event) =>
                          updateField(index, {
                            required: event.target.value === 'true',
                          })
                        }
                        fullWidth
                      >
                        <MenuItem value="false">{t('common.no')}</MenuItem>
                        <MenuItem value="true">{t('common.yes')}</MenuItem>
                      </TextField>

                      <IconButton
                        aria-label={t('trades.schemaEditor.removeField')}
                        onClick={() => removeField(index)}
                      >
                        <DeleteOutlineOutlinedIcon />
                      </IconButton>
                    </Stack>

                    <If condition={field.type === 'number'}>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <TextField
                          label={t('trades.schemaEditor.fields.min')}
                          type="number"
                          value={field.min ?? ''}
                          onChange={(event) =>
                            updateField(index, {
                              min: parseOptionalNumber(event.target.value),
                            })
                          }
                          fullWidth
                        />

                        <TextField
                          label={t('trades.schemaEditor.fields.max')}
                          type="number"
                          value={field.max ?? ''}
                          onChange={(event) =>
                            updateField(index, {
                              max: parseOptionalNumber(event.target.value),
                            })
                          }
                          fullWidth
                        />
                      </Stack>
                    </If>

                    <If condition={field.type === 'enum'}>
                      <TextField
                        label={t('trades.schemaEditor.fields.values')}
                        value={enumValueInputs[index] ?? ''}
                        onChange={(event) => updateEnumValues(index, event.target.value)}
                        helperText={t('trades.schemaEditor.valuesHelp')}
                        fullWidth
                      />
                    </If>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </If>

          <AppButton
            label={t('trades.schemaEditor.addField')}
            variant="outlined"
            onClick={addField}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <AppButton label={t('trades.schemaEditor.cancel')} variant="text" onClick={onClose} />
        <AppButton
          label={t('trades.schemaEditor.save')}
          onClick={save}
          disabled={saving || validationError !== null}
        />
      </DialogActions>
    </Dialog>
  );
}
