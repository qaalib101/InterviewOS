import type { DashboardSummary } from "@interview-os/shared";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet } from "../lib/api";
import { formatDate, label } from "../lib/format";
import { MeterBar } from "../ui/MeterBar";
import { PageHeader, Panel } from "../ui/Primitives";

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiGet<DashboardSummary>("/api/v1/dashboard")
  });

  if (isLoading) return <PageHeader title="Dashboard" eyebrow="Loading" />;
  if (error || !data) {
    return (
      <>
        <PageHeader title="Dashboard" eyebrow="Overview" />
        <Panel>
          <p className="text-sm text-rust">Dashboard data could not be loaded.</p>
        </Panel>
      </>
    );
  }

  const maxPipeline = maxCount(data.pipelineByStage);
  const maxFollowUps = maxCount(data.followUpsByPriority);
  const maxOutcomes = maxCount(data.interviewsByOutcome);

  return (
    <>
      <PageHeader title="Dashboard" eyebrow="Daily command center" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Active Applications" value={data.activeApplications.length} to="/applications" />
        <StatCard label="Upcoming Interviews" value={data.upcomingInterviews.length} to="/interviews" />
        <StatCard label="Open Follow-Ups" value={data.dueFollowUps.length} to="/follow-ups" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Active Applications">
          <div className="space-y-3">
            {data.activeApplications.length ? data.activeApplications.map((application) => (
              <article key={application.id} className="rounded-md border border-line bg-paper p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{application.company.name} · {application.roleTitle}</p>
                    <p className="text-sm text-steel">{label(application.stage)} · {label(application.priority)} priority</p>
                  </div>
                  {application.confidence ? <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold">Confidence {application.confidence}/5</span> : null}
                </div>
                {application.nextAction ? <p className="mt-2 text-sm">Next: {application.nextAction}</p> : null}
                {application.nextActionAt ? <p className="mt-1 text-xs text-steel">Target: {formatDate(application.nextActionAt)}</p> : null}
              </article>
            )) : <p className="text-sm text-steel">No active applications yet.</p>}
          </div>
        </Panel>

        <Panel title="Pipeline By Stage">
          <div className="space-y-3">
            {data.pipelineByStage.map((bucket) => <MeterBar key={bucket.key} count={bucket.count} label={bucket.label} max={maxPipeline} />)}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Upcoming Interviews">
          <div className="space-y-3">
            {data.upcomingInterviews.length ? data.upcomingInterviews.map((interview) => (
              <article key={interview.id} className="rounded-md border border-line bg-paper p-3">
                <p className="font-medium">{interview.roundName}</p>
                <p className="text-sm text-steel">{interview.application.company.name} · {interview.application.roleTitle}</p>
                <p className="mt-1 text-sm">{formatDate(interview.scheduledAt)} · {interview.durationMinutes} min</p>
              </article>
            )) : <p className="text-sm text-steel">No upcoming interviews scheduled.</p>}
          </div>
        </Panel>

        <Panel title="Follow-Ups Due">
          <div className="space-y-3">
            {data.dueFollowUps.length ? data.dueFollowUps.map((followUp) => (
              <article key={followUp.id} className="rounded-md border border-line bg-paper p-3">
                <p className="font-medium">{followUp.title}</p>
                <p className="text-sm text-steel">{formatDate(followUp.dueAt)} · {label(followUp.priority)}</p>
                <p className="mt-1 text-xs text-steel">{followUp.application ? `${followUp.application.company.name} · ${followUp.application.roleTitle}` : followUp.contact?.name ?? followUp.interview?.roundName ?? "No linked record"}</p>
              </article>
            )) : <p className="text-sm text-steel">No open follow-ups.</p>}
          </div>
        </Panel>

        <Panel title="Recent Activity">
          <div className="space-y-3">
            {data.recentActivity.length ? data.recentActivity.map((event) => (
              <article key={event.id} className="rounded-md border border-line bg-paper p-3">
                <p className="text-sm font-medium">{activityTitle(event)}</p>
                <p className="text-xs text-steel">{formatDate(event.occurredAt)}</p>
              </article>
            )) : <p className="text-sm text-steel">No activity recorded yet.</p>}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Open Follow-Ups By Priority">
          <div className="space-y-3">
            {data.followUpsByPriority.map((bucket) => <MeterBar key={bucket.key} count={bucket.count} label={bucket.label} max={maxFollowUps} />)}
          </div>
        </Panel>
        <Panel title="Interview Outcomes">
          <div className="space-y-3">
            {data.interviewsByOutcome.map((bucket) => <MeterBar key={bucket.key} count={bucket.count} label={bucket.label} max={maxOutcomes} />)}
          </div>
        </Panel>
      </div>
    </>
  );
}

function StatCard({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link className="rounded-md border border-line bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" to={to}>
      <p className="text-xs font-semibold uppercase tracking-widest text-steel">{label}</p>
      <p className="mt-2 font-display text-4xl text-ink">{value}</p>
    </Link>
  );
}

function maxCount(buckets: Array<{ count: number }>) {
  return Math.max(1, ...buckets.map((bucket) => bucket.count));
}

function activityTitle(event: DashboardSummary["recentActivity"][number]) {
  const metadata = event.metadata ?? {};
  const name = String(metadata.roleTitle ?? metadata.title ?? metadata.name ?? metadata.roundName ?? label(event.entityType));
  return `${label(event.eventType)} · ${name}`;
}
