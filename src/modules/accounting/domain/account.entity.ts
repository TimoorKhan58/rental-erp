import type { AccountId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type { AccountType } from "./account.constants";
import {
  normalizeAccountProps,
  normalizeCreateAccountData,
  normalizeUpdateAccountData,
} from "./account.rules";
import type {
  AccountProps,
  CreateAccountData,
  UpdateAccountData,
} from "./account.types";

export class Account implements Entity<AccountId> {
  readonly id: AccountId;
  readonly accountCode: string;
  readonly name: string;
  readonly accountType: AccountType;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: AccountProps) {
    const normalized = normalizeAccountProps(props);

    this.id = normalized.id;
    this.accountCode = normalized.accountCode;
    this.name = normalized.name;
    this.accountType = normalized.accountType;
    this.description = normalized.description;
    this.isActive = normalized.isActive;
    this.createdAt = normalized.createdAt;
    this.updatedAt = normalized.updatedAt;
  }

  static create(
    data: CreateAccountData,
  ): Omit<AccountProps, "id" | "createdAt" | "updatedAt"> {
    return normalizeCreateAccountData(data);
  }

  static reconstitute(props: AccountProps): Account {
    return new Account(props);
  }

  toProps(): AccountProps {
    return {
      id: this.id,
      accountCode: this.accountCode,
      name: this.name,
      accountType: this.accountType,
      description: this.description,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  withUpdated(data: UpdateAccountData): Account {
    const normalized = normalizeUpdateAccountData(data);

    return Account.reconstitute({
      ...this.toProps(),
      name: normalized.name ?? this.name,
      accountType: normalized.accountType ?? this.accountType,
      description:
        normalized.description !== undefined
          ? normalized.description
          : this.description,
      isActive: normalized.isActive ?? this.isActive,
      updatedAt: new Date(),
    });
  }
}
