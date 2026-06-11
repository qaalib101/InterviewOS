import { applicationStages, priorities, remoteModes } from "@interview-os/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/api";
import { formatDate, label } from "../lib/format";
import { ConfirmDelete } from "../ui/ConfirmDelete";
import { FormActions } from "../ui/FormActions";
import { CrudLayout, Field, PageHeader, Panel } from "../ui/Primitives";
import { useCrudToast } from "../ui/Toast";

type Company = { id: string; name: string };
type Application = {
  id: string;
  companyId: string;
  company?: Company;
  roleTitle: string;
  jobUrl?: string | null;
  source?: string | null;
  stage: string;
  compensationMin?: number | null;
  compensationMax?: number | null;
  priority: string;
  remoteMode: string;
  confidence?: number | null;
  nextAction?: string | null;
  nextActionAt?: string | null;
  concerns?: string | null;
  notes?: string | null;
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
  const crudToast = useCrudToast("Application");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => apiGet<Company[]>("/api/v1/companies") });
  const { data: applications = [] } = useQuery({ queryKey: ["applications"], queryFn: () => apiGet<Application[]>("/api/v1/applications") });
  const payload = () => ({
    ...form,
    compensationMin: form.compensationMin ? Number(form.compensationMin) : null,
    compensationMax: form.compensationMax ? Number(form.compensationMax) : null,
    confidence: form.confidence ? Number(form.confidence) : null,
    nextActionAt: form.nextActionAt || null
  });
  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };
  const createApplication = useMutation({
    mutationFn: () => apiPost<Application>("/api/v1/applications", payload()),
    onSuccess: () => {
      const roleTitle = form.roleTitle;
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      crudToast.created(roleTitle);
    },
    onError: (error) => crudToast.failed("create", error)
  });
  const updateApplication = useMutation({
    mutationFn: () => apiPatch<Application>(`/api/v1/applications/${editingId}`, payload()),
    onSuccess: () => {
      const roleTitle = form.roleTitle;
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      crudToast.updated(roleTitle);
    },
    onError: (error) => crudToast.failed("update", error)
  });
  const deleteApplication = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/v1/applications/${id}`),
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      crudToast.deleted();
    },
    onError: (error) => crudToast.failed("delete", error)
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (editingId) updateApplication.mutate();
    else createApplication.mutate();
  }

  function editApplication(application: Application) {
    setEditingId(application.id);
    setForm({
      companyId: application.companyId,
      roleTitle: application.roleTitle,
      jobUrl: application.jobUrl ?? "",
      source: application.source ?? "",
      stage: application.stage,
      compensationMin: application.compensationMin ? String(application.compensationMin) : "",
      compensationMax: application.compensationMax ? String(application.compensationMax) : "",
      remoteMode: application.remoteMode,
      priority: application.priority,
      confidence: application.confidence ? String(application.confidence) : "",
      concerns: application.concerns ?? "",
      nextAction: application.nextAction ?? "",
      nextActionAt: toDatetimeLocal(application.nextActionAt),
      notes: application.notes ?? ""
    });
  }

  return (
    <>
      <PageHeader title="Applications" eyebrow="New and existing processes" />
      <CrudLayout
        main={<Panel title="Application Pipeline">
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
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="bg-white text-ink hover:bg-paper" onClick={() => editApplication(application)} type="button">Edit</button>
                  <ConfirmDelete onConfirm={() => deleteApplication.mutate(application.id)} disabled={deleteApplication.isPending} />
                </div>
              </article>
            ))}
          </div>
        </Panel>}
        sidebar={<Panel title={editingId ? "Edit Application" : "Create Or Import Process"}>
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
            <FormActions
              createLabel="Save Application"
              isEditing={Boolean(editingId)}
              onCancel={resetForm}
              pending={createApplication.isPending || updateApplication.isPending}
            />
          </form>
        </Panel>}
      />
    </>
  );
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}
