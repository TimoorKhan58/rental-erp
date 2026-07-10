import { TagInvariantError } from "./tag.errors";

export function normalizeRequiredText(value: string, field: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new TagInvariantError(`${field} is required`, field);
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

export function normalizeTagColor(color: string | null | undefined): string | null {
  const normalized = normalizeOptionalText(color);

  if (normalized === null) {
    return null;
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    throw new TagInvariantError(
      "Tag color must be a valid hex color (e.g. #FF5733)",
      "color",
    );
  }

  return normalized.toUpperCase();
}
