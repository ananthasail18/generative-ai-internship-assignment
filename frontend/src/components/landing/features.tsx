import { Brain, Layout, Map, MessagesSquare, ShieldCheck, Sparkles } from "lucide-react";

import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

const features = [
  {
    icon: Sparkles,
    title: "AI-powered course structure",
    description:
      "Our Structure Agent reads your PDF and designs chapters, topics, and lessons with sensible ordering and difficulty labels.",
  },
  {
    icon: MessagesSquare,
    title: "Lessons that read like ChatGPT",
    description:
      "Lesson Agents draft clear, conversational explanations, then the Storytelling Agent adds narrative you'll actually remember.",
  },
  {
    icon: Brain,
    title: "Quiz & flashcards baked in",
    description:
      "The Quiz Agent produces flashcards and multiple-choice questions for every lesson, ready for in-line review.",
  },
  {
    icon: Map,
    title: "Continue where you left off",
    description:
      "Real-time progress tracking shows what's done, what's next, and how far you are through each course.",
  },
  {
    icon: Layout,
    title: "A Linear-grade reading experience",
    description:
      "Keyboard-friendly navigation, lesson sidebars, and a clean content layout that gets out of the way.",
  },
  {
    icon: ShieldCheck,
    title: "Your PDFs stay yours",
    description:
      "Files are stored locally in development. Bring your own object storage in production with a single env swap.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Everything you need to learn from a PDF — without the busywork
            </h2>
            <p className="mt-4 text-balance text-muted-foreground">
              CourseForge handles parsing, structuring, narration and review so
              you can focus on actually learning.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <article className="group h-full rounded-2xl border border-border bg-background p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
