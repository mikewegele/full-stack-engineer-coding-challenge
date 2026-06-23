import { apiClient } from './api.service';
import { components } from './generated/pricing-api.types';

export type TradeCode = components['schemas']['CreatePricingCatalogDto']['trade'];

export type PricingCatalogStatus = components['schemas']['PricingCatalogResponseDto']['status'];

export type PricingUnit = components['schemas']['PricingCatalogPositionResponseDto']['unit'];

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

export type TradeConfigResponse = Omit<
  components['schemas']['TradeConfigResponseDto'],
  'pricingSchema'
> & {
  pricingSchema: PricingSchema;
};

export type PricingCatalogPositionResponse = Omit<
  components['schemas']['PricingCatalogPositionResponseDto'],
  'attributes' | 'minQuantity' | 'maxQuantity'
> & {
  attributes: Record<string, unknown>;
  minQuantity: string | null;
  maxQuantity: string | null;
};

export type PricingCatalogVersionResponse = Omit<
  components['schemas']['PricingCatalogResponseDto'],
  'positions' | 'publishedAt'
> & {
  publishedAt: string | null;
  positions: PricingCatalogPositionResponse[];
};

export type CreatePricingCatalogRequest = components['schemas']['CreatePricingCatalogDto'];

export type UpdatePricingCatalogRequest = Omit<
  components['schemas']['UpdatePricingCatalogDto'],
  'positions'
> & {
  positions?: UpdatePricingCatalogPositionRequest[];
};

export type UpdatePricingCatalogPositionRequest = Omit<
  components['schemas']['UpdatePricingCatalogPositionDto'],
  'attributes'
> & {
  attributes?: Record<string, unknown>;
};

export function listTrades(): Promise<TradeConfigResponse[]> {
  return apiClient.get<TradeConfigResponse[]>('/trades').then((response) => response.data);
}

export function listPricingCatalogs(
  craftsmanId: string,
  trade: TradeCode,
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

export function updatePricingCatalog(
  versionId: string,
  payload: UpdatePricingCatalogRequest,
): Promise<PricingCatalogVersionResponse> {
  return apiClient
    .patch<PricingCatalogVersionResponse>(`/pricing-catalogs/${versionId}`, payload)
    .then((response) => response.data);
}

export function publishPricingCatalog(versionId: string): Promise<PricingCatalogVersionResponse> {
  return apiClient
    .post<PricingCatalogVersionResponse>(`/pricing-catalogs/${versionId}/publish`)
    .then((response) => response.data);
}
