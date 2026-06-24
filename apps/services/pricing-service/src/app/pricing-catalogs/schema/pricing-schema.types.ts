export type PricingSchemaFieldTypes = 'string' | 'number' | 'boolean' | 'enum';

export type PricingSchemaDependsOn = {
  field: string;
  equals: string | number | boolean;
};

export type PricingSchemaField = {
  name: string;
  type: PricingSchemaFieldTypes;
  required?: boolean;
  min?: number;
  max?: number;
  values?: string[];
  dependsOn?: PricingSchemaDependsOn;
};

export type PricingSchema = {
  fields: PricingSchemaField[];
};

export type PricingSchemaValidationError = {
  field: string;
  message: string;
};
