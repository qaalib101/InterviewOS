import type { ImportProposal } from "@interview-os/shared";
import { label } from "../lib/format";
import { Field } from "./Primitives";

export function ImportProposalCard({ proposal, onChange }: { proposal: ImportProposal; onChange: (proposal: ImportProposal) => void }) {
  const fieldsText = JSON.stringify(proposal.proposedFields, null, 2);

  function updateFields(value: string) {
    try {
      onChange({ ...proposal, proposedFields: JSON.parse(value) });
    } catch {
      onChange({ ...proposal, warnings: [...new Set([...proposal.warnings, "Proposed fields JSON is invalid."])] });
    }
  }

  return (
    <article className="rounded-md border border-line bg-paper p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{label(proposal.entityType)}</p>
          <p className="text-sm text-steel">Confidence {Math.round(proposal.confidence * 100)}%{proposal.matchReason ? ` · ${proposal.matchReason}` : ""}</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input checked={proposal.included} className="h-4 w-4" type="checkbox" onChange={(event) => onChange({ ...proposal, included: event.target.checked })} />
          Include
        </label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="Operation">
          <select value={proposal.operation} onChange={(event) => onChange({ ...proposal, operation: event.target.value as ImportProposal["operation"] })}>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="SKIP">Skip</option>
          </select>
        </Field>
        <Field label="Existing Entity ID">
          <input value={proposal.existingEntityId ?? ""} onChange={(event) => onChange({ ...proposal, existingEntityId: event.target.value || null })} placeholder="Required for updates unless matched" />
        </Field>
      </div>

      <div className="mt-3">
        <Field label="Proposed Fields JSON">
          <textarea rows={9} defaultValue={fieldsText} onBlur={(event) => updateFields(event.target.value)} />
        </Field>
      </div>

      {proposal.missingFields.length ? <p className="mt-3 text-sm text-rust">Missing: {proposal.missingFields.join(", ")}</p> : null}
      {proposal.warnings.length ? (
        <ul className="mt-2 space-y-1 text-sm text-rust">
          {proposal.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      ) : null}
    </article>
  );
}
