"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, ChevronRight, Clock, Layers } from "lucide-react";

import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageLoader } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { Chapter, CourseDetail, Lesson } from "@/types";
import { formatDuration } from "@/lib/utils";

function firstIncompleteLesson(c: CourseDetail): { lesson: Lesson; chapter: Chapter } | null {
  for (const ch of c.chapters) {
    for (const tp of ch.topics) {
      for (const ls of tp.lessons) {
        if (!ls.completed) return { lesson: ls, chapter: ch };
      }
    }
  }
  // All complete -> return first lesson so "Continue" still works (review).
  const firstCh = c.chapters[0];
  const firstL = firstCh?.topics[0]?.lessons[0];
  return firstL ? { lesson: firstL, chapter: firstCh } : null;
}

import { ChatWidget } from "@/components/chat/ChatWidget";
import { SearchModal } from "@/components/layout/SearchModal";

export default function CoursePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.course(id)
      .then(setCourse)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load course"))
      .finally(() => setLoading(false));
  }, [id]);

  const nextResume = useMemo(() => (course ? firstIncompleteLesson(course) : null), [course]);

  if (loading) return <PageLoader label="Loading course…" />;
  if (error || !course) {
    return (
      <EmptyState
        title="Course not found"
        description={error ?? "The course you’re looking for doesn’t exist or you don’t have access."}
        action={<Button asChild><Link href="/dashboard">Back to dashboard</Link></Button>}
      />
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <SearchModal />
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="primary">{course.difficulty}</Badge>
            <Badge variant="outline">{course.total_lessons} lessons</Badge>
            <Badge variant="outline">
              <Clock className="h-3 w-3" /> {formatDuration(course.estimated_time)}
            </Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {course.title}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {course.description ?? "Auto-generated from your PDF."}
          </p>

          {course.learning_objectives && course.learning_objectives.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground mb-1">Learning Objectives</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {course.learning_objectives.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>
          )}
          
          {course.prerequisites && course.prerequisites.length > 0 && (
            <div className="mt-2">
              <h3 className="text-sm font-semibold text-foreground mb-1">Prerequisites</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {course.prerequisites.map((pre, i) => (
                  <li key={i}>{pre}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="w-full max-w-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{course.completed_lessons}/{course.total_lessons} lessons</span>
          </div>
          <Progress value={course.progress_percent} />
          {nextResume ? (
            <Button asChild className="w-full">
              <Link href={`/lesson/${nextResume.lesson.id}`}>
                Continue · Lesson {nextResume.lesson.title.split("·")[0]?.trim() ?? ""}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Table of contents */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">Table of contents</h2>
        </div>

        {course.chapters.length === 0 ? (
          <EmptyState title="No chapters yet" description="AI agents will populate this course soon." />
        ) : (
          <div className="space-y-4">
            {course.chapters.map((ch, i) => (
              <Card key={ch.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    {ch.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {ch.topics.map((tp) => (
                    <div key={tp.id} className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {tp.title}
                      </p>
                      <ul className="divide-y divide-border rounded-xl border border-border">
                        {tp.lessons.map((ls) => (
                          <li key={ls.id}>
                            <Link
                              href={`/lesson/${ls.id}`}
                              className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-secondary/40"
                            >
                              <span className="flex items-center gap-2.5">
                                {ls.completed ? (
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                    <BookOpen className="h-3 w-3" />
                                  </span>
                                ) : (
                                  <span className="h-5 w-5 rounded-full border border-border" />
                                )}
                                {ls.title}
                              </span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <ChatWidget courseId={course.id} />
    </motion.div>
  );
}
