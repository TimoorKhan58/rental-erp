import type { ProductId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Product } from "./product.entity";
import type { ProductListQuery } from "./product-list.query";
import type { CreateProductData, UpdateProductData } from "./product.types";

export interface IProductRepository {
  findById(id: ProductId): Promise<Product | null>;
  findByProductCode(productCode: string): Promise<Product | null>;
  findPaged(query: ProductListQuery): Promise<PaginatedResult<Product>>;
  exists(id: ProductId): Promise<boolean>;
  create(data: CreateProductData): Promise<Product>;
  update(id: ProductId, data: UpdateProductData): Promise<Product>;
  delete(id: ProductId): Promise<void>;
}
