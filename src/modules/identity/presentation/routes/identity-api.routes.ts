import type { NextRequest } from "next/server";

import type { IdentityApplicationServices } from "@/modules/identity/application/services/identity-application-services.interface";
import type {
  IdentityUserDto,
  IdentityUserPermissionsDto,
  IdentityUserProfileDto,
  RoleDto,
} from "@/modules/identity/application/dtos/identity-user.dto";
import {
  CreateIdentityUserSchema,
  IdentityUserIdParamSchema,
  ResetIdentityUserPasswordSchema,
  UpdateIdentityUserSchema,
} from "@/modules/identity/application";
import { ListIdentityUsersSchema } from "@/modules/identity/application/schemas/list-identity-users.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { UnauthorizedError } from "@/shared/infrastructure/errors";

import {
  toIdentityUserListResponse,
  toIdentityUserPermissionsResponse,
  toIdentityUserProfileResponse,
  toIdentityUserResponse,
  toRoleListResponse,
} from "../mappers/identity-response.mapper";
import {
  runIdentityApiRoute,
  toJsonResponse,
} from "../http/identity-api.route-runner";
import { IDENTITY_ROUTES, ROLE_ROUTES } from "../routes/identity.routes";

export type IdentityServiceResolver = (
  ctx: import("@/shared/application/context").ExecutionContext,
) => IdentityApplicationServices;

export async function handleListIdentityUsers(
  request: NextRequest,
  resolveServices: IdentityServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListIdentityUsersSchema, query);

  const result = await runIdentityApiRoute({
    request,
    route: IDENTITY_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.identity.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.listIdentityUsers.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<IdentityUserDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toIdentityUserListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateIdentityUser(
  request: NextRequest,
  resolveServices: IdentityServiceResolver,
): Promise<Response> {
  const body: unknown = await request.json();
  const createInput = parseRequest(CreateIdentityUserSchema, body);

  const result = await runIdentityApiRoute({
    request,
    route: IDENTITY_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.identity.create,
    resolveServices,
    handler: async (_ctx, services) =>
      services.createIdentityUser.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toIdentityUserResponse(result.body.data as IdentityUserDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetIdentityUserById(
  request: NextRequest,
  id: string,
  resolveServices: IdentityServiceResolver,
): Promise<Response> {
  const params = parseRequest(IdentityUserIdParamSchema, { id });

  const result = await runIdentityApiRoute({
    request,
    route: IDENTITY_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.identity.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getIdentityUserById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toIdentityUserResponse(result.body.data as IdentityUserDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateIdentityUser(
  request: NextRequest,
  id: string,
  resolveServices: IdentityServiceResolver,
): Promise<Response> {
  const params = parseRequest(IdentityUserIdParamSchema, { id });
  const body: unknown = await request.json();
  const updateInput = parseRequest(UpdateIdentityUserSchema, body);

  const result = await runIdentityApiRoute({
    request,
    route: IDENTITY_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.identity.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateIdentityUser.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toIdentityUserResponse(result.body.data as IdentityUserDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleDeactivateIdentityUser(
  request: NextRequest,
  id: string,
  resolveServices: IdentityServiceResolver,
): Promise<Response> {
  const params = parseRequest(IdentityUserIdParamSchema, { id });

  const result = await runIdentityApiRoute({
    request,
    route: IDENTITY_ROUTES.byId(id),
    httpMethod: "DELETE",
    permission: PERMISSIONS.identity.delete,
    resolveServices,
    handler: async (_ctx, services) => {
      await services.deactivateIdentityUser.execute(params);
      return null;
    },
  });

  return toJsonResponse(result);
}

export async function handleResetIdentityUserPassword(
  request: NextRequest,
  id: string,
  resolveServices: IdentityServiceResolver,
): Promise<Response> {
  const params = parseRequest(IdentityUserIdParamSchema, { id });
  const body: unknown = await request.json();
  const resetInput = parseRequest(ResetIdentityUserPasswordSchema, body);

  const result = await runIdentityApiRoute({
    request,
    route: IDENTITY_ROUTES.resetPassword(id),
    httpMethod: "POST",
    permission: PERMISSIONS.identity.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.resetIdentityUserPassword.execute(params, resetInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toIdentityUserResponse(result.body.data as IdentityUserDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetIdentityUserPermissions(
  request: NextRequest,
  id: string,
  resolveServices: IdentityServiceResolver,
): Promise<Response> {
  const params = parseRequest(IdentityUserIdParamSchema, { id });

  const result = await runIdentityApiRoute({
    request,
    route: IDENTITY_ROUTES.permissions(id),
    httpMethod: "GET",
    permission: PERMISSIONS.identity.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getIdentityUserPermissions.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toIdentityUserPermissionsResponse(
          result.body.data as IdentityUserPermissionsDto,
        ),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetIdentityUserProfile(
  request: NextRequest,
  resolveServices: IdentityServiceResolver,
): Promise<Response> {
  const result = await runIdentityApiRoute({
    request,
    route: IDENTITY_ROUTES.me,
    httpMethod: "GET",
    permission: PERMISSIONS.identity.read,
    resolveServices,
    handler: async (ctx, services) => {
      if (ctx.request.userId === undefined) {
        throw new UnauthorizedError();
      }

      return services.getIdentityUserProfile.execute(ctx.request.userId);
    },
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toIdentityUserProfileResponse(
          result.body.data as IdentityUserProfileDto,
        ),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleListRoles(
  request: NextRequest,
  resolveServices: IdentityServiceResolver,
): Promise<Response> {
  const result = await runIdentityApiRoute({
    request,
    route: ROLE_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.identity.read,
    resolveServices,
    handler: async (_ctx, services) => services.listRoles.execute(),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRoleListResponse(result.body.data as RoleDto[]),
      },
    });
  }

  return toJsonResponse(result);
}
