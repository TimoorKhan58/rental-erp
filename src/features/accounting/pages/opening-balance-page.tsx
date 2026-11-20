"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/config/routes";
import { apiGet, apiPost } from "@/lib/api";
import { ApiClientError } from "@/lib/api/types";
import { useAppMutation } from "@/lib/query";
import { formatCurrency, formatDate } from "@/lib/utils";
import { localDateInputValue } from "@/lib/utils/local-date";
import { AccountingSubNav } from "../components";

type OpeningBalance = {
  journalEntryId: string;
  journalNumber: string;
  date: string;
  lines: Array<{ accountCode: string; accountName: string; amount: number }>;
  total: number;
};

const QUERY_KEY = ["app", "accounting", "opening-balance"] as const;

function AmountField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        placeholder="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/**
 * Opening balance (owner's decision, 2026-11-20): the money and equipment the
 * business had when it started using RentCore. Without it, cash and bank
 * show minus figures because only payments out were ever recorded.
 */
export function OpeningBalancePage() {
  const queryClient = useQueryClient();
  const current = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => apiGet<OpeningBalance | null>("/opening-balance"),
  });
  const [date, setDate] = useState(localDateInputValue());
  const [cashInHand, setCashInHand] = useState("");
  const [bank, setBank] = useState("");
  const [equipment, setEquipment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const save = useAppMutation({
    mutationFn: (payload: { date: string; cashInHand: number; bank: number; equipment: number }) =>
      apiPost<OpeningBalance>("/opening-balance", payload),
    showSuccessToast: true,
    successMessage: "Opening balance saved.",
    onSuccess: async () => {
      setCashInHand("");
      setBank("");
      setEquipment("");
      await queryClient.invalidateQueries({ queryKey: ["app"] });
    },
  });

  const amounts = [cashInHand, bank, equipment].map((value) => (value.trim() === "" ? 0 : Number(value)));
  const invalid = amounts.some((value) => !Number.isFinite(value) || value < 0);
  const total = invalid ? 0 : amounts.reduce((sum, value) => sum + value, 0);

  const handleSave = async () => {
    setError(null);
    if (invalid) {
      setError("Amounts must be zero or more.");
      return;
    }
    if (total <= 0) {
      setError("Enter at least one amount.");
      return;
    }
    try {
      await save.mutateAsync({ date, cashInHand: amounts[0]!, bank: amounts[1]!, equipment: amounts[2]! });
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Could not save. Please try again.");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Opening balance"
        description="The money and equipment your business had when you started using RentCore."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Accounting", href: ROUTES.accounting },
          { label: "Opening balance" },
        ]}
      />
      <AccountingSubNav />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title={current.data ? "Change the opening balance" : "Enter your opening balance"}
          description="Count what you had on the day you started: cash in the drawer, money in the bank, and what your rental items were worth. RentCore records it as money you, the owner, put into the business."
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="opening-date" className="text-sm font-medium">
                On which day?
              </label>
              <Input id="opening-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              <p className="text-xs text-muted-foreground">Usually the day before your first order in RentCore.</p>
            </div>
            <AmountField
              id="opening-cash"
              label="Cash in hand"
              hint="Notes and coins you had."
              value={cashInHand}
              onChange={setCashInHand}
            />
            <AmountField
              id="opening-bank"
              label="Money in the bank"
              hint="Your bank balance on that day."
              value={bank}
              onChange={setBank}
            />
            <AmountField
              id="opening-equipment"
              label="Rental items you already owned (optional)"
              hint="What they cost you, roughly. Leave empty if you are not sure."
              value={equipment}
              onChange={setEquipment}
            />
            <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">Owner&apos;s capital (total)</span>
              <span className="font-heading text-lg font-semibold tabular-nums">{formatCurrency(total)}</span>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            {current.data ? (
              <p className="text-xs text-muted-foreground">
                Saving replaces the opening balance below. The old one is kept as void, so nothing is lost.
              </p>
            ) : null}
            <div className="flex justify-end">
              <AppButton loading={save.isPending} onClick={() => void handleSave()}>
                Save opening balance
              </AppButton>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="What is saved now">
          {current.isLoading ? (
            <LoadingState label="Loading..." />
          ) : current.isError ? (
            <p role="alert" className="text-sm text-destructive">
              Could not load the opening balance. Refresh the page to try again.
            </p>
          ) : current.data ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {formatDate(current.data.date)} · entry {current.data.journalNumber}
              </p>
              <dl className="space-y-2">
                {current.data.lines.map((line) => (
                  <div key={line.accountCode} className="flex justify-between gap-4">
                    <dt>
                      {line.accountName} <span className="text-muted-foreground">({line.accountCode})</span>
                    </dt>
                    <dd className="tabular-nums">{formatCurrency(line.amount)}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t border-border pt-2 font-medium">
                  <dt>Owner&apos;s capital</dt>
                  <dd className="tabular-nums">{formatCurrency(current.data.total)}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing yet. Until you enter it, your cash and bank can show minus amounts, because
              RentCore only knows the money that came in and went out since you started.
            </p>
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
