export function Toggle({ checked, onChange, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ' +
        (checked ? 'bg-verdant' : 'bg-slate-light')
      }
    >
      <span
        className={
          'inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ' +
          (checked ? 'translate-x-6' : 'translate-x-1')
        }
      />
    </button>
  );
}
