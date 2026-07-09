import type { ProductDto } from "../dtos/product.dto";
import type {
  CreateProductInput,
  ProductIdParamInput,
  UpdateProductInput,
} from "../schemas/product.schemas";
import type { ListProductsInput } from "../schemas/list-products.schema";
import type { ExecutionContext } from "@/shared/application/context";
import type { PaginatedResult } from "@/shared/domain/pagination";

export interface ProductApplicationServices {
  getProductById: {
    execute(input: ProductIdParamInput): Promise<ProductDto>;
  };
  listProducts: {
    execute(input: ListProductsInput): Promise<PaginatedResult<ProductDto>>;
  };
  createProduct: {
    execute(input: CreateProductInput): Promise<ProductDto>;
  };
  updateProduct: {
    execute(
      params: ProductIdParamInput,
      input: UpdateProductInput,
    ): Promise<ProductDto>;
  };
  deleteProduct: {
    execute(input: ProductIdParamInput): Promise<void>;
  };
}

export type ProductServiceResolver = (
  ctx: ExecutionContext,
) => ProductApplicationServices;
