/** An empty plate with a fork and spoon: decorative, drawn in theme colours. */
export function EmptyPlate() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true" className="h-20 w-32">
      <rect x="10" y="14" width="5" height="52" rx="2.5" className="fill-muted-foreground/40" />
      <rect x="8" y="14" width="2" height="16" rx="1" className="fill-muted-foreground/40" />
      <rect x="15" y="14" width="2" height="16" rx="1" className="fill-muted-foreground/40" />
      <circle cx="60" cy="40" r="30" className="fill-muted" />
      <circle cx="60" cy="40" r="21" fill="none" strokeWidth="2" className="stroke-border" />
      <path
        d="M48 36c4-6 20-6 24 0"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="stroke-primary/70"
      />
      <ellipse cx="108" cy="24" rx="5" ry="8" className="fill-muted-foreground/40" />
      <rect x="106" y="30" width="4" height="36" rx="2" className="fill-muted-foreground/40" />
    </svg>
  );
}
