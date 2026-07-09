import type { NextRequest } from "next/server";

import type { RepairServiceResolver } from "@/modules/repair/application/services/repair-application-services.interface";
import type { RepairDto } from "@/modules/repair/application/dtos/repair.dto";
import {
  CreateRepairSchema,
  RepairIdParamSchema,
  UpdateRepairSchema,
} from "@/modules/repair/application/schemas/repair.schemas";
import { ListRepairsSchema } from "@/modules/repair/application/schemas/repair.schemas";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toRepairListResponse,
  toRepairResponse,
} from "../mappers/repair-response.mapper";
import {
  runRepairApiRoute,
  toJsonResponse,
} from "../http/repair-api.route-runner";
import { REPAIR_ROUTES } from "../routes/repair.routes";

export async function handleListRepairs(
  request: NextRequest,
  resolveServices: RepairServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListRepairsSchema, query);

  const result = await runRepairApiRoute({
    request,
    route: REPAIR_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.repairs.read,
    resolveServices,
    handler: async (_ctx, services) => services.listRepairs.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<RepairDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRepairListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateRepair(
  request: NextRequest,
  resolveServices: RepairServiceResolver,
): Promise<Response> {
  const body = await request.json();
  const createInput = parseRequest(CreateRepairSchema, body);

  const result = await runRepairApiRoute({
    request,
    route: REPAIR_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.repairs.create,
    resolveServices,
    handler: async (_ctx, services) => services.createRepair.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRepairResponse(result.body.data as RepairDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetRepairById(
  request: NextRequest,
  id: string,
  resolveServices: RepairServiceResolver,
): Promise<Response> {
  const params = parseRequest(RepairIdParamSchema, { id });

  const result = await runRepairApiRoute({
    request,
    route: REPAIR_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.repairs.read,
    resolveServices,
    handler: async (_ctx, services) => services.getRepairById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRepairResponse(result.body.data as RepairDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateRepair(
  request: NextRequest,
  id: string,
  resolveServices: RepairServiceResolver,
): Promise<Response> {
  const params = parseRequest(RepairIdParamSchema, { id });
  const body = await request.json();
  const updateInput = parseRequest(UpdateRepairSchema, body);

  const result = await runRepairApiRoute({
    request,
    route: REPAIR_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.repairs.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateRepair.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRepairResponse(result.body.data as RepairDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleStartRepair(
  request: NextRequest,
  id: string,
  resolveServices: RepairServiceResolver,
): Promise<Response> {
  const params = parseRequest(RepairIdParamSchema, { id });

  const result = await runRepairApiRoute({
    request,
    route: REPAIR_ROUTES.start(id),
    httpMethod: "POST",
    permission: PERMISSIONS.repairs.start,
    resolveServices,
    handler: async (_ctx, services) => services.startRepair.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRepairResponse(result.body.data as RepairDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCompleteRepair(
  request: NextRequest,
  id: string,
  resolveServices: RepairServiceResolver,
): Promise<Response> {
  const params = parseRequest(RepairIdParamSchema, { id });

  const result = await runRepairApiRoute({
    request,
    route: REPAIR_ROUTES.complete(id),
    httpMethod: "POST",
    permission: PERMISSIONS.repairs.complete,
    resolveServices,
    handler: async (_ctx, services) => services.completeRepair.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRepairResponse(result.body.data as RepairDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCancelRepair(
  request: NextRequest,
  id: string,
  resolveServices: RepairServiceResolver,
): Promise<Response> {
  const params = parseRequest(RepairIdParamSchema, { id });

  const result = await runRepairApiRoute({
    request,
    route: REPAIR_ROUTES.cancel(id),
    httpMethod: "POST",
    permission: PERMISSIONS.repairs.cancel,
    resolveServices,
    handler: async (_ctx, services) => services.cancelRepair.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRepairResponse(result.body.data as RepairDto),
      },
    });
  }

  return toJsonResponse(result);
}
