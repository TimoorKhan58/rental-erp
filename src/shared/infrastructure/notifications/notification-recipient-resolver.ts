import type { DbClient } from "@/shared/infrastructure/database/prisma-types";

import type { RecipientInput } from "./notification-types";

const FALLBACK_RECIPIENT_NAME = "Team member";

export async function resolveUserRecipients(
  db: DbClient,
  userIds: readonly string[],
): Promise<RecipientInput[]> {
  const uniqueIds = [...new Set(userIds.filter((id) => id.trim().length > 0))];

  if (uniqueIds.length === 0) {
    return [];
  }

  const users = await db.user.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const usersById = new Map(users.map((user) => [user.id, user]));

  return uniqueIds.map((userId) => {
    const user = usersById.get(userId);

    return {
      userId,
      name: user?.name ?? FALLBACK_RECIPIENT_NAME,
      email: user?.email ?? undefined,
    };
  });
}
