import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/config/routes";
import { APPLICATION } from "@/constants/application";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { findActivePlatformOwner } from "@/modules/platform/infrastructure/platform-owner.repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Platform · ${APPLICATION.name}`,
  robots: { index: false, follow: false },
};

/**
 * Platform home (SaaS phase 3b). Only active platform owners see it;
 * everyone else, including business owners, gets "not found".
 */
export default async function PlatformHomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const owner = session === null ? null : await findActivePlatformOwner(prisma, session.user.id);

  if (owner === null) {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-start justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardDescription>{APPLICATION.name} platform</CardDescription>
          <CardTitle className="text-2xl">Businesses</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <p>
            Signed in as <span className="font-medium">{owner.name}</span> ({owner.email}).
            This login manages businesses and cannot open any business&apos;s data.
          </p>
          <p className="text-muted-foreground">
            Creating, listing and deactivating businesses arrive in the next update.
          </p>
          <a className="self-start font-medium text-primary underline-offset-4 hover:underline" href={ROUTES.logout}>
            Sign out
          </a>
        </CardContent>
      </Card>
    </main>
  );
}
