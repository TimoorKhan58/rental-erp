import type { ProductApplicationServices as ProductApplicationServicesBase } from "@/modules/product/application/services/product-application-services.interface";
import { CreateProductService } from "@/modules/product/application/services/create-product.service";
import {
  ProductService,
  type IProductService,
} from "@/modules/product/application/services/product.service";
import { DeleteProductService } from "@/modules/product/application/services/delete-product.service";
import { GetProductByIdService } from "@/modules/product/application/services/get-product-by-id.service";
import { ListProductsService } from "@/modules/product/application/services/list-products.service";
import { UpdateProductService } from "@/modules/product/application/services/update-product.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createProductRepositoryFromSharedDeps } from "./create-product.repository";
import { createProductTransactionRunner } from "./create-product-transaction.runner";

export type { ProductApplicationServicesBase as ProductApplicationServices };

export interface WiredProductApplicationServices
  extends ProductApplicationServicesBase {
  productService: IProductService;
}

export function createProductApplicationServices(
  deps: SharedDeps,
): WiredProductApplicationServices {
  const repository = createProductRepositoryFromSharedDeps(deps);
  const transactionRunner = createProductTransactionRunner(deps);

  const getProductById = new GetProductByIdService(repository);
  const listProducts = new ListProductsService(repository);
  const createProduct = new CreateProductService(transactionRunner);
  const updateProduct = new UpdateProductService(transactionRunner);
  const deleteProduct = new DeleteProductService(transactionRunner);

  return {
    getProductById,
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    productService: new ProductService(
      getProductById,
      listProducts,
      createProduct,
      updateProduct,
      deleteProduct,
    ),
  };
}
