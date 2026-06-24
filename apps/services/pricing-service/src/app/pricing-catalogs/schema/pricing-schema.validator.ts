import {
  PricingSchema,
  PricingSchemaField,
  PricingSchemaValidationError,
} from './pricing-schema.types';

export const validatePricingAttributes = (
  schema: PricingSchema,
  attributes: Record<string, unknown>,
): PricingSchemaValidationError[] => {
  const errors: PricingSchemaValidationError[] = [];

  const fieldsByName = new Map(schema.fields.map((field) => [field.name, field]));

  Object.keys(attributes).forEach((attributeName) => {
    if (!fieldsByName.has(attributeName)) {
      errors.push({
        field: attributeName,
        message: `${attributeName} is not allowed by the pricing schema`,
      });
    }
  });

  schema.fields.forEach((field) => {
    checkIsRequired(field, attributes, errors);
    checkTypeErrors(field, attributes, errors);
    checkMinMaxErrors(field, attributes, errors);
    checkEnumErrors(field, attributes, errors);
    checkDependsOnErrors(field, attributes, errors);
  });
  return errors;
};

// ---------------------------------------------------------------------
// Private helper methods
// ---------------------------------------------------------------------

const checkIsRequired = (
  field: PricingSchemaField,
  attributes: Record<string, unknown>,
  errors: PricingSchemaValidationError[],
): void => {
  if (field.dependsOn) {
    return;
  }
  const value = attributes[field.name];
  if (field.required === true && isMissing(value)) {
    addError(errors, { field: field.name, message: `${field.name} is required` });
  }
};

const checkTypeErrors = (
  field: PricingSchemaField,
  attributes: Record<string, unknown>,
  errors: PricingSchemaValidationError[],
): void => {
  const value = attributes[field.name];
  if (isMissing(value)) {
    return;
  }
  const expectedType = field.type === 'enum' ? 'string' : field.type;
  if (typeof value !== expectedType) {
    addError(errors, {
      field: field.name,
      message: `${field.name} has to be ${expectedType} but is ${typeof value}`,
    });
  }
};

const checkMinMaxErrors = (
  field: PricingSchemaField,
  attributes: Record<string, unknown>,
  errors: PricingSchemaValidationError[],
): void => {
  const value = attributes[field.name];
  if (field.type !== 'number' || isMissing(value) || typeof value !== 'number') {
    return;
  }
  if (field.min !== undefined && value < field.min) {
    addError(errors, {
      field: field.name,
      message: `Value of ${field.name} has to be greater than or equal to ${field.min}`,
    });
  }
  if (field.max !== undefined && value > field.max) {
    addError(errors, {
      field: field.name,
      message: `Value of ${field.name} has to be less than or equal to ${field.max}`,
    });
  }
};

const checkEnumErrors = (
  field: PricingSchemaField,
  attributes: Record<string, unknown>,
  errors: PricingSchemaValidationError[],
): void => {
  const value = attributes[field.name];
  if (field.type !== 'enum' || isMissing(value) || typeof value !== 'string') {
    return;
  }
  const allowedValues = field.values ?? [];
  if (!allowedValues.includes(value)) {
    addError(errors, {
      field: field.name,
      message: `${field.name} must be one of ${allowedValues.join(', ')}`,
    });
  }
};

const checkDependsOnErrors = (
  field: PricingSchemaField,
  attributes: Record<string, unknown>,
  errors: PricingSchemaValidationError[],
): void => {
  if (!field.dependsOn) {
    return;
  }
  const dependencyValue = attributes[field.dependsOn.field];
  const dependencyMatches = dependencyValue === field.dependsOn.equals;
  if (dependencyMatches && isMissing(attributes[field.name])) {
    addError(errors, {
      field: field.name,
      message: `${field.name} is required when ${field.dependsOn.field} equals ${field.dependsOn.equals}`,
    });
  }
};

const isMissing = (value: unknown): boolean => {
  return value === undefined || value === null || value === '';
};

const addError = (
  errors: PricingSchemaValidationError[],
  error: PricingSchemaValidationError,
): void => {
  errors.push({
    field: error.field,
    message: error.message,
  });
};
