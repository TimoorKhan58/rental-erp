export { Product, type ProductProps } from "./product.entity";
export {
  ProductDomainError,
  ProductInvariantError,
} from "./product.errors";
export {
  PRODUCT_ENTITY_NAME,
  PRODUCT_MODULE,
  PRODUCT_SEARCH_FIELDS,
  PRODUCT_SORT_FIELDS,
  type ProductSortField,
} from "./product.constants";
export type { ProductListQuery } from "./product-list.query";
export type { IProductRepository } from "./product.repository.interface";
export type { CreateProductData, UpdateProductData } from "./product.types";
export {
  createProductCode,
  type ProductCode,
} from "./value-objects/product-code.vo";
export {
  createProductName,
  type ProductName,
} from "./value-objects/product-name.vo";
export {
  createRentalRate,
  type RentalRate,
} from "./value-objects/rental-rate.vo";
export {
  createReplacementCost,
  type ReplacementCost,
} from "./value-objects/replacement-cost.vo";
export {
  createUnit,
  type Unit,
} from "./value-objects/unit.vo";
