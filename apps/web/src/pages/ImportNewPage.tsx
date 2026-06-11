import type { AiProviderStatus, ImportAnalysisResult, ImportProposal, ImportSourceType } from "@interview-os/shared";
import { importSourceTypes } from "@interview-os/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPatch, apiPost } from "../lib/api";
import { label } from "../lib/format";
import { ImportProposalCard } from "../ui/ImportProposalCard";
import { PageHeader, Panel } from "../ui/Primitives";
import { ProviderStatus } from "../ui/ProviderStatus";
import { useToast } from "../ui/Toast";

type AnalyzeResponse = {
  id: string;
  status: string;
  analysis: ImportAnalysisResult;
};

type CommitResponse = {
  records: Array<{ proposalId: string; entityType: string; operation: string; id: string; label: string; path: string }>;
};

type ApplicationOption = {
  id: string;
  roleTitle: string;
  stage: string;
  company?: { name: string } | null;
};

type InterviewOption = {
  id: string;
  roundName: string;
  scheduledAt: string;
  applicationId: string;
  application?: { roleTitle: string; company?: { name: string } | null } | null;
};

export function ImportNewPage() {
  const toast = useToast();
  const [sourceType, setSourceType] = useState<ImportSourceType>("unknown");
  const [rawText, setRawText] = useState("");
  const [contextApplicationId, setContextApplicationId] = useState("");
  const [contextInterviewId, setContextInterviewId] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ImportAnalysisResult | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResponse | null>(null);
  const { data: providerStatus } = useQuery({ queryKey: ["ai-status"], queryFn: () => apiGet<AiProviderStatus>("/api/v1/ai/status") });
  const { data: applications = [] } = useQuery({ queryKey: ["applications"], queryFn: () => apiGet<ApplicationOption[]>("/api/v1/applications") });
  const { data: interviews = [] } = useQuery({ queryKey: ["interviews"], queryFn: () => apiGet<InterviewOption[]>("/api/v1/interviews") });

  const analyze = useMutation({
    mutationFn: () => apiPost<AnalyzeResponse>("/api/v1/imports/analyze", {
      sourceType,
      rawText,
      contextApplicationId: contextInterviewId ? undefined : contextApplicationId || undefined,
      contextInterviewId: contextInterviewId || undefined
    }),
    onSuccess: (response) => {
      setSessionId(response.id);
      setAnalysis(response.analysis);
      setCommitResult(null);
      toast.success("Import analyzed", `${response.analysis.proposals.length} proposals are ready to review.`);
    },
    onError: (error) => {
      toast.error("Import analysis failed", error instanceof Error ? error.message : "Review the source text and provider configuration.");
    }
  });

  const saveProposals = useMutation({
    mutationFn: (nextAnalysis: ImportAnalysisResult) => apiPatch<AnalyzeResponse>(`/api/v1/imports/${sessionId}/proposals`, { analysis: nextAnalysis }),
    onError: (error) => {
      toast.error("Could not save review edits", error instanceof Error ? error.message : "Try again before committing.");
    }
  });

  const commit = useMutation({
    mutationFn: async () => {
      if (!sessionId || !analysis) throw new Error("Analyze an import before committing.");
      await saveProposals.mutateAsync(analysis);
      return apiPost<CommitResponse>(`/api/v1/imports/${sessionId}/commit`, { analysis });
    },
    onSuccess: (response) => {
      setCommitResult(response);
      toast.success("Import committed", `${response.records.length} records were created or updated.`);
    },
    onError: (error) => {
      toast.error("Import commit failed", error instanceof Error ? error.message : "No records were committed.");
    }
  });

  const grouped = useMemo(() => {
    const groups = new Map<string, ImportProposal[]>();
    for (const proposal of analysis?.proposals ?? []) {
      groups.set(proposal.entityType, [...(groups.get(proposal.entityType) ?? []), proposal]);
    }
    return [...groups.entries()];
  }, [analysis]);

  function submit(event: FormEvent) {
    event.preventDefault();
    analyze.mutate();
  }

  function changeSourceType(nextSourceType: ImportSourceType) {
    setSourceType(nextSourceType);
    setAnalysis(null);
    setCommitResult(null);
    if (nextSourceType === "unknown") {
      setContextApplicationId("");
      setContextInterviewId("");
    }
  }

  function updateProposal(next: ImportProposal) {
    if (!analysis) return;
    setAnalysis({ ...analysis, proposals: analysis.proposals.map((proposal) => proposal.id === next.id ? next : proposal) });
  }

  const analyzeDisabled = !providerStatus?.available || !rawText.trim() || analyze.isPending;
  const showContext = sourceType !== "unknown";
  const includedCount = analysis?.proposals.filter((proposal) => proposal.included && proposal.operation !== "SKIP").length ?? 0;
  const proposalCount = analysis?.proposals.length ?? 0;

  return (
    <>
      <PageHeader title="Text Import" eyebrow="Context first, review before commit" />
      <div className="grid gap-5 xl:grid-cols-[440px_1fr]">
        <div className="space-y-4">
          <Panel title="Import Setup">
            <form className="grid gap-3" onSubmit={submit}>
              <ProviderStatus status={providerStatus} />
              <label className="grid gap-1 text-sm font-medium">
                <span>Source Type</span>
                <select value={sourceType} onChange={(event) => changeSourceType(event.target.value as ImportSourceType)}>
                  {importSourceTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}
                </select>
              </label>
              {showContext ? (
                <div className="rounded-xl border border-line bg-sand/60 p-3">
                  <div className="mb-2">
                    <p className="text-sm font-semibold">Context</p>
                    <p className="text-xs text-steel">Optional, but recommended for notes and follow-ups. Selected context overrides AI guesses.</p>
                  </div>
                  <div className="grid gap-2">
                    <label className="grid gap-1 text-sm font-medium">
                      <span>Existing Interview</span>
                      <select
                        value={contextInterviewId}
                        onChange={(event) => {
                          setContextInterviewId(event.target.value);
                          if (event.target.value) setContextApplicationId("");
                        }}
                      >
                        <option value="">No interview selected</option>
                        {interviews.map((interview) => (
                          <option key={interview.id} value={interview.id}>
                            {interview.roundName} · {interview.application?.roleTitle ?? "Application"} · {label(interview.application?.company?.name)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                      <span>Existing Application</span>
                      <select
                        disabled={Boolean(contextInterviewId)}
                        value={contextApplicationId}
                        onChange={(event) => setContextApplicationId(event.target.value)}
                      >
                        <option value="">{contextInterviewId ? "Using selected interview's application" : "No application selected"}</option>
                        {applications.map((application) => (
                          <option key={application.id} value={application.id}>
                            {application.roleTitle} · {label(application.company?.name)} · {label(application.stage)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ) : null}
              <label className="grid gap-1 text-sm font-medium">
                <span>Raw Text</span>
                <textarea rows={16} value={rawText} onChange={(event) => setRawText(event.target.value)} placeholder="Paste recruiter email, job description, interview notes, or follow-up text." />
              </label>
              {analyze.error ? <p className="text-sm text-rust">{analyze.error.message}</p> : null}
              <button className="w-full" disabled={analyzeDisabled} type="submit">{analyze.isPending ? "Analyzing..." : "Analyze Text"}</button>
            </form>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Import Preview">
            {!analysis ? <p className="text-sm text-steel">Analyze pasted text to generate reviewable proposals.</p> : null}
            {analysis ? (
              <div className="mb-4 rounded-xl border border-line bg-sand/50 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{includedCount} of {proposalCount} proposals included</p>
                  <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">Review Required</span>
                </div>
                {analysis.summary ? <p className="text-sm text-steel">{analysis.summary}</p> : null}
              </div>
            ) : null}
            <div className="space-y-5">
              {grouped.map(([entityType, proposals]) => (
                <section key={entityType} className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-steel">{label(entityType)}</h2>
                  {proposals.map((proposal) => <ImportProposalCard key={proposal.id} proposal={proposal} onChange={updateProposal} />)}
                </section>
              ))}
            </div>
            {analysis ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <button disabled={commit.isPending || saveProposals.isPending} onClick={() => commit.mutate()} type="button">
                  {commit.isPending ? "Committing..." : "Commit Included Proposals"}
                </button>
                {commit.error ? <p className="text-sm text-rust">{commit.error.message}</p> : null}
              </div>
            ) : null}
          </Panel>

          {commitResult ? (
            <Panel title="Committed Records">
              <div className="space-y-2">
                {commitResult.records.map((record) => (
                  <Link className="block rounded-md border border-line bg-paper p-3 text-sm hover:bg-white" key={`${record.entityType}-${record.id}`} to={record.path}>
                    {label(record.operation)} {label(record.entityType)} · {record.label}
                  </Link>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
