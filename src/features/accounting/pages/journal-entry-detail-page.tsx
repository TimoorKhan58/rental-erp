"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, FileCheckIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard, EmptyCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  canPostJournalEntry,
  canVoidJournalEntry,
  REFERENCE_TYPE_LABELS,
} from "../mappers";
import {
  useChartOfAccounts,
  useJournalEntry,
  useAccountingPermissions,
} from "../hooks";
import { JournalStatusBadge } from "../components/journal-status-badge";
import { PostJournalDialog } from "../dialogs/post-journal-dialog";
import { VoidJournalDialog } from "../dialogs/void-journal-dialog";

type JournalEntryDetailPageProps = {
  journalId: string;
};

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const display =
    value === null || value === undefined || (typeof value === "string" && !value.trim())
      ? "—"
      : String(value);

  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{display}</dd>
    </div>
  );
}

export function JournalEntryDetailPage({ journalId }: JournalEntryDetailPageProps) {
  const router = useRouter();
  const { data: journal, isLoading, isError, error, refetch } = useJournalEntry(journalId);
  const { canPost, canVoid } = useAccountingPermissions();
  const { data: accountsData } = useChartOfAccounts({ pageSize: 100 });

  const [postOpen, setPostOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  const accountLabelById = useMemo(() => {
    const map = new Map<string, string>();
    (accountsData?.items ?? []).forEach((account) => {
      map.set(account.id, `${account.accountCode} — ${account.name}`);
    });
    return map;
  }, [accountsData?.items]);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading journal entry..." />
      </PageContainer>
    );
  }

  if (isError || !journal) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Journal entry not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested journal entry could not be loaded."}
          </p>
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => void refetch()}>
              Try again
            </AppButton>
            <AppButton
              variant="outline"
              render={<Link href={ROUTES.accountingJournalEntries} />}
            >
              Back to list
            </AppButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  const sortedLines = [...journal.lines].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <PageContainer>
      <PageHeader
        title={journal.journalNumber}
        description={journal.description}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Accounting", href: ROUTES.accounting },
          { label: "Journal entries", href: ROUTES.accountingJournalEntries },
          { label: journal.journalNumber },
        ]}
        actions={
          <>
            <AppButton
              variant="outline"
              leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.accountingJournalEntries} />}
            >
              Back
            </AppButton>
            {canPost && canPostJournalEntry(journal.status) ? (
              <AppButton
                leftIcon={<FileCheckIcon className="size-4" aria-hidden="true" />}
                onClick={() => setPostOpen(true)}
              >
                Post
              </AppButton>
            ) : null}
            {canVoid && canVoidJournalEntry(journal.status) ? (
              <AppButton
                variant="destructive"
                leftIcon={<XIcon className="size-4" aria-hidden="true" />}
                onClick={() => setVoidOpen(true)}
              >
                Void
              </AppButton>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Journal header" actions={<JournalStatusBadge status={journal.status} />}>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Journal number" value={journal.journalNumber} />
              <DetailField label="Journal date" value={formatDate(journal.journalDate)} />
              <DetailField label="Description" value={journal.description} />
              <DetailField
                label="Reference type"
                value={
                  journal.referenceType
                    ? REFERENCE_TYPE_LABELS[journal.referenceType]
                    : null
                }
              />
              <DetailField label="Reference ID" value={journal.referenceId} />
            </dl>
          </SectionCard>

          <SectionCard title="Journal lines">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-3 py-2 font-medium" scope="col">Account</th>
                    <th className="px-3 py-2 font-medium" scope="col">Memo</th>
                    <th className="px-3 py-2 text-right font-medium" scope="col">Debit</th>
                    <th className="px-3 py-2 text-right font-medium" scope="col">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLines.map((line) => (
                    <tr key={line.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        {accountLabelById.get(line.accountId) ?? line.accountId}
                      </td>
                      <td className="px-3 py-2">{line.memo ?? "—"}</td>
                      <td className="px-3 py-2 text-right">
                        {line.debit > 0 ? formatCurrency(line.debit) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {line.credit > 0 ? formatCurrency(line.credit) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Status">
            <JournalStatusBadge status={journal.status} />
          </SectionCard>

          <SectionCard title="Milestones">
            <dl className="space-y-4">
              <DetailField
                label="Posted at"
                value={journal.postedAt ? formatDateTime(journal.postedAt) : null}
              />
              <DetailField
                label="Voided at"
                value={journal.voidedAt ? formatDateTime(journal.voidedAt) : null}
              />
            </dl>
          </SectionCard>

          <SectionCard title="Account">
            <dl className="space-y-4">
              <DetailField label="Created" value={formatDate(journal.createdAt)} />
              <DetailField label="Last updated" value={formatDateTime(journal.updatedAt)} />
            </dl>
          </SectionCard>

          <EmptyCard
            title="Accounting journal"
            description="Linked accounting entries are reflected in financial reports after posting."
          />

          <EmptyCard
            title="Audit timeline"
            description="Audit trail details will appear here when available from the API."
          />
        </div>
      </div>

      <PostJournalDialog journal={journal} open={postOpen} onOpenChange={setPostOpen} />

      <VoidJournalDialog
        journal={journal}
        open={voidOpen}
        onOpenChange={setVoidOpen}
        onVoided={() => router.push(ROUTES.accountingJournalEntries)}
      />
    </PageContainer>
  );
}
