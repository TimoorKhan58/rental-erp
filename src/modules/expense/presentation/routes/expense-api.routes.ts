import type { NextRequest } from "next/server";

import type { ExpenseServiceResolver } from "@/modules/expense/application/services/expense-application-services.interface";
import type { ExpenseDto } from "@/modules/expense/application/dtos/expense.dto";
import {
  CreateExpenseSchema,
  ExpenseIdParamSchema,
  RejectExpenseSchema,
  UpdateExpenseSchema,
} from "@/modules/expense/application";
import { ListExpensesSchema } from "@/modules/expense/application/schemas/list-expenses.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toExpenseListResponse,
  toExpenseResponse,
} from "../mappers/expense-response.mapper";
import {
  runExpenseApiRoute,
  toJsonResponse,
} from "../http/expense-api.route-runner";
import { EXPENSE_ROUTES } from "../routes/expense.routes";

export async function handleListExpenses(
  request: NextRequest,
  resolveServices: ExpenseServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListExpensesSchema, query);

  const result = await runExpenseApiRoute({
    request,
    route: EXPENSE_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.expenses.read,
    resolveServices,
    handler: async (_ctx, services) => services.listExpenses.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<ExpenseDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toExpenseListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateExpense(
  request: NextRequest,
  resolveServices: ExpenseServiceResolver,
): Promise<Response> {
  const body: unknown = await request.json();
  const createInput = parseRequest(CreateExpenseSchema, body);

  const result = await runExpenseApiRoute({
    request,
    route: EXPENSE_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.expenses.create,
    resolveServices,
    handler: async (_ctx, services) =>
      services.createExpense.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toExpenseResponse(result.body.data as ExpenseDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetExpenseById(
  request: NextRequest,
  id: string,
  resolveServices: ExpenseServiceResolver,
): Promise<Response> {
  const params = parseRequest(ExpenseIdParamSchema, { id });

  const result = await runExpenseApiRoute({
    request,
    route: EXPENSE_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.expenses.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getExpenseById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toExpenseResponse(result.body.data as ExpenseDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateExpense(
  request: NextRequest,
  id: string,
  resolveServices: ExpenseServiceResolver,
): Promise<Response> {
  const params = parseRequest(ExpenseIdParamSchema, { id });
  const body: unknown = await request.json();
  const updateInput = parseRequest(UpdateExpenseSchema, body);

  const result = await runExpenseApiRoute({
    request,
    route: EXPENSE_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.expenses.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateExpense.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toExpenseResponse(result.body.data as ExpenseDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleSubmitExpense(
  request: NextRequest,
  id: string,
  resolveServices: ExpenseServiceResolver,
): Promise<Response> {
  const params = parseRequest(ExpenseIdParamSchema, { id });

  const result = await runExpenseApiRoute({
    request,
    route: EXPENSE_ROUTES.submit(id),
    httpMethod: "POST",
    permission: PERMISSIONS.expenses.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.submitExpense.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toExpenseResponse(result.body.data as ExpenseDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleApproveExpense(
  request: NextRequest,
  id: string,
  resolveServices: ExpenseServiceResolver,
): Promise<Response> {
  const params = parseRequest(ExpenseIdParamSchema, { id });

  const result = await runExpenseApiRoute({
    request,
    route: EXPENSE_ROUTES.approve(id),
    httpMethod: "POST",
    permission: PERMISSIONS.expenses.approve,
    resolveServices,
    handler: async (_ctx, services) =>
      services.approveExpense.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toExpenseResponse(result.body.data as ExpenseDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleRejectExpense(
  request: NextRequest,
  id: string,
  resolveServices: ExpenseServiceResolver,
): Promise<Response> {
  const params = parseRequest(ExpenseIdParamSchema, { id });
  const body: unknown = await request.json();
  const rejectInput = parseRequest(RejectExpenseSchema, body);

  const result = await runExpenseApiRoute({
    request,
    route: EXPENSE_ROUTES.reject(id),
    httpMethod: "POST",
    permission: PERMISSIONS.expenses.reject,
    resolveServices,
    handler: async (_ctx, services) =>
      services.rejectExpense.execute(params, rejectInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toExpenseResponse(result.body.data as ExpenseDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handlePayExpense(
  request: NextRequest,
  id: string,
  resolveServices: ExpenseServiceResolver,
): Promise<Response> {
  const params = parseRequest(ExpenseIdParamSchema, { id });

  const result = await runExpenseApiRoute({
    request,
    route: EXPENSE_ROUTES.pay(id),
    httpMethod: "POST",
    permission: PERMISSIONS.expenses.pay,
    resolveServices,
    handler: async (_ctx, services) => services.payExpense.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toExpenseResponse(result.body.data as ExpenseDto),
      },
    });
  }

  return toJsonResponse(result);
}
