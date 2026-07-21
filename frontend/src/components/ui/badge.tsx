import * as React from "react";

import { cn } from "@/lib/utils";

type Variant = "default" | "primary" | "accent" | "outline" | "success";

const styles: Record<Variant, string> = {
  default: "bg-secondary text-secondary-foreground",
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  outline: "border border-border bg-background text-foreground",
  success: "bg-emerald-100 text-emerald-700",
};

export function Badge({
  className,
  variant = "default",
  children,
}: {
  className?: string;
  variant?: Variant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
