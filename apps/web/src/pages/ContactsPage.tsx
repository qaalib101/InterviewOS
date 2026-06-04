import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { Field, PageHeader, Panel } from "../ui/Primitives";

type Company = { id: string; name: string };
type Application = { id: string; roleTitle: string; company?: Company };
type Contact = {
  id: string;
  name: string;
  role?: string | null;
  email?: string | null;
  company?: Company | null;
  application?: Application | null;
  notes?: string | null;
};

const initialForm = {
  companyId: "",
  applicationId: "",
  name: "",
  role: "",
  email: "",
  phone: "",
  linkedinUrl: "",
  notes: ""
};

export function ContactsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => apiGet<Company[]>("/api/v1/companies") });
  const { data: applications = [] } = useQuery({ queryKey: ["applications"], queryFn: () => apiGet<Application[]>("/api/v1/applications") });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => apiGet<Contact[]>("/api/v1/contacts") });
  const createContact = useMutation({
    mutationFn: () =>
      apiPost<Contact>("/api/v1/contacts", {
        ...form,
        companyId: form.companyId || null,
        applicationId: form.applicationId || null
      }),
    onSuccess: () => {
      setForm(initialForm);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    }
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    createContact.mutate();
  }

  return (
    <>
      <PageHeader title="Contacts" eyebrow="Recruiters and hiring contacts" />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Panel title="Contact Profiles">
          <div className="space-y-3">
            {contacts.map((contact) => (
              <article key={contact.id} className="rounded-md border border-line bg-paper p-4">
                <p className="font-medium">{contact.name}</p>
                <p className="text-sm text-steel">{contact.role || "No role"} · {contact.company?.name || "No company"}</p>
                <p className="text-sm">{contact.email || "No email recorded"}</p>
                {contact.application ? <p className="mt-2 text-sm">Linked to: {contact.application.roleTitle}</p> : null}
                {contact.notes ? <p className="mt-2 text-sm text-steel">{contact.notes}</p> : null}
              </article>
            ))}
          </div>
        </Panel>
        <Panel title="Create Contact">
          <form className="grid gap-3" onSubmit={submit}>
            <Field label="Name"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Role"><input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} /></Field>
            <Field label="Email"><input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
            <Field label="Phone"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
            <Field label="LinkedIn URL"><input value={form.linkedinUrl} onChange={(event) => setForm({ ...form, linkedinUrl: event.target.value })} /></Field>
            <Field label="Company">
              <select value={form.companyId} onChange={(event) => setForm({ ...form, companyId: event.target.value })}>
                <option value="">No company</option>
                {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
              </select>
            </Field>
            <Field label="Application">
              <select value={form.applicationId} onChange={(event) => setForm({ ...form, applicationId: event.target.value })}>
                <option value="">No application</option>
                {applications.map((application) => (
                  <option key={application.id} value={application.id}>{application.company?.name} · {application.roleTitle}</option>
                ))}
              </select>
            </Field>
            <Field label="Notes"><textarea rows={4} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            <button disabled={createContact.isPending}>Create Contact</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
