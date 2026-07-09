import type { ProductCode } from "./value-objects/product-code.vo";
import type { ProductName } from "./value-objects/product-name.vo";
import type { RentalRate } from "./value-objects/rental-rate.vo";
import type { ReplacementCost } from "./value-objects/replacement-cost.vo";
import type { Unit } from "./value-objects/unit.vo";

export interface CreateProductData {
  productCode: ProductCode;
  name: ProductName;
  description?: string | null;
  unit: Unit;
  rentalRate: RentalRate;
  replacementCost?: ReplacementCost | null;
  isActive?: boolean;
}

export interface UpdateProductData {
  name?: ProductName;
  description?: string | null;
  unit?: Unit;
  rentalRate?: RentalRate;
  replacementCost?: ReplacementCost | null;
  isActive?: boolean;
}
