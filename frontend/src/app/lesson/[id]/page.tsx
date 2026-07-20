"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
  GraduationCap,
  Lightbulb,
  Target,
  Sparkles
} from "lucide-react";

import { api } from "@/lib/api";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/spinner";
import type { CourseDetail, Lesson } from "@/types";
import { cn } from "@/lib/utils";

import { FlashcardDeck } from "@/components/lesson/FlashcardDeck";
import { QuizEngine } from "@/components/lesson/QuizEngine";
import { ChatWidget } from "@/components/chat/ChatWidget";

function flattenLessons(c: CourseDetail): Lesson[] {
  return c.chapters.flatMap((ch) => ch.topics.flatMap((tp) => tp.lessons));
}

// Helper to safely render JSON dicts or arrays
const renderDict = (data: any, icon?: React.ReactNode) => {
  if (!data) return null;
  
  if (typeof data === "string") return <p className="text-muted-foreground mt-4">{data}</p>;
  
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    return (
      <ul className="space-y-3 mt-4">
        {data.map((item, i) => {
          if (typeof item === 'string') {
             return (
               <li key={i} className="flex gap-3">
                 <div className="mt-1 shrink-0">{icon || <CheckCircle2 className="w-5 h-5 text-primary" />}</div>
                 <span className="text-muted-foreground">{item}</span>
               </li>
             );
          }
          const titleStr = item.title || item.name || item.concept || item.key || item.takeaway || item.note || item.context || "";
          const descStr = item.description || item.explanation || item.value || item.content || item.detail || item.example || "";
          
          if (!titleStr && !descStr) {
            return (
              <li key={i} className="flex gap-3">
                <div className="mt-1 shrink-0">{icon || <CheckCircle2 className="w-5 h-5 text-primary" />}</div>
                <span className="text-muted-foreground">{JSON.stringify(item)}</span>
              </li>
            );
          }
          
          return (
            <li key={i} className="flex gap-3">
              <div className="mt-1 shrink-0">{icon || <CheckCircle2 className="w-5 h-5 text-primary" />}</div>
              <div>
                {titleStr && <strong className="text-foreground font-semibold block sm:inline">{titleStr}: </strong>}
                <span className="text-muted-foreground">{descStr}</span>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }
  
  if (typeof data === 'object') {
    if (Object.keys(data).length === 0) return null;
    return (
      <ul className="space-y-3 mt-4">
        {Object.entries(data).map(([key, value], i) => (
          <li key={i} className="flex gap-3">
            <div className="mt-1 shrink-0">{icon || <CheckCircle2 className="w-5 h-5 text-primary" />}</div>
            <div>
              <strong className="text-foreground font-semibold block sm:inline">{key}: </strong>
              <span className="text-muted-foreground">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
            </div>
          </li>
        ))}
      </ul>
    );
  }
  
  return null;
};

export default function LessonPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const lessonId = Number(params.id);
  const { toast } = useToast();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.courses()
      .then(async (courses) => {
        for (const c of courses) {
          const full = await api.course(c.id);
          const flat = flattenLessons(full);
          if (flat.some((l) => l.id === lessonId)) {
            if (cancelled) return;
            setCourse(full);
            setActiveChapterId(full.chapters[0]?.id ?? null);
            return;
          }
        }
        throw new Error("Lesson not found in any of your courses.");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load lesson"))
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  useEffect(() => {
    api.lesson(lessonId)
      .then(setLesson)
      .catch(() => null);
  }, [lessonId]);

  const flat = useMemo(() => (course ? flattenLessons(course) : []), [course]);
  const currentIndex = useMemo(() => flat.findIndex((l) => l.id === lessonId), [flat, lessonId]);
  const prevLesson = currentIndex > 0 ? flat[currentIndex - 1] : undefined;
  const nextLesson = currentIndex > -1 && currentIndex < flat.length - 1 ? flat[currentIndex + 1] : undefined;

  const markComplete = async (completed: boolean) => {
    setSaving(true);
    try {
      await api.completeLesson(lessonId, { completed, time_spent: lesson?.time_spent ?? 0 });
      setLesson((l) => (l ? { ...l, completed } : l));
      setCourse((c) => {
        if (!c) return c;
        const updated = { ...c };
        updated.chapters = updated.chapters.map((ch) => ({
          ...ch,
          topics: ch.topics.map((tp) => ({
            ...tp,
            lessons: tp.lessons.map((l) => (l.id === lessonId ? { ...l, completed } : l)),
          })),
        }));
        const all = flattenLessons(updated);
        updated.completed_lessons = all.filter((l) => l.completed).length;
        updated.progress_percent = all.length ? (updated.completed_lessons / all.length) * 100 : 0;
        return updated;
      });
      toast({
        title: completed ? "Marked complete" : "Marked incomplete",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Couldn’t update progress",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) return <PageLoader label="Loading lesson…" />;
  if (error || !course || !lesson) return (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="text-xl font-semibold">Lesson not found</h1>
      <Button asChild className="mt-4"><Link href="/dashboard">Back to dashboard</Link></Button>
    </div>
  );

  const currentChapter = course.chapters.find((ch) => ch.topics.some((tp) => tp.lessons.some((l) => l.id === lessonId)));

  // Fallback to basic rendering if no rich content exists
  const hasRichContent = lesson.introduction || lesson.explanation || lesson.concepts;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Sidebar Navigation */}
      <aside className="lg:sticky lg:top-24 lg:self-start hidden lg:block">
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden flex flex-col max-h-[80vh]">
          <div className="border-b border-border p-5 bg-secondary/30">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Course Content</p>
            <p className="truncate text-sm font-semibold text-foreground">{course.title}</p>
            <Progress value={course.progress_percent} className="mt-3 h-1.5" />
            <p className="mt-1.5 text-xs text-muted-foreground font-medium">
              {course.completed_lessons}/{course.total_lessons} lessons · {Math.round(course.progress_percent)}%
            </p>
          </div>
          <nav className="overflow-y-auto scrollbar-thin p-3">
            {course.chapters.map((ch) => (
              <div key={ch.id} className="mb-2">
                <button
                  onClick={() => setActiveChapterId(ch.id)}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
                >
                  <span className="truncate">{ch.title}</span>
                </button>
                {activeChapterId === ch.id && (
                  <ul className="mt-1 space-y-1 pl-4 border-l-2 border-secondary ml-3">
                    {ch.topics.map((tp) => (
                      <li key={tp.id} className="space-y-1">
                        <p className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{tp.title}</p>
                        {tp.lessons.map((l) => (
                          <li key={l.id} className="list-none">
                            <Link
                              href={`/lesson/${l.id}`}
                              className={cn(
                                "flex items-start gap-2.5 rounded-md px-2.5 py-2 text-sm transition-all",
                                l.id === lessonId
                                  ? "bg-primary/10 text-primary font-semibold shadow-sm"
                                  : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                              )}
                            >
                              {l.completed ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                              ) : (
                                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
                              )}
                              <span className="line-clamp-2 leading-tight">{l.title}</span>
                            </Link>
                          </li>
                        ))}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="min-w-0 pb-24">
        {/* Header Breadcrumbs */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href={`/course/${course.id}`}><ArrowLeft className="h-4 w-4 mr-2" /> Back to Course</Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {currentChapter && <Badge variant="default" className="bg-secondary text-foreground hover:bg-secondary/80">{currentChapter.title}</Badge>}
            <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5">
              <Clock className="h-3 w-3 mr-1.5" /> Lesson {currentIndex + 1}/{flat.length}
            </Badge>
          </div>
        </div>

        {/* Page Title & Intro */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground balance-text mb-6">
            {lesson.title}
          </h1>
          
          {/* Quick Navigation Pills for smooth scrolling */}
          <div className="flex flex-wrap gap-2 mb-8">
            {hasRichContent && <Button variant="secondary" size="sm" onClick={() => scrollTo('theory')} className="rounded-full">Theory</Button>}
            {lesson.stories?.length > 0 && <Button variant="secondary" size="sm" onClick={() => scrollTo('story')} className="rounded-full">Story</Button>}
            {lesson.flashcards?.length > 0 && <Button variant="secondary" size="sm" onClick={() => scrollTo('flashcards')} className="rounded-full">Flashcards</Button>}
            {lesson.quizzes?.length > 0 && <Button variant="secondary" size="sm" onClick={() => scrollTo('quiz')} className="rounded-full">Quiz</Button>}
          </div>

          {!hasRichContent ? (
            <div className="prose prose-lg max-w-none text-foreground/80">
              {lesson.content.split("\n").map((line, i) => (
                <p key={i} className="mb-4">{line}</p>
              ))}
            </div>
          ) : (
            <div className="space-y-12">
              {/* Introduction & Explanation Section */}
              <section id="theory" className="scroll-mt-24 space-y-8">
                {lesson.introduction && (
                  <div className="text-xl leading-relaxed text-muted-foreground font-medium">
                    {lesson.introduction}
                  </div>
                )}
                
                {lesson.explanation && (
                  <div className="bg-white rounded-2xl p-6 sm:p-10 border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground">Deep Dive</h2>
                    </div>
                    <div className="prose prose-lg max-w-none text-foreground/90 whitespace-pre-wrap">
                      {lesson.explanation}
                    </div>
                  </div>
                )}

                {/* Concepts & Examples */}
                <div className="grid sm:grid-cols-2 gap-6">
                  {lesson.concepts && Object.keys(lesson.concepts).length > 0 && (
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-2xl p-6 border border-indigo-100">
                      <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-900 mb-2">
                        <Target className="w-5 h-5 text-indigo-600" /> Key Concepts
                      </h3>
                      {renderDict(lesson.concepts, <Sparkles className="w-4 h-4 text-indigo-500" />)}
                    </div>
                  )}
                  {lesson.examples && Object.keys(lesson.examples).length > 0 && (
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-2xl p-6 border border-emerald-100">
                      <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-900 mb-2">
                        <Lightbulb className="w-5 h-5 text-emerald-600" /> Real Examples
                      </h3>
                      {renderDict(lesson.examples, <CheckCircle2 className="w-4 h-4 text-emerald-500" />)}
                    </div>
                  )}
                </div>
              </section>

              {/* Stories / Analogies */}
              {lesson.stories && lesson.stories.length > 0 && (
                <section id="story" className="scroll-mt-24">
                  <hr className="border-border my-12" />
                  <div className="space-y-6">
                    {lesson.stories.map((story) => (
                      <div key={story.id} className="bg-amber-50/50 rounded-2xl p-6 sm:p-10 border border-amber-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                          <Lightbulb className="w-32 h-32 text-amber-900" />
                        </div>
                        <h2 className="text-2xl font-bold text-amber-950 mb-6 flex items-center gap-3">
                          <span className="bg-amber-200 text-amber-800 p-2 rounded-xl"><Lightbulb className="w-6 h-6" /></span>
                          Analogy & Story
                        </h2>
                        {story.analogy && <p className="text-lg font-medium text-amber-900 mb-4 italic">&quot;{story.analogy}&quot;</p>}
                        {story.story && <p className="text-amber-900/90 leading-relaxed mb-6">{story.story}</p>}
                        
                        {(story.real_world_example || story.beginner_explanation) && (
                          <div className="bg-white/60 rounded-xl p-5 mt-6 border border-amber-200/50">
                            {story.real_world_example && (
                              <div className="mb-3">
                                <strong className="text-amber-950">Real World: </strong>
                                <span className="text-amber-900/80">{story.real_world_example}</span>
                              </div>
                            )}
                            {story.beginner_explanation && (
                              <div>
                                <strong className="text-amber-950">In Simple Terms: </strong>
                                <span className="text-amber-900/80">{story.beginner_explanation}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Flashcards */}
              {lesson.flashcards && lesson.flashcards.length > 0 && (
                <section id="flashcards" className="scroll-mt-24">
                  <hr className="border-border my-12" />
                  <FlashcardDeck flashcards={lesson.flashcards} />
                </section>
              )}

              {/* Summary */}
              {lesson.summary && (
                <section className="bg-secondary/30 rounded-2xl p-8 border border-border">
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-primary" /> Summary
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{lesson.summary}</p>
                </section>
              )}

              {/* Quizzes */}
              {lesson.quizzes && lesson.quizzes.length > 0 && (
                <section id="quiz" className="scroll-mt-24">
                  <hr className="border-border my-12" />
                  <QuizEngine questions={lesson.quizzes} />
                </section>
              )}
            </div>
          )}
        </motion.div>

        {/* Footer Actions */}
        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-6 bg-white border border-border rounded-2xl shadow-sm">
          <Button
            size="lg"
            variant={lesson.completed ? "outline" : "default"}
            onClick={() => markComplete(!lesson.completed)}
            disabled={saving}
            className={cn("sm:w-auto font-semibold transition-all", lesson.completed && "border-emerald-500 text-emerald-600 hover:bg-emerald-50")}
          >
            {saving ? "Saving…" : lesson.completed ? <><Check className="h-5 w-5 mr-2" /> Completed</> : <><CheckCircle2 className="h-5 w-5 mr-2" /> Mark as Complete</>}
          </Button>

          <div className="flex gap-3">
            <Button size="lg" variant="secondary" disabled={!prevLesson} asChild={!!prevLesson}>
              <Link href={prevLesson ? `/lesson/${prevLesson.id}` : "#"}><ArrowLeft className="h-4 w-4 mr-2" /> Prev</Link>
            </Button>
            <Button size="lg" disabled={!nextLesson} asChild={!!nextLesson}>
              <Link href={nextLesson ? `/lesson/${nextLesson.id}` : "#"}>Next <ArrowRight className="h-4 w-4 ml-2" /></Link>
            </Button>
          </div>
        </div>
      </section>
      <ChatWidget lessonId={lesson.id} courseId={course.id} />
    </div>
  );
}
