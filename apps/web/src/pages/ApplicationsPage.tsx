import { applicationStages, priorities, remoteModes } from "@interview-os/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { formatDate, label } from "../lib/format";
import { Field, PageHeader, Panel } from "../ui/Primitives";

type Company = { id: string; name: string };
type Application = {
  id: string;
  companyId: string;
  company?: Company;
  roleTitle: string;
  stage: string;
  priority: string;
  remoteMode: string;
  confidence?: number | null;
  nextAction?: string | null;
  nextActionAt?: string | null;
  concerns?: string | null;
};

const initialForm = {
  companyId: "",
  roleTitle: "",
  jobUrl: "",
  source: "",
  stage: "APPLIED",
  compensationMin: "",
  compensationMax: "",
  remoteMode: "UNKNOWN",
  priority: "MEDIUM",
  confidence: "",
  concerns: "",
  nextAction: "",
  nextActionAt: "",
  notes: ""
};

export function ApplicationsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => apiGet<Company[]>("/api/v1/companies") });
  const { data: applications = [] } = useQuery({ queryKey: ["applications"], queryFn: () => apiGet<Application[]>("/api/v1/applications") });
  const createApplication = useMutation({
    mutationFn: () =>
      apiPost<Application>("/api/v1/applications", {
        ...form,
        compensationMin: form.compensationMin ? Number(form.compensationMin) : null,
        compensationMax: form.compensationMax ? Number(form.compensationMax) : null,
        confidence: form.confidence ? Number(form.confidence) : null,
        nextActionAt: form.nextActionAt || null
      }),
    onSuccess: () => {
      setForm(initialForm);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    }
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    createApplication.mutate();
  }

  return (
    <>
      <PageHeader title="Applications" eyebrow="New and existing processes" />
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Panel title="Application Pipeline">
          <div className="space-y-3">
            {applications.map((application) => (
              <article key={application.id} className="rounded-md border border-line bg-paper p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{application.roleTitle}</p>
                    <p className="text-sm text-steel">
                      {application.company?.name} · {label(application.stage)} · {label(application.remoteMode)}
                    </p>
                  </div>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-rust">{label(application.priority)}</span>
                </div>
                <p className="mt-3 text-sm">{application.nextAction || "No next action recorded"}</p>
                <p className="mt-1 text-xs text-steel">Next action date: {formatDate(application.nextActionAt)}</p>
                {application.concerns ? <p className="mt-2 text-sm text-rust">Concern: {application.concerns}</p> : null}
              </article>
            ))}
          </div>
        </Panel>
        <Panel title="Create Or Import Process">
          <form className="grid gap-3" onSubmit={submit}>
            <Field label="Company">
              <select required value={form.companyId} onChange={(event) => setForm({ ...form, companyId: event.target.value })}>
                <option value="">Select company</option>
                {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
              </select>
            </Field>
            <Field label="Role Title"><input required value={form.roleTitle} onChange={(event) => setForm({ ...form, roleTitle: event.target.value })} /></Field>
            <Field label="Job URL"><input value={form.jobUrl} onChange={(event) => setForm({ ...form, jobUrl: event.target.value })} /></Field>
            <Field label="Source"><input value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} /></Field>
            <Field label="Stage">
              <select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })}>
                {applicationStages.map((stage) => <option key={stage} value={stage}>{label(stage)}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Comp Min"><input type="number" value={form.compensationMin} onChange={(event) => setForm({ ...form, compensationMin: event.target.value })} /></Field>
              <Field label="Comp Max"><input type="number" value={form.compensationMax} onChange={(event) => setForm({ ...form, compensationMax: event.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Remote Mode">
                <select value={form.remoteMode} onChange={(event) => setForm({ ...form, remoteMode: event.target.value })}>
                  {remoteModes.map((mode) => <option key={mode} value={mode}>{label(mode)}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                  {priorities.map((priority) => <option key={priority} value={priority}>{label(priority)}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Confidence 1-5"><input min="1" max="5" type="number" value={form.confidence} onChange={(event) => setForm({ ...form, confidence: event.target.value })} /></Field>
            <Field label="Concerns"><textarea rows={3} value={form.concerns} onChange={(event) => setForm({ ...form, concerns: event.target.value })} /></Field>
            <Field label="Next Action"><input value={form.nextAction} onChange={(event) => setForm({ ...form, nextAction: event.target.value })} /></Field>
            <Field label="Next Action Date"><input type="datetime-local" value={form.nextActionAt} onChange={(event) => setForm({ ...form, nextActionAt: event.target.value })} /></Field>
            <Field label="Notes"><textarea rows={4} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            <button disabled={createApplication.isPending}>Save Application</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
