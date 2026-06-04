import type { ReactNode } from "react";

export function PageHeader({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <header className="mb-6">
      {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-rust">{eyebrow}</p> : null}
      <h1 className="font-display text-4xl text-ink">{title}</h1>
    </header>
  );
}

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-line bg-white/85 p-4 shadow-sm">
      {title ? <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-steel">{title}</h2> : null}
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
