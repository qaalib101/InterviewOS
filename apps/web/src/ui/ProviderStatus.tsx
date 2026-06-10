import type { AiProviderStatus } from "@interview-os/shared";

export function ProviderStatus({ status }: { status?: AiProviderStatus }) {
  if (!status) return <p className="text-sm text-steel">Checking AI provider...</p>;

  return (
    <div className={`rounded-md border p-3 text-sm ${status.available ? "border-line bg-paper" : "border-rust/40 bg-rust/10"}`}>
      <p className="font-medium">Provider: {status.provider}</p>
      <p className={status.available ? "text-steel" : "text-rust"}>{status.message}</p>
    </div>
  );
}
