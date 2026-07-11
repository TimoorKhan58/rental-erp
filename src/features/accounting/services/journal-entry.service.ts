import type {
  JournalEntryListResponse,
  JournalEntryResponse,
  ListJournalEntriesParams,
} from "../types";
import { apiGet, apiPost } from "@/lib/api";

const BASE = "/journal-entries";

export async function getJournalEntries(
  params: ListJournalEntriesParams = {},
): Promise<JournalEntryListResponse> {
  return apiGet<JournalEntryListResponse>(BASE, { params });
}

export async function getJournalEntry(id: string): Promise<JournalEntryResponse> {
  return apiGet<JournalEntryResponse>(`${BASE}/${id}`);
}

export async function postJournalEntry(id: string): Promise<JournalEntryResponse> {
  return apiPost<JournalEntryResponse>(`${BASE}/${id}/post`);
}

export async function voidJournalEntry(id: string): Promise<JournalEntryResponse> {
  return apiPost<JournalEntryResponse>(`${BASE}/${id}/void`);
}
