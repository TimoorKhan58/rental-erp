import type { PaginatedResult } from "@/shared/domain/pagination";

import type { ProductDto } from "../dtos/product.dto";
import type {
  CreateProductInput,
  ProductIdParamInput,
  UpdateProductInput,
} from "../schemas/product.schemas";
import type { ListProductsInput } from "../schemas/list-products.schema";
import { CreateProductService } from "./create-product.service";
import { DeleteProductService } from "./delete-product.service";
import { GetProductByIdService } from "./get-product-by-id.service";
import { ListProductsService } from "./list-products.service";
import { UpdateProductService } from "./update-product.service";

export interface IProductService {
  getById(input: ProductIdParamInput): Promise<ProductDto>;
  list(input: ListProductsInput): Promise<PaginatedResult<ProductDto>>;
  create(input: CreateProductInput): Promise<ProductDto>;
  update(
    input: ProductIdParamInput,
    data: UpdateProductInput,
  ): Promise<ProductDto>;
  delete(input: ProductIdParamInput): Promise<void>;
}

export class ProductService implements IProductService {
  constructor(
    private readonly getProductByIdService: GetProductByIdService,
    private readonly listProductsService: ListProductsService,
    private readonly createProductService: CreateProductService,
    private readonly updateProductService: UpdateProductService,
    private readonly deleteProductService: DeleteProductService,
  ) {}

  getById(input: ProductIdParamInput): Promise<ProductDto> {
    return this.getProductByIdService.execute(input);
  }

  list(input: ListProductsInput): Promise<PaginatedResult<ProductDto>> {
    return this.listProductsService.execute(input);
  }

  create(input: CreateProductInput): Promise<ProductDto> {
    return this.createProductService.execute(input);
  }

  update(
    input: ProductIdParamInput,
    data: UpdateProductInput,
  ): Promise<ProductDto> {
    return this.updateProductService.execute(input, data);
  }

  delete(input: ProductIdParamInput): Promise<void> {
    return this.deleteProductService.execute(input);
  }
}
