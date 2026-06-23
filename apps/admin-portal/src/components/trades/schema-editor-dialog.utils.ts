import { PricingSchemaFieldType } from '../../services/trades.service';

export const fieldTypes: PricingSchemaFieldType[] = ['string', 'number', 'boolean', 'enum'];

export function hasEmptyName(value: string): boolean {
  return value.trim().length === 0;
}

export function reorderEnumValueInputs(
  current: Record<number, string>,
  index: number,
  targetIndex: number,
): Record<number, string> {
  const next = { ...current };
  const currentValue = next[index];
  const targetValue = next[targetIndex];

  if (currentValue === undefined) {
    delete next[targetIndex];
  } else {
    next[targetIndex] = currentValue;
  }

  if (targetValue === undefined) {
    delete next[index];
  } else {
    next[index] = targetValue;
  }

  return next;
}

export function removeEnumValueInput(
  current: Record<number, string>,
  index: number,
): Record<number, string> {
  return Object.fromEntries(
    Object.entries(current)
      .filter(([key]) => Number(key) !== index)
      .map(([key, value]) => {
        const numericKey = Number(key);

        return [numericKey > index ? numericKey - 1 : numericKey, value];
      }),
  );
}
