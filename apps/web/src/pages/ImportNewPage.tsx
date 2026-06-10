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

type AnalyzeResponse = {
  id: string;
  status: string;
  analysis: ImportAnalysisResult;
};

type CommitResponse = {
  records: Array<{ proposalId: string; entityType: string; operation: string; id: string; label: string; path: string }>;
};

export function ImportNewPage() {
  const [sourceType, setSourceType] = useState<ImportSourceType>("unknown");
  const [rawText, setRawText] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ImportAnalysisResult | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResponse | null>(null);
  const { data: providerStatus } = useQuery({ queryKey: ["ai-status"], queryFn: () => apiGet<AiProviderStatus>("/api/v1/ai/status") });

  const analyze = useMutation({
    mutationFn: () => apiPost<AnalyzeResponse>("/api/v1/imports/analyze", { sourceType, rawText }),
    onSuccess: (response) => {
      setSessionId(response.id);
      setAnalysis(response.analysis);
      setCommitResult(null);
    }
  });

  const saveProposals = useMutation({
    mutationFn: (nextAnalysis: ImportAnalysisResult) => apiPatch<AnalyzeResponse>(`/api/v1/imports/${sessionId}/proposals`, { analysis: nextAnalysis })
  });

  const commit = useMutation({
    mutationFn: async () => {
      if (!sessionId || !analysis) throw new Error("Analyze an import before committing.");
      await saveProposals.mutateAsync(analysis);
      return apiPost<CommitResponse>(`/api/v1/imports/${sessionId}/commit`, { analysis });
    },
    onSuccess: setCommitResult
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

  function updateProposal(next: ImportProposal) {
    if (!analysis) return;
    setAnalysis({ ...analysis, proposals: analysis.proposals.map((proposal) => proposal.id === next.id ? next : proposal) });
  }

  const analyzeDisabled = !providerStatus?.available || !rawText.trim() || analyze.isPending;

  return (
    <>
      <PageHeader title="Text Import" eyebrow="Review before commit" />
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <Panel title="Provider Status">
            <ProviderStatus status={providerStatus} />
          </Panel>
          <Panel title="Paste Source Text">
            <form className="grid gap-3" onSubmit={submit}>
              <label className="grid gap-1 text-sm font-medium">
                <span>Source Type</span>
                <select value={sourceType} onChange={(event) => setSourceType(event.target.value as ImportSourceType)}>
                  {importSourceTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                <span>Raw Text</span>
                <textarea rows={14} value={rawText} onChange={(event) => setRawText(event.target.value)} placeholder="Paste recruiter email, job description, interview notes, or follow-up text." />
              </label>
              {analyze.error ? <p className="text-sm text-rust">{analyze.error.message}</p> : null}
              <button disabled={analyzeDisabled} type="submit">{analyze.isPending ? "Analyzing..." : "Analyze Text"}</button>
            </form>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Import Preview">
            {!analysis ? <p className="text-sm text-steel">Analyze pasted text to generate reviewable proposals.</p> : null}
            {analysis?.summary ? <p className="mb-4 text-sm text-steel">{analysis.summary}</p> : null}
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
