import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Testimonials } from "@/components/landing/testimonials";

export default function Page() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <Testimonials />
    </>
  );
}
