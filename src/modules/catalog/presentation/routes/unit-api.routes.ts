import type { NextRequest } from "next/server";

import type { CatalogServiceResolver } from "@/modules/catalog/application/services/catalog-application-services.interface";
import type { UnitDto } from "@/modules/catalog/application/dtos/unit.dto";
import {
  CreateUnitSchema,
  UnitIdParamSchema,
  UpdateUnitSchema,
} from "@/modules/catalog/application/schemas/unit.schemas";
import { ListUnitsSchema } from "@/modules/catalog/application/schemas/list-units.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toUnitListResponse,
  toUnitResponse,
} from "../mappers/unit-response.mapper";
import {
  runCatalogApiRoute,
  toJsonResponse,
} from "../http/catalog-api.route-runner";
import { UNIT_ROUTES } from "./unit.routes";

export async function handleListUnits(
  request: NextRequest,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListUnitsSchema, query);

  const result = await runCatalogApiRoute({
    request,
    route: UNIT_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.catalog.read,
    resolveServices,
    handler: async (_ctx, services) => services.listUnits.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<UnitDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toUnitListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateUnit(
  request: NextRequest,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const body: unknown = await request.json();
  const createInput = parseRequest(CreateUnitSchema, body);

  const result = await runCatalogApiRoute({
    request,
    route: UNIT_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.catalog.create,
    resolveServices,
    handler: async (_ctx, services) => services.createUnit.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toUnitResponse(result.body.data as UnitDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetUnitById(
  request: NextRequest,
  id: string,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const params = parseRequest(UnitIdParamSchema, { id });

  const result = await runCatalogApiRoute({
    request,
    route: UNIT_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.catalog.read,
    resolveServices,
    handler: async (_ctx, services) => services.getUnitById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toUnitResponse(result.body.data as UnitDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateUnit(
  request: NextRequest,
  id: string,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const params = parseRequest(UnitIdParamSchema, { id });
  const body: unknown = await request.json();
  const updateInput = parseRequest(UpdateUnitSchema, body);

  const result = await runCatalogApiRoute({
    request,
    route: UNIT_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.catalog.update,
    resolveServices,
    handler: async (_ctx, services) => services.updateUnit.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toUnitResponse(result.body.data as UnitDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleDeleteUnit(
  request: NextRequest,
  id: string,
  resolveServices: CatalogServiceResolver,
): Promise<Response> {
  const params = parseRequest(UnitIdParamSchema, { id });

  const result = await runCatalogApiRoute({
    request,
    route: UNIT_ROUTES.byId(id),
    httpMethod: "DELETE",
    permission: PERMISSIONS.catalog.delete,
    resolveServices,
    handler: async (_ctx, services) => {
      await services.deleteUnit.execute(params);
      return null;
    },
  });

  return toJsonResponse(result);
}
