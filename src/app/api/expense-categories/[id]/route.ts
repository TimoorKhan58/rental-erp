import type { NextRequest } from "next/server";

import {
  handleDeleteExpenseCategory,
  handleGetExpenseCategoryById,
  handleUpdateExpenseCategory,
} from "@/modules/expense/presentation/routes/expense-category-api.routes";

import { resolveExpenseCategoryApplicationServices } from "../_composition/resolve-expense-category-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetExpenseCategoryById(
    request,
    id,
    resolveExpenseCategoryApplicationServices,
  );
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateExpenseCategory(
    request,
    id,
    resolveExpenseCategoryApplicationServices,
  );
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleDeleteExpenseCategory(
    request,
    id,
    resolveExpenseCategoryApplicationServices,
  );
}
