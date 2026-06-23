import { MenuItem, TextField } from '@mui/material';
import { FieldError, UseFormRegister } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { PricingSchemaField } from '../../../services/pricing-catalogs.service';
import { PositionFormValues } from './pricing-catalog-position-dialog.utils';

interface Props {
  field: PricingSchemaField;
  register: UseFormRegister<PositionFormValues>;
  error?: FieldError;
  disabled: boolean;
}

export function PricingCatalogDynamicAttributeField(props: Props): JSX.Element {
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
