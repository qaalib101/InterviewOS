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
      <button disabled={pending}>{isEditing ? updateLabel : createLabel}</button>
      {isEditing ? (
        <button className="bg-white text-ink hover:bg-paper" onClick={onCancel} type="button">
          Cancel Edit
        </button>
      ) : null}
    </div>
  );
}
