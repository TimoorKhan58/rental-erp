import type { NextRequest } from "next/server";

import type { ProductServiceResolver } from "@/modules/product/application/services/product-application-services.interface";
import type { ProductDto } from "@/modules/product/application/dtos/product.dto";
import {
  CreateProductSchema,
  ProductIdParamSchema,
  UpdateProductSchema,
} from "@/modules/product/application";
import { ListProductsSchema } from "@/modules/product/application/schemas/list-products.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toProductListResponse,
  toProductResponse,
} from "../mappers/product-response.mapper";
import {
  runProductApiRoute,
  toJsonResponse,
} from "../http/product-api.route-runner";
import { PRODUCT_ROUTES } from "../routes/product.routes";

export async function handleListProducts(
  request: NextRequest,
  resolveServices: ProductServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListProductsSchema, query);

  const result = await runProductApiRoute({
    request,
    route: PRODUCT_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.products.read,
    resolveServices,
    handler: async (_ctx, services) => services.listProducts.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<ProductDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toProductListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateProduct(
  request: NextRequest,
  resolveServices: ProductServiceResolver,
): Promise<Response> {
  const body: unknown = await request.json();
  const createInput = parseRequest(CreateProductSchema, body);

  const result = await runProductApiRoute({
    request,
    route: PRODUCT_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.products.create,
    resolveServices,
    handler: async (_ctx, services) => services.createProduct.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toProductResponse(result.body.data as ProductDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetProductById(
  request: NextRequest,
  id: string,
  resolveServices: ProductServiceResolver,
): Promise<Response> {
  const params = parseRequest(ProductIdParamSchema, { id });

  const result = await runProductApiRoute({
    request,
    route: PRODUCT_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.products.read,
    resolveServices,
    handler: async (_ctx, services) => services.getProductById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toProductResponse(result.body.data as ProductDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateProduct(
  request: NextRequest,
  id: string,
  resolveServices: ProductServiceResolver,
): Promise<Response> {
  const params = parseRequest(ProductIdParamSchema, { id });
  const body: unknown = await request.json();
  const updateInput = parseRequest(UpdateProductSchema, body);

  const result = await runProductApiRoute({
    request,
    route: PRODUCT_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.products.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateProduct.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toProductResponse(result.body.data as ProductDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleDeleteProduct(
  request: NextRequest,
  id: string,
  resolveServices: ProductServiceResolver,
): Promise<Response> {
  const params = parseRequest(ProductIdParamSchema, { id });

  const result = await runProductApiRoute({
    request,
    route: PRODUCT_ROUTES.byId(id),
    httpMethod: "DELETE",
    permission: PERMISSIONS.products.delete,
    resolveServices,
    handler: async (_ctx, services) => {
      await services.deleteProduct.execute(params);
      return null;
    },
  });

  return toJsonResponse(result);
}
