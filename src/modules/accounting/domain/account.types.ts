import type { AccountId } from "@/shared/domain/ids";

import type { AccountType } from "./account.constants";

export interface CreateAccountData {
  accountCode: string;
  name: string;
  accountType: AccountType;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateAccountData {
  name?: string;
  accountType?: AccountType;
  description?: string | null;
  isActive?: boolean;
}

export interface AccountProps {
  id: AccountId;
  accountCode: string;
  name: string;
  accountType: AccountType;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
