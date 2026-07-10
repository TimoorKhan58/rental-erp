import { AttributeInvariantError } from "./attribute.errors";
import {
  ATTRIBUTE_DATA_TYPES,
  type AttributeDataType,
} from "./attribute.constants";

export function normalizeRequiredText(value: string, field: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new AttributeInvariantError(`${field} is required`, field);
  }

  return trimmed;
}

export function validateAttributeDataType(value: string): AttributeDataType {
  if (!ATTRIBUTE_DATA_TYPES.includes(value as AttributeDataType)) {
    throw new AttributeInvariantError(
      "Attribute data type must be TEXT, NUMBER, or BOOLEAN",
      "dataType",
    );
  }

  return value as AttributeDataType;
}
