"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { PageLoader } from "@/components/ui/spinner";

export function AuthGuard({
  children,
  redirectIfAuthed = "/dashboard",
}: {
  children: React.ReactNode;
  redirectIfAuthed?: string;
}) {
  const { loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(redirectIfAuthed);
    }
  }, [loading, isAuthenticated, redirectIfAuthed, router]);

  if (loading || isAuthenticated) return <PageLoader />;
  return <>{children}</>;
}
