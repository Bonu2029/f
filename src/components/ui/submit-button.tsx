"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** Submit button that disables itself and shows a pending label. */
export function SubmitButton({
  children,
  pendingLabel,
  fullWidth = true,
  size = "lg",
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size={size}
      variant={variant}
      fullWidth={fullWidth}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (pendingLabel ?? "Working…") : children}
    </Button>
  );
}
