import type {
  AccountListResponse,
  AccountResponse,
  CreateAccountPayload,
  ListAccountsParams,
} from "../types";
import { apiGet, apiPost } from "@/lib/api";

const BASE = "/accounts";

export async function getChartOfAccounts(
  params: ListAccountsParams = {},
): Promise<AccountListResponse> {
  return apiGet<AccountListResponse>(BASE, { params });
}

export async function getAccount(id: string): Promise<AccountResponse> {
  return apiGet<AccountResponse>(`${BASE}/${id}`);
}

export async function createAccount(
  payload: CreateAccountPayload,
): Promise<AccountResponse> {
  return apiPost<AccountResponse>(BASE, payload);
}
