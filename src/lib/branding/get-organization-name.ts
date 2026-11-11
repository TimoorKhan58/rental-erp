import { APPLICATION } from "@/constants/application";
import prisma from "@/lib/prisma";
import { createAppLogger } from "@/shared/infrastructure/logging";

/**
 * Company name for public pages (login, auth layout). It is only a label, so
 * a slow or unavailable database falls back to the app name instead of
 * failing the login page (QA-017).
 */
export async function getOrganizationName(): Promise<string> {
  try {
    const settings = await prisma.companySetting.findFirst({
      where: { isActive: true },
      select: { companyName: true },
      orderBy: { updatedAt: "desc" },
    });

    const companyName = settings?.companyName?.trim();
    return companyName && companyName.length > 0 ? companyName : APPLICATION.name;
  } catch (error) {
    createAppLogger().warn("Company name lookup failed; using app name", {
      error: error instanceof Error ? error.message : String(error),
    });
    return APPLICATION.name;
  }
}
