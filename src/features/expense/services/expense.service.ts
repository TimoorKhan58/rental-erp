import type {
  CreateExpenseCategoryPayload,
  CreateExpensePayload,
  ExpenseCategoryListResponse,
  ExpenseCategoryResponse,
  ExpenseListResponse,
  ExpenseResponse,
  ListExpenseCategoriesParams,
  ListExpensesParams,
  RejectExpensePayload,
  UpdateExpenseCategoryPayload,
  UpdateExpensePayload,
} from "../types";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

const BASE = "/expenses";
const CATEGORIES_BASE = "/expense-categories";

export async function getExpenses(
  params: ListExpensesParams = {},
): Promise<ExpenseListResponse> {
  return apiGet<ExpenseListResponse>(BASE, { params });
}

export async function getExpense(id: string): Promise<ExpenseResponse> {
  return apiGet<ExpenseResponse>(`${BASE}/${id}`);
}

export async function createExpense(
  payload: CreateExpensePayload,
): Promise<ExpenseResponse> {
  return apiPost<ExpenseResponse>(BASE, payload);
}

export async function updateExpense(
  id: string,
  payload: UpdateExpensePayload,
): Promise<ExpenseResponse> {
  return apiPatch<ExpenseResponse>(`${BASE}/${id}`, payload);
}

export async function submitExpense(id: string): Promise<ExpenseResponse> {
  return apiPost<ExpenseResponse>(`${BASE}/${id}/submit`);
}

export async function approveExpense(id: string): Promise<ExpenseResponse> {
  return apiPost<ExpenseResponse>(`${BASE}/${id}/approve`);
}

export async function rejectExpense(
  id: string,
  payload: RejectExpensePayload,
): Promise<ExpenseResponse> {
  return apiPost<ExpenseResponse>(`${BASE}/${id}/reject`, payload);
}

export async function payExpense(id: string): Promise<ExpenseResponse> {
  return apiPost<ExpenseResponse>(`${BASE}/${id}/pay`);
}

export async function getExpenseCategories(
  params: ListExpenseCategoriesParams = {},
): Promise<ExpenseCategoryListResponse> {
  return apiGet<ExpenseCategoryListResponse>(CATEGORIES_BASE, { params });
}

export async function getExpenseCategory(
  id: string,
): Promise<ExpenseCategoryResponse> {
  return apiGet<ExpenseCategoryResponse>(`${CATEGORIES_BASE}/${id}`);
}

export async function createExpenseCategory(
  payload: CreateExpenseCategoryPayload,
): Promise<ExpenseCategoryResponse> {
  return apiPost<ExpenseCategoryResponse>(CATEGORIES_BASE, payload);
}

export async function updateExpenseCategory(
  id: string,
  payload: UpdateExpenseCategoryPayload,
): Promise<ExpenseCategoryResponse> {
  return apiPatch<ExpenseCategoryResponse>(`${CATEGORIES_BASE}/${id}`, payload);
}

export async function deleteExpenseCategory(id: string): Promise<void> {
  return apiDelete(`${CATEGORIES_BASE}/${id}`);
}
