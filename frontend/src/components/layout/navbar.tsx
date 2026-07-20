"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/providers/auth-provider";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { BookOpen, Home, Upload } from "lucide-react";
import { SearchModal } from "@/components/layout/SearchModal";

type NavItem = { href: string; label: string };

const marketingNav: NavItem[] = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#testimonials", label: "Testimonials" },
];

export function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {marketingNav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm font-medium text-foreground transition hover:text-primary"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="hidden h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:inline-flex"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

const dashboardNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
];

export function DashboardNavbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Logo href="/dashboard" />
          <nav className="hidden items-center gap-1 md:flex">
            {dashboardNav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                  )}
                >
                  {item.href === "/upload" ? (
                    <Upload className="h-4 w-4" />
                  ) : (
                    <Home className="h-4 w-4" />
                  )}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Search */}
        <SearchModal />

        <div className="flex items-center gap-3">
          <Link
            href="/upload"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <Upload className="h-4 w-4" />
            Upload PDF
          </Link>

          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-full border border-border px-2 py-1 pl-1 transition hover:bg-secondary"
          >
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                user?.name?.[0]?.toUpperCase() ?? <BookOpen className="h-4 w-4" />
              )}
            </span>
            <span className="hidden text-sm font-medium sm:inline">
              {user?.name ?? "Account"}
            </span>
          </Link>
          <button
            onClick={logout}
            className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
