"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { DashboardNavbar } from "@/components/layout/navbar";
import { PageLoader } from "@/components/ui/spinner";

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) return <PageLoader label="Loading workspace…" />;

  return (
    <div className="min-h-screen bg-secondary/20">
      <DashboardNavbar />
      <main className="mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
