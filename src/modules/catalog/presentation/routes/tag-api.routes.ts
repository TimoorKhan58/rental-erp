import type { NextRequest } from "next/server";

import type { CatalogServiceResolver } from "@/modules/catalog/application/services/catalog-application-services.interface";
import type { TagDto } from "@/modules/catalog/application/dtos/tag.dto";
import {
  CreateTagSchema,
  TagIdParamSchema,
  UpdateTagSchema,
} from "@/modules/catalog/application/schemas/tag.schemas";
import { ListTagsSchema } from "@/modules/catalog/application/schemas/list-tags.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toTagListResponse,
  toTagResponse,
} from "../mappers/tag-response.mapper";
import {
  runCatalogApiRoute,
  toJsonResponse,
} from "../http/catalog-api.route-runner";
import { TAG_ROUTES } from "./tag.routes";

export async function handleListTags(
  request: NextRequest,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListTagsSchema, query);

  const result = await runCatalogApiRoute({
    request,
    route: TAG_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.catalog.read,
    resolveServices,
    handler: async (_ctx, services) => services.listTags.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<TagDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toTagListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateTag(
  request: NextRequest,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const body: unknown = await request.json();
  const createInput = parseRequest(CreateTagSchema, body);

  const result = await runCatalogApiRoute({
    request,
    route: TAG_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.catalog.create,
    resolveServices,
    handler: async (_ctx, services) => services.createTag.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toTagResponse(result.body.data as TagDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetTagById(
  request: NextRequest,
  id: string,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const params = parseRequest(TagIdParamSchema, { id });

  const result = await runCatalogApiRoute({
    request,
    route: TAG_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.catalog.read,
    resolveServices,
    handler: async (_ctx, services) => services.getTagById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toTagResponse(result.body.data as TagDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateTag(
  request: NextRequest,
  id: string,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const params = parseRequest(TagIdParamSchema, { id });
  const body: unknown = await request.json();
  const updateInput = parseRequest(UpdateTagSchema, body);

  const result = await runCatalogApiRoute({
    request,
    route: TAG_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.catalog.update,
    resolveServices,
    handler: async (_ctx, services) => services.updateTag.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toTagResponse(result.body.data as TagDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleDeleteTag(
  request: NextRequest,
  id: string,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const params = parseRequest(TagIdParamSchema, { id });

  const result = await runCatalogApiRoute({
    request,
    route: TAG_ROUTES.byId(id),
    httpMethod: "DELETE",
    permission: PERMISSIONS.catalog.delete,
    resolveServices,
    handler: async (_ctx, services) => {
      await services.deleteTag.execute(params);
      return null;
    },
  });

  return toJsonResponse(result);
}
