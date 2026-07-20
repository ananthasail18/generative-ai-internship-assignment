"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { PageLoader } from "@/components/ui/spinner";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { loginWithToken } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      toast({ title: "Missing auth token", variant: "error" });
      router.replace("/login");
      return;
    }
    loginWithToken(token)
      .then(() => {
        toast({ title: "Signed in", variant: "success" });
        router.replace("/dashboard");
      })
      .catch(() => {
        toast({ title: "Sign-in failed", variant: "error" });
        router.replace("/login");
      });
  }, [params, loginWithToken, router, toast]);

  return <PageLoader label="Signing you in…" />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<PageLoader label="Signing you in…" />}>
      <CallbackInner />
    </Suspense>
  );
}
