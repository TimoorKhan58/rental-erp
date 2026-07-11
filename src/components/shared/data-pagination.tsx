"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getPageRange, getPaginationLabel } from "@/lib/utils";
import type { PaginationMeta } from "@/types/api";

type DataPaginationProps = {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  className?: string;
};

export function DataPagination({
  meta,
  onPageChange,
  className,
}: DataPaginationProps) {
  const pages = getPageRange(meta.page, meta.totalPages);

  if (meta.totalPages <= 1) {
    return (
      <p className="text-sm text-muted-foreground">{getPaginationLabel(meta)}</p>
    );
  }

  return (
    <div className={className}>
      <div className="mb-2 text-sm text-muted-foreground">
        {getPaginationLabel(meta)}
      </div>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(event) => {
                event.preventDefault();
                if (meta.page > 1) {
                  onPageChange(meta.page - 1);
                }
              }}
              aria-disabled={meta.page <= 1}
              className={meta.page <= 1 ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>

          {pages.map((page: number | "ellipsis", index: number) =>
            page === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  isActive={page === meta.page}
                  onClick={(event) => {
                    event.preventDefault();
                    onPageChange(page);
                  }}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(event) => {
                event.preventDefault();
                if (meta.page < meta.totalPages) {
                  onPageChange(meta.page + 1);
                }
              }}
              aria-disabled={meta.page >= meta.totalPages}
              className={
                meta.page >= meta.totalPages ? "pointer-events-none opacity-50" : undefined
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
