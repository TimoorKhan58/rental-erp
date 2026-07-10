import type { NextRequest } from "next/server";

import { handleSubmitExpense } from "@/modules/expense/presentation/routes/expense-api.routes";

import { resolveExpenseApplicationServices } from "../../_composition/resolve-expense-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleSubmitExpense(
    request,
    id,
    resolveExpenseApplicationServices,
  );
}
