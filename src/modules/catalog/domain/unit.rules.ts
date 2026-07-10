import { UnitInvariantError } from "./unit.errors";

export function normalizeRequiredText(value: string, field: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new UnitInvariantError(`${field} is required`, field);
  }

  return trimmed;
}

export function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeUnitCode(code: string): string {
  const normalized = normalizeRequiredText(code, "code").toUpperCase();

  if (!/^[A-Z0-9_-]+$/.test(normalized)) {
    throw new UnitInvariantError(
      "Unit code must contain only letters, numbers, underscores, or hyphens",
      "code",
    );
  }

  return normalized;
}
