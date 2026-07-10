import type { DocumentType } from "./settings.constants";

export const NUMBER_SEQUENCE_ENTITY_NAME = "NumberSequence";

export const DOCUMENT_TYPE_PREFIXES: Record<DocumentType, string> = {
  RENTAL_ORDER: "RO-",
  PAYMENT: "PAY-",
  DISPATCH: "DIS-",
  EXPENSE: "EXP-",
  REPAIR: "RPR-",
  CUSTOMER: "CUS-",
  PRODUCT: "PRD-",
};

export const DEFAULT_SEQUENCE_PADDING_LENGTH = 3;
export const DEFAULT_SEQUENCE_STARTING_NUMBER = 1;
