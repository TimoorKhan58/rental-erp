"use client";

import Link from "next/link";
import {
  MapPinIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  Trash2Icon,
  UserCheckIcon,
  UserXIcon,
} from "lucide-react";
import { AppButton } from "@/components/design-system/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/config/routes";
import { toWhatsAppNumber } from "@/features/rental-invoice/mappers/invoice-whatsapp";
import { CustomerAvatar } from "./customer-avatar";
import { CustomerStatusBadge } from "./customer-status-badge";
import type { CustomerResponse } from "../types";

type CustomerProfileCardProps = {
  customer: CustomerResponse;
  canUpdate: boolean;
  canDelete: boolean;
  /** Shows "New order" for this customer (usability revamp R4). */
  canCreateOrder?: boolean;
  onEdit?: () => void;
  onToggleStatus?: () => void;
  onDelete?: () => void;
};

export function CustomerProfileCard({
  customer,
  canUpdate,
  canDelete,
  canCreateOrder = false,
  onToggleStatus,
  onDelete,
}: CustomerProfileCardProps) {
  const whatsAppNumber = toWhatsAppNumber(customer.phone);
  return (
    <section
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-5"
      aria-label="Customer identity"
    >
      <div className="flex min-w-0 items-start gap-3">
        <CustomerAvatar name={customer.name} size="lg" className="ring-2 ring-border" />
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading truncate text-2xl font-semibold tracking-tight">
              {customer.name}
            </h1>
            <CustomerStatusBadge isActive={customer.isActive} />
          </div>
          <p className="text-sm text-muted-foreground">{customer.customerCode}</p>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-4">
            <a
              href={`tel:${customer.phone}`}
              className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline"
            >
              <PhoneIcon className="size-3.5 shrink-0" aria-hidden="true" />
              {customer.phone}
            </a>
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
        {canCreateOrder && customer.isActive ? (
          <AppButton
            size="sm"
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
            render={<Link href={`${ROUTES.rentalOrdersNew}?customerId=${customer.id}`} />}
          >
            New order
          </AppButton>
        ) : null}
        {whatsAppNumber ? (
          <AppButton
            variant="outline"
            size="sm"
            leftIcon={<MessageCircleIcon className="size-4" aria-hidden="true" />}
            render={
              <a
                href={`https://wa.me/${whatsAppNumber}`}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            WhatsApp
          </AppButton>
        ) : null}
        {canUpdate ? (
          <AppButton
            size="sm"
            variant="outline"
            leftIcon={<PencilIcon className="size-4" aria-hidden="true" />}
            render={<Link href={ROUTES.customerEdit(customer.id)} />}
          >
            Edit
          </AppButton>
        ) : null}
        {canUpdate || canDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <AppButton
                  variant="outline"
                  size="sm"
                  leftIcon={<MoreHorizontalIcon className="size-4" aria-hidden="true" />}
                />
              }
            >
              More
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {canUpdate ? (
                <DropdownMenuItem onClick={onToggleStatus}>
                  {customer.isActive ? (
                    <UserXIcon aria-hidden="true" />
                  ) : (
                    <UserCheckIcon aria-hidden="true" />
                  )}
                  {customer.isActive ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2Icon aria-hidden="true" />
                  Delete customer
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </section>
  );
}
