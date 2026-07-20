"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Github } from "lucide-react";

const DEMO_USER = {
  id: 1,
  name: "Demo Learner",
  email: "demo@courseforge.dev",
  image: null,
  oauth_provider: "demo",
  created_at: new Date().toISOString(),
};

export function OAuthButtons({ className }: { className?: string }) {
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const { toast } = useToast();
  const [checking, setChecking] = useState<"google" | "github" | null>(null);

  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  async function tryOAuth(provider: "google" | "github") {
    setChecking(provider);
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 2200);
      const res = await fetch(`${base}/api/health`, { signal: ctrl.signal });
      clearTimeout(timeout);
      if (res.ok) {
        window.location.href = `${base}/api/auth/${provider}`;
        return;
      }
      throw new Error("backend returned " + res.status);
    } catch {
      const stored = window.localStorage.getItem("courseforge_token");
      window.localStorage.setItem(
        "courseforge_demo_user",
        JSON.stringify(DEMO_USER),
      );
      try {
        await loginWithToken("demo-token-");
        toast({
          title: "Demo mode",
          description:
            "Backend not reachable — signed you in as a demo user so you can explore the UI.",
          variant: "success",
        });
        router.push("/dashboard");
      } catch {
        const usedFallback = window.localStorage.getItem("courseforge_demo_user");
        if (usedFallback) {
          window.localStorage.setItem("courseforge_token", "demo-token-");
          toast({
            title: "Demo mode",
            description:
              "Backend not reachable — exploring the UI with a demo user.",
            variant: "success",
          });
          router.push("/dashboard");
        }
      } finally {
        void stored;
      }
    } finally {
      setChecking(null);
    }
  }

  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
      <button
        type="button"
        onClick={() => tryOAuth("google")}
        disabled={checking !== null}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-input bg-white px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-secondary disabled:cursor-wait disabled:opacity-60"
      >
        <GoogleIcon className="h-5 w-5" />
        {checking === "google" ? "Checking…" : "Continue with Google"}
      </button>
      <button
        type="button"
        onClick={() => tryOAuth("github")}
        disabled={checking !== null}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-input bg-white px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-secondary disabled:cursor-wait disabled:opacity-60"
      >
        <Github className="h-5 w-5" />
        {checking === "github" ? "Checking…" : "Continue with GitHub"}
      </button>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.3 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.7 1.1 7.8 3l5.7-5.7C34.3 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.3C29.2 35 26.8 36 24 36c-5.3 0-9.7-3.5-11.3-8.3l-6.5 5C9.6 39.5 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6.3 5.3C39.5 35.5 44 30.4 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

void api;
