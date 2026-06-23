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
import { useEffect, useMemo } from 'react';
import { FieldError, useForm, UseFormRegister } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  PricingSchemaField,
  PricingUnit,
  UpdatePricingCatalogPositionRequest,
} from '../services/pricing-catalogs.service';

type PositionFormValues = {
  key: string;
  label: string;
  unit: PricingUnit;
  netPriceEuro: string;
  vatRate: string;
  minQuantity: string;
  maxQuantity: string;
  attributes: Record<string, string>;
};

interface Props {
  open: boolean;
  fields: PricingSchemaField[];
  saving: boolean;
  onClose: () => void;
  onSave: (position: UpdatePricingCatalogPositionRequest) => void;
}

const units: PricingUnit[] = ['piece', 'm2', 'meter', 'hour', 'flat'];

function toCents(value: string): number {
  return Math.round(Number(value) * 100);
}

function toOptionalNumber(value: string): number | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }

  return Number(value);
}

function parseAttributeValue(field: PricingSchemaField, value: string): unknown {
  if (field.type === 'number') {
    return Number(value);
  }

  if (field.type === 'boolean') {
    return value === 'true';
  }

  return value;
}

function isFieldVisible(field: PricingSchemaField, values: PositionFormValues): boolean {
  if (!field.dependsOn) {
    return true;
  }

  return values.attributes[field.dependsOn.field] === String(field.dependsOn.equals);
}

function isValidNumber(value: string): boolean {
  return Number.isFinite(Number(value));
}

export function PricingCatalogPositionDialog(props: Props): JSX.Element {
  const { open, fields, saving, onClose, onSave } = props;
  const { t } = useTranslation();

  const defaultValues = useMemo<PositionFormValues>(
    () => ({
      key: '',
      label: '',
      unit: 'piece',
      netPriceEuro: '',
      vatRate: '0.19',
      minQuantity: '',
      maxQuantity: '',
      attributes: Object.fromEntries(fields.map((field) => [field.name, ''])),
    }),
    [fields],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PositionFormValues>({
    defaultValues,
    mode: 'onChange',
  });

  const values = watch();

  useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [defaultValues, open, reset]);

  const onSubmit = (formValues: PositionFormValues): void => {
    const attributes = Object.fromEntries(
      fields
        .filter((field) => isFieldVisible(field, formValues))
        .filter((field) => formValues.attributes[field.name]?.trim().length > 0)
        .map((field) => [
          field.name,
          parseAttributeValue(field, formValues.attributes[field.name]),
        ]),
    );

    onSave({
      key: formValues.key,
      label: formValues.label,
      unit: formValues.unit,
      netPriceCents: toCents(formValues.netPriceEuro),
      vatRate: Number(formValues.vatRate),
      minQuantity: toOptionalNumber(formValues.minQuantity),
      maxQuantity: toOptionalNumber(formValues.maxQuantity),
      attributes,
      surcharges: [],
    });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>{t('pricing.positionDialog.title')}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={t('pricing.positionDialog.fields.key')}
            fullWidth
            {...register('key', { required: t('validation.required') })}
            error={!!errors.key}
            helperText={errors.key?.message}
            disabled={saving}
          />

          <TextField
            label={t('pricing.positionDialog.fields.label')}
            fullWidth
            {...register('label', { required: t('validation.required') })}
            error={!!errors.label}
            helperText={errors.label?.message}
            disabled={saving}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label={t('pricing.positionDialog.fields.unit')}
              fullWidth
              defaultValue="piece"
              {...register('unit', { required: t('validation.required') })}
              disabled={saving}
            >
              {units.map((unit) => (
                <MenuItem key={unit} value={unit}>
                  {unit}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              type="number"
              label={t('pricing.positionDialog.fields.netPrice')}
              fullWidth
              inputProps={{
                min: 0,
                step: 0.01,
              }}
              {...register('netPriceEuro', {
                required: t('validation.required'),
                min: {
                  value: 0,
                  message: t('pricing.positionDialog.validation.min', { min: 0 }),
                },
                validate: (value) =>
                  isValidNumber(value) || t('pricing.positionDialog.validation.invalidNumber'),
              })}
              error={!!errors.netPriceEuro}
              helperText={errors.netPriceEuro?.message}
              disabled={saving}
            />

            <TextField
              type="number"
              label={t('pricing.positionDialog.fields.vatRate')}
              fullWidth
              inputProps={{
                min: 0,
                max: 1,
                step: 0.01,
              }}
              {...register('vatRate', {
                required: t('validation.required'),
                min: {
                  value: 0,
                  message: t('pricing.positionDialog.validation.min', { min: 0 }),
                },
                max: {
                  value: 1,
                  message: t('pricing.positionDialog.validation.max', { max: 1 }),
                },
                validate: (value) =>
                  isValidNumber(value) || t('pricing.positionDialog.validation.invalidNumber'),
              })}
              error={!!errors.vatRate}
              helperText={errors.vatRate?.message}
              disabled={saving}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              type="number"
              label={t('pricing.positionDialog.fields.minQuantity')}
              fullWidth
              inputProps={{
                min: 0,
                step: 1,
              }}
              {...register('minQuantity', {
                validate: (value) =>
                  value.trim().length === 0 ||
                  isValidNumber(value) ||
                  t('pricing.positionDialog.validation.invalidNumber'),
              })}
              error={!!errors.minQuantity}
              helperText={errors.minQuantity?.message}
              disabled={saving}
            />

            <TextField
              type="number"
              label={t('pricing.positionDialog.fields.maxQuantity')}
              fullWidth
              inputProps={{
                min: 0,
                step: 1,
              }}
              {...register('maxQuantity', {
                validate: (value) =>
                  value.trim().length === 0 ||
                  isValidNumber(value) ||
                  t('pricing.positionDialog.validation.invalidNumber'),
              })}
              error={!!errors.maxQuantity}
              helperText={errors.maxQuantity?.message}
              disabled={saving}
            />
          </Stack>

          {fields.length === 0 ? (
            <Alert severity="info">{t('pricing.positionDialog.noSchemaFields')}</Alert>
          ) : null}

          {fields.map((field) =>
            isFieldVisible(field, values) ? (
              <DynamicAttributeField
                key={field.name}
                field={field}
                register={register}
                error={errors.attributes?.[field.name]}
                disabled={saving}
              />
            ) : null,
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button variant="text" onClick={onClose} disabled={saving}>
          {t('pricing.positionDialog.cancel')}
        </Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={saving}>
          {saving ? t('pricing.positionDialog.saving') : t('pricing.positionDialog.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DynamicAttributeField(props: {
  field: PricingSchemaField;
  register: UseFormRegister<PositionFormValues>;
  error?: FieldError;
  disabled: boolean;
}): JSX.Element {
  const { field, register, error, disabled } = props;
  const { t } = useTranslation();

  const validation = {
    required: field.required ? t('validation.required') : false,
    validate: (value: string) => {
      if (!value) {
        return true;
      }

      if (field.type === 'number') {
        const numberValue = Number(value);

        if (!Number.isFinite(numberValue)) {
          return t('pricing.positionDialog.validation.invalidNumber');
        }

        if (field.min !== undefined && numberValue < field.min) {
          return t('pricing.positionDialog.validation.min', { min: field.min });
        }

        if (field.max !== undefined && numberValue > field.max) {
          return t('pricing.positionDialog.validation.max', { max: field.max });
        }
      }

      return true;
    },
  };

  if (field.type === 'enum') {
    return (
      <TextField
        select
        label={field.name}
        fullWidth
        defaultValue=""
        {...register(`attributes.${field.name}`, validation)}
        error={!!error}
        helperText={error?.message}
        disabled={disabled}
      >
        <MenuItem value="">{t('pricing.positionDialog.emptyValue')}</MenuItem>
        {(field.values ?? []).map((value) => (
          <MenuItem key={value} value={value}>
            {value}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (field.type === 'boolean') {
    return (
      <TextField
        select
        label={field.name}
        fullWidth
        defaultValue=""
        {...register(`attributes.${field.name}`, validation)}
        error={!!error}
        helperText={error?.message}
        disabled={disabled}
      >
        <MenuItem value="">{t('pricing.positionDialog.emptyValue')}</MenuItem>
        <MenuItem value="true">{t('common.yes')}</MenuItem>
        <MenuItem value="false">{t('common.no')}</MenuItem>
      </TextField>
    );
  }

  if (field.type === 'number') {
    return (
      <TextField
        type="number"
        label={field.name}
        fullWidth
        inputProps={{
          min: field.min,
          max: field.max,
          step: 1,
        }}
        {...register(`attributes.${field.name}`, validation)}
        error={!!error}
        helperText={error?.message}
        disabled={disabled}
      />
    );
  }

  return (
    <TextField
      label={field.name}
      fullWidth
      {...register(`attributes.${field.name}`, validation)}
      error={!!error}
      helperText={error?.message}
      disabled={disabled}
    />
  );
}
