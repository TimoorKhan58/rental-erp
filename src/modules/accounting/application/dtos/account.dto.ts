import type { AccountType } from "@/modules/accounting/domain/account.constants";

export interface AccountDto {
  id: string;
  accountCode: string;
  name: string;
  accountType: AccountType;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountDto {
  accountCode: string;
  name: string;
  accountType: AccountType;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateAccountDto {
  name?: string;
  accountType?: AccountType;
  description?: string | null;
  isActive?: boolean;
}
