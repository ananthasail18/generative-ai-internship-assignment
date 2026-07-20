import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-primary to-accent p-12 text-white lg:flex">
        <Logo href="/" className="[&_span]:text-white" />
        <div className="space-y-4">
          <h2 className="text-balance text-3xl font-semibold leading-tight">
            Your PDFs deserve to become{" "}
            <span className="opacity-90">a course you’ll actually finish.</span>
          </h2>
          <p className="max-w-md text-white/80">
            Drop a PDF, let our AI agents design the chapters and lessons, and
            track real progress — all in one modern dashboard.
          </p>
        </div>
        <p className="text-sm text-white/60">© {new Date().getFullYear()} CourseForge AI</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing you agree to our{" "}
            <Link href="#" className="underline hover:text-foreground">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="#" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
