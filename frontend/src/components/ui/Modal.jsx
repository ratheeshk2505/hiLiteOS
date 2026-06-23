export function Modal({ open, title, description, onClose, children, maxWidth = 'max-w-md' }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" onClick={onClose}>
      <div
        className={`w-full ${maxWidth} rounded-xl bg-paper-raised p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg text-ink">{title}</h3>
            {description && <p className="mt-1 text-sm text-slate">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-lg p-1 text-slate hover:bg-paper hover:text-ink"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
