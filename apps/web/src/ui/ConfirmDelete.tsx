import { useState } from "react";
import { LoadingButton } from "./LoadingButton";

type ConfirmDeleteProps = {
  label?: string;
  onConfirm: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function ConfirmDelete({ label = "Delete", onConfirm, disabled, loading }: ConfirmDeleteProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <LoadingButton className="bg-rust hover:bg-rust/80" disabled={disabled} loading={loading} loadingLabel="Deleting..." onClick={onConfirm} type="button">
          Confirm
        </LoadingButton>
        <button className="bg-white text-ink hover:bg-paper" disabled={disabled || loading} onClick={() => setConfirming(false)} type="button">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button className="bg-white text-rust hover:bg-paper" disabled={disabled || loading} onClick={() => setConfirming(true)} type="button">
      {label}
    </button>
  );
}
