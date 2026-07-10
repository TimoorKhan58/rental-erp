function formatDecimal(value: number): string {
  return value.toFixed(2);
}

export function decimalToDtoString(
  value: number | null | undefined,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return formatDecimal(value);
}

export function parseDecimalFromDto(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  return Number(value);
}
