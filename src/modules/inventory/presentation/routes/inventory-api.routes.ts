import type { NextRequest } from "next/server";

import type { InventoryServiceResolver } from "@/modules/inventory/application/services/inventory-application-services.interface";
import type { InventoryDto } from "@/modules/inventory/application/dtos/inventory.dto";
import {
  CreateInventorySchema,
  InventoryIdParamSchema,
  UpdateInventorySchema,
} from "@/modules/inventory/application";
import { ListInventorySchema } from "@/modules/inventory/application/schemas/list-inventory.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toInventoryListResponse,
  toInventoryResponse,
} from "../mappers/inventory-response.mapper";
import {
  runInventoryApiRoute,
  toJsonResponse,
} from "../http/inventory-api.route-runner";
import { INVENTORY_ROUTES } from "../routes/inventory.routes";

export async function handleListInventory(
  request: NextRequest,
  resolveServices: InventoryServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListInventorySchema, query);

  const result = await runInventoryApiRoute({
    request,
    route: INVENTORY_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.inventory.read,
    resolveServices,
    handler: async (_ctx, services) => services.listInventory.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<InventoryDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toInventoryListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateInventory(
  request: NextRequest,
  resolveServices: InventoryServiceResolver,
): Promise<Response> {
  const body: unknown = await request.json();
  const createInput = parseRequest(CreateInventorySchema, body);

  const result = await runInventoryApiRoute({
    request,
    route: INVENTORY_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.inventory.create,
    resolveServices,
    handler: async (_ctx, services) =>
      services.createInventory.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toInventoryResponse(result.body.data as InventoryDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetInventoryById(
  request: NextRequest,
  id: string,
  resolveServices: InventoryServiceResolver,
): Promise<Response> {
  const params = parseRequest(InventoryIdParamSchema, { id });

  const result = await runInventoryApiRoute({
    request,
    route: INVENTORY_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.inventory.read,
    resolveServices,
    handler: async (_ctx, services) => services.getInventoryById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toInventoryResponse(result.body.data as InventoryDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateInventory(
  request: NextRequest,
  id: string,
  resolveServices: InventoryServiceResolver,
): Promise<Response> {
  const params = parseRequest(InventoryIdParamSchema, { id });
  const body: unknown = await request.json();
  const updateInput = parseRequest(UpdateInventorySchema, body);

  const result = await runInventoryApiRoute({
    request,
    route: INVENTORY_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.inventory.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateInventory.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toInventoryResponse(result.body.data as InventoryDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleDeleteInventory(
  request: NextRequest,
  id: string,
  resolveServices: InventoryServiceResolver,
): Promise<Response> {
  const params = parseRequest(InventoryIdParamSchema, { id });

  const result = await runInventoryApiRoute({
    request,
    route: INVENTORY_ROUTES.byId(id),
    httpMethod: "DELETE",
    permission: PERMISSIONS.inventory.delete,
    resolveServices,
    handler: async (_ctx, services) => {
      await services.deleteInventory.execute(params);
      return null;
    },
  });

  return toJsonResponse(result);
}
