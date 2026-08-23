type Props = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

export default function Button({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      // Without this the editor blurs on mousedown and the selection collapses
      // before the click handler ever runs.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={[
        'inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-sm px-2',
        'text-sm transition-colors duration-200 ease-[--ease-smooth]',
        'focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none',
        disabled
          ? 'cursor-not-allowed text-muted/45 line-through decoration-1'
          : active
            ? 'bg-accent-soft text-accent'
            : 'text-ink hover:bg-accent-soft active:bg-line/60',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
