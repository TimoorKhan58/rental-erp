import type { NextRequest } from "next/server";

import type { RentalInvoiceServiceResolver } from "@/modules/rental-invoice/application/services/rental-invoice-application-services.interface";
import type { RentalInvoiceDto } from "@/modules/rental-invoice/application/dtos/rental-invoice.dto";
import {
  CreateRentalInvoiceSchema,
  RentalInvoiceIdParamSchema,
  UpdateRentalInvoiceSchema,
} from "@/modules/rental-invoice/application";
import { ListRentalInvoicesSchema } from "@/modules/rental-invoice/application/schemas/list-rental-invoices.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toRentalInvoiceListResponse,
  toRentalInvoiceResponse,
} from "../mappers/rental-invoice-response.mapper";
import {
  runRentalInvoiceApiRoute,
  toJsonResponse,
} from "../http/rental-invoice-api.route-runner";
import { RENTAL_INVOICE_ROUTES } from "../routes/rental-invoice.routes";

export async function handleListRentalInvoices(
  request: NextRequest,
  resolveServices: RentalInvoiceServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListRentalInvoicesSchema, query);

  const result = await runRentalInvoiceApiRoute({
    request,
    route: RENTAL_INVOICE_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.rentalInvoices.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.listRentalInvoices.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<RentalInvoiceDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRentalInvoiceListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateRentalInvoice(
  request: NextRequest,
  resolveServices: RentalInvoiceServiceResolver,
): Promise<Response> {
  const body = await request.json();
  const createInput = parseRequest(CreateRentalInvoiceSchema, body);

  const result = await runRentalInvoiceApiRoute({
    request,
    route: RENTAL_INVOICE_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.rentalInvoices.create,
    resolveServices,
    handler: async (_ctx, services) =>
      services.createRentalInvoice.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRentalInvoiceResponse(result.body.data as RentalInvoiceDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetRentalInvoiceById(
  request: NextRequest,
  id: string,
  resolveServices: RentalInvoiceServiceResolver,
): Promise<Response> {
  const params = parseRequest(RentalInvoiceIdParamSchema, { id });

  const result = await runRentalInvoiceApiRoute({
    request,
    route: RENTAL_INVOICE_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.rentalInvoices.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getRentalInvoiceById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRentalInvoiceResponse(result.body.data as RentalInvoiceDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateRentalInvoice(
  request: NextRequest,
  id: string,
  resolveServices: RentalInvoiceServiceResolver,
): Promise<Response> {
  const params = parseRequest(RentalInvoiceIdParamSchema, { id });
  const body = await request.json();
  const updateInput = parseRequest(UpdateRentalInvoiceSchema, body);

  const result = await runRentalInvoiceApiRoute({
    request,
    route: RENTAL_INVOICE_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.rentalInvoices.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateRentalInvoice.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRentalInvoiceResponse(result.body.data as RentalInvoiceDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleIssueRentalInvoice(
  request: NextRequest,
  id: string,
  resolveServices: RentalInvoiceServiceResolver,
): Promise<Response> {
  const params = parseRequest(RentalInvoiceIdParamSchema, { id });

  const result = await runRentalInvoiceApiRoute({
    request,
    route: RENTAL_INVOICE_ROUTES.issue(id),
    httpMethod: "POST",
    permission: PERMISSIONS.rentalInvoices.issue,
    resolveServices,
    handler: async (_ctx, services) =>
      services.issueRentalInvoice.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRentalInvoiceResponse(result.body.data as RentalInvoiceDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleVoidRentalInvoice(
  request: NextRequest,
  id: string,
  resolveServices: RentalInvoiceServiceResolver,
): Promise<Response> {
  const params = parseRequest(RentalInvoiceIdParamSchema, { id });

  const result = await runRentalInvoiceApiRoute({
    request,
    route: RENTAL_INVOICE_ROUTES.void(id),
    httpMethod: "POST",
    permission: PERMISSIONS.rentalInvoices.void,
    resolveServices,
    handler: async (_ctx, services) =>
      services.voidRentalInvoice.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRentalInvoiceResponse(result.body.data as RentalInvoiceDto),
      },
    });
  }

  return toJsonResponse(result);
}
