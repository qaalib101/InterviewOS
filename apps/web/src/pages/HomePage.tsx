import { projectMeta } from "@interview-os/shared";
import { Link } from "react-router-dom";
import { PageHeader, Panel } from "../ui/Primitives";

export function HomePage() {
  return (
    <>
      <PageHeader title={projectMeta.name} eyebrow="Milestone 2" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Current Scope">
          <p className="text-sm text-steel">Core CRM, interview rounds, notes, and follow-ups are active.</p>
        </Panel>
        <Panel title="Primary Workflow">
          <p className="text-sm text-steel">Create a company, add an application, then link people and conversations to that process.</p>
        </Panel>
        <Panel title="Next Milestone">
          <p className="text-sm text-steel">Dashboard and activity views will be added after Milestone 4 is complete and approved.</p>
        </Panel>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white" to="/companies">Companies</Link>
        <Link className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white" to="/applications">Applications</Link>
        <Link className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white" to="/contacts">Contacts</Link>
        <Link className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white" to="/interviews">Interviews</Link>
        <Link className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white" to="/follow-ups">Follow-Ups</Link>
      </div>
    </>
  );
}
