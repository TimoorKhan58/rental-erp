import type { NextRequest } from "next/server";

import type { CatalogServiceResolver } from "@/modules/catalog/application/services/catalog-application-services.interface";
import type { BrandDto } from "@/modules/catalog/application/dtos/brand.dto";
import {
  CreateBrandSchema,
  BrandIdParamSchema,
  UpdateBrandSchema,
} from "@/modules/catalog/application/schemas/brand.schemas";
import { ListBrandsSchema } from "@/modules/catalog/application/schemas/list-brands.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toBrandListResponse,
  toBrandResponse,
} from "../mappers/brand-response.mapper";
import {
  runCatalogApiRoute,
  toJsonResponse,
} from "../http/catalog-api.route-runner";
import { BRAND_ROUTES } from "./brand.routes";

export async function handleListBrands(
  request: NextRequest,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListBrandsSchema, query);

  const result = await runCatalogApiRoute({
    request,
    route: BRAND_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.catalog.read,
    resolveServices,
    handler: async (_ctx, services) => services.listBrands.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<BrandDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toBrandListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateBrand(
  request: NextRequest,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const body: unknown = await request.json();
  const createInput = parseRequest(CreateBrandSchema, body);

  const result = await runCatalogApiRoute({
    request,
    route: BRAND_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.catalog.create,
    resolveServices,
    handler: async (_ctx, services) => services.createBrand.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toBrandResponse(result.body.data as BrandDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetBrandById(
  request: NextRequest,
  id: string,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const params = parseRequest(BrandIdParamSchema, { id });

  const result = await runCatalogApiRoute({
    request,
    route: BRAND_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.catalog.read,
    resolveServices,
    handler: async (_ctx, services) => services.getBrandById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toBrandResponse(result.body.data as BrandDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateBrand(
  request: NextRequest,
  id: string,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const params = parseRequest(BrandIdParamSchema, { id });
  const body: unknown = await request.json();
  const updateInput = parseRequest(UpdateBrandSchema, body);

  const result = await runCatalogApiRoute({
    request,
    route: BRAND_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.catalog.update,
    resolveServices,
    handler: async (_ctx, services) => services.updateBrand.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toBrandResponse(result.body.data as BrandDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleDeleteBrand(
  request: NextRequest,
  id: string,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const params = parseRequest(BrandIdParamSchema, { id });

  const result = await runCatalogApiRoute({
    request,
    route: BRAND_ROUTES.byId(id),
    httpMethod: "DELETE",
    permission: PERMISSIONS.catalog.delete,
    resolveServices,
    handler: async (_ctx, services) => {
      await services.deleteBrand.execute(params);
      return null;
    },
  });

  return toJsonResponse(result);
}
