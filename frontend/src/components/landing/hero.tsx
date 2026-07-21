"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, FileText, Layers, Sparkles, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-radial-fade">
      <div className="absolute inset-0 -z-10 bg-grid opacity-60" />
      <Container className="py-20 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Now in preview · AI agents plug in next
          </span>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Turn any PDF into a{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              structured e-course
            </span>{" "}
            your team will actually finish.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
            CourseForge ingests your PDF, distills it into chapters and lessons,
            and serves an interactive learning experience — complete with quizzes,
            flashcards and a spaced review layer.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/signup">
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card · Google & GitHub sign-in · 100 MB PDFs
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-14 max-w-5xl"
        >
          <div className="rounded-2xl border border-border bg-background shadow-xl">
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs text-muted-foreground">
                courseforge.ai/dashboard
              </span>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-3">
              <PreviewCard
                icon={<Upload className="h-4 w-4" />}
                title="intro-to-ml.pdf"
                meta="12 pages · 1.2 MB · uploaded"
              />
              <PreviewCard
                icon={<Layers className="h-4 w-4" />}
                title="Course: Introduction to ML"
                meta="3 chapters · 6 lessons · 38% complete"
              />
              <PreviewCard
                icon={<FileText className="h-4 w-4" />}
                title="Lesson 1.1 · Defining ML"
                meta="≈ 4 min read · mark complete"
              />
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

function PreviewCard({
  icon,
  title,
  meta,
}: {
  icon: React.ReactNode;
  title: string;
  meta: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
    </div>
  );
}
