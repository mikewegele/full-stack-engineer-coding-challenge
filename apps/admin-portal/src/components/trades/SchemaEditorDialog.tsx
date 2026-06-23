import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography, } from '@mui/material';
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
import { parseEnumValues, validatePricingSchemaFields } from './schema-editor.utils';
import { removeEnumValueInput, reorderEnumValueInputs } from './schema-editor-dialog.utils';
import { SchemaEditorFieldCard } from './SchemaEditorFieldCard';

interface Props {
  trade: TradeConfigResponse | null;
  open: boolean;
  onClose: () => void;
  onSaved: (trade: TradeConfigResponse) => void;
}

export function SchemaEditorDialog(props: Props): JSX.Element {
  const { trade, open, onClose, onSaved } = props;
  const { t } = useTranslation();

  const [fields, setFields] = useState<PricingSchemaField[]>([]);
  const [enumValueInputs, setEnumValueInputs] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const validationError = useMemo((): string | null => {
    const validation = validatePricingSchemaFields(fields);

    if (validation.valid) {
      return null;
    }

    return t(validation.messageKey, { defaultValue: validation.messageKey });
  }, [fields, t]);

  useEffect(() => {
    if (!trade) {
      setFields([]);
      setEnumValueInputs({});
      setError(null);
      setSubmitted(false);
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
    setSubmitted(false);
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

  const updateDependsOnField = useCallback(
    (index: number, dependsOnField: string): void => {
      if (!dependsOnField) {
        updateField(index, {
          dependsOn: undefined,
        });
        return;
      }

      updateField(index, {
        dependsOn: {
          field: dependsOnField,
          equals: fields[index]?.dependsOn?.equals ?? '',
        },
      });
    },
    [fields, updateField],
  );

  const updateDependsOnEquals = useCallback(
    (index: number, equals: string): void => {
      const dependsOnField = fields[index]?.dependsOn?.field;

      if (!dependsOnField) {
        return;
      }

      updateField(index, {
        dependsOn: {
          field: dependsOnField,
          equals,
        },
      });
    },
    [fields, updateField],
  );

  const removeField = useCallback((index: number): void => {
    setFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index));
    setEnumValueInputs((current) => removeEnumValueInput(current, index));
  }, []);

  const moveField = useCallback(
    (index: number, direction: -1 | 1): void => {
      const targetIndex = index + direction;

      setFields((current) => {
        if (targetIndex < 0 || targetIndex >= current.length) {
          return current;
        }

        const next = [...current];
        const [field] = next.splice(index, 1);
        next.splice(targetIndex, 0, field);

        return next;
      });

      setEnumValueInputs((current) => {
        if (targetIndex < 0 || targetIndex >= fields.length) {
          return current;
        }

        return reorderEnumValueInputs(current, index, targetIndex);
      });
    },
    [fields.length],
  );

  const save = useCallback(async (): Promise<void> => {
    setSubmitted(true);
    setError(null);

    if (!trade || validationError) {
      return;
    }

    setSaving(true);

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

          <If condition={submitted && error === null && validationError !== null}>
            <Alert severity="error">{validationError}</Alert>
          </If>

          <If condition={fields.length === 0}>
            <Alert severity="info">{t('trades.schemaEditor.emptyState')}</Alert>
          </If>

          <If condition={fields.length > 0}>
            <Stack spacing={2}>
              {fields.map((field, index) => (
                <SchemaEditorFieldCard
                  key={index}
                  field={field}
                  fields={fields}
                  index={index}
                  enumValueInput={enumValueInputs[index] ?? ''}
                  showValidationErrors={submitted}
                  onUpdateField={updateField}
                  onUpdateFieldType={updateFieldType}
                  onUpdateEnumValues={updateEnumValues}
                  onUpdateDependsOnField={updateDependsOnField}
                  onUpdateDependsOnEquals={updateDependsOnEquals}
                  onMoveField={moveField}
                  onRemoveField={removeField}
                />
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
        <AppButton label={t('trades.schemaEditor.save')} onClick={save} disabled={saving} />
      </DialogActions>
    </Dialog>
  );
}
