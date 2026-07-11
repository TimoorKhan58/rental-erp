import type {
  AccountListResponse,
  AccountResponse,
  ListAccountsParams,
} from "../types";
import { apiGet } from "@/lib/api";

const BASE = "/accounts";

export async function getChartOfAccounts(
  params: ListAccountsParams = {},
): Promise<AccountListResponse> {
  return apiGet<AccountListResponse>(BASE, { params });
}

export async function getAccount(id: string): Promise<AccountResponse> {
  return apiGet<AccountResponse>(`${BASE}/${id}`);
}
