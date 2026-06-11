import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/api";
import { ConfirmDelete } from "../ui/ConfirmDelete";
import { FormActions } from "../ui/FormActions";
import { CrudLayout, Field, PageHeader, Panel } from "../ui/Primitives";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => apiGet<Company[]>("/api/v1/companies") });
  const resetForm = () => {
    setForm({ name: "", website: "", industry: "", location: "", notes: "" });
    setEditingId(null);
  };
  const createCompany = useMutation({
    mutationFn: () => apiPost<Company>("/api/v1/companies", form),
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    }
  });
  const updateCompany = useMutation({
    mutationFn: () => apiPatch<Company>(`/api/v1/companies/${editingId}`, form),
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
    }
  });
  const deleteCompany = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/v1/companies/${id}`),
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
    }
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (editingId) updateCompany.mutate();
    else createCompany.mutate();
  }

  function editCompany(company: Company) {
    setEditingId(company.id);
    setForm({
      name: company.name,
      website: company.website ?? "",
      industry: company.industry ?? "",
      location: company.location ?? "",
      notes: company.notes ?? ""
    });
  }

  return (
    <>
      <PageHeader title="Companies" eyebrow="Core CRM" />
      <CrudLayout
        sidebarWidth="380px"
        main={<Panel title="Company Profiles">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-widest text-steel">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Industry</th>
                  <th className="py-2 pr-4">Location</th>
                  <th className="py-2 pr-4">Pipeline</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="border-b border-line last:border-0">
                    <td className="py-3 pr-4 font-medium">{company.name}</td>
                    <td className="py-3 pr-4">{company.industry}</td>
                    <td className="py-3 pr-4">{company.location}</td>
                    <td className="py-3 pr-4">{company._count?.applications ?? 0} applications · {company._count?.contacts ?? 0} contacts</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <button className="bg-white text-ink hover:bg-paper" onClick={() => editCompany(company)} type="button">Edit</button>
                        <ConfirmDelete onConfirm={() => deleteCompany.mutate(company.id)} disabled={deleteCompany.isPending} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>}
        sidebar={<Panel title={editingId ? "Edit Company" : "Create Company"}>
          <form className="grid gap-3" onSubmit={submit}>
            <Field label="Name"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Website"><input value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></Field>
            <Field label="Industry"><input value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} /></Field>
            <Field label="Location"><input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></Field>
            <Field label="Notes"><textarea rows={4} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            <FormActions
              createLabel="Create Company"
              isEditing={Boolean(editingId)}
              onCancel={resetForm}
              pending={createCompany.isPending || updateCompany.isPending}
            />
          </form>
        </Panel>}
      />
    </>
  );
}
