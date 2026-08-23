import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Alert({
  tone = "error",
  children,
  className,
}: {
  tone?: "error" | "success" | "info";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-accent-200 bg-accent-50 text-accent-700",
  } as const;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        tones[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
