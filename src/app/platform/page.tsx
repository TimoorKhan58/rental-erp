import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { PlatformBusinessesView } from "@/features/platform/platform-businesses-view";
import { APPLICATION } from "@/constants/application";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { findActivePlatformOwner } from "@/modules/platform/infrastructure/platform-owner.repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Platform",
  robots: { index: false, follow: false },
};

/**
 * Platform home (SaaS phases 3b/3c): the list of businesses. Only active platform owners see it;
 * everyone else, including business owners, gets "not found".
 */
export default async function PlatformHomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const owner = session === null ? null : await findActivePlatformOwner(prisma, session.user.id);

  if (owner === null) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="text-sm text-muted-foreground">{APPLICATION.name} platform</p>
            <h1 className="text-2xl font-semibold tracking-tight">Manage businesses</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              {owner.name} · {owner.email}
            </span>
            <a className="font-medium text-primary underline-offset-4 hover:underline" href={ROUTES.logout}>
              Sign out
            </a>
          </div>
        </header>
        <PlatformBusinessesView />
        <p className="text-xs text-muted-foreground">
          This login manages businesses only and cannot open any business&apos;s data. Every action here is recorded.
        </p>
      </div>
    </main>
  );
}
