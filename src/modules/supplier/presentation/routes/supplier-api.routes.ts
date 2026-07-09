import type { NextRequest } from "next/server";

import type { SupplierServiceResolver } from "@/modules/supplier/application/services/supplier-application-services.interface";
import type { SupplierDto } from "@/modules/supplier/application/dtos/supplier.dto";
import {
  CreateSupplierSchema,
  SupplierIdParamSchema,
  UpdateSupplierSchema,
} from "@/modules/supplier/application";
import { ListSuppliersSchema } from "@/modules/supplier/application/schemas/list-suppliers.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toSupplierListResponse,
  toSupplierResponse,
} from "../mappers/supplier-response.mapper";
import {
  runSupplierApiRoute,
  toJsonResponse,
} from "../http/supplier-api.route-runner";
import { SUPPLIER_ROUTES } from "../routes/supplier.routes";

export async function handleListSuppliers(
  request: NextRequest,
  resolveServices: SupplierServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListSuppliersSchema, query);

  const result = await runSupplierApiRoute({
    request,
    route: SUPPLIER_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.suppliers.read,
    resolveServices,
    handler: async (_ctx, services) => services.listSuppliers.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<SupplierDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toSupplierListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateSupplier(
  request: NextRequest,
  resolveServices: SupplierServiceResolver,
): Promise<Response> {
  const body: unknown = await request.json();
  const createInput = parseRequest(CreateSupplierSchema, body);

  const result = await runSupplierApiRoute({
    request,
    route: SUPPLIER_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.suppliers.create,
    resolveServices,
    handler: async (_ctx, services) => services.createSupplier.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toSupplierResponse(result.body.data as SupplierDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetSupplierById(
  request: NextRequest,
  id: string,
  resolveServices: SupplierServiceResolver,
): Promise<Response> {
  const params = parseRequest(SupplierIdParamSchema, { id });

  const result = await runSupplierApiRoute({
    request,
    route: SUPPLIER_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.suppliers.read,
    resolveServices,
    handler: async (_ctx, services) => services.getSupplierById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toSupplierResponse(result.body.data as SupplierDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateSupplier(
  request: NextRequest,
  id: string,
  resolveServices: SupplierServiceResolver,
): Promise<Response> {
  const params = parseRequest(SupplierIdParamSchema, { id });
  const body: unknown = await request.json();
  const updateInput = parseRequest(UpdateSupplierSchema, body);

  const result = await runSupplierApiRoute({
    request,
    route: SUPPLIER_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.suppliers.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateSupplier.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toSupplierResponse(result.body.data as SupplierDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleDeleteSupplier(
  request: NextRequest,
  id: string,
  resolveServices: SupplierServiceResolver,
): Promise<Response> {
  const params = parseRequest(SupplierIdParamSchema, { id });

  const result = await runSupplierApiRoute({
    request,
    route: SUPPLIER_ROUTES.byId(id),
    httpMethod: "DELETE",
    permission: PERMISSIONS.suppliers.delete,
    resolveServices,
    handler: async (_ctx, services) => {
      await services.deleteSupplier.execute(params);
      return null;
    },
  });

  return toJsonResponse(result);
}
