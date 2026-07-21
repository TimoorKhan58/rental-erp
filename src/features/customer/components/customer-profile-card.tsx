"use client";

import Link from "next/link";
import {
  ArrowLeftIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  Trash2Icon,
  UserCheckIcon,
  UserXIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { CustomerAvatar } from "./customer-avatar";
import { CustomerStatusBadge } from "./customer-status-badge";
import type { CustomerResponse } from "../types";

type CustomerProfileCardProps = {
  customer: CustomerResponse;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit?: () => void;
  onToggleStatus?: () => void;
  onDelete?: () => void;
};

export function CustomerProfileCard({
  customer,
  canUpdate,
  canDelete,
  onToggleStatus,
  onDelete,
}: CustomerProfileCardProps) {
  return (
    <Card className="overflow-hidden border-border bg-card shadow-soft-md">
      <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <CustomerAvatar name={customer.name} size="lg" className="ring-4 ring-card" />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading truncate text-2xl font-semibold tracking-tight">
                {customer.name}
              </h1>
              <CustomerStatusBadge isActive={customer.isActive} />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{customer.customerCode}</p>
            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-4">
              <span className="inline-flex items-center gap-1.5">
                <PhoneIcon className="size-3.5 shrink-0" aria-hidden="true" />
                {customer.phone}
              </span>
              {customer.address?.trim() ? (
                <span className="inline-flex min-w-0 items-start gap-1.5">
                  <MapPinIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span className="line-clamp-2">{customer.address}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AppButton
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
            render={<Link href={ROUTES.customers} />}
          >
            Back
          </AppButton>
          {canUpdate ? (
            <AppButton
              variant="outline"
              size="sm"
              leftIcon={
                customer.isActive ? (
                  <UserXIcon className="size-4" aria-hidden="true" />
                ) : (
                  <UserCheckIcon className="size-4" aria-hidden="true" />
                )
              }
              onClick={onToggleStatus}
            >
              {customer.isActive ? "Deactivate" : "Activate"}
            </AppButton>
          ) : null}
          {canUpdate ? (
            <AppButton
              size="sm"
              leftIcon={<PencilIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.customerEdit(customer.id)} />}
            >
              Edit
            </AppButton>
          ) : null}
          {canDelete ? (
            <AppButton
              variant="destructive"
              size="sm"
              leftIcon={<Trash2Icon className="size-4" aria-hidden="true" />}
              onClick={onDelete}
            >
              Delete
            </AppButton>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
