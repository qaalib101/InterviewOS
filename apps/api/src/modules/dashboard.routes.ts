import { applicationStages, interviewOutcomes, priorities } from "@interview-os/shared";
import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { asyncHandler, getLocalUserId } from "../shared/http.js";

export const dashboardRouter = Router();
export const activityRouter = Router();

const terminalApplicationStages = ["REJECTED", "WITHDRAWN", "ARCHIVED"] as const;

const applicationInclude = {
  company: true
};

const interviewInclude = {
  application: { include: { company: true } }
};

const followUpInclude = {
  application: { include: { company: true } },
  contact: true,
  interview: true
};

dashboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const userId = await getLocalUserId(prisma);
    const now = new Date();

    const [
      activeApplications,
      upcomingInterviews,
      dueFollowUps,
      recentActivity,
      pipelineCounts,
      followUpPriorityCounts,
      interviewOutcomeCounts
    ] = await Promise.all([
      prisma.application.findMany({
        where: { userId, stage: { notIn: [...terminalApplicationStages] } },
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
        include: applicationInclude
      }),
      prisma.interview.findMany({
        where: { userId, scheduledAt: { gte: now } },
        orderBy: { scheduledAt: "asc" },
        include: interviewInclude
      }),
      prisma.followUp.findMany({
        where: { userId, completedAt: null },
        orderBy: [{ dueAt: "asc" }, { priority: "desc" }],
        include: followUpInclude
      }),
      prisma.activityEvent.findMany({
        where: { userId },
        orderBy: { occurredAt: "desc" },
        take: 10
      }),
      prisma.application.groupBy({
        by: ["stage"],
        where: { userId },
        _count: { stage: true }
      }),
      prisma.followUp.groupBy({
        by: ["priority"],
        where: { userId, completedAt: null },
        _count: { priority: true }
      }),
      prisma.interview.groupBy({
        by: ["outcome"],
        where: { userId },
        _count: { outcome: true }
      })
    ]);

    res.json({
      activeApplications,
      upcomingInterviews,
      dueFollowUps,
      recentActivity,
      pipelineByStage: applicationStages.map((stage) => ({
        key: stage,
        label: toLabel(stage),
        count: pipelineCounts.find((item) => item.stage === stage)?._count.stage ?? 0
      })),
      followUpsByPriority: priorities.map((priority) => ({
        key: priority,
        label: toLabel(priority),
        count: followUpPriorityCounts.find((item) => item.priority === priority)?._count.priority ?? 0
      })),
      interviewsByOutcome: interviewOutcomes.map((outcome) => ({
        key: outcome,
        label: toLabel(outcome),
        count: interviewOutcomeCounts.find((item) => item.outcome === outcome)?._count.outcome ?? 0
      }))
    });
  })
);

activityRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const userId = await getLocalUserId(prisma);
    const events = await prisma.activityEvent.findMany({
      where: { userId },
      orderBy: { occurredAt: "desc" },
      take: 50
    });

    res.json(events);
  })
);

function toLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
