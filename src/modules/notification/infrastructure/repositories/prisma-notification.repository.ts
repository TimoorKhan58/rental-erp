import type { Prisma } from "@/generated/prisma/client";
import type { NotificationListQuery } from "@/modules/notification/domain/notification-list.query";
import type { NotificationId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  createRepositoryQuerySpec,
  repositoryFindFirst,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";
import { normalizeSearchTerm } from "@/shared/infrastructure/database/repository/query/build-search";

import { NotificationInboxItem } from "@/modules/notification/domain/notification.entity";
import type { INotificationRepository } from "@/modules/notification/domain/notification.repository.interface";
import type { MarkAllNotificationsReadResult } from "@/modules/notification/domain/notification.repository.interface";
import { NOTIFICATION_SEARCH_FIELDS } from "@/modules/notification/domain/notification.constants";
import type { NotificationAccessContext } from "@/modules/notification/domain/notification.types";

import { toNotificationInboxItemDomain } from "../mappers/notification.persistence.mapper";

const MODEL = "NotificationRecipient";

const NOTIFICATION_INCLUDE = {
  notification: true,
} as const;

const DEFAULT_ORDER_BY: Prisma.NotificationRecipientOrderByWithRelationInput = {
  notification: {
    createdAt: "desc",
  },
};

type RecipientWithNotification = Prisma.NotificationRecipientGetPayload<{
  include: typeof NOTIFICATION_INCLUDE;
}>;

function buildCreatedAtFilter(
  fromDate?: Date,
  toDate?: Date,
): Prisma.DateTimeFilter | undefined {
  if (fromDate === undefined && toDate === undefined) {
    return undefined;
  }

  const filter: Prisma.DateTimeFilter = {};

  if (fromDate !== undefined) {
    filter.gte = fromDate;
  }

  if (toDate !== undefined) {
    filter.lte = toDate;
  }

  return filter;
}

function buildNotificationSearchWhere(
  search?: string,
): Prisma.NotificationWhereInput | undefined {
  const term = normalizeSearchTerm(search);

  if (term === undefined) {
    return undefined;
  }

  return {
    OR: NOTIFICATION_SEARCH_FIELDS.map((field) => ({
      [field]: {
        contains: term,
        mode: "insensitive" as const,
      },
    })),
  };
}

function buildAccessWhere(
  access: NotificationAccessContext,
): Prisma.NotificationRecipientWhereInput {
  if (access.viewAll) {
    return {};
  }

  return {
    userId: access.viewerUserId,
  };
}

function mapNotificationFilter(
  filter: Record<string, unknown>,
): Prisma.NotificationRecipientWhereInput | undefined {
  const where: Prisma.NotificationRecipientWhereInput = {};
  const notificationWhere: Prisma.NotificationWhereInput = {};

  if (filter.type !== undefined) {
    notificationWhere.channel = filter.type as Prisma.NotificationWhereInput["channel"];
  }

  if (filter.status !== undefined) {
    notificationWhere.status = filter.status as Prisma.NotificationWhereInput["status"];
  }

  const createdAt = buildCreatedAtFilter(
    filter.fromDate as Date | undefined,
    filter.toDate as Date | undefined,
  );

  if (createdAt !== undefined) {
    notificationWhere.createdAt = createdAt;
  }

  const searchWhere = buildNotificationSearchWhere(filter.search as string | undefined);

  if (searchWhere !== undefined) {
    Object.assign(notificationWhere, searchWhere);
  }

  if (Object.keys(notificationWhere).length > 0) {
    where.notification = notificationWhere;
  }

  if (filter.recipientId !== undefined) {
    where.userId = String(filter.recipientId);
  }

  if (filter.read === true) {
    where.isRead = true;
  } else if (filter.unread === true) {
    where.isRead = false;
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapNotificationSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.NotificationRecipientOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  const [field, order] = Object.entries(sort)[0] ?? [];

  if (field === undefined || order === undefined) {
    return DEFAULT_ORDER_BY;
  }

  switch (field) {
    case "isRead":
      return { isRead: order };
    case "readAt":
      return { readAt: order };
    case "createdAt":
    case "title":
    case "status":
    case "channel":
    case "priority":
    case "module":
      return {
        notification: {
          [field]: order,
        },
      };
    default:
      return DEFAULT_ORDER_BY;
  }
}

function toDomain(record: RecipientWithNotification): NotificationInboxItem {
  return toNotificationInboxItemDomain(record, record.notification);
}

function selectRecipientForAccess(
  recipients: RecipientWithNotification[],
  access: NotificationAccessContext,
): RecipientWithNotification | null {
  if (recipients.length === 0) {
    return null;
  }

  if (!access.viewAll) {
    return (
      recipients.find((recipient) => recipient.userId === access.viewerUserId) ??
      null
    );
  }

  return (
    recipients.find((recipient) => recipient.userId === access.viewerUserId) ??
    recipients[0] ??
    null
  );
}

export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(
    id: NotificationId,
    access: NotificationAccessContext,
  ): Promise<NotificationInboxItem | null> {
    return repositoryFindFirst(
      this.runner,
      async (db) => {
        if (!access.viewAll) {
          const recipient = await db.notificationRecipient.findFirst({
            where: {
              notificationId: id,
              userId: access.viewerUserId,
            },
            include: NOTIFICATION_INCLUDE,
          });

          return recipient ? toDomain(recipient) : null;
        }

        const notification = await db.notification.findUnique({
          where: { id },
          include: {
            recipients: true,
          },
        });

        if (notification === null) {
          return null;
        }

        const recipientRecord = selectRecipientForAccess(
          notification.recipients.map((recipient) => ({
            ...recipient,
            notification,
          })),
          access,
        );

        if (recipientRecord === null) {
          return null;
        }

        return toDomain(recipientRecord);
      },
      { model: MODEL, operation: "findById" },
    );
  }

  async findPaged(
    query: NotificationListQuery,
  ): Promise<PaginatedResult<NotificationInboxItem>> {
    const filter: Record<string, unknown> = {};

    if (query.type !== undefined) {
      filter.type = query.type;
    }

    if (query.status !== undefined) {
      filter.status = query.status;
    }

    if (query.read === true) {
      filter.read = true;
    }

    if (query.unread === true) {
      filter.unread = true;
    }

    if (query.fromDate !== undefined) {
      filter.fromDate = query.fromDate;
    }

    if (query.toDate !== undefined) {
      filter.toDate = query.toDate;
    }

    if (query.recipientId !== undefined) {
      filter.recipientId = query.recipientId;
    }

    if (query.search !== undefined) {
      filter.search = query.search;
    }

    const result = await runRepositoryPagedQuery(
      this.runner,
      {
        spec: createRepositoryQuerySpec({
          page: query.page,
          pageSize: query.pageSize,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          filter: Object.keys(filter).length > 0 ? filter : undefined,
        }),
        baseWhere: buildAccessWhere(query.access),
        mapFilter: mapNotificationFilter,
        mapSort: mapNotificationSort,
        handlers: {
          findMany: (db, args) =>
            db.notificationRecipient.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
              include: NOTIFICATION_INCLUDE,
            }),
          count: (db, args) =>
            db.notificationRecipient.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    );

    return {
      items: result.items.map(toDomain),
      meta: result.meta,
    };
  }

  markAsRead(
    id: NotificationId,
    access: NotificationAccessContext,
  ): Promise<NotificationInboxItem | null> {
    return this.runner.run(async (db) => {
      const recipient = await db.notificationRecipient.findFirst({
        where: {
          notificationId: id,
          userId: access.viewerUserId,
        },
        include: NOTIFICATION_INCLUDE,
      });

      if (recipient === null) {
        return null;
      }

      if (recipient.isRead) {
        return toDomain(recipient);
      }

      const updated = await db.notificationRecipient.update({
        where: { id: recipient.id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
        include: NOTIFICATION_INCLUDE,
      });

      return toDomain(updated);
    }, { model: MODEL, operation: "markAsRead" });
  }

  markAllAsRead(userId: string): Promise<MarkAllNotificationsReadResult> {
    return this.runner.run(async (db) => {
      const result = await db.notificationRecipient.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return {
        markedCount: result.count,
      };
    }, { model: MODEL, operation: "markAllAsRead" });
  }
}
