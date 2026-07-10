import type { NextRequest } from "next/server";

import {
  handleGetExpenseById,
  handleUpdateExpense,
} from "@/modules/expense/presentation/routes/expense-api.routes";

import { resolveExpenseApplicationServices } from "../_composition/resolve-expense-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetExpenseById(
    request,
    id,
    resolveExpenseApplicationServices,
  );
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateExpense(
    request,
    id,
    resolveExpenseApplicationServices,
  );
}
