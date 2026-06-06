import { projectMeta } from "@interview-os/shared";
import { Link } from "react-router-dom";
import { PageHeader, Panel } from "../ui/Primitives";

export function HomePage() {
  return (
    <>
      <PageHeader title={projectMeta.name} eyebrow="Milestone 2" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Current Scope">
          <p className="text-sm text-steel">Core CRM and interview rounds are active: companies, applications, contacts, interviews, and notes.</p>
        </Panel>
        <Panel title="Primary Workflow">
          <p className="text-sm text-steel">Create a company, add an application, then link recruiter or hiring contacts to that process.</p>
        </Panel>
        <Panel title="Next Milestone">
          <p className="text-sm text-steel">Follow-ups will be added after Milestone 3 is complete and approved.</p>
        </Panel>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white" to="/companies">Companies</Link>
        <Link className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white" to="/applications">Applications</Link>
        <Link className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white" to="/contacts">Contacts</Link>
        <Link className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white" to="/interviews">Interviews</Link>
      </div>
    </>
  );
}
