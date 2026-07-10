import type { ProductId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Product } from "./product.entity";
import type { ProductListQuery } from "./product-list.query";
import type {
  CreateProductData,
  ProductMetadata,
  UpdateProductData,
} from "./product.types";

export interface ProductRecord {
  product: Product;
  metadata: ProductMetadata;
}

export interface IProductRepository {
  findById(id: ProductId): Promise<ProductRecord | null>;
  findByProductCode(productCode: string): Promise<ProductRecord | null>;
  findPaged(query: ProductListQuery): Promise<PaginatedResult<ProductRecord>>;
  exists(id: ProductId): Promise<boolean>;
  create(data: CreateProductData): Promise<ProductRecord>;
  update(id: ProductId, data: UpdateProductData): Promise<ProductRecord>;
  delete(id: ProductId): Promise<void>;
}
