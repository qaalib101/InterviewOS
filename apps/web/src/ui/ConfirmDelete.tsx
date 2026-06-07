import { useState } from "react";

type ConfirmDeleteProps = {
  label?: string;
  onConfirm: () => void;
  disabled?: boolean;
};

export function ConfirmDelete({ label = "Delete", onConfirm, disabled }: ConfirmDeleteProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button className="bg-rust hover:bg-rust/80" disabled={disabled} onClick={onConfirm} type="button">
          Confirm
        </button>
        <button className="bg-white text-ink hover:bg-paper" onClick={() => setConfirming(false)} type="button">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button className="bg-white text-rust hover:bg-paper" disabled={disabled} onClick={() => setConfirming(true)} type="button">
      {label}
    </button>
  );
}
