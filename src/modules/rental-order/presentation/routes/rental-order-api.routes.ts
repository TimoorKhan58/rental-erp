import type { NextRequest } from "next/server";

import type { RentalOrderServiceResolver } from "@/modules/rental-order/application/services/rental-order-application-services.interface";
import type { RentalOrderDto } from "@/modules/rental-order/application/dtos/rental-order.dto";
import {
  CreateRentalOrderSchema,
  RentalOrderIdParamSchema,
  ReserveRentalOrderSchema,
  UpdateRentalOrderSchema,
} from "@/modules/rental-order/application";
import { ListRentalOrdersSchema } from "@/modules/rental-order/application/schemas/list-rental-orders.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";

import {
  toRentalOrderListResponse,
  toRentalOrderResponse,
} from "../mappers/rental-order-response.mapper";
import {
  runRentalOrderApiRoute,
  toJsonResponse,
} from "../http/rental-order-api.route-runner";
import { RENTAL_ORDER_ROUTES } from "../routes/rental-order.routes";

export async function handleListRentalOrders(
  request: NextRequest,
  resolveServices: RentalOrderServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());

  const result = await runRentalOrderApiRoute({
    request,
    route: RENTAL_ORDER_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.rentalOrders.read,
    resolveServices,
    handler: async (_ctx, services) => {
      const listInput = parseRequest(ListRentalOrdersSchema, query);
      const paginated = await services.listRentalOrders.execute(listInput);
      return toRentalOrderListResponse(paginated);
    },
  });

  return toJsonResponse(result);
}

export async function handleCreateRentalOrder(
  request: NextRequest,
  resolveServices: RentalOrderServiceResolver,
): Promise<Response> {
  const body = await request.json();
  const createInput = parseRequest(CreateRentalOrderSchema, body);

  const result = await runRentalOrderApiRoute({
    request,
    route: RENTAL_ORDER_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.rentalOrders.create,
    resolveServices,
    handler: async (_ctx, services) =>
      services.createRentalOrder.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRentalOrderResponse(result.body.data as RentalOrderDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetRentalOrderById(
  request: NextRequest,
  id: string,
  resolveServices: RentalOrderServiceResolver,
): Promise<Response> {
  const params = parseRequest(RentalOrderIdParamSchema, { id });

  const result = await runRentalOrderApiRoute({
    request,
    route: RENTAL_ORDER_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.rentalOrders.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getRentalOrderById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRentalOrderResponse(result.body.data as RentalOrderDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateRentalOrder(
  request: NextRequest,
  id: string,
  resolveServices: RentalOrderServiceResolver,
): Promise<Response> {
  const params = parseRequest(RentalOrderIdParamSchema, { id });
  const body = await request.json();
  const updateInput = parseRequest(UpdateRentalOrderSchema, body);

  const result = await runRentalOrderApiRoute({
    request,
    route: RENTAL_ORDER_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.rentalOrders.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateRentalOrder.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRentalOrderResponse(result.body.data as RentalOrderDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleConfirmRentalOrder(
  request: NextRequest,
  id: string,
  resolveServices: RentalOrderServiceResolver,
): Promise<Response> {
  const params = parseRequest(RentalOrderIdParamSchema, { id });

  const result = await runRentalOrderApiRoute({
    request,
    route: RENTAL_ORDER_ROUTES.confirm(id),
    httpMethod: "POST",
    permission: PERMISSIONS.rentalOrders.confirm,
    resolveServices,
    handler: async (_ctx, services) =>
      services.confirmRentalOrder.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRentalOrderResponse(result.body.data as RentalOrderDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleReserveRentalOrder(
  request: NextRequest,
  id: string,
  resolveServices: RentalOrderServiceResolver,
): Promise<Response> {
  const params = parseRequest(RentalOrderIdParamSchema, { id });
  const body = await request.json();
  const reserveInput = parseRequest(ReserveRentalOrderSchema, body);

  const result = await runRentalOrderApiRoute({
    request,
    route: RENTAL_ORDER_ROUTES.reserve(id),
    httpMethod: "POST",
    permission: PERMISSIONS.rentalOrders.reserve,
    resolveServices,
    handler: async (_ctx, services) =>
      services.reserveRentalOrder.execute(params, reserveInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRentalOrderResponse(result.body.data as RentalOrderDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCancelRentalOrder(
  request: NextRequest,
  id: string,
  resolveServices: RentalOrderServiceResolver,
): Promise<Response> {
  const params = parseRequest(RentalOrderIdParamSchema, { id });

  const result = await runRentalOrderApiRoute({
    request,
    route: RENTAL_ORDER_ROUTES.cancel(id),
    httpMethod: "POST",
    permission: PERMISSIONS.rentalOrders.cancel,
    resolveServices,
    handler: async (_ctx, services) =>
      services.cancelRentalOrder.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRentalOrderResponse(result.body.data as RentalOrderDto),
      },
    });
  }

  return toJsonResponse(result);
}
