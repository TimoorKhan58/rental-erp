import type { NextRequest } from "next/server";

import {
  handleCreateExpense,
  handleListExpenses,
} from "@/modules/expense/presentation/routes/expense-api.routes";

import { resolveExpenseApplicationServices } from "./_composition/resolve-expense-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListExpenses(request, resolveExpenseApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateExpense(request, resolveExpenseApplicationServices);
}
