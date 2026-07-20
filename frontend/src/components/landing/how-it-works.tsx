import { CheckCircle2, FileText, LayoutTemplate, MessageSquare, Rocket, ShieldCheck } from "lucide-react";

import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

const steps = [
  {
    icon: FileText,
    title: "Upload your PDF",
    description: "Drag-and-drop a PDF up to 100 MB. We parse metadata with PyMuPDF and extract page count, title and author.",
  },
  {
    icon: LayoutTemplate,
    title: "Structure Agent drafts an outline",
    description: "The orchestrator chunks the text and asks the Structure Agent to design chapters, topics, and lessons.",
  },
  {
    icon: MessageSquare,
    title: "Lessons + storytelling layer",
    description: "Lesson Agents draft each lesson; the Storyteller adds analogies; quizzes and flashcards get generated.",
  },
  {
    icon: ShieldCheck,
    title: "Review Agent QA-pass",
    description: "A final Review Agent checks coherence and surface gaps before the course is committed to storage.",
  },
  {
    icon: Rocket,
    title: "Learn & track progress",
    description: "Pick up where you left off with per-lesson progress, completion badges, and overall dashboards.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-secondary/30 py-20 sm:py-28">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-balance text-muted-foreground">
              From PDF upload to a polished course in five steps. AI agents are
              modular — each stage is independently swappable.
            </p>
          </Reveal>
        </div>

        <ol className="mx-auto mt-14 max-w-3xl">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 0.06}>
              <div className="relative flex gap-5 border-b border-border/70 py-6 last:border-b-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {s.description}
                  </p>
                </div>
                {i < steps.length - 1 ? (
                  <CheckCircle2 className="mt-1 hidden h-5 w-5 text-emerald-500 sm:block" />
                ) : null}
              </div>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}
