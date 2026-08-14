import { cn } from "@/lib/utils";

/**
 * The NOW mark: a ring with the hand at twelve and a live indicator — "this
 * minute", drawn once so it stays consistent across the app, favicon and PWA
 * icon.
 */
export function LogoMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="9.5" fill="currentColor" />
      <circle cx="16" cy="16.6" r="7.6" stroke="white" strokeOpacity="0.55" strokeWidth="2.1" />
      <path
        d="M16 16.6V11.4"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M16 16.6h4.1" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="24.4" cy="8.2" r="3.4" fill="white" />
      <circle cx="24.4" cy="8.2" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function Logo({
  className,
  size = 30,
  showWord = true,
  tone = "brand",
}: {
  className?: string;
  size?: number;
  showWord?: boolean;
  tone?: "brand" | "ink" | "white";
}) {
  const markTone =
    tone === "white" ? "text-white" : tone === "ink" ? "text-ink" : "text-brand-500";
  const wordTone = tone === "white" ? "text-white" : "text-ink";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} className={markTone} />
      {showWord && (
        <span
          className={cn("font-extrabold tracking-[-0.055em]", wordTone)}
          style={{ fontSize: size * 0.78, lineHeight: 1 }}
        >
          NOW
        </span>
      )}
    </span>
  );
}
