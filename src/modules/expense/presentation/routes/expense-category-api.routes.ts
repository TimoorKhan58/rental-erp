import type { NextRequest } from "next/server";

import type { CategoryServiceResolver } from "@/modules/expense/application/services/category-application-services.interface";
import type { ExpenseCategoryDto } from "@/modules/expense/application/dtos/expense-category.dto";
import {
  CreateExpenseCategorySchema,
  ExpenseCategoryIdParamSchema,
  UpdateExpenseCategorySchema,
} from "@/modules/expense/application";
import { ListExpenseCategoriesSchema } from "@/modules/expense/application/schemas/list-expense-categories.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toExpenseCategoryListResponse,
  toExpenseCategoryResponse,
} from "../mappers/expense-category-response.mapper";
import {
  runExpenseCategoryApiRoute,
  toJsonResponse,
} from "../http/expense-category-api.route-runner";
import { EXPENSE_CATEGORY_ROUTES } from "../routes/expense-category.routes";

export async function handleListExpenseCategories(
  request: NextRequest,
  resolveServices: CategoryServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListExpenseCategoriesSchema, query);

  const result = await runExpenseCategoryApiRoute({
    request,
    route: EXPENSE_CATEGORY_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.expenses.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.listCategories.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<ExpenseCategoryDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toExpenseCategoryListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateExpenseCategory(
  request: NextRequest,
  resolveServices: CategoryServiceResolver,
): Promise<Response> {
  const body: unknown = await request.json();
  const createInput = parseRequest(CreateExpenseCategorySchema, body);

  const result = await runExpenseCategoryApiRoute({
    request,
    route: EXPENSE_CATEGORY_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.expenses.create,
    resolveServices,
    handler: async (_ctx, services) =>
      services.createCategory.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toExpenseCategoryResponse(result.body.data as ExpenseCategoryDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetExpenseCategoryById(
  request: NextRequest,
  id: string,
  resolveServices: CategoryServiceResolver,
): Promise<Response> {
  const params = parseRequest(ExpenseCategoryIdParamSchema, { id });

  const result = await runExpenseCategoryApiRoute({
    request,
    route: EXPENSE_CATEGORY_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.expenses.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getCategoryById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toExpenseCategoryResponse(result.body.data as ExpenseCategoryDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateExpenseCategory(
  request: NextRequest,
  id: string,
  resolveServices: CategoryServiceResolver,
): Promise<Response> {
  const params = parseRequest(ExpenseCategoryIdParamSchema, { id });
  const body: unknown = await request.json();
  const updateInput = parseRequest(UpdateExpenseCategorySchema, body);

  const result = await runExpenseCategoryApiRoute({
    request,
    route: EXPENSE_CATEGORY_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.expenses.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateCategory.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toExpenseCategoryResponse(result.body.data as ExpenseCategoryDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleDeleteExpenseCategory(
  request: NextRequest,
  id: string,
  resolveServices: CategoryServiceResolver,
): Promise<Response> {
  const params = parseRequest(ExpenseCategoryIdParamSchema, { id });

  const result = await runExpenseCategoryApiRoute({
    request,
    route: EXPENSE_CATEGORY_ROUTES.byId(id),
    httpMethod: "DELETE",
    permission: PERMISSIONS.expenses.update,
    resolveServices,
    handler: async (_ctx, services) => {
      await services.deleteCategory.execute(params);
      return null;
    },
  });

  return toJsonResponse(result);
}
