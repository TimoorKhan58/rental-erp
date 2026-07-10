import type { NextRequest } from "next/server";

import type { CatalogServiceResolver } from "@/modules/catalog/application/services/catalog-application-services.interface";
import type { CategoryDto } from "@/modules/catalog/application/dtos/category.dto";
import {
  CreateCategorySchema,
  CategoryIdParamSchema,
  UpdateCategorySchema,
} from "@/modules/catalog/application/schemas/category.schemas";
import { ListCategoriesSchema } from "@/modules/catalog/application/schemas/list-categories.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toCategoryListResponse,
  toCategoryResponse,
} from "../mappers/category-response.mapper";
import {
  runCatalogApiRoute,
  toJsonResponse,
} from "../http/catalog-api.route-runner";
import { CATEGORY_ROUTES } from "./category.routes";

export async function handleListCategories(
  request: NextRequest,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListCategoriesSchema, query);

  const result = await runCatalogApiRoute({
    request,
    route: CATEGORY_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.catalog.read,
    resolveServices,
    handler: async (_ctx, services) => services.listCategories.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<CategoryDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toCategoryListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateCategory(
  request: NextRequest,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const body: unknown = await request.json();
  const createInput = parseRequest(CreateCategorySchema, body);

  const result = await runCatalogApiRoute({
    request,
    route: CATEGORY_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.catalog.create,
    resolveServices,
    handler: async (_ctx, services) => services.createCategory.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toCategoryResponse(result.body.data as CategoryDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetCategoryById(
  request: NextRequest,
  id: string,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const params = parseRequest(CategoryIdParamSchema, { id });

  const result = await runCatalogApiRoute({
    request,
    route: CATEGORY_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.catalog.read,
    resolveServices,
    handler: async (_ctx, services) => services.getCategoryById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toCategoryResponse(result.body.data as CategoryDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateCategory(
  request: NextRequest,
  id: string,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const params = parseRequest(CategoryIdParamSchema, { id });
  const body: unknown = await request.json();
  const updateInput = parseRequest(UpdateCategorySchema, body);

  const result = await runCatalogApiRoute({
    request,
    route: CATEGORY_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.catalog.update,
    resolveServices,
    handler: async (_ctx, services) => services.updateCategory.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toCategoryResponse(result.body.data as CategoryDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleDeleteCategory(
  request: NextRequest,
  id: string,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const params = parseRequest(CategoryIdParamSchema, { id });

  const result = await runCatalogApiRoute({
    request,
    route: CATEGORY_ROUTES.byId(id),
    httpMethod: "DELETE",
    permission: PERMISSIONS.catalog.delete,
    resolveServices,
    handler: async (_ctx, services) => {
      await services.deleteCategory.execute(params);
      return null;
    },
  });

  return toJsonResponse(result);
}
