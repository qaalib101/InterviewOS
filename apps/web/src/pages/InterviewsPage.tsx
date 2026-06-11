import { interviewFormats, interviewNoteTypes, interviewOutcomes, interviewTypes } from "@interview-os/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/api";
import { formatDate, label } from "../lib/format";
import { ConfirmDelete } from "../ui/ConfirmDelete";
import { FormActions } from "../ui/FormActions";
import { CrudLayout, Field, PageHeader, Panel } from "../ui/Primitives";
import { useCrudToast } from "../ui/Toast";

type Application = {
  id: string;
  roleTitle: string;
  company?: { name: string };
};

type InterviewNote = {
  id: string;
  type: string;
  body: string;
  createdAt: string;
};

type Interview = {
  id: string;
  applicationId: string;
  application?: Application;
  roundName: string;
  roundNumber: number;
  type: string;
  format: string;
  scheduledAt: string;
  durationMinutes: number;
  interviewers?: string | null;
  expectedTopics?: string | null;
  prepNotes?: string | null;
  rawPostInterviewNotes?: string | null;
  outcome: string;
  notes?: InterviewNote[];
};

const initialInterviewForm = {
  applicationId: "",
  roundName: "",
  roundNumber: "1",
  type: "TECHNICAL",
  format: "VIDEO",
  scheduledAt: "",
  durationMinutes: "60",
  interviewers: "",
  expectedTopics: "",
  prepNotes: "",
  rawPostInterviewNotes: "",
  outcome: "SCHEDULED"
};

const initialNoteForm = {
  interviewId: "",
  type: "PREP",
  body: ""
};

export function InterviewsPage() {
  const queryClient = useQueryClient();
  const interviewToast = useCrudToast("Interview");
  const noteToast = useCrudToast("Interview note");
  const [interviewForm, setInterviewForm] = useState(initialInterviewForm);
  const [noteForm, setNoteForm] = useState(initialNoteForm);
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const { data: applications = [] } = useQuery({ queryKey: ["applications"], queryFn: () => apiGet<Application[]>("/api/v1/applications") });
  const { data: interviews = [] } = useQuery({ queryKey: ["interviews"], queryFn: () => apiGet<Interview[]>("/api/v1/interviews") });
  const interviewPayload = () => ({
    ...interviewForm,
    roundNumber: Number(interviewForm.roundNumber),
    durationMinutes: Number(interviewForm.durationMinutes),
    scheduledAt: interviewForm.scheduledAt
  });
  const resetInterviewForm = () => {
    setInterviewForm(initialInterviewForm);
    setEditingInterviewId(null);
  };
  const resetNoteForm = () => {
    setNoteForm(initialNoteForm);
    setEditingNoteId(null);
  };

  const createInterview = useMutation({
    mutationFn: () => apiPost<Interview>("/api/v1/interviews", interviewPayload()),
    onSuccess: () => {
      const roundName = interviewForm.roundName;
      resetInterviewForm();
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      interviewToast.created(roundName);
    },
    onError: (error) => interviewToast.failed("create", error)
  });
  const updateInterview = useMutation({
    mutationFn: () => apiPatch<Interview>(`/api/v1/interviews/${editingInterviewId}`, interviewPayload()),
    onSuccess: () => {
      const roundName = interviewForm.roundName;
      resetInterviewForm();
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      interviewToast.updated(roundName);
    },
    onError: (error) => interviewToast.failed("update", error)
  });
  const deleteInterview = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/v1/interviews/${id}`),
    onSuccess: () => {
      resetInterviewForm();
      resetNoteForm();
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      interviewToast.deleted();
    },
    onError: (error) => interviewToast.failed("delete", error)
  });

  const createNote = useMutation({
    mutationFn: () =>
      apiPost<InterviewNote>(`/api/v1/interviews/${noteForm.interviewId}/notes`, {
        type: noteForm.type,
        body: noteForm.body
      }),
    onSuccess: () => {
      resetNoteForm();
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      noteToast.created();
    },
    onError: (error) => noteToast.failed("create", error)
  });
  const updateNote = useMutation({
    mutationFn: () =>
      apiPatch<InterviewNote>(`/api/v1/interview-notes/${editingNoteId}`, {
        type: noteForm.type,
        body: noteForm.body
      }),
    onSuccess: () => {
      resetNoteForm();
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      noteToast.updated();
    },
    onError: (error) => noteToast.failed("update", error)
  });
  const deleteNote = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/v1/interview-notes/${id}`),
    onSuccess: () => {
      resetNoteForm();
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      noteToast.deleted();
    },
    onError: (error) => noteToast.failed("delete", error)
  });

  function submitInterview(event: FormEvent) {
    event.preventDefault();
    if (editingInterviewId) updateInterview.mutate();
    else createInterview.mutate();
  }

  function submitNote(event: FormEvent) {
    event.preventDefault();
    if (editingNoteId) updateNote.mutate();
    else createNote.mutate();
  }

  function editInterview(interview: Interview) {
    setEditingInterviewId(interview.id);
    setInterviewForm({
      applicationId: interview.applicationId,
      roundName: interview.roundName,
      roundNumber: String(interview.roundNumber),
      type: interview.type,
      format: interview.format,
      scheduledAt: toDatetimeLocal(interview.scheduledAt),
      durationMinutes: String(interview.durationMinutes),
      interviewers: interview.interviewers ?? "",
      expectedTopics: interview.expectedTopics ?? "",
      prepNotes: interview.prepNotes ?? "",
      rawPostInterviewNotes: interview.rawPostInterviewNotes ?? "",
      outcome: interview.outcome
    });
  }

  function editNote(interviewId: string, note: InterviewNote) {
    setEditingNoteId(note.id);
    setNoteForm({
      interviewId,
      type: note.type,
      body: note.body
    });
  }

  return (
    <>
      <PageHeader title="Interviews" eyebrow="Rounds and notes" />
      <CrudLayout
        main={<Panel title="Interview Rounds">
          <div className="space-y-3">
            {interviews.map((interview) => (
              <article key={interview.id} className="rounded-md border border-line bg-paper p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{interview.roundName}</p>
                    <p className="text-sm text-steel">
                      Round {interview.roundNumber} · {interview.application?.company?.name} · {interview.application?.roleTitle}
                    </p>
                  </div>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-rust">{label(interview.outcome)}</span>
                </div>
                <p className="mt-3 text-sm">
                  {label(interview.type)} · {label(interview.format)} · {interview.durationMinutes} min · {formatDate(interview.scheduledAt)}
                </p>
                {interview.interviewers ? <p className="mt-2 text-sm">Interviewers: {interview.interviewers}</p> : null}
                {interview.expectedTopics ? <p className="mt-2 text-sm text-steel">Expected: {interview.expectedTopics}</p> : null}
                {interview.prepNotes ? <p className="mt-2 text-sm text-steel">Prep: {interview.prepNotes}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="bg-white text-ink hover:bg-paper" onClick={() => editInterview(interview)} type="button">Edit</button>
                  <ConfirmDelete onConfirm={() => deleteInterview.mutate(interview.id)} disabled={deleteInterview.isPending} />
                </div>
                {interview.notes?.length ? (
                  <div className="mt-4 space-y-2">
                    {interview.notes.map((note) => (
                      <div key={note.id} className="rounded-md bg-white p-3 text-sm">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-semibold">{label(note.type)}</p>
                          <div className="flex flex-wrap gap-2">
                            <button className="bg-paper text-ink hover:bg-line" onClick={() => editNote(interview.id, note)} type="button">Edit</button>
                            <ConfirmDelete onConfirm={() => deleteNote.mutate(note.id)} disabled={deleteNote.isPending} />
                          </div>
                        </div>
                        <p className="mt-1 text-steel">{note.body}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </Panel>}
        sidebar={<div className="space-y-4">
          <Panel title={editingInterviewId ? "Edit Interview Round" : "Create Interview Round"}>
            <form className="grid gap-3" onSubmit={submitInterview}>
              <Field label="Application">
                <select required value={interviewForm.applicationId} onChange={(event) => setInterviewForm({ ...interviewForm, applicationId: event.target.value })}>
                  <option value="">Select application</option>
                  {applications.map((application) => (
                    <option key={application.id} value={application.id}>
                      {application.company?.name} · {application.roleTitle}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Round Name"><input required value={interviewForm.roundName} onChange={(event) => setInterviewForm({ ...interviewForm, roundName: event.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Round Number"><input min="1" required type="number" value={interviewForm.roundNumber} onChange={(event) => setInterviewForm({ ...interviewForm, roundNumber: event.target.value })} /></Field>
                <Field label="Duration"><input min="1" required type="number" value={interviewForm.durationMinutes} onChange={(event) => setInterviewForm({ ...interviewForm, durationMinutes: event.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <select value={interviewForm.type} onChange={(event) => setInterviewForm({ ...interviewForm, type: event.target.value })}>
                    {interviewTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}
                  </select>
                </Field>
                <Field label="Format">
                  <select value={interviewForm.format} onChange={(event) => setInterviewForm({ ...interviewForm, format: event.target.value })}>
                    {interviewFormats.map((format) => <option key={format} value={format}>{label(format)}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Scheduled Time"><input required type="datetime-local" value={interviewForm.scheduledAt} onChange={(event) => setInterviewForm({ ...interviewForm, scheduledAt: event.target.value })} /></Field>
              <Field label="Outcome">
                <select value={interviewForm.outcome} onChange={(event) => setInterviewForm({ ...interviewForm, outcome: event.target.value })}>
                  {interviewOutcomes.map((outcome) => <option key={outcome} value={outcome}>{label(outcome)}</option>)}
                </select>
              </Field>
              <Field label="Interviewers"><input value={interviewForm.interviewers} onChange={(event) => setInterviewForm({ ...interviewForm, interviewers: event.target.value })} /></Field>
              <Field label="Expected Topics"><textarea rows={3} value={interviewForm.expectedTopics} onChange={(event) => setInterviewForm({ ...interviewForm, expectedTopics: event.target.value })} /></Field>
              <Field label="Prep Notes"><textarea rows={3} value={interviewForm.prepNotes} onChange={(event) => setInterviewForm({ ...interviewForm, prepNotes: event.target.value })} /></Field>
              <Field label="Raw Post-Interview Notes"><textarea rows={3} value={interviewForm.rawPostInterviewNotes} onChange={(event) => setInterviewForm({ ...interviewForm, rawPostInterviewNotes: event.target.value })} /></Field>
              <FormActions
                createLabel="Create Interview"
                isEditing={Boolean(editingInterviewId)}
                onCancel={resetInterviewForm}
                pending={createInterview.isPending || updateInterview.isPending}
              />
            </form>
          </Panel>
          <Panel title={editingNoteId ? "Edit Interview Note" : "Add Interview Note"}>
            <form className="grid gap-3" onSubmit={submitNote}>
              <Field label="Interview">
                <select required disabled={Boolean(editingNoteId)} value={noteForm.interviewId} onChange={(event) => setNoteForm({ ...noteForm, interviewId: event.target.value })}>
                  <option value="">Select interview</option>
                  {interviews.map((interview) => (
                    <option key={interview.id} value={interview.id}>
                      {interview.application?.company?.name} · {interview.roundName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Note Type">
                <select value={noteForm.type} onChange={(event) => setNoteForm({ ...noteForm, type: event.target.value })}>
                  {interviewNoteTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}
                </select>
              </Field>
              <Field label="Body"><textarea required rows={5} value={noteForm.body} onChange={(event) => setNoteForm({ ...noteForm, body: event.target.value })} /></Field>
              <FormActions
                createLabel="Add Note"
                isEditing={Boolean(editingNoteId)}
                onCancel={resetNoteForm}
                pending={createNote.isPending || updateNote.isPending}
              />
            </form>
          </Panel>
        </div>}
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
