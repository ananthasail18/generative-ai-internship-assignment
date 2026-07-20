import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

const testimonials = [
  {
    quote:
      "CourseForge replaced three internal tools for our onboarding — new hires finish 4× as many guides.",
    name: "Priya Sharma",
    role: "L&D Lead, Brightloop",
  },
  {
    quote:
      "I uploaded a 90-page research paper and got a structured course in minutes. Lessons read like ChatGPT.",
    name: "Marcus Lee",
    role: "Graduate Student, ETH Zürich",
  },
  {
    quote:
      "The pipeline being modular is huge — we’re swapping in our own Structure Agent next quarter.",
    name: "Ana Vidal",
    role: "Co-founder, Tracksy",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 sm:py-28">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Loved by learners and teams
            </h2>
            <p className="mt-4 text-balance text-muted-foreground">
              Testimonials shown are placeholder copy. Real quotes coming soon.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.05}>
              <figure className="h-full rounded-2xl border border-border bg-white p-6 shadow-sm">
                <blockquote className="text-sm leading-relaxed text-foreground">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {t.name[0]}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
