import { MenuItem, Paper, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { If } from '../helper/If';
import { PricingSchemaField, PricingSchemaFieldType } from '../../services/trades.service';
import { parseOptionalNumber } from './schema-editor.utils';
import { fieldTypes, hasEmptyName } from './schema-editor-dialog.utils';
import { SchemaEditorFieldActions } from './SchemaEditorFieldActions';

interface Props {
  field: PricingSchemaField;
  fields: PricingSchemaField[];
  index: number;
  enumValueInput: string;
  showValidationErrors: boolean;
  onUpdateField: (index: number, patch: Partial<PricingSchemaField>) => void;
  onUpdateFieldType: (index: number, type: PricingSchemaFieldType) => void;
  onUpdateEnumValues: (index: number, value: string) => void;
  onUpdateDependsOnField: (index: number, dependsOnField: string) => void;
  onUpdateDependsOnEquals: (index: number, equals: string) => void;
  onMoveField: (index: number, direction: -1 | 1) => void;
  onRemoveField: (index: number) => void;
}

export function SchemaEditorFieldCard(props: Props): JSX.Element {
  const {
    field,
    fields,
    index,
    enumValueInput,
    showValidationErrors,
    onUpdateField,
    onUpdateFieldType,
    onUpdateEnumValues,
    onUpdateDependsOnField,
    onUpdateDependsOnEquals,
    onMoveField,
    onRemoveField,
  } = props;

  const { t } = useTranslation();
  const nameError = showValidationErrors && hasEmptyName(field.name);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', md: 'center' }}
        >
          <TextField
            label={t('trades.schemaEditor.fields.name')}
            value={field.name}
            onChange={(event) => onUpdateField(index, { name: event.target.value })}
            error={nameError}
            helperText={
              nameError ? t('validation.required', { defaultValue: 'Pflichtfeld' }) : undefined
            }
            fullWidth
          />

          <TextField
            select
            label={t('trades.schemaEditor.fields.type')}
            value={field.type}
            onChange={(event) =>
              onUpdateFieldType(index, event.target.value as PricingSchemaFieldType)
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
              onUpdateField(index, {
                required: event.target.value === 'true',
              })
            }
            fullWidth
          >
            <MenuItem value="false">{t('common.no')}</MenuItem>
            <MenuItem value="true">{t('common.yes')}</MenuItem>
          </TextField>

          <SchemaEditorFieldActions
            index={index}
            fieldCount={fields.length}
            onMove={onMoveField}
            onRemove={onRemoveField}
          />
        </Stack>

        <If condition={field.type === 'number'}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label={t('trades.schemaEditor.fields.min')}
              type="number"
              value={field.min ?? ''}
              onChange={(event) =>
                onUpdateField(index, {
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
                onUpdateField(index, {
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
            value={enumValueInput}
            onChange={(event) => onUpdateEnumValues(index, event.target.value)}
            helperText={t('trades.schemaEditor.valuesHelp')}
            fullWidth
          />
        </If>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            select
            label={t('trades.schemaEditor.fields.dependsOnField')}
            value={field.dependsOn?.field ?? ''}
            onChange={(event) => onUpdateDependsOnField(index, event.target.value)}
            fullWidth
          >
            <MenuItem value="">{t('trades.schemaEditor.fields.dependsOnNone')}</MenuItem>

            {fields
              .filter((candidate, candidateIndex) => candidateIndex !== index)
              .filter((candidate) => candidate.name.trim().length > 0)
              .map((candidate) => (
                <MenuItem key={candidate.name} value={candidate.name}>
                  {candidate.name}
                </MenuItem>
              ))}
          </TextField>

          <TextField
            label={t('trades.schemaEditor.fields.dependsOnEquals')}
            value={field.dependsOn?.equals ?? ''}
            onChange={(event) => onUpdateDependsOnEquals(index, event.target.value)}
            disabled={!field.dependsOn?.field}
            fullWidth
          />
        </Stack>
      </Stack>
    </Paper>
  );
}
