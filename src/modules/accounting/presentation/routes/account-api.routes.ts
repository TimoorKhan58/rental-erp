import type { NextRequest } from "next/server";

import type { AccountingServiceResolver } from "@/modules/accounting/application/services/accounting-application-services.interface";
import type { AccountDto } from "@/modules/accounting/application/dtos/account.dto";
import {
  CreateAccountSchema,
  AccountIdParamSchema,
  UpdateAccountSchema,
} from "@/modules/accounting/application";
import { ListAccountsSchema } from "@/modules/accounting/application/schemas/list-accounts.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toAccountListResponse,
  toAccountResponse,
} from "../mappers/account-response.mapper";
import {
  runAccountingApiRoute,
  toJsonResponse,
} from "../http/accounting-api.route-runner";
import { ACCOUNT_ROUTES } from "../routes/account.routes";

export async function handleListAccounts(
  request: NextRequest,
  resolveServices: AccountingServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListAccountsSchema, query);

  const result = await runAccountingApiRoute({
    request,
    route: ACCOUNT_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.accounts.read,
    resolveServices,
    handler: async (_ctx, services) => services.listAccounts.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<AccountDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAccountListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateAccount(
  request: NextRequest,
  resolveServices: AccountingServiceResolver,
): Promise<Response> {
  const body = await request.json();
  const createInput = parseRequest(CreateAccountSchema, body);

  const result = await runAccountingApiRoute({
    request,
    route: ACCOUNT_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.accounts.create,
    resolveServices,
    handler: async (_ctx, services) =>
      services.createAccount.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAccountResponse(result.body.data as AccountDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetAccountById(
  request: NextRequest,
  id: string,
  resolveServices: AccountingServiceResolver,
): Promise<Response> {
  const params = parseRequest(AccountIdParamSchema, { id });

  const result = await runAccountingApiRoute({
    request,
    route: ACCOUNT_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.accounts.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getAccountById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAccountResponse(result.body.data as AccountDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateAccount(
  request: NextRequest,
  id: string,
  resolveServices: AccountingServiceResolver,
): Promise<Response> {
  const params = parseRequest(AccountIdParamSchema, { id });
  const body = await request.json();
  const updateInput = parseRequest(UpdateAccountSchema, body);

  const result = await runAccountingApiRoute({
    request,
    route: ACCOUNT_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.accounts.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateAccount.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAccountResponse(result.body.data as AccountDto),
      },
    });
  }

  return toJsonResponse(result);
}
