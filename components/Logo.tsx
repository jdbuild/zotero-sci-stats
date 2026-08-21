export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="7" fill="#dc2f36" />
      <path
        d="M9 22V14M16 22V9M23 22V17"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="11" r="1.6" fill="white" />
      <circle cx="16" cy="6" r="1.6" fill="white" />
      <circle cx="23" cy="14" r="1.6" fill="white" />
    </svg>
  );
}
