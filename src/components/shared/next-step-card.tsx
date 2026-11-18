"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { AppButton } from "@/components/design-system/button";
import { cn } from "@/lib/utils";

/** What a record needs next, in plain words (usability revamp R3). */
export type NextStep<K extends string = string> = {
  title: string;
  text: string;
  tone: "normal" | "urgent" | "done";
  action?: { kind: K; label: string } | { kind: "link"; label: string; href: string };
};

type NextStepCardProps<K extends string> = {
  step: NextStep<K>;
  /** False hides the button for people who may not do the action. */
  allowed?: boolean;
  /** Runs a non-link action (opens its dialog). */
  onAction?: (kind: K) => void;
};

/** One box with the single right action, shown near the top of a record. */
export function NextStepCard<K extends string>({ step, allowed = true, onAction }: NextStepCardProps<K>) {
  const action = allowed ? step.action : undefined;
  const icon = <ArrowRightIcon className="size-4" aria-hidden="true" />;
  return (
    <section
      aria-label="Next step"
      className={cn(
        "flex flex-col gap-3 rounded-md border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        step.tone === "urgent" ? "border-destructive/40 bg-destructive/5" : "border-primary/30 bg-primary/5",
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next step</p>
        <p className={cn("text-base font-semibold", step.tone === "urgent" ? "text-destructive" : "text-foreground")}>
          {step.title}
        </p>
        <p className="text-sm text-muted-foreground">{step.text}</p>
      </div>
      {action && "href" in action ? (
        <AppButton className="shrink-0" rightIcon={icon} render={<Link href={action.href} />}>
          {action.label}
        </AppButton>
      ) : action ? (
        <AppButton className="shrink-0" rightIcon={icon} onClick={() => onAction?.(action.kind as K)}>
          {action.label}
        </AppButton>
      ) : null}
    </section>
  );
}
