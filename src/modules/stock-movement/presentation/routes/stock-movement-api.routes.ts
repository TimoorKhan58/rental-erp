import type { NextRequest } from "next/server";

import type { StockMovementServiceResolver } from "@/modules/stock-movement/application/services/stock-movement-application-services.interface";
import type { StockMovementDto } from "@/modules/stock-movement/application/dtos/stock-movement.dto";
import {
  CreateStockMovementSchema,
  StockMovementIdParamSchema,
} from "@/modules/stock-movement/application";
import { ListStockMovementsSchema } from "@/modules/stock-movement/application/schemas/list-stock-movement.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toStockMovementListResponse,
  toStockMovementResponse,
} from "../mappers/stock-movement-response.mapper";
import {
  runStockMovementApiRoute,
  toJsonResponse,
} from "../http/stock-movement-api.route-runner";
import { STOCK_MOVEMENT_ROUTES } from "../routes/stock-movement.routes";

export async function handleListStockMovements(
  request: NextRequest,
  resolveServices: StockMovementServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListStockMovementsSchema, query);

  const result = await runStockMovementApiRoute({
    request,
    route: STOCK_MOVEMENT_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.stockMovements.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.listStockMovements.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<StockMovementDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toStockMovementListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateStockMovement(
  request: NextRequest,
  resolveServices: StockMovementServiceResolver,
): Promise<Response> {
  const body: unknown = await request.json();
  const createInput = parseRequest(CreateStockMovementSchema, body);

  const result = await runStockMovementApiRoute({
    request,
    route: STOCK_MOVEMENT_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.stockMovements.create,
    resolveServices,
    handler: async (_ctx, services) =>
      services.createStockMovement.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toStockMovementResponse(result.body.data as StockMovementDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetStockMovementById(
  request: NextRequest,
  id: string,
  resolveServices: StockMovementServiceResolver,
): Promise<Response> {
  const params = parseRequest(StockMovementIdParamSchema, { id });

  const result = await runStockMovementApiRoute({
    request,
    route: STOCK_MOVEMENT_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.stockMovements.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getStockMovementById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toStockMovementResponse(result.body.data as StockMovementDto),
      },
    });
  }

  return toJsonResponse(result);
}
