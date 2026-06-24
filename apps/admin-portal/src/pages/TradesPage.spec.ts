import { describe, expect, it } from 'vitest';
import { countSchemaFields } from './TradesPage';

describe('countSchemaFields', () => {
  it('returns 0 when pricingSchema is missing', () => {
    expect(countSchemaFields(undefined)).toBe(0);
  });

  it('returns 0 when pricingSchema is null', () => {
    expect(countSchemaFields(null)).toBe(0);
  });

  it('returns 0 when pricingSchema is not an object', () => {
    expect(countSchemaFields('not-an-object')).toBe(0);
  });

  it('returns 0 when pricingSchema.fields is missing', () => {
    expect(countSchemaFields({})).toBe(0);
  });

  it('returns 0 when pricingSchema.fields is not an array', () => {
    expect(countSchemaFields({ fields: 'oops' })).toBe(0);
  });

  it('returns the field count when schema is well-formed', () => {
    expect(
      countSchemaFields({
        fields: [
          { name: 'heatingPowerKw', type: 'number' },
          { name: 'inverterModel', type: 'string' },
        ],
      }),
    ).toBe(2);
  });
});
