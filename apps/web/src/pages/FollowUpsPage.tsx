import { followUpTypes, priorities } from "@interview-os/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/api";
import { formatDate, label } from "../lib/format";
import { ConfirmDelete } from "../ui/ConfirmDelete";
import { FormActions } from "../ui/FormActions";
import { LoadingButton } from "../ui/LoadingButton";
import { CrudLayout, Field, PageHeader, Panel } from "../ui/Primitives";
import { useCrudToast } from "../ui/Toast";

type Application = { id: string; roleTitle: string; company?: { name: string } };
type Contact = { id: string; name: string; company?: { name: string } | null };
type Interview = { id: string; roundName: string; application?: Application };
type FollowUp = {
  id: string;
  applicationId?: string | null;
  contactId?: string | null;
  interviewId?: string | null;
  application?: Application | null;
  contact?: Contact | null;
  interview?: Interview | null;
  title: string;
  dueAt: string;
  completedAt?: string | null;
  priority: string;
  type: string;
  notes?: string | null;
};

const initialForm = {
  applicationId: "",
  contactId: "",
  interviewId: "",
  title: "",
  dueAt: "",
  priority: "MEDIUM",
  type: "EMAIL",
  notes: ""
};

export function FollowUpsPage() {
  const queryClient = useQueryClient();
  const crudToast = useCrudToast("Follow-up");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { data: applications = [] } = useQuery({ queryKey: ["applications"], queryFn: () => apiGet<Application[]>("/api/v1/applications") });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => apiGet<Contact[]>("/api/v1/contacts") });
  const { data: interviews = [] } = useQuery({ queryKey: ["interviews"], queryFn: () => apiGet<Interview[]>("/api/v1/interviews") });
  const { data: followUps = [] } = useQuery({ queryKey: ["follow-ups"], queryFn: () => apiGet<FollowUp[]>("/api/v1/follow-ups") });

  const openFollowUps = followUps.filter((followUp) => !followUp.completedAt);
  const completedFollowUps = followUps.filter((followUp) => followUp.completedAt);
  const payload = () => ({
    ...form,
    applicationId: form.applicationId || null,
    contactId: form.contactId || null,
    interviewId: form.interviewId || null
  });
  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["follow-ups"] });

  const createFollowUp = useMutation({
    mutationFn: () => apiPost<FollowUp>("/api/v1/follow-ups", payload()),
    onSuccess: () => {
      const title = form.title;
      resetForm();
      invalidate();
      crudToast.created(title);
    },
    onError: (error) => crudToast.failed("create", error)
  });
  const updateFollowUp = useMutation({
    mutationFn: () => apiPatch<FollowUp>(`/api/v1/follow-ups/${editingId}`, payload()),
    onSuccess: () => {
      const title = form.title;
      resetForm();
      invalidate();
      crudToast.updated(title);
    },
    onError: (error) => crudToast.failed("update", error)
  });
  const deleteFollowUp = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/v1/follow-ups/${id}`),
    onSuccess: () => {
      resetForm();
      invalidate();
      crudToast.deleted();
    },
    onError: (error) => crudToast.failed("delete", error)
  });
  const completeFollowUp = useMutation({
    mutationFn: (id: string) => apiPatch<FollowUp>(`/api/v1/follow-ups/${id}/complete`, {}),
    onSuccess: (followUp) => {
      invalidate();
      crudToast.completed(followUp.title);
    },
    onError: (error) => crudToast.failed("complete", error)
  });
  const reopenFollowUp = useMutation({
    mutationFn: (id: string) => apiPatch<FollowUp>(`/api/v1/follow-ups/${id}/reopen`, {}),
    onSuccess: (followUp) => {
      invalidate();
      crudToast.reopened(followUp.title);
    },
    onError: (error) => crudToast.failed("reopen", error)
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (editingId) updateFollowUp.mutate();
    else createFollowUp.mutate();
  }

  function editFollowUp(followUp: FollowUp) {
    setEditingId(followUp.id);
    setForm({
      applicationId: followUp.applicationId ?? "",
      contactId: followUp.contactId ?? "",
      interviewId: followUp.interviewId ?? "",
      title: followUp.title,
      dueAt: toDatetimeLocal(followUp.dueAt),
      priority: followUp.priority,
      type: followUp.type,
      notes: followUp.notes ?? ""
    });
  }

  return (
    <>
      <PageHeader title="Follow-Ups" eyebrow="Next actions" />
      <CrudLayout
        main={<div className="space-y-4">
          <FollowUpList
            actionLabel="Complete"
            actionPending={completeFollowUp.isPending}
            emptyLabel="No open follow-ups."
            followUps={openFollowUps}
            onAction={(id) => completeFollowUp.mutate(id)}
            onDelete={(id) => deleteFollowUp.mutate(id)}
            deletePending={deleteFollowUp.isPending}
            onEdit={editFollowUp}
            title="Open Follow-Ups"
          />
          <FollowUpList
            actionLabel="Reopen"
            actionPending={reopenFollowUp.isPending}
            emptyLabel="No completed follow-ups."
            followUps={completedFollowUps}
            onAction={(id) => reopenFollowUp.mutate(id)}
            onDelete={(id) => deleteFollowUp.mutate(id)}
            deletePending={deleteFollowUp.isPending}
            onEdit={editFollowUp}
            title="Completed"
          />
        </div>}
        sidebar={<Panel title={editingId ? "Edit Follow-Up" : "Create Follow-Up"}>
          <form className="grid gap-3" onSubmit={submit}>
            <Field label="Title">
              <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </Field>
            <Field label="Due Date">
              <input required type="datetime-local" value={form.dueAt} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Priority">
                <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                  {priorities.map((priority) => <option key={priority} value={priority}>{label(priority)}</option>)}
                </select>
              </Field>
              <Field label="Type">
                <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                  {followUpTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Application">
              <select value={form.applicationId} onChange={(event) => setForm({ ...form, applicationId: event.target.value })}>
                <option value="">No application</option>
                {applications.map((application) => (
                  <option key={application.id} value={application.id}>{application.company?.name} · {application.roleTitle}</option>
                ))}
              </select>
            </Field>
            <Field label="Contact">
              <select value={form.contactId} onChange={(event) => setForm({ ...form, contactId: event.target.value })}>
                <option value="">No contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>{contact.company?.name ? `${contact.company.name} · ` : ""}{contact.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Interview">
              <select value={form.interviewId} onChange={(event) => setForm({ ...form, interviewId: event.target.value })}>
                <option value="">No interview</option>
                {interviews.map((interview) => (
                  <option key={interview.id} value={interview.id}>{interview.application?.company?.name} · {interview.roundName}</option>
                ))}
              </select>
            </Field>
            <Field label="Notes">
              <textarea rows={4} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </Field>
            <FormActions
              createLabel="Create Follow-Up"
              isEditing={Boolean(editingId)}
              onCancel={resetForm}
              pending={createFollowUp.isPending || updateFollowUp.isPending}
            />
          </form>
        </Panel>}
      />
    </>
  );
}

function FollowUpList({
  actionLabel,
  actionPending,
  deletePending,
  emptyLabel,
  followUps,
  onAction,
  onDelete,
  onEdit,
  title
}: {
  actionLabel: string;
  actionPending?: boolean;
  deletePending?: boolean;
  emptyLabel: string;
  followUps: FollowUp[];
  onAction: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (followUp: FollowUp) => void;
  title: string;
}) {
  return (
    <Panel title={title}>
      <div className="space-y-3">
        {followUps.length ? followUps.map((followUp) => (
          <article key={followUp.id} className="rounded-md border border-line bg-paper p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{followUp.title}</p>
                <p className="text-sm text-steel">{formatDate(followUp.dueAt)} · {label(followUp.priority)} · {label(followUp.type)}</p>
              </div>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-rust">
                {followUp.completedAt ? "Complete" : "Open"}
              </span>
            </div>
            <p className="mt-2 text-sm text-steel">{linkLabel(followUp)}</p>
            {followUp.notes ? <p className="mt-2 text-sm">{followUp.notes}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="bg-white text-ink hover:bg-paper" onClick={() => onEdit(followUp)} type="button">Edit</button>
              <LoadingButton className="bg-white text-ink hover:bg-paper" loading={actionPending} loadingLabel={`${actionLabel}...`} onClick={() => onAction(followUp.id)} type="button">
                {actionLabel}
              </LoadingButton>
              <ConfirmDelete onConfirm={() => onDelete(followUp.id)} loading={deletePending} />
            </div>
          </article>
        )) : <p className="text-sm text-steel">{emptyLabel}</p>}
      </div>
    </Panel>
  );
}

function linkLabel(followUp: FollowUp) {
  const parts = [
    followUp.application ? `${followUp.application.company?.name} · ${followUp.application.roleTitle}` : null,
    followUp.contact ? `Contact: ${followUp.contact.name}` : null,
    followUp.interview ? `Interview: ${followUp.interview.roundName}` : null
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "No linked record";
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}
