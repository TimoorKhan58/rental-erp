"use client";

import Link from "next/link";
import { MoreHorizontalIcon } from "lucide-react";
import type { DataTableColumn } from "@/components/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { formatDate } from "@/lib/utils";
import {
  canPostJournalEntry,
  canVoidJournalEntry,
  REFERENCE_TYPE_LABELS,
} from "../mappers";
import { JournalStatusBadge } from "../components/journal-status-badge";
import { SortableColumnHeader } from "./journal-sortable-column-header";
import type {
  JournalEntryResponse,
  JournalEntrySortField,
  ListJournalEntriesParams,
} from "../types";

type JournalTableColumnOptions = {
  params: ListJournalEntriesParams;
  onSort: (field: JournalEntrySortField, order: ListJournalEntriesParams["sortOrder"]) => void;
  canPost: boolean;
  canVoid: boolean;
  onPost: (journal: JournalEntryResponse) => void;
  onVoid: (journal: JournalEntryResponse) => void;
};

export function getJournalEntryTableColumns({
  params,
  onSort,
  canPost,
  canVoid,
  onPost,
  onVoid,
}: JournalTableColumnOptions): Array<DataTableColumn<JournalEntryResponse>> {
  return [
    {
      id: "journalNumber",
      header: (
        <SortableColumnHeader
          label="Journal number"
          field="journalNumber"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link
          href={ROUTES.accountingJournalEntryDetail(row.id)}
          className="font-medium text-primary hover:underline"
        >
          {row.journalNumber}
        </Link>
      ),
    },
    {
      id: "journalDate",
      header: (
        <SortableColumnHeader
          label="Journal date"
          field="journalDate"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => formatDate(row.journalDate),
    },
    {
      id: "referenceType",
      header: "Reference",
      cell: (row) =>
        row.referenceType ? REFERENCE_TYPE_LABELS[row.referenceType] : "—",
    },
    {
      id: "description",
      header: "Description",
      cell: (row) => row.description,
    },
    {
      id: "status",
      header: (
        <SortableColumnHeader
          label="Status"
          field="status"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => <JournalStatusBadge status={row.status} />,
    },
    {
      id: "createdAt",
      header: (
        <SortableColumnHeader
          label="Created"
          field="createdAt"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => formatDate(row.createdAt),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      cell: (row) => {
        const showPost = canPost && canPostJournalEntry(row.status);
        const showVoid = canVoid && canVoidJournalEntry(row.status);
        const hasActions = showPost || showVoid;

        if (!hasActions) {
          return null;
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <AppButton
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for ${row.journalNumber}`}
                />
              }
            >
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                render={<Link href={ROUTES.accountingJournalEntryDetail(row.id)} />}
              >
                View details
              </DropdownMenuItem>
              {showPost ? (
                <DropdownMenuItem onClick={() => onPost(row)}>Post journal</DropdownMenuItem>
              ) : null}
              {showVoid ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => onVoid(row)}>
                    Void journal
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      className: "w-12 text-right",
      headerClassName: "w-12",
    },
  ];
}
