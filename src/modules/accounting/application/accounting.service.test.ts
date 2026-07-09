import { describe, expect, it, vi } from "vitest";

import { AccountingService } from "@/modules/accounting/application/services/accounting.service";

import {
  ACCOUNT_ID,
  VALID_CREATE_ACCOUNT_INPUT,
} from "../tests/helpers/account.fixtures";
import {
  JOURNAL_ENTRY_ID,
  VALID_CREATE_JOURNAL_INPUT,
} from "../tests/helpers/journal-entry.fixtures";

function createFacade() {
  const getAccountById = { execute: vi.fn() };
  const listAccounts = { execute: vi.fn() };
  const createAccount = { execute: vi.fn() };
  const updateAccount = { execute: vi.fn() };
  const getJournalEntryById = { execute: vi.fn() };
  const listJournalEntries = { execute: vi.fn() };
  const createJournalEntry = { execute: vi.fn() };
  const updateJournalEntry = { execute: vi.fn() };
  const postJournalEntry = { execute: vi.fn() };
  const voidJournalEntry = { execute: vi.fn() };

  const service = new AccountingService(
    getAccountById as never,
    listAccounts as never,
    createAccount as never,
    updateAccount as never,
    getJournalEntryById as never,
    listJournalEntries as never,
    createJournalEntry as never,
    updateJournalEntry as never,
    postJournalEntry as never,
    voidJournalEntry as never,
  );

  return {
    service,
    getAccountById,
    listAccounts,
    createAccount,
    updateAccount,
    getJournalEntryById,
    listJournalEntries,
    createJournalEntry,
    updateJournalEntry,
    postJournalEntry,
    voidJournalEntry,
  };
}

describe("AccountingService facade", () => {
  it("delegates getAccountById", async () => {
    const { service, getAccountById } = createFacade();
    getAccountById.execute.mockResolvedValue({ id: ACCOUNT_ID });

    await service.getAccountById({ id: ACCOUNT_ID });

    expect(getAccountById.execute).toHaveBeenCalledWith({ id: ACCOUNT_ID });
  });

  it("delegates listAccounts", async () => {
    const { service, listAccounts } = createFacade();
    listAccounts.execute.mockResolvedValue({ items: [], meta: {} });

    await service.listAccounts({ page: 1, pageSize: 10, sortOrder: "desc" });

    expect(listAccounts.execute).toHaveBeenCalled();
  });

  it("delegates createAccount", async () => {
    const { service, createAccount } = createFacade();

    await service.createAccount(VALID_CREATE_ACCOUNT_INPUT as never);

    expect(createAccount.execute).toHaveBeenCalledWith(
      VALID_CREATE_ACCOUNT_INPUT,
    );
  });

  it("delegates updateAccount", async () => {
    const { service, updateAccount } = createFacade();
    const updateInput = { name: "Updated Cash" };

    await service.updateAccount({ id: ACCOUNT_ID }, updateInput);

    expect(updateAccount.execute).toHaveBeenCalledWith(
      { id: ACCOUNT_ID },
      updateInput,
    );
  });

  it("delegates getJournalEntryById", async () => {
    const { service, getJournalEntryById } = createFacade();
    getJournalEntryById.execute.mockResolvedValue({ id: JOURNAL_ENTRY_ID });

    await service.getJournalEntryById({ id: JOURNAL_ENTRY_ID });

    expect(getJournalEntryById.execute).toHaveBeenCalledWith({
      id: JOURNAL_ENTRY_ID,
    });
  });

  it("delegates createJournalEntry", async () => {
    const { service, createJournalEntry } = createFacade();

    await service.createJournalEntry(VALID_CREATE_JOURNAL_INPUT as never);

    expect(createJournalEntry.execute).toHaveBeenCalledWith(
      VALID_CREATE_JOURNAL_INPUT,
    );
  });

  it("delegates postJournalEntry", async () => {
    const { service, postJournalEntry } = createFacade();

    await service.postJournalEntry({ id: JOURNAL_ENTRY_ID });

    expect(postJournalEntry.execute).toHaveBeenCalledWith({
      id: JOURNAL_ENTRY_ID,
    });
  });

  it("delegates voidJournalEntry", async () => {
    const { service, voidJournalEntry } = createFacade();

    await service.voidJournalEntry({ id: JOURNAL_ENTRY_ID });

    expect(voidJournalEntry.execute).toHaveBeenCalledWith({
      id: JOURNAL_ENTRY_ID,
    });
  });
});
