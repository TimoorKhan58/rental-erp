"use client";

import Link from "next/link";
import { BookOpenIcon } from "lucide-react";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatDate } from "@/lib/utils";
import { useJournalEntries } from "@/features/accounting/hooks";
import { JournalStatusBadge } from "@/features/accounting/components/journal-status-badge";

type RentalInvoiceJournalSectionProps = {
  invoiceId: string;
};

export function RentalInvoiceJournalSection({
  invoiceId,
}: RentalInvoiceJournalSectionProps) {
  const journalsQuery = useJournalEntries({
    referenceType: "RENTAL_INVOICE",
    referenceId: invoiceId,
    page: 1,
    pageSize: 10,
    sortBy: "journalDate",
    sortOrder: "desc",
  });

  const journals = journalsQuery.data?.items ?? [];

  return (
    <SectionCard title="Accounting journal">
      {journalsQuery.isLoading ? (
        <LoadingState label="Loading journal entries..." />
      ) : journals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No journal entries linked to this invoice yet. Entries with reference type
          Rental invoice and this invoice ID will appear here when posted in accounting.
        </p>
      ) : (
        <div className="space-y-3">
          {journals.map((journal) => (
            <div
              key={journal.id}
              className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{journal.journalNumber}</p>
                  <JournalStatusBadge status={journal.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(journal.journalDate)}
                  {journal.description ? ` · ${journal.description}` : ""}
                </p>
              </div>
              <AppButton
                variant="outline"
                size="sm"
                leftIcon={<BookOpenIcon className="size-4" aria-hidden="true" />}
                render={
                  <Link href={ROUTES.accountingJournalEntryDetail(journal.id)} />
                }
              >
                View entry
              </AppButton>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
