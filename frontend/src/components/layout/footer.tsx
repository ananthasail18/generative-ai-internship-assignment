import Link from "next/link";
import { Github, Twitter } from "lucide-react";

import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-secondary/20">
      <Container className="py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Turn any PDF into a structured, lesson-by-lesson course — with AI
              agents doing the heavy lifting.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://github.com"
                aria-label="GitHub"
                className="text-muted-foreground hover:text-foreground"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                aria-label="Twitter"
                className="text-muted-foreground hover:text-foreground"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          <FooterCol
            title="Product"
            links={[
              { href: "/#features", label: "Features" },
              { href: "/#how-it-works", label: "How it works" },
              { href: "/upload", label: "Upload" },
              { href: "/dashboard", label: "Dashboard" },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { href: "/#testimonials", label: "Testimonials" },
              { href: "/login", label: "Sign in" },
              { href: "/signup", label: "Sign up" },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { href: "#", label: "Privacy" },
              { href: "#", label: "Terms" },
              { href: "#", label: "Security" },
            ]}
          />
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} CourseForge AI. All rights reserved.</p>
          <p>Built with Next.js · FastAPI · PyMuPDF</p>
        </div>
      </Container>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
