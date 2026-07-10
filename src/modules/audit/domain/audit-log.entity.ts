import type { AuditLogId } from "@/shared/domain/ids";

import type { AuditLogProps } from "./audit-log.types";

export class AuditLog {
  readonly id: AuditLogId;
  readonly userId: string | null;
  readonly module: string;
  readonly entityName: string;
  readonly recordId: string;
  readonly action: AuditLogProps["action"];
  readonly status: AuditLogProps["status"];
  readonly oldValues: AuditLogProps["oldValues"];
  readonly newValues: AuditLogProps["newValues"];
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly requestId: string | null;
  readonly httpMethod: string | null;
  readonly route: string | null;
  readonly errorMessage: string | null;
  readonly createdAt: Date;

  private constructor(props: AuditLogProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.module = props.module;
    this.entityName = props.entityName;
    this.recordId = props.recordId;
    this.action = props.action;
    this.status = props.status;
    this.oldValues = props.oldValues;
    this.newValues = props.newValues;
    this.ipAddress = props.ipAddress;
    this.userAgent = props.userAgent;
    this.requestId = props.requestId;
    this.httpMethod = props.httpMethod;
    this.route = props.route;
    this.errorMessage = props.errorMessage;
    this.createdAt = props.createdAt;
  }

  static reconstitute(props: AuditLogProps): AuditLog {
    return new AuditLog(props);
  }

  toProps(): AuditLogProps {
    return {
      id: this.id,
      userId: this.userId,
      module: this.module,
      entityName: this.entityName,
      recordId: this.recordId,
      action: this.action,
      status: this.status,
      oldValues: this.oldValues,
      newValues: this.newValues,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      requestId: this.requestId,
      httpMethod: this.httpMethod,
      route: this.route,
      errorMessage: this.errorMessage,
      createdAt: this.createdAt,
    };
  }
}
