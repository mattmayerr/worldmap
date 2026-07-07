type IconProps = { className?: string };

export function IconPhone({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 5.5C3 4.12 4.12 3 5.5 3h1.75c.69 0 1.31.42 1.56 1.06l.97 2.43a1.5 1.5 0 01-.35 1.58l-1.1 1.1a12.04 12.04 0 005.49 5.49l1.1-1.1a1.5 1.5 0 011.58-.35l2.43.97c.64.25 1.06.87 1.06 1.56V18.5A1.5 1.5 0 0118.5 20h-.25C10.7 20 4 13.3 4 5.25V5.5z"
      />
    </svg>
  );
}

export function IconChart({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5M4 19h16M8 17V11M12 17V7M16 17v-4" />
    </svg>
  );
}

export function IconSparkles({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.5 3.5l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5zM17 10l.75 1.75L19.5 12.5 17.75 13.25 17 15l-.75-1.75L14.5 12.5l1.75-.75L17 10zM6 14l.5 1.25L7.75 15.5 6.5 16l-.5 1.25L5.5 16l-1.25-.5L5.5 15.25 6 14z"
      />
    </svg>
  );
}

export function IconMic({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" d="M12 3a3 3 0 00-3 3v5a3 3 0 006 0V6a3 3 0 00-3-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 11a6 6 0 0012 0M12 17v4M9 21h6" />
    </svg>
  );
}

export function IconLogout({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H4M11 8l-4 4 4 4M20 4v16" />
    </svg>
  );
}

export function IconCheckCircle({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M12 21a9 9 0 100-18 9 9 0 000 18z" />
    </svg>
  );
}

export function IconTrophy({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M12 17v4M7 4h10v3a5 5 0 01-10 0V4zM5 5H3v1a3 3 0 003 3M19 5h2v1a3 3 0 01-3 3" />
    </svg>
  );
}

export function IconBook({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 5.5A2.5 2.5 0 017.5 3H18v18H7.5A2.5 2.5 0 005 18.5V5.5zM5 5.5A2.5 2.5 0 007.5 3H18M9 7h6M9 11h6"
      />
    </svg>
  );
}
