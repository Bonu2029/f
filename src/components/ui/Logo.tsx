/**
 * Wordmark. Typographic rather than illustrative — a monogram rule, the name
 * in the display serif, and the descriptor letterspaced beneath it.
 */
export default function Logo({
  className = "",
  size = "md",
  showDescriptor = true,
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "hero";
  showDescriptor?: boolean;
}) {
  const scale = {
    sm: "text-[1.0625rem]",
    md: "text-[1.375rem]",
    lg: "text-[2rem]",
    hero: "text-[clamp(1.75rem,4.4vw,3.5rem)]",
  }[size];

  const descriptor = {
    sm: "text-[0.4375rem]",
    md: "text-[0.5rem]",
    lg: "text-[0.625rem]",
    hero: "text-[clamp(0.5rem,0.85vw,0.75rem)]",
  }[size];

  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`}>
      <span
        className={`font-display ${scale} tracking-[0.14em] text-graphite`}
        style={{ fontWeight: 400 }}
      >
        MASSIEL
      </span>
      {showDescriptor && (
        <span className="mt-[0.42em] flex w-full items-center gap-[0.5em]">
          <span className="h-px flex-1 bg-copper/45" />
          <span
            className={`font-sans ${descriptor} font-medium tracking-[0.42em] whitespace-nowrap text-copper`}
          >
            BEAUTY SALON
          </span>
          <span className="h-px flex-1 bg-copper/45" />
        </span>
      )}
    </span>
  );
}
