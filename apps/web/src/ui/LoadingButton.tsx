import type { ButtonHTMLAttributes, ReactNode } from "react";

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: ReactNode;
};

export function LoadingButton({ children, disabled, loading, loadingLabel, className = "", ...props }: LoadingButtonProps) {
  return (
    <button className={className} disabled={disabled || loading} {...props}>
      <span className="inline-flex items-center gap-2">
        {loading ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> : null}
        {loading ? loadingLabel ?? "Working..." : children}
      </span>
    </button>
  );
}
