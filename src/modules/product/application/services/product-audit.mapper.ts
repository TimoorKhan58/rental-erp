import type { Product } from "@/modules/product/domain/product.entity";
import type { AuditValues } from "@/shared/infrastructure/audit/audit-logger.interface";

import { decimalToDtoString } from "../mappers/product-decimal.mapper";

export function toProductAuditValues(product: Product): AuditValues {
  const props = product.toProps();

  return {
    id: props.id,
    productCode: props.productCode,
    name: props.name,
    description: props.description,
    unit: props.unit,
    rentalRate: decimalToDtoString(props.rentalRate),
    replacementCost: decimalToDtoString(props.replacementCost),
    isActive: props.isActive,
  };
}
