"use client";

import type { ReactNode } from "react";
import { EmptyState, LoadingState } from "@/components/feedback";
import { useFinancialReportPermissions } from "../hooks";

type ReportPermissionGateProps = {
  requireFinancial?: boolean;
  requireOperational?: boolean;
  children: ReactNode;
};

export function ReportPermissionGate({
  requireFinancial = false,
  requireOperational = false,
  children,
}: ReportPermissionGateProps) {
  const { isLoading, canReadFinancial, canReadOperational } =
    useFinancialReportPermissions();

  if (isLoading) {
    return <LoadingState label="Checking permissions..." />;
  }

  if (requireFinancial && !canReadFinancial) {
    return (
      <EmptyState
        title="Financial reports unavailable"
        description="You need financial reports read permission to view this report."
      />
    );
  }

  if (requireOperational && !canReadOperational) {
    return (
      <EmptyState
        title="Report unavailable"
        description="You need reports read permission to view this report."
      />
    );
  }

  return children;
}
