import type { NextRequest } from "next/server";

import type { SupplierPaymentServiceResolver } from "@/modules/supplier-payment/application/services/supplier-payment-application-services.interface";
import type { SupplierPaymentDto } from "@/modules/supplier-payment/application/dtos/supplier-payment.dto";
import {
  CreateSupplierPaymentSchema,
  SupplierPaymentIdParamSchema,
} from "@/modules/supplier-payment/application";
import { ListSupplierPaymentsSchema } from "@/modules/supplier-payment/application/schemas/list-supplier-payments.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { UUIDSchema } from "@/shared/application/validation";
import { z } from "zod";

import {
  toSupplierPaymentListResponse,
  toSupplierPaymentResponse,
} from "../mappers/supplier-payment-response.mapper";
import {
  runSupplierPaymentApiRoute,
  toJsonResponse,
} from "../http/supplier-payment-api.route-runner";
import { SUPPLIER_PAYMENT_ROUTES } from "../routes/supplier-payment.routes";
import { PURCHASE_ORDER_ROUTES } from "@/modules/procurement/presentation/routes/purchase-order.routes";
import { runCatchingApiHandler } from "@/shared/infrastructure/http/run-catching-api-handler";

export async function handleListSupplierPayments(
  request: NextRequest,
  resolveServices: SupplierPaymentServiceResolver,
): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const listInput = parseRequest(ListSupplierPaymentsSchema, query);

    const result = await runSupplierPaymentApiRoute({
      request,
      route: SUPPLIER_PAYMENT_ROUTES.base,
      httpMethod: "GET",
      permission: PERMISSIONS.supplierPayments.read,
      resolveServices,
      handler: async (_ctx, services) =>
        services.listSupplierPayments.execute(listInput),
    });

    if (result.status === 200 && "data" in result.body) {
      const paginated = result.body.data as PaginatedResult<SupplierPaymentDto>;
      return toJsonResponse({
        ...result,
        body: {
          ...result.body,
          data: toSupplierPaymentListResponse(paginated),
        },
      });
    }

    return toJsonResponse(result);
  });
}

export async function handleCreateSupplierPayment(
  request: NextRequest,
  resolveServices: SupplierPaymentServiceResolver,
): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const body = await request.json();
    const createInput = parseRequest(CreateSupplierPaymentSchema, body);

    const result = await runSupplierPaymentApiRoute({
      request,
      route: SUPPLIER_PAYMENT_ROUTES.base,
      httpMethod: "POST",
      permission: PERMISSIONS.supplierPayments.create,
      resolveServices,
      handler: async (_ctx, services) =>
        services.createSupplierPayment.execute(createInput),
    });

    if (result.status === 200 && "data" in result.body) {
      return toJsonResponse({
        ...result,
        body: {
          ...result.body,
          data: toSupplierPaymentResponse(
            result.body.data as SupplierPaymentDto,
          ),
        },
      });
    }

    return toJsonResponse(result);
  });
}

export async function handleGetSupplierPaymentById(
  request: NextRequest,
  id: string,
  resolveServices: SupplierPaymentServiceResolver,
): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const params = parseRequest(SupplierPaymentIdParamSchema, { id });

    const result = await runSupplierPaymentApiRoute({
      request,
      route: SUPPLIER_PAYMENT_ROUTES.byId(id),
      httpMethod: "GET",
      permission: PERMISSIONS.supplierPayments.read,
      resolveServices,
      handler: async (_ctx, services) =>
        services.getSupplierPaymentById.execute(params),
    });

    if (result.status === 200 && "data" in result.body) {
      return toJsonResponse({
        ...result,
        body: {
          ...result.body,
          data: toSupplierPaymentResponse(
            result.body.data as SupplierPaymentDto,
          ),
        },
      });
    }

    return toJsonResponse(result);
  });
}

export async function handlePostSupplierPayment(
  request: NextRequest,
  id: string,
  resolveServices: SupplierPaymentServiceResolver,
): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const params = parseRequest(SupplierPaymentIdParamSchema, { id });

    const result = await runSupplierPaymentApiRoute({
      request,
      route: SUPPLIER_PAYMENT_ROUTES.post(id),
      httpMethod: "POST",
      permission: PERMISSIONS.supplierPayments.post,
      resolveServices,
      handler: async (_ctx, services) =>
        services.postSupplierPayment.execute(params),
    });

    if (result.status === 200 && "data" in result.body) {
      return toJsonResponse({
        ...result,
        body: {
          ...result.body,
          data: toSupplierPaymentResponse(
            result.body.data as SupplierPaymentDto,
          ),
        },
      });
    }

    return toJsonResponse(result);
  });
}

export async function handleVoidSupplierPayment(
  request: NextRequest,
  id: string,
  resolveServices: SupplierPaymentServiceResolver,
): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const params = parseRequest(SupplierPaymentIdParamSchema, { id });

    const result = await runSupplierPaymentApiRoute({
      request,
      route: SUPPLIER_PAYMENT_ROUTES.void(id),
      httpMethod: "POST",
      permission: PERMISSIONS.supplierPayments.void,
      resolveServices,
      handler: async (_ctx, services) =>
        services.voidSupplierPayment.execute(params),
    });

    if (result.status === 200 && "data" in result.body) {
      return toJsonResponse({
        ...result,
        body: {
          ...result.body,
          data: toSupplierPaymentResponse(
            result.body.data as SupplierPaymentDto,
          ),
        },
      });
    }

    return toJsonResponse(result);
  });
}

const PurchaseOrderIdParamSchema = z.object({
  id: UUIDSchema,
});

export async function handleListPurchaseOrderSupplierPayments(
  request: NextRequest,
  purchaseOrderId: string,
  resolveServices: SupplierPaymentServiceResolver,
): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const { id } = parseRequest(PurchaseOrderIdParamSchema, {
      id: purchaseOrderId,
    });
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const listInput = parseRequest(ListSupplierPaymentsSchema, {
      ...query,
      purchaseOrderId: id,
    });

    const result = await runSupplierPaymentApiRoute({
      request,
      route: PURCHASE_ORDER_ROUTES.payments(id),
      httpMethod: "GET",
      permission: PERMISSIONS.supplierPayments.read,
      resolveServices,
      handler: async (_ctx, services) =>
        services.listSupplierPayments.execute(listInput),
    });

    if (result.status === 200 && "data" in result.body) {
      const paginated = result.body.data as PaginatedResult<SupplierPaymentDto>;
      return toJsonResponse({
        ...result,
        body: {
          ...result.body,
          data: toSupplierPaymentListResponse(paginated),
        },
      });
    }

    return toJsonResponse(result);
  });
}

export async function handleCreatePurchaseOrderSupplierPayment(
  request: NextRequest,
  purchaseOrderId: string,
  resolveServices: SupplierPaymentServiceResolver,
): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const { id } = parseRequest(PurchaseOrderIdParamSchema, {
      id: purchaseOrderId,
    });
    const body = await request.json();
    const createInput = parseRequest(CreateSupplierPaymentSchema, {
      ...body,
      purchaseOrderId: id,
    });

    const result = await runSupplierPaymentApiRoute({
      request,
      route: PURCHASE_ORDER_ROUTES.payments(id),
      httpMethod: "POST",
      permission: PERMISSIONS.supplierPayments.create,
      resolveServices,
      handler: async (_ctx, services) =>
        services.createSupplierPayment.execute(createInput),
    });

    if (result.status === 200 && "data" in result.body) {
      return toJsonResponse({
        ...result,
        body: {
          ...result.body,
          data: toSupplierPaymentResponse(
            result.body.data as SupplierPaymentDto,
          ),
        },
      });
    }

    return toJsonResponse(result);
  });
}
