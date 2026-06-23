const TONE_CLASSES = {
  default: 'bg-line/60 text-ink',
  verdant: 'bg-verdant-soft text-verdant',
  ember: 'bg-ember-soft text-ember',
  gold: 'bg-gold-soft text-ink',
};

export function Pill({ label, tone = 'default' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone] || TONE_CLASSES.default}`}>
      {label}
    </span>
  );
}
