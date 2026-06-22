import { PricingSchema } from './pricing-schema.types';
import { validatePricingAttributes } from './pricing-schema.validator';

const windowsSchema: PricingSchema = {
  fields: [
    {
      name: 'frameMaterial',
      type: 'enum',
      required: true,
      values: ['wood', 'plastic', 'aluminium'],
    },
    {
      name: 'uValue',
      type: 'number',
      required: true,
      min: 0.5,
      max: 3,
    },
    {
      name: 'isTripleGlazed',
      type: 'boolean',
      required: false,
    },
    {
      name: 'woodTreatment',
      type: 'string',
      required: true,
      dependsOn: {
        field: 'frameMaterial',
        equals: 'wood',
      },
    },
  ],
};

describe('validatePricingAttributes', () => {
  it('returns no errors for valid attributes', () => {
    const result = validatePricingAttributes(windowsSchema, {
      frameMaterial: 'wood',
      uValue: 1.2,
      isTripleGlazed: true,
      woodTreatment: 'sealed',
    });

    expect(result).toEqual([]);
  });

  it('returns an error for unknown fields', () => {
    const result = validatePricingAttributes(windowsSchema, {
      frameMaterial: 'plastic',
      uValue: 1.2,
      unsupportedField: 'x',
    });

    expect(result).toContainEqual({
      field: 'unsupportedField',
      message: 'unsupportedField is not allowed by the pricing schema',
    });
  });

  it('returns an error for missing required fields', () => {
    const result = validatePricingAttributes(windowsSchema, {
      frameMaterial: 'plastic',
    });

    expect(result).toContainEqual({
      field: 'uValue',
      message: 'uValue is required',
    });
  });

  it('returns an error for wrong string type', () => {
    const result = validatePricingAttributes(windowsSchema, {
      frameMaterial: 123,
      uValue: 1.2,
    });

    expect(result).toContainEqual({
      field: 'frameMaterial',
      message: 'frameMaterial has to be string but is number',
    });
  });

  it('returns an error for wrong number type', () => {
    const result = validatePricingAttributes(windowsSchema, {
      frameMaterial: 'plastic',
      uValue: '1.2',
    });

    expect(result).toContainEqual({
      field: 'uValue',
      message: 'uValue has to be number but is string',
    });
  });

  it('returns an error for wrong boolean type', () => {
    const result = validatePricingAttributes(windowsSchema, {
      frameMaterial: 'plastic',
      uValue: 1.2,
      isTripleGlazed: 'yes',
    });

    expect(result).toContainEqual({
      field: 'isTripleGlazed',
      message: 'isTripleGlazed has to be boolean but is string',
    });
  });

  it('returns an error when number is below min', () => {
    const result = validatePricingAttributes(windowsSchema, {
      frameMaterial: 'plastic',
      uValue: 0.3,
    });

    expect(result).toContainEqual({
      field: 'uValue',
      message: 'Value of uValue has to be greater than or equal to 0.5',
    });
  });

  it('returns an error when number is above max', () => {
    const result = validatePricingAttributes(windowsSchema, {
      frameMaterial: 'plastic',
      uValue: 3.5,
    });

    expect(result).toContainEqual({
      field: 'uValue',
      message: 'Value of uValue has to be less than or equal to 3',
    });
  });

  it('returns an error for invalid enum value', () => {
    const result = validatePricingAttributes(windowsSchema, {
      frameMaterial: 'steel',
      uValue: 1.2,
    });

    expect(result).toContainEqual({
      field: 'frameMaterial',
      message: 'frameMaterial must be one of wood, plastic, aluminium',
    });
  });

  it('requires a dependsOn field when the condition matches', () => {
    const result = validatePricingAttributes(windowsSchema, {
      frameMaterial: 'wood',
      uValue: 1.2,
    });

    expect(result).toContainEqual({
      field: 'woodTreatment',
      message: 'woodTreatment is required when frameMaterial equals wood',
    });
  });

  it('does not require a dependsOn field when the condition does not match', () => {
    const result = validatePricingAttributes(windowsSchema, {
      frameMaterial: 'plastic',
      uValue: 1.2,
    });

    expect(result).toEqual([]);
  });

  it('supports numeric dependsOn values', () => {
    const schema: PricingSchema = {
      fields: [
        {
          name: 'heatingPowerKw',
          type: 'number',
          required: true,
          min: 3,
          max: 20,
        },
        {
          name: 'requiresCrane',
          type: 'boolean',
          required: true,
          dependsOn: {
            field: 'heatingPowerKw',
            equals: 20,
          },
        },
      ],
    };

    const result = validatePricingAttributes(schema, {
      heatingPowerKw: 20,
    });

    expect(result).toContainEqual({
      field: 'requiresCrane',
      message: 'requiresCrane is required when heatingPowerKw equals 20',
    });
  });

  it('supports boolean dependsOn values', () => {
    const schema: PricingSchema = {
      fields: [
        {
          name: 'requiresInspection',
          type: 'boolean',
          required: true,
        },
        {
          name: 'inspectionNote',
          type: 'string',
          required: true,
          dependsOn: {
            field: 'requiresInspection',
            equals: true,
          },
        },
      ],
    };

    const result = validatePricingAttributes(schema, {
      requiresInspection: true,
    });

    expect(result).toContainEqual({
      field: 'inspectionNote',
      message: 'inspectionNote is required when requiresInspection equals true',
    });
  });
});
