import type { NextRequest } from "next/server";

import type { PurchaseOrderServiceResolver } from "@/modules/procurement/application/services/purchase-order-application-services.interface";
import type { PurchaseOrderDto } from "@/modules/procurement/application/dtos/purchase-order.dto";
import {
  CreatePurchaseOrderSchema,
  PurchaseOrderIdParamSchema,
  ReceivePurchaseOrderSchema,
  UpdatePurchaseOrderSchema,
} from "@/modules/procurement/application";
import { ListPurchaseOrdersSchema } from "@/modules/procurement/application/schemas/list-purchase-orders.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toPurchaseOrderListResponse,
  toPurchaseOrderResponse,
} from "../mappers/purchase-order-response.mapper";
import {
  runPurchaseOrderApiRoute,
  toJsonResponse,
} from "../http/purchase-order-api.route-runner";
import { PURCHASE_ORDER_ROUTES } from "../routes/purchase-order.routes";

export async function handleListPurchaseOrders(
  request: NextRequest,
  resolveServices: PurchaseOrderServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListPurchaseOrdersSchema, query);

  const result = await runPurchaseOrderApiRoute({
    request,
    route: PURCHASE_ORDER_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.purchaseOrders.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.listPurchaseOrders.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<PurchaseOrderDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toPurchaseOrderListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreatePurchaseOrder(
  request: NextRequest,
  resolveServices: PurchaseOrderServiceResolver,
): Promise<Response> {
  const body = await request.json();
  const createInput = parseRequest(CreatePurchaseOrderSchema, body);

  const result = await runPurchaseOrderApiRoute({
    request,
    route: PURCHASE_ORDER_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.purchaseOrders.create,
    resolveServices,
    handler: async (_ctx, services) =>
      services.createPurchaseOrder.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toPurchaseOrderResponse(result.body.data as PurchaseOrderDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetPurchaseOrderById(
  request: NextRequest,
  id: string,
  resolveServices: PurchaseOrderServiceResolver,
): Promise<Response> {
  const params = parseRequest(PurchaseOrderIdParamSchema, { id });

  const result = await runPurchaseOrderApiRoute({
    request,
    route: PURCHASE_ORDER_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.purchaseOrders.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getPurchaseOrderById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toPurchaseOrderResponse(result.body.data as PurchaseOrderDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdatePurchaseOrder(
  request: NextRequest,
  id: string,
  resolveServices: PurchaseOrderServiceResolver,
): Promise<Response> {
  const params = parseRequest(PurchaseOrderIdParamSchema, { id });
  const body = await request.json();
  const updateInput = parseRequest(UpdatePurchaseOrderSchema, body);

  const result = await runPurchaseOrderApiRoute({
    request,
    route: PURCHASE_ORDER_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.purchaseOrders.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updatePurchaseOrder.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toPurchaseOrderResponse(result.body.data as PurchaseOrderDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleApprovePurchaseOrder(
  request: NextRequest,
  id: string,
  resolveServices: PurchaseOrderServiceResolver,
): Promise<Response> {
  const params = parseRequest(PurchaseOrderIdParamSchema, { id });

  const result = await runPurchaseOrderApiRoute({
    request,
    route: PURCHASE_ORDER_ROUTES.approve(id),
    httpMethod: "POST",
    permission: PERMISSIONS.purchaseOrders.approve,
    resolveServices,
    handler: async (_ctx, services) =>
      services.approvePurchaseOrder.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toPurchaseOrderResponse(result.body.data as PurchaseOrderDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleReceivePurchaseOrder(
  request: NextRequest,
  id: string,
  resolveServices: PurchaseOrderServiceResolver,
): Promise<Response> {
  const params = parseRequest(PurchaseOrderIdParamSchema, { id });
  const body = await request.json();
  const receiveInput = parseRequest(ReceivePurchaseOrderSchema, body);

  const result = await runPurchaseOrderApiRoute({
    request,
    route: PURCHASE_ORDER_ROUTES.receive(id),
    httpMethod: "POST",
    permission: PERMISSIONS.purchaseOrders.receive,
    resolveServices,
    handler: async (_ctx, services) =>
      services.receivePurchaseOrder.execute(params, receiveInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toPurchaseOrderResponse(result.body.data as PurchaseOrderDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCancelPurchaseOrder(
  request: NextRequest,
  id: string,
  resolveServices: PurchaseOrderServiceResolver,
): Promise<Response> {
  const params = parseRequest(PurchaseOrderIdParamSchema, { id });

  const result = await runPurchaseOrderApiRoute({
    request,
    route: PURCHASE_ORDER_ROUTES.cancel(id),
    httpMethod: "POST",
    permission: PERMISSIONS.purchaseOrders.cancel,
    resolveServices,
    handler: async (_ctx, services) =>
      services.cancelPurchaseOrder.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toPurchaseOrderResponse(result.body.data as PurchaseOrderDto),
      },
    });
  }

  return toJsonResponse(result);
}
