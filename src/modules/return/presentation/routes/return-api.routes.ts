import type { NextRequest } from "next/server";

import type { ReturnServiceResolver } from "@/modules/return/application/services/return-application-services.interface";
import type { ReturnDto } from "@/modules/return/application/dtos/return.dto";
import {
  CreateReturnSchema,
  InspectReturnSchema,
  ReturnIdParamSchema,
  UpdateReturnSchema,
} from "@/modules/return/application";
import { ListReturnsSchema } from "@/modules/return/application/schemas/list-returns.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toReturnListResponse,
  toReturnResponse,
} from "../mappers/return-response.mapper";
import {
  runReturnApiRoute,
  toJsonResponse,
} from "../http/return-api.route-runner";
import { RETURN_ROUTES } from "../routes/return.routes";

export async function handleListReturns(
  request: NextRequest,
  resolveServices: ReturnServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListReturnsSchema, query);

  const result = await runReturnApiRoute({
    request,
    route: RETURN_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.returns.read,
    resolveServices,
    handler: async (_ctx, services) => services.listReturns.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<ReturnDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toReturnListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateReturn(
  request: NextRequest,
  resolveServices: ReturnServiceResolver,
): Promise<Response> {
  const body = await request.json();
  const createInput = parseRequest(CreateReturnSchema, body);

  const result = await runReturnApiRoute({
    request,
    route: RETURN_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.returns.create,
    resolveServices,
    handler: async (_ctx, services) => services.createReturn.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toReturnResponse(result.body.data as ReturnDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetReturnById(
  request: NextRequest,
  id: string,
  resolveServices: ReturnServiceResolver,
): Promise<Response> {
  const params = parseRequest(ReturnIdParamSchema, { id });

  const result = await runReturnApiRoute({
    request,
    route: RETURN_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.returns.read,
    resolveServices,
    handler: async (_ctx, services) => services.getReturnById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toReturnResponse(result.body.data as ReturnDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateReturn(
  request: NextRequest,
  id: string,
  resolveServices: ReturnServiceResolver,
): Promise<Response> {
  const params = parseRequest(ReturnIdParamSchema, { id });
  const body = await request.json();
  const updateInput = parseRequest(UpdateReturnSchema, body);

  const result = await runReturnApiRoute({
    request,
    route: RETURN_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.returns.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateReturn.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toReturnResponse(result.body.data as ReturnDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleReceiveReturn(
  request: NextRequest,
  id: string,
  resolveServices: ReturnServiceResolver,
): Promise<Response> {
  const params = parseRequest(ReturnIdParamSchema, { id });

  const result = await runReturnApiRoute({
    request,
    route: RETURN_ROUTES.receive(id),
    httpMethod: "POST",
    permission: PERMISSIONS.returns.receive,
    resolveServices,
    handler: async (_ctx, services) => services.receiveReturn.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toReturnResponse(result.body.data as ReturnDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleInspectReturn(
  request: NextRequest,
  id: string,
  resolveServices: ReturnServiceResolver,
): Promise<Response> {
  const params = parseRequest(ReturnIdParamSchema, { id });
  const body = await request.json();
  const inspectInput = parseRequest(InspectReturnSchema, body);

  const result = await runReturnApiRoute({
    request,
    route: RETURN_ROUTES.inspect(id),
    httpMethod: "POST",
    permission: PERMISSIONS.returns.inspect,
    resolveServices,
    handler: async (_ctx, services) =>
      services.inspectReturn.execute(params, inspectInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toReturnResponse(result.body.data as ReturnDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCompleteReturn(
  request: NextRequest,
  id: string,
  resolveServices: ReturnServiceResolver,
): Promise<Response> {
  const params = parseRequest(ReturnIdParamSchema, { id });

  const result = await runReturnApiRoute({
    request,
    route: RETURN_ROUTES.complete(id),
    httpMethod: "POST",
    permission: PERMISSIONS.returns.complete,
    resolveServices,
    handler: async (_ctx, services) => services.completeReturn.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toReturnResponse(result.body.data as ReturnDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCancelReturn(
  request: NextRequest,
  id: string,
  resolveServices: ReturnServiceResolver,
): Promise<Response> {
  const params = parseRequest(ReturnIdParamSchema, { id });

  const result = await runReturnApiRoute({
    request,
    route: RETURN_ROUTES.cancel(id),
    httpMethod: "POST",
    permission: PERMISSIONS.returns.cancel,
    resolveServices,
    handler: async (_ctx, services) => services.cancelReturn.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toReturnResponse(result.body.data as ReturnDto),
      },
    });
  }

  return toJsonResponse(result);
}
