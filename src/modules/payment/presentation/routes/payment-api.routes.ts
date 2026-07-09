import type { NextRequest } from "next/server";

import type { PaymentServiceResolver } from "@/modules/payment/application/services/payment-application-services.interface";
import type { PaymentDto } from "@/modules/payment/application/dtos/payment.dto";
import {
  CreatePaymentSchema,
  PaymentIdParamSchema,
  UpdatePaymentSchema,
} from "@/modules/payment/application";
import { ListPaymentsSchema } from "@/modules/payment/application/schemas/list-payments.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toPaymentListResponse,
  toPaymentResponse,
} from "../mappers/payment-response.mapper";
import {
  runPaymentApiRoute,
  toJsonResponse,
} from "../http/payment-api.route-runner";
import { PAYMENT_ROUTES } from "../routes/payment.routes";

export async function handleListPayments(
  request: NextRequest,
  resolveServices: PaymentServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListPaymentsSchema, query);

  const result = await runPaymentApiRoute({
    request,
    route: PAYMENT_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.payments.read,
    resolveServices,
    handler: async (_ctx, services) => services.listPayments.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<PaymentDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toPaymentListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreatePayment(
  request: NextRequest,
  resolveServices: PaymentServiceResolver,
): Promise<Response> {
  const body = await request.json();
  const createInput = parseRequest(CreatePaymentSchema, body);

  const result = await runPaymentApiRoute({
    request,
    route: PAYMENT_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.payments.create,
    resolveServices,
    handler: async (_ctx, services) =>
      services.createPayment.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toPaymentResponse(result.body.data as PaymentDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetPaymentById(
  request: NextRequest,
  id: string,
  resolveServices: PaymentServiceResolver,
): Promise<Response> {
  const params = parseRequest(PaymentIdParamSchema, { id });

  const result = await runPaymentApiRoute({
    request,
    route: PAYMENT_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.payments.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getPaymentById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toPaymentResponse(result.body.data as PaymentDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdatePayment(
  request: NextRequest,
  id: string,
  resolveServices: PaymentServiceResolver,
): Promise<Response> {
  const params = parseRequest(PaymentIdParamSchema, { id });
  const body = await request.json();
  const updateInput = parseRequest(UpdatePaymentSchema, body);

  const result = await runPaymentApiRoute({
    request,
    route: PAYMENT_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.payments.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updatePayment.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toPaymentResponse(result.body.data as PaymentDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handlePostPayment(
  request: NextRequest,
  id: string,
  resolveServices: PaymentServiceResolver,
): Promise<Response> {
  const params = parseRequest(PaymentIdParamSchema, { id });

  const result = await runPaymentApiRoute({
    request,
    route: PAYMENT_ROUTES.post(id),
    httpMethod: "POST",
    permission: PERMISSIONS.payments.post,
    resolveServices,
    handler: async (_ctx, services) => services.postPayment.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toPaymentResponse(result.body.data as PaymentDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleVoidPayment(
  request: NextRequest,
  id: string,
  resolveServices: PaymentServiceResolver,
): Promise<Response> {
  const params = parseRequest(PaymentIdParamSchema, { id });

  const result = await runPaymentApiRoute({
    request,
    route: PAYMENT_ROUTES.void(id),
    httpMethod: "POST",
    permission: PERMISSIONS.payments.void,
    resolveServices,
    handler: async (_ctx, services) => services.voidPayment.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toPaymentResponse(result.body.data as PaymentDto),
      },
    });
  }

  return toJsonResponse(result);
}
