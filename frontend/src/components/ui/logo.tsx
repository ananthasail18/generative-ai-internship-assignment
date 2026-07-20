import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-sm">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className="text-lg font-semibold tracking-tight text-foreground">
        CourseForge<span className="text-primary">.ai</span>
      </span>
    </Link>
  );
}
