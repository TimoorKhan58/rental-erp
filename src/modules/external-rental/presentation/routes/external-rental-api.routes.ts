import type { NextRequest } from "next/server";

import type { ExternalRentalServiceResolver } from "@/modules/external-rental/application/services/external-rental-application-services.interface";
import type { ExternalRentalAgreementDto } from "@/modules/external-rental/application/dtos/external-rental.dto";
import {
  AllocateExternalRentalSchema,
  ConfirmExternalRentalSchema,
  CreateExternalRentalSchema,
  ExternalRentalIdParamSchema,
  ListExternalRentalsSchema,
  ReceiveExternalRentalSchema,
  SettleExternalRentalSchema,
  SupplierReturnExternalRentalSchema,
} from "@/modules/external-rental/application";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toExternalRentalListResponse,
  toExternalRentalResponse,
} from "../mappers/external-rental-response.mapper";
import {
  runExternalRentalApiRoute,
  toJsonResponse,
} from "../http/external-rental-api.route-runner";
import { EXTERNAL_RENTAL_ROUTES } from "../routes/external-rental.routes";
import { runCatchingApiHandler } from "@/shared/infrastructure/http/run-catching-api-handler";

export async function handleListExternalRentals(
  request: NextRequest,
  resolveServices: ExternalRentalServiceResolver,
): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const listInput = parseRequest(ListExternalRentalsSchema, query);

    const result = await runExternalRentalApiRoute({
      request,
      route: EXTERNAL_RENTAL_ROUTES.base,
      httpMethod: "GET",
      permission: PERMISSIONS.externalRentals.read,
      resolveServices,
      handler: async (_ctx, services) =>
        services.listExternalRentals.execute(listInput),
    });

    if (result.status === 200 && "data" in result.body) {
      const paginated = result.body
        .data as PaginatedResult<ExternalRentalAgreementDto>;
      return toJsonResponse({
        ...result,
        body: {
          ...result.body,
          data: toExternalRentalListResponse(paginated),
        },
      });
    }

    return toJsonResponse(result);
  });
}

export async function handleCreateExternalRental(
  request: NextRequest,
  resolveServices: ExternalRentalServiceResolver,
): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const body = await request.json();
    const createInput = parseRequest(CreateExternalRentalSchema, body);

    const result = await runExternalRentalApiRoute({
      request,
      route: EXTERNAL_RENTAL_ROUTES.base,
      httpMethod: "POST",
      permission: PERMISSIONS.externalRentals.create,
      resolveServices,
      handler: async (_ctx, services) =>
        services.createExternalRental.execute(createInput),
    });

    if (result.status === 200 && "data" in result.body) {
      return toJsonResponse({
        ...result,
        body: {
          ...result.body,
          data: toExternalRentalResponse(
            result.body.data as ExternalRentalAgreementDto,
          ),
        },
      });
    }

    return toJsonResponse(result);
  });
}

export async function handleGetExternalRentalById(
  request: NextRequest,
  id: string,
  resolveServices: ExternalRentalServiceResolver,
): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const params = parseRequest(ExternalRentalIdParamSchema, { id });

    const result = await runExternalRentalApiRoute({
      request,
      route: EXTERNAL_RENTAL_ROUTES.byId(id),
      httpMethod: "GET",
      permission: PERMISSIONS.externalRentals.read,
      resolveServices,
      handler: async (_ctx, services) =>
        services.getExternalRentalById.execute(params),
    });

    if (result.status === 200 && "data" in result.body) {
      return toJsonResponse({
        ...result,
        body: {
          ...result.body,
          data: toExternalRentalResponse(
            result.body.data as ExternalRentalAgreementDto,
          ),
        },
      });
    }

    return toJsonResponse(result);
  });
}

export async function handleConfirmExternalRental(
  request: NextRequest,
  id: string,
  resolveServices: ExternalRentalServiceResolver,
): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const params = parseRequest(ExternalRentalIdParamSchema, { id });
    const body = await request.json().catch(() => ({}));
    const confirmInput = parseRequest(ConfirmExternalRentalSchema, body);

    const result = await runExternalRentalApiRoute({
      request,
      route: EXTERNAL_RENTAL_ROUTES.confirm(id),
      httpMethod: "POST",
      permission: PERMISSIONS.externalRentals.confirm,
      resolveServices,
      handler: async (_ctx, services) =>
        services.confirmExternalRental.execute(params, confirmInput),
    });

    if (result.status === 200 && "data" in result.body) {
      return toJsonResponse({
        ...result,
        body: {
          ...result.body,
          data: toExternalRentalResponse(
            result.body.data as ExternalRentalAgreementDto,
          ),
        },
      });
    }

    return toJsonResponse(result);
  });
}

export async function handleReceiveExternalRental(
  request: NextRequest,
  id: string,
  resolveServices: ExternalRentalServiceResolver,
): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const params = parseRequest(ExternalRentalIdParamSchema, { id });
    const body = await request.json();
    const receiveInput = parseRequest(ReceiveExternalRentalSchema, body);

    const result = await runExternalRentalApiRoute({
      request,
      route: EXTERNAL_RENTAL_ROUTES.receive(id),
      httpMethod: "POST",
      permission: PERMISSIONS.externalRentals.receive,
      resolveServices,
      handler: async (_ctx, services) =>
        services.receiveExternalRental.execute(params, receiveInput),
    });

    if (result.status === 200 && "data" in result.body) {
      return toJsonResponse({
        ...result,
        body: {
          ...result.body,
          data: toExternalRentalResponse(
            result.body.data as ExternalRentalAgreementDto,
          ),
        },
      });
    }

    return toJsonResponse(result);
  });
}

export async function handleAllocateExternalRental(
  request: NextRequest,
  id: string,
  resolveServices: ExternalRentalServiceResolver,
): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const params = parseRequest(ExternalRentalIdParamSchema, { id });
    const body = await request.json();
    const allocateInput = parseRequest(AllocateExternalRentalSchema, body);

    const result = await runExternalRentalApiRoute({
      request,
      route: EXTERNAL_RENTAL_ROUTES.allocate(id),
      httpMethod: "POST",
      permission: PERMISSIONS.externalRentals.allocate,
      resolveServices,
      handler: async (_ctx, services) =>
        services.allocateExternalRental.execute(params, allocateInput),
    });

    if (result.status === 200 && "data" in result.body) {
      return toJsonResponse({
        ...result,
        body: {
          ...result.body,
          data: toExternalRentalResponse(
            result.body.data as ExternalRentalAgreementDto,
          ),
        },
      });
    }

    return toJsonResponse(result);
  });
}

export async function handleSupplierReturnExternalRental(
  request: NextRequest,
  id: string,
  resolveServices: ExternalRentalServiceResolver,
): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const params = parseRequest(ExternalRentalIdParamSchema, { id });
    const body = await request.json();
    const returnInput = parseRequest(SupplierReturnExternalRentalSchema, body);

    const result = await runExternalRentalApiRoute({
      request,
      route: EXTERNAL_RENTAL_ROUTES.returnToSupplier(id),
      httpMethod: "POST",
      permission: PERMISSIONS.externalRentals.returnToSupplier,
      resolveServices,
      handler: async (_ctx, services) =>
        services.supplierReturnExternalRental.execute(params, returnInput),
    });

    if (result.status === 200 && "data" in result.body) {
      return toJsonResponse({
        ...result,
        body: {
          ...result.body,
          data: toExternalRentalResponse(
            result.body.data as ExternalRentalAgreementDto,
          ),
        },
      });
    }

    return toJsonResponse(result);
  });
}

export async function handleSettleExternalRental(
  request: NextRequest,
  id: string,
  resolveServices: ExternalRentalServiceResolver,
): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const params = parseRequest(ExternalRentalIdParamSchema, { id });
    const body = await request.json();
    const settleInput = parseRequest(SettleExternalRentalSchema, body);

    const result = await runExternalRentalApiRoute({
      request,
      route: EXTERNAL_RENTAL_ROUTES.settle(id),
      httpMethod: "POST",
      permission: PERMISSIONS.externalRentals.settle,
      resolveServices,
      handler: async (_ctx, services) =>
        services.settleExternalRental.execute(params, settleInput),
    });

    if (result.status === 200 && "data" in result.body) {
      return toJsonResponse({
        ...result,
        body: {
          ...result.body,
          data: toExternalRentalResponse(
            result.body.data as ExternalRentalAgreementDto,
          ),
        },
      });
    }

    return toJsonResponse(result);
  });
}

export async function handleCancelExternalRental(
  request: NextRequest,
  id: string,
  resolveServices: ExternalRentalServiceResolver,
): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const params = parseRequest(ExternalRentalIdParamSchema, { id });

    const result = await runExternalRentalApiRoute({
      request,
      route: EXTERNAL_RENTAL_ROUTES.cancel(id),
      httpMethod: "POST",
      permission: PERMISSIONS.externalRentals.cancel,
      resolveServices,
      handler: async (_ctx, services) =>
        services.cancelExternalRental.execute(params),
    });

    if (result.status === 200 && "data" in result.body) {
      return toJsonResponse({
        ...result,
        body: {
          ...result.body,
          data: toExternalRentalResponse(
            result.body.data as ExternalRentalAgreementDto,
          ),
        },
      });
    }

    return toJsonResponse(result);
  });
}
