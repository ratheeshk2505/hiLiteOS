export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', tone = 'default', onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-paper-raised p-6 shadow-xl">
        <h3 className="font-display text-lg text-ink">{title}</h3>
        <p className="mt-2 text-sm text-slate">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={
              'rounded-lg px-4 py-2 text-sm font-medium text-white ' +
              (tone === 'danger' ? 'bg-ember hover:bg-ember/90' : 'bg-ink hover:bg-ink-soft')
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
