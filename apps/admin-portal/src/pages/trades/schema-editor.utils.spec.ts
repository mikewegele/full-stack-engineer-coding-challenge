import { describe, expect, it } from 'vitest';
import { PricingSchemaField } from '../../services/trades.service';
import {
  parseEnumValues,
  parseOptionalNumber,
  validatePricingSchemaFields,
} from './schema-editor.utils';

describe('parseOptionalNumber', () => {
  it('returns undefined for empty values', () => {
    expect(parseOptionalNumber('')).toBeUndefined();
    expect(parseOptionalNumber('   ')).toBeUndefined();
  });

  it('returns a number for numeric values', () => {
    expect(parseOptionalNumber('12')).toBe(12);
    expect(parseOptionalNumber('12.5')).toBe(12.5);
  });
});

describe('parseEnumValues', () => {
  it('splits comma-separated enum values', () => {
    expect(parseEnumValues('small, medium, large')).toEqual(['small', 'medium', 'large']);
  });

  it('trims values and removes empty entries', () => {
    expect(parseEnumValues(' small, , medium ,, large ')).toEqual(['small', 'medium', 'large']);
  });
});

describe('validatePricingSchemaFields', () => {
  it('rejects empty field names', () => {
    const fields: PricingSchemaField[] = [
      {
        name: '',
        type: 'string',
        required: false,
      },
    ];

    expect(validatePricingSchemaFields(fields)).toEqual({
      valid: false,
      messageKey: 'trades.schemaEditor.validation.emptyName',
    });
  });

  it('rejects duplicate field names', () => {
    const fields: PricingSchemaField[] = [
      {
        name: 'model',
        type: 'string',
        required: false,
      },
      {
        name: 'model',
        type: 'number',
        required: false,
      },
    ];

    expect(validatePricingSchemaFields(fields)).toEqual({
      valid: false,
      messageKey: 'trades.schemaEditor.validation.duplicateName',
    });
  });

  it('rejects number fields where min is greater than max', () => {
    const fields: PricingSchemaField[] = [
      {
        name: 'power',
        type: 'number',
        required: false,
        min: 10,
        max: 5,
      },
    ];

    expect(validatePricingSchemaFields(fields)).toEqual({
      valid: false,
      messageKey: 'trades.schemaEditor.validation.invalidNumberRange',
    });
  });

  it('rejects enum fields without values', () => {
    const fields: PricingSchemaField[] = [
      {
        name: 'size',
        type: 'enum',
        required: false,
        values: [],
      },
    ];

    expect(validatePricingSchemaFields(fields)).toEqual({
      valid: false,
      messageKey: 'trades.schemaEditor.validation.emptyEnumValues',
    });
  });

  it('accepts a valid schema', () => {
    const fields: PricingSchemaField[] = [
      {
        name: 'power',
        type: 'number',
        required: true,
        min: 1,
        max: 20,
      },
      {
        name: 'size',
        type: 'enum',
        required: false,
        values: ['small', 'medium', 'large'],
      },
    ];

    expect(validatePricingSchemaFields(fields)).toEqual({
      valid: true,
    });
  });
});
