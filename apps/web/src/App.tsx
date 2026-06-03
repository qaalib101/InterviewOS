import { projectMeta } from "@interview-os/shared";

export function App() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f7f4ef,#edf1ed)] px-6 py-10 text-ink">
      <section className="mx-auto max-w-3xl rounded-md border border-line bg-white/80 p-8 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-rust">Foundation</p>
        <h1 className="font-display text-4xl">{projectMeta.name}</h1>
        <p className="mt-4 text-lg text-steel">{projectMeta.currentMilestone}</p>
        <div className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-md bg-paper p-4">
            <p className="font-semibold">Web</p>
            <p>React, TypeScript, Vite, Tailwind</p>
          </div>
          <div className="rounded-md bg-paper p-4">
            <p className="font-semibold">API</p>
            <p>Node.js, Express, Prisma, Postgres</p>
          </div>
        </div>
      </section>
    </main>
  );
}
