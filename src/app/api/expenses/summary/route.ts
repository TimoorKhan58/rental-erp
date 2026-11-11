import type { NextRequest } from "next/server";

import { handleGetExpenseSummary } from "@/modules/expense/presentation/routes/expense-api.routes";

import { resolveExpenseApplicationServices } from "../_composition/resolve-expense-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleGetExpenseSummary(
    request,
    resolveExpenseApplicationServices,
  );
}
