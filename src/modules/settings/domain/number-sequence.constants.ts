import type { DocumentType } from "./settings.constants";

export const NUMBER_SEQUENCE_ENTITY_NAME = "NumberSequence";

export const DOCUMENT_TYPE_PREFIXES: Record<DocumentType, string> = {
  RENTAL_ORDER: "RO-",
  PAYMENT: "PAY-",
  SUPPLIER_PAYMENT: "SPAY-",
  DISPATCH: "DIS-",
  EXPENSE: "EXP-",
  REPAIR: "RPR-",
  CUSTOMER: "CUS-",
  PRODUCT: "PRD-",
  SUPPLIER: "SUP-",
  WAREHOUSE: "WH-",
  PURCHASE_ORDER: "PO-",
  RETURN: "RET-",
  MAINTENANCE: "MNT-",
  EXTERNAL_RENTAL_AGREEMENT: "ERA-",
};

export const DEFAULT_SEQUENCE_PADDING_LENGTH = 3;
export const DEFAULT_SEQUENCE_STARTING_NUMBER = 1;
