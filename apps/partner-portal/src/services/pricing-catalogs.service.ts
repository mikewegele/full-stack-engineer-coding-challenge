import { apiClient } from './api.service';

export type PricingCatalogStatus = 'DRAFT' | 'PUBLISHED';

export type PricingUnit = 'piece' | 'm2' | 'meter' | 'hour' | 'flat';

export type PricingSchemaFieldType = 'string' | 'number' | 'boolean' | 'enum';

export type PricingSchemaDependsOn = {
  field: string;
  equals: string | number | boolean;
};

export type PricingSchemaField = {
  name: string;
  type: PricingSchemaFieldType;
  required?: boolean;
  min?: number;
  max?: number;
  values?: string[];
  dependsOn?: PricingSchemaDependsOn;
};

export type PricingSchema = {
  fields: PricingSchemaField[];
};

export type TradeConfigResponse = {
  id: string;
  trade: string;
  displayName: string;
  pricingSchema: PricingSchema;
};

export type PricingCatalogPositionResponse = {
  id: string;
  key: string;
  label: string;
  unit: PricingUnit;
  netPriceCents: number;
  vatRate: string;
  minQuantity: string | null;
  maxQuantity: string | null;
  attributes: Record<string, unknown>;
};

export type PricingCatalogVersionResponse = {
  id: string;
  craftsmanId: string;
  trade: string;
  status: PricingCatalogStatus;
  effectiveFrom: string;
  publishedAt: string | null;
  positions: PricingCatalogPositionResponse[];
};

export type CreatePricingCatalogRequest = {
  craftsmanId: string;
  trade: string;
  effectiveFrom: string;
};

export function listTrades(): Promise<TradeConfigResponse[]> {
  return apiClient.get<TradeConfigResponse[]>('/trades').then((response) => response.data);
}

export function listPricingCatalogs(
  craftsmanId: string,
  trade: string,
): Promise<PricingCatalogVersionResponse[]> {
  return apiClient
    .get<PricingCatalogVersionResponse[]>('/pricing-catalogs', {
      params: {
        craftsmanId,
        trade,
      },
    })
    .then((response) => response.data);
}

export function createPricingCatalog(
  payload: CreatePricingCatalogRequest,
): Promise<PricingCatalogVersionResponse> {
  return apiClient
    .post<PricingCatalogVersionResponse>('/pricing-catalogs', payload)
    .then((response) => response.data);
}
