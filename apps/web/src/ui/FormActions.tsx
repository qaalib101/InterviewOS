import { LoadingButton } from "./LoadingButton";

type FormActionsProps = {
  isEditing: boolean;
  pending?: boolean;
  onCancel?: () => void;
  createLabel: string;
  updateLabel?: string;
};

export function FormActions({ isEditing, pending, onCancel, createLabel, updateLabel = "Save Changes" }: FormActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <LoadingButton loading={pending} loadingLabel={isEditing ? "Saving..." : "Creating..."}>
        {isEditing ? updateLabel : createLabel}
      </LoadingButton>
      {isEditing ? (
        <button className="bg-white text-ink hover:bg-paper" disabled={pending} onClick={onCancel} type="button">
          Cancel Edit
        </button>
      ) : null}
    </div>
  );
}
