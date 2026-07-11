"use client";

import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { AppButton } from "@/components/design-system/button";
import { cn } from "@/lib/utils";
import type { NotificationSortField } from "../types";

type SortableColumnHeaderProps = {
  label: string;
  field: NotificationSortField;
  currentSortBy?: NotificationSortField;
  currentSortOrder?: "asc" | "desc";
  onSort: (field: NotificationSortField, order: "asc" | "desc") => void;
  className?: string;
};

export function SortableColumnHeader({
  label,
  field,
  currentSortBy,
  currentSortOrder = "asc",
  onSort,
  className,
}: SortableColumnHeaderProps) {
  const isActive = currentSortBy === field;

  const handleClick = () => {
    if (!isActive) {
      onSort(field, "desc");
      return;
    }

    onSort(field, currentSortOrder === "asc" ? "desc" : "asc");
  };

  return (
    <AppButton
      type="button"
      variant="ghost"
      size="sm"
      className={cn("-ml-2 h-8 px-2 font-medium", className)}
      onClick={handleClick}
      aria-label={`Sort by ${label}`}
    >
      {label}
      {isActive ? (
        currentSortOrder === "asc" ? (
          <ArrowUpIcon className="size-3.5" aria-hidden="true" />
        ) : (
          <ArrowDownIcon className="size-3.5" aria-hidden="true" />
        )
      ) : (
        <ChevronsUpDownIcon className="size-3.5 opacity-50" aria-hidden="true" />
      )}
    </AppButton>
  );
}
