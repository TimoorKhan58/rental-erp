import type { NextRequest } from "next/server";

import {
  handleCreateExpenseCategory,
  handleListExpenseCategories,
} from "@/modules/expense/presentation/routes/expense-category-api.routes";

import { resolveExpenseCategoryApplicationServices } from "./_composition/resolve-expense-category-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListExpenseCategories(
    request,
    resolveExpenseCategoryApplicationServices,
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateExpenseCategory(
    request,
    resolveExpenseCategoryApplicationServices,
  );
}
