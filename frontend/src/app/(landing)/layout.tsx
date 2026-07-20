import { Footer } from "@/components/layout/footer";
import { MarketingNavbar } from "@/components/layout/navbar";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNavbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
