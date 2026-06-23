export function StatusBadge({ status }) {
  const isActive = status === 'active';
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ' +
        (isActive ? 'bg-verdant-soft text-verdant' : 'bg-ember-soft text-ember')
      }
    >
      <span className={'h-1.5 w-1.5 rounded-full ' + (isActive ? 'bg-verdant' : 'bg-ember')} />
      {isActive ? 'Active' : 'Suspended'}
    </span>
  );
}
