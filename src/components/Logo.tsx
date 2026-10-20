export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-xl font-semibold ${className}`}>
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <rect width="28" height="28" rx="7" fill="#0B6E4F" />
        <path d="M7 20V9l7 8 7-8v11" fill="none" stroke="#F6F2E9" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Meu Controle
    </span>
  );
}
