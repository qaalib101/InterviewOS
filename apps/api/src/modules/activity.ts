import type { ActivityEntityType, ActivityEventType, Prisma, PrismaClient } from "@prisma/client";

type ActivityDb = Pick<PrismaClient, "activityEvent">;

type ActivityInput = {
  userId: string;
  entityType: ActivityEntityType;
  entityId: string;
  eventType: ActivityEventType;
  metadata?: Prisma.InputJsonObject;
  occurredAt?: Date;
};

export async function recordActivity(db: ActivityDb, input: ActivityInput) {
  return db.activityEvent.create({
    data: {
      userId: input.userId,
      entityType: input.entityType,
      entityId: input.entityId,
      eventType: input.eventType,
      metadata: input.metadata ?? {},
      occurredAt: input.occurredAt ?? new Date()
    }
  });
}
