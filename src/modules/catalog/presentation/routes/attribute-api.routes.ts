import type { NextRequest } from "next/server";

import type { CatalogServiceResolver } from "@/modules/catalog/application/services/catalog-application-services.interface";
import type { AttributeDto } from "@/modules/catalog/application/dtos/attribute.dto";
import {
  CreateAttributeSchema,
  AttributeIdParamSchema,
  UpdateAttributeSchema,
} from "@/modules/catalog/application/schemas/attribute.schemas";
import { ListAttributesSchema } from "@/modules/catalog/application/schemas/list-attributes.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toAttributeListResponse,
  toAttributeResponse,
} from "../mappers/attribute-response.mapper";
import {
  runCatalogApiRoute,
  toJsonResponse,
} from "../http/catalog-api.route-runner";
import { ATTRIBUTE_ROUTES } from "./attribute.routes";

export async function handleListAttributes(
  request: NextRequest,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListAttributesSchema, query);

  const result = await runCatalogApiRoute({
    request,
    route: ATTRIBUTE_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.catalog.read,
    resolveServices,
    handler: async (_ctx, services) => services.listAttributes.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<AttributeDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAttributeListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateAttribute(
  request: NextRequest,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const body: unknown = await request.json();
  const createInput = parseRequest(CreateAttributeSchema, body);

  const result = await runCatalogApiRoute({
    request,
    route: ATTRIBUTE_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.catalog.create,
    resolveServices,
    handler: async (_ctx, services) => services.createAttribute.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAttributeResponse(result.body.data as AttributeDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetAttributeById(
  request: NextRequest,
  id: string,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const params = parseRequest(AttributeIdParamSchema, { id });

  const result = await runCatalogApiRoute({
    request,
    route: ATTRIBUTE_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.catalog.read,
    resolveServices,
    handler: async (_ctx, services) => services.getAttributeById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAttributeResponse(result.body.data as AttributeDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateAttribute(
  request: NextRequest,
  id: string,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const params = parseRequest(AttributeIdParamSchema, { id });
  const body: unknown = await request.json();
  const updateInput = parseRequest(UpdateAttributeSchema, body);

  const result = await runCatalogApiRoute({
    request,
    route: ATTRIBUTE_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.catalog.update,
    resolveServices,
    handler: async (_ctx, services) => services.updateAttribute.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAttributeResponse(result.body.data as AttributeDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleDeleteAttribute(
  request: NextRequest,
  id: string,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const params = parseRequest(AttributeIdParamSchema, { id });

  const result = await runCatalogApiRoute({
    request,
    route: ATTRIBUTE_ROUTES.byId(id),
    httpMethod: "DELETE",
    permission: PERMISSIONS.catalog.delete,
    resolveServices,
    handler: async (_ctx, services) => {
      await services.deleteAttribute.execute(params);
      return null;
    },
  });

  return toJsonResponse(result);
}
