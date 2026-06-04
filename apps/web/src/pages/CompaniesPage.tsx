import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { Field, PageHeader, Panel } from "../ui/Primitives";

type Company = {
  id: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  location?: string | null;
  notes?: string | null;
  _count?: { applications: number; contacts: number };
};

export function CompaniesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", website: "", industry: "", location: "", notes: "" });
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => apiGet<Company[]>("/api/v1/companies") });
  const createCompany = useMutation({
    mutationFn: () => apiPost<Company>("/api/v1/companies", form),
    onSuccess: () => {
      setForm({ name: "", website: "", industry: "", location: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    }
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    createCompany.mutate();
  }

  return (
    <>
      <PageHeader title="Companies" eyebrow="Core CRM" />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Panel title="Company Profiles">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-widest text-steel">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Industry</th>
                  <th className="py-2 pr-4">Location</th>
                  <th className="py-2 pr-4">Pipeline</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="border-b border-line last:border-0">
                    <td className="py-3 pr-4 font-medium">{company.name}</td>
                    <td className="py-3 pr-4">{company.industry}</td>
                    <td className="py-3 pr-4">{company.location}</td>
                    <td className="py-3 pr-4">{company._count?.applications ?? 0} applications · {company._count?.contacts ?? 0} contacts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Create Company">
          <form className="grid gap-3" onSubmit={submit}>
            <Field label="Name"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Website"><input value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></Field>
            <Field label="Industry"><input value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} /></Field>
            <Field label="Location"><input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></Field>
            <Field label="Notes"><textarea rows={4} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            <button disabled={createCompany.isPending}>Create Company</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
