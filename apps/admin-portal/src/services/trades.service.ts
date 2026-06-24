import { apiClient } from './api.service';
import { components } from './generated/pricing-api.types';

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

export type TradeConfigResponse = components['schemas']['TradeConfigResponseDto'] & {
  pricingSchema: PricingSchema;
};

export type UpdateTradeConfigRequest = Omit<
  components['schemas']['UpdateTradeConfigDto'],
  'pricingSchema'
> & {
  pricingSchema?: PricingSchema;
};

export function listTrades(): Promise<TradeConfigResponse[]> {
  return apiClient.get<TradeConfigResponse[]>('/trades').then((r) => r.data);
}

export function getTrade(trade: string): Promise<TradeConfigResponse> {
  return apiClient.get<TradeConfigResponse>(`/trades/${trade}`).then((r) => r.data);
}

export function updateTradeConfig(
  trade: string,
  payload: UpdateTradeConfigRequest,
): Promise<TradeConfigResponse> {
  return apiClient.patch<TradeConfigResponse>(`/trades/${trade}`, payload).then((r) => r.data);
}
