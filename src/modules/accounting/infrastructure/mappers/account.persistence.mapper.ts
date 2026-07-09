import { Prisma } from "@/generated/prisma/client";
import { Account } from "@/modules/accounting/domain/account.entity";
import type { AccountType } from "@/modules/accounting/domain/account.constants";
import type {
  CreateAccountData,
  UpdateAccountData,
} from "@/modules/accounting/domain/account.types";
import type { AccountId } from "@/shared/domain/ids";

export function toAccountDomain(record: {
  id: string;
  accountCode: string;
  name: string;
  accountType: AccountType;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Account {
  return Account.reconstitute({
    id: record.id as AccountId,
    accountCode: record.accountCode,
    name: record.name,
    accountType: record.accountType,
    description: record.description,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toAccountCreateInput(
  data: CreateAccountData,
): Prisma.AccountCreateInput {
  const normalized = Account.create(data);

  return {
    accountCode: normalized.accountCode,
    name: normalized.name,
    accountType: normalized.accountType,
    description: normalized.description,
    isActive: normalized.isActive,
  };
}

export function toAccountUpdateInput(
  data: UpdateAccountData,
  existing: Account,
): Prisma.AccountUpdateInput {
  const updated = existing.withUpdated(data);
  const props = updated.toProps();
  const update: Prisma.AccountUpdateInput = {};

  if (data.name !== undefined) {
    update.name = props.name;
  }

  if (data.accountType !== undefined) {
    update.accountType = props.accountType;
  }

  if (data.description !== undefined) {
    update.description = props.description;
  }

  if (data.isActive !== undefined) {
    update.isActive = props.isActive;
  }

  return update;
}
