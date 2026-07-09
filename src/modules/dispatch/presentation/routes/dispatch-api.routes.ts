import type { NextRequest } from "next/server";

import type { DispatchServiceResolver } from "@/modules/dispatch/application/services/dispatch-application-services.interface";
import type { DispatchDto } from "@/modules/dispatch/application/dtos/dispatch.dto";
import {
  CreateDispatchSchema,
  DispatchIdParamSchema,
  UpdateDispatchSchema,
} from "@/modules/dispatch/application";
import { ListDispatchesSchema } from "@/modules/dispatch/application/schemas/list-dispatches.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toDispatchListResponse,
  toDispatchResponse,
} from "../mappers/dispatch-response.mapper";
import {
  runDispatchApiRoute,
  toJsonResponse,
} from "../http/dispatch-api.route-runner";
import { DISPATCH_ROUTES } from "../routes/dispatch.routes";

export async function handleListDispatches(
  request: NextRequest,
  resolveServices: DispatchServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListDispatchesSchema, query);

  const result = await runDispatchApiRoute({
    request,
    route: DISPATCH_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.dispatches.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.listDispatches.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<DispatchDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toDispatchListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateDispatch(
  request: NextRequest,
  resolveServices: DispatchServiceResolver,
): Promise<Response> {
  const body = await request.json();
  const createInput = parseRequest(CreateDispatchSchema, body);

  const result = await runDispatchApiRoute({
    request,
    route: DISPATCH_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.dispatches.create,
    resolveServices,
    handler: async (_ctx, services) =>
      services.createDispatch.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toDispatchResponse(result.body.data as DispatchDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetDispatchById(
  request: NextRequest,
  id: string,
  resolveServices: DispatchServiceResolver,
): Promise<Response> {
  const params = parseRequest(DispatchIdParamSchema, { id });

  const result = await runDispatchApiRoute({
    request,
    route: DISPATCH_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.dispatches.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getDispatchById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toDispatchResponse(result.body.data as DispatchDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateDispatch(
  request: NextRequest,
  id: string,
  resolveServices: DispatchServiceResolver,
): Promise<Response> {
  const params = parseRequest(DispatchIdParamSchema, { id });
  const body = await request.json();
  const updateInput = parseRequest(UpdateDispatchSchema, body);

  const result = await runDispatchApiRoute({
    request,
    route: DISPATCH_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.dispatches.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateDispatch.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toDispatchResponse(result.body.data as DispatchDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCompleteDispatch(
  request: NextRequest,
  id: string,
  resolveServices: DispatchServiceResolver,
): Promise<Response> {
  const params = parseRequest(DispatchIdParamSchema, { id });

  const result = await runDispatchApiRoute({
    request,
    route: DISPATCH_ROUTES.complete(id),
    httpMethod: "POST",
    permission: PERMISSIONS.dispatches.complete,
    resolveServices,
    handler: async (_ctx, services) =>
      services.completeDispatch.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toDispatchResponse(result.body.data as DispatchDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCancelDispatch(
  request: NextRequest,
  id: string,
  resolveServices: DispatchServiceResolver,
): Promise<Response> {
  const params = parseRequest(DispatchIdParamSchema, { id });

  const result = await runDispatchApiRoute({
    request,
    route: DISPATCH_ROUTES.cancel(id),
    httpMethod: "POST",
    permission: PERMISSIONS.dispatches.cancel,
    resolveServices,
    handler: async (_ctx, services) =>
      services.cancelDispatch.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toDispatchResponse(result.body.data as DispatchDto),
      },
    });
  }

  return toJsonResponse(result);
}
