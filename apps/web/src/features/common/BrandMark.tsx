import { clsx as cx } from 'clsx';

/** A plate with a bite taken out — inline so the shell needs no image request. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cx('shrink-0', className ?? 'size-8')}>
      <defs>
        <mask id="brand-bite">
          <rect width="32" height="32" fill="white" />
          <circle cx="27.5" cy="6.5" r="6" fill="black" />
        </mask>
      </defs>
      <g mask="url(#brand-bite)">
        <circle cx="16" cy="16" r="14" className="fill-primary" />
        <circle
          cx="16"
          cy="16"
          r="8.5"
          fill="none"
          strokeWidth="2"
          className="stroke-primary-foreground/35"
        />
      </g>
      <circle cx="16" cy="16" r="3" className="fill-primary-foreground" />
    </svg>
  );
}
