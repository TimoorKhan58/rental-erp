import type {
  AuditLogListResponse,
  AuditLogResponse,
  ListAuditLogsParams,
} from "../types";
import { apiGet } from "@/lib/api";

const BASE = "/audit";

export async function getAuditLogs(
  params: ListAuditLogsParams = {},
): Promise<AuditLogListResponse> {
  return apiGet<AuditLogListResponse>(BASE, { params });
}

export async function getAuditLog(id: string): Promise<AuditLogResponse> {
  return apiGet<AuditLogResponse>(`${BASE}/${id}`);
}
