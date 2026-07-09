import type { NextRequest } from "next/server";

import type { MaintenanceServiceResolver } from "@/modules/maintenance/application/services/maintenance-application-services.interface";
import type { MaintenanceDto } from "@/modules/maintenance/application/dtos/maintenance.dto";
import {
  CreateMaintenanceSchema,
  MaintenanceIdParamSchema,
  UpdateMaintenanceSchema,
} from "@/modules/maintenance/application/schemas/maintenance.schemas";
import { ListMaintenancesSchema } from "@/modules/maintenance/application/schemas/maintenance.schemas";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toMaintenanceListResponse,
  toMaintenanceResponse,
} from "../mappers/maintenance-response.mapper";
import {
  runMaintenanceApiRoute,
  toJsonResponse,
} from "../http/maintenance-api.route-runner";
import { MAINTENANCE_ROUTES } from "../routes/maintenance.routes";

export async function handleListMaintenances(
  request: NextRequest,
  resolveServices: MaintenanceServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListMaintenancesSchema, query);

  const result = await runMaintenanceApiRoute({
    request,
    route: MAINTENANCE_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.maintenances.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.listMaintenances.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<MaintenanceDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toMaintenanceListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateMaintenance(
  request: NextRequest,
  resolveServices: MaintenanceServiceResolver,
): Promise<Response> {
  const body = await request.json();
  const createInput = parseRequest(CreateMaintenanceSchema, body);

  const result = await runMaintenanceApiRoute({
    request,
    route: MAINTENANCE_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.maintenances.create,
    resolveServices,
    handler: async (_ctx, services) =>
      services.createMaintenance.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toMaintenanceResponse(result.body.data as MaintenanceDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetMaintenanceById(
  request: NextRequest,
  id: string,
  resolveServices: MaintenanceServiceResolver,
): Promise<Response> {
  const params = parseRequest(MaintenanceIdParamSchema, { id });

  const result = await runMaintenanceApiRoute({
    request,
    route: MAINTENANCE_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.maintenances.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getMaintenanceById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toMaintenanceResponse(result.body.data as MaintenanceDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateMaintenance(
  request: NextRequest,
  id: string,
  resolveServices: MaintenanceServiceResolver,
): Promise<Response> {
  const params = parseRequest(MaintenanceIdParamSchema, { id });
  const body = await request.json();
  const updateInput = parseRequest(UpdateMaintenanceSchema, body);

  const result = await runMaintenanceApiRoute({
    request,
    route: MAINTENANCE_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.maintenances.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateMaintenance.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toMaintenanceResponse(result.body.data as MaintenanceDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleStartMaintenance(
  request: NextRequest,
  id: string,
  resolveServices: MaintenanceServiceResolver,
): Promise<Response> {
  const params = parseRequest(MaintenanceIdParamSchema, { id });

  const result = await runMaintenanceApiRoute({
    request,
    route: MAINTENANCE_ROUTES.start(id),
    httpMethod: "POST",
    permission: PERMISSIONS.maintenances.start,
    resolveServices,
    handler: async (_ctx, services) =>
      services.startMaintenance.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toMaintenanceResponse(result.body.data as MaintenanceDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCompleteMaintenance(
  request: NextRequest,
  id: string,
  resolveServices: MaintenanceServiceResolver,
): Promise<Response> {
  const params = parseRequest(MaintenanceIdParamSchema, { id });

  const result = await runMaintenanceApiRoute({
    request,
    route: MAINTENANCE_ROUTES.complete(id),
    httpMethod: "POST",
    permission: PERMISSIONS.maintenances.complete,
    resolveServices,
    handler: async (_ctx, services) =>
      services.completeMaintenance.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toMaintenanceResponse(result.body.data as MaintenanceDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCancelMaintenance(
  request: NextRequest,
  id: string,
  resolveServices: MaintenanceServiceResolver,
): Promise<Response> {
  const params = parseRequest(MaintenanceIdParamSchema, { id });

  const result = await runMaintenanceApiRoute({
    request,
    route: MAINTENANCE_ROUTES.cancel(id),
    httpMethod: "POST",
    permission: PERMISSIONS.maintenances.cancel,
    resolveServices,
    handler: async (_ctx, services) =>
      services.cancelMaintenance.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toMaintenanceResponse(result.body.data as MaintenanceDto),
      },
    });
  }

  return toJsonResponse(result);
}
