import type { NextRequest } from "next/server";

import type { CategoryServiceResolver } from "@/modules/asset/application/services/category-application-services.interface";
import type { AssetCategoryDto } from "@/modules/asset/application/dtos/asset-category.dto";
import {
  AssetCategoryIdParamSchema,
  CreateAssetCategorySchema,
  UpdateAssetCategorySchema,
} from "@/modules/asset/application";
import { ListAssetCategoriesSchema } from "@/modules/asset/application/schemas/list-asset-categories.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toAssetCategoryListResponse,
  toAssetCategoryResponse,
} from "../mappers/asset-category-response.mapper";
import {
  runAssetCategoryApiRoute,
  toJsonResponse,
} from "../http/asset-category-api.route-runner";
import { ASSET_CATEGORY_ROUTES } from "../routes/asset-category.routes";

export async function handleListAssetCategories(
  request: NextRequest,
  resolveServices: CategoryServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListAssetCategoriesSchema, query);

  const result = await runAssetCategoryApiRoute({
    request,
    route: ASSET_CATEGORY_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.assetCategories.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.listCategories.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<AssetCategoryDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAssetCategoryListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateAssetCategory(
  request: NextRequest,
  resolveServices: CategoryServiceResolver,
): Promise<Response> {
  const body: unknown = await request.json();
  const createInput = parseRequest(CreateAssetCategorySchema, body);

  const result = await runAssetCategoryApiRoute({
    request,
    route: ASSET_CATEGORY_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.assetCategories.create,
    resolveServices,
    handler: async (_ctx, services) =>
      services.createCategory.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAssetCategoryResponse(result.body.data as AssetCategoryDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetAssetCategoryById(
  request: NextRequest,
  id: string,
  resolveServices: CategoryServiceResolver,
): Promise<Response> {
  const params = parseRequest(AssetCategoryIdParamSchema, { id });

  const result = await runAssetCategoryApiRoute({
    request,
    route: ASSET_CATEGORY_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.assetCategories.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getCategoryById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAssetCategoryResponse(result.body.data as AssetCategoryDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateAssetCategory(
  request: NextRequest,
  id: string,
  resolveServices: CategoryServiceResolver,
): Promise<Response> {
  const params = parseRequest(AssetCategoryIdParamSchema, { id });
  const body: unknown = await request.json();
  const updateInput = parseRequest(UpdateAssetCategorySchema, body);

  const result = await runAssetCategoryApiRoute({
    request,
    route: ASSET_CATEGORY_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.assetCategories.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateCategory.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAssetCategoryResponse(result.body.data as AssetCategoryDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleDeleteAssetCategory(
  request: NextRequest,
  id: string,
  resolveServices: CategoryServiceResolver,
): Promise<Response> {
  const params = parseRequest(AssetCategoryIdParamSchema, { id });

  const result = await runAssetCategoryApiRoute({
    request,
    route: ASSET_CATEGORY_ROUTES.byId(id),
    httpMethod: "DELETE",
    permission: PERMISSIONS.assetCategories.delete,
    resolveServices,
    handler: async (_ctx, services) => {
      await services.deleteCategory.execute(params);
      return null;
    },
  });

  return toJsonResponse(result);
}
