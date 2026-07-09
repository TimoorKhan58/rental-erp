import type { NextRequest } from "next/server";

import type { WarehouseServiceResolver } from "@/modules/warehouse/application/services/warehouse-application-services.interface";
import type { WarehouseDto } from "@/modules/warehouse/application/dtos/warehouse.dto";
import {
  CreateWarehouseSchema,
  WarehouseIdParamSchema,
  UpdateWarehouseSchema,
} from "@/modules/warehouse/application";
import { ListWarehousesSchema } from "@/modules/warehouse/application/schemas/list-warehouses.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toWarehouseListResponse,
  toWarehouseResponse,
} from "../mappers/warehouse-response.mapper";
import {
  runWarehouseApiRoute,
  toJsonResponse,
} from "../http/warehouse-api.route-runner";
import { WAREHOUSE_ROUTES } from "../routes/warehouse.routes";

export async function handleListWarehouses(
  request: NextRequest,
  resolveServices: WarehouseServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListWarehousesSchema, query);

  const result = await runWarehouseApiRoute({
    request,
    route: WAREHOUSE_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.warehouses.read,
    resolveServices,
    handler: async (_ctx, services) => services.listWarehouses.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<WarehouseDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toWarehouseListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateWarehouse(
  request: NextRequest,
  resolveServices: WarehouseServiceResolver,
): Promise<Response> {
  const body: unknown = await request.json();
  const createInput = parseRequest(CreateWarehouseSchema, body);

  const result = await runWarehouseApiRoute({
    request,
    route: WAREHOUSE_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.warehouses.create,
    resolveServices,
    handler: async (_ctx, services) => services.createWarehouse.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toWarehouseResponse(result.body.data as WarehouseDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetWarehouseById(
  request: NextRequest,
  id: string,
  resolveServices: WarehouseServiceResolver,
): Promise<Response> {
  const params = parseRequest(WarehouseIdParamSchema, { id });

  const result = await runWarehouseApiRoute({
    request,
    route: WAREHOUSE_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.warehouses.read,
    resolveServices,
    handler: async (_ctx, services) => services.getWarehouseById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toWarehouseResponse(result.body.data as WarehouseDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateWarehouse(
  request: NextRequest,
  id: string,
  resolveServices: WarehouseServiceResolver,
): Promise<Response> {
  const params = parseRequest(WarehouseIdParamSchema, { id });
  const body: unknown = await request.json();
  const updateInput = parseRequest(UpdateWarehouseSchema, body);

  const result = await runWarehouseApiRoute({
    request,
    route: WAREHOUSE_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.warehouses.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateWarehouse.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toWarehouseResponse(result.body.data as WarehouseDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleDeleteWarehouse(
  request: NextRequest,
  id: string,
  resolveServices: WarehouseServiceResolver,
): Promise<Response> {
  const params = parseRequest(WarehouseIdParamSchema, { id });

  const result = await runWarehouseApiRoute({
    request,
    route: WAREHOUSE_ROUTES.byId(id),
    httpMethod: "DELETE",
    permission: PERMISSIONS.warehouses.delete,
    resolveServices,
    handler: async (_ctx, services) => {
      await services.deleteWarehouse.execute(params);
      return null;
    },
  });

  return toJsonResponse(result);
}
