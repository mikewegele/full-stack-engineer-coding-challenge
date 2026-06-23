import { PricingSchemaField } from '../../services/trades.service';

export type SchemaEditorValidationResult = {
  valid: boolean;
  messageKey?: string;
};

export function parseOptionalNumber(value: string): number | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }

  return Number(value);
}

export function parseEnumValues(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function validatePricingSchemaFields(
  fields: PricingSchemaField[],
): SchemaEditorValidationResult {
  const names = fields.map((field) => field.name.trim());

  if (names.some((name) => name.length === 0)) {
    return {
      valid: false,
      messageKey: 'trades.schemaEditor.validation.emptyName',
    };
  }

  const uniqueNames = new Set(names);

  if (uniqueNames.size !== names.length) {
    return {
      valid: false,
      messageKey: 'trades.schemaEditor.validation.duplicateName',
    };
  }

  const invalidNumberField = fields.find(
    (field) =>
      field.type === 'number' &&
      field.min !== undefined &&
      field.max !== undefined &&
      field.min > field.max,
  );

  if (invalidNumberField) {
    return {
      valid: false,
      messageKey: 'trades.schemaEditor.validation.invalidNumberRange',
    };
  }

  const invalidEnumField = fields.find(
    (field) => field.type === 'enum' && (!field.values || field.values.length === 0),
  );

  if (invalidEnumField) {
    return {
      valid: false,
      messageKey: 'trades.schemaEditor.validation.emptyEnumValues',
    };
  }

  return {
    valid: true,
  };
}
