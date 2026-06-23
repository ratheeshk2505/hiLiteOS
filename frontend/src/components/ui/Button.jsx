export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base',
  };

  const variants = {
    primary: 'bg-ink text-paper hover:bg-ink-soft',
    secondary: 'bg-paper-raised text-ink border border-line hover:bg-paper',
    danger: 'bg-ember text-white hover:bg-ember/90',
    ghost: 'text-ink hover:bg-line/60',
  };

  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
