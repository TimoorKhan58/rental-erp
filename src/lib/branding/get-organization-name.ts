import { APPLICATION } from "@/constants/application";
import prisma from "@/lib/prisma";

export async function getOrganizationName(): Promise<string> {
  const settings = await prisma.companySetting.findFirst({
    where: { isActive: true },
    select: { companyName: true },
    orderBy: { updatedAt: "desc" },
  });

  const companyName = settings?.companyName?.trim();
  return companyName && companyName.length > 0 ? companyName : APPLICATION.name;
}
