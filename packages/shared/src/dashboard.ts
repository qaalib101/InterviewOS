import type { ApplicationStage, Priority } from "./crm.js";
import type { InterviewOutcome } from "./interviews.js";

export const activityEntityTypes = ["COMPANY", "APPLICATION", "CONTACT", "INTERVIEW", "INTERVIEW_NOTE", "FOLLOW_UP"] as const;
export const activityEventTypes = ["CREATED", "UPDATED", "DELETED", "COMPLETED", "REOPENED", "STAGE_CHANGED", "OUTCOME_CHANGED"] as const;

export type ActivityEntityType = (typeof activityEntityTypes)[number];
export type ActivityEventType = (typeof activityEventTypes)[number];

export type CountBucket<T extends string> = {
  key: T;
  label: string;
  count: number;
};

export type DashboardSummary = {
  activeApplications: Array<{
    id: string;
    roleTitle: string;
    stage: ApplicationStage;
    priority: Priority;
    confidence?: number | null;
    nextAction?: string | null;
    nextActionAt?: string | null;
    company: { id: string; name: string };
  }>;
  upcomingInterviews: Array<{
    id: string;
    roundName: string;
    roundNumber: number;
    scheduledAt: string;
    durationMinutes: number;
    outcome: InterviewOutcome;
    application: { id: string; roleTitle: string; company: { id: string; name: string } };
  }>;
  dueFollowUps: Array<{
    id: string;
    title: string;
    dueAt: string;
    priority: Priority;
    type: string;
    application?: { id: string; roleTitle: string; company: { id: string; name: string } } | null;
    contact?: { id: string; name: string } | null;
    interview?: { id: string; roundName: string } | null;
  }>;
  recentActivity: Array<{
    id: string;
    entityType: ActivityEntityType;
    entityId: string;
    eventType: ActivityEventType;
    occurredAt: string;
    metadata?: Record<string, unknown> | null;
  }>;
  pipelineByStage: Array<CountBucket<ApplicationStage>>;
  followUpsByPriority: Array<CountBucket<Priority>>;
  interviewsByOutcome: Array<CountBucket<InterviewOutcome>>;
};
