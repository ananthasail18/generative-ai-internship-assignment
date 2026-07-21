"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
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
import ReactMarkdown from "react-markdown";

function flattenLessons(c: CourseDetail): Lesson[] {
  return c.chapters.flatMap((ch) => ch.topics.flatMap((tp) => tp.lessons));
}

// Helper to safely render JSON dicts or arrays
const renderDict = (data: any, icon?: React.ReactNode) => {
  if (!data) return null;
  
  if (typeof data === "string") return <p className="text-foreground/80 mt-4">{data}</p>;
  
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    return (
      <ul className="space-y-3 mt-4">
        {data.map((item, i) => {
          if (typeof item === 'string') {
             return (
               <li key={i} className="flex gap-3 items-start">
                 <div className="mt-1 shrink-0">{icon || <CheckCircle2 className="w-5 h-5 text-primary" />}</div>
                 <div className="text-foreground/80 leading-relaxed"><ReactMarkdown>{item}</ReactMarkdown></div>
               </li>
             );
          }
          const titleStr = item.title || item.name || item.concept || item.key || item.takeaway || item.note || item.context || "";
          const descStr = item.description || item.explanation || item.value || item.content || item.detail || item.example || "";
          
          if (!titleStr && !descStr) {
            return (
              <li key={i} className="flex gap-3 items-start">
                <div className="mt-1 shrink-0">{icon || <CheckCircle2 className="w-5 h-5 text-primary" />}</div>
                <div className="text-muted-foreground">{JSON.stringify(item)}</div>
              </li>
            );
          }
          
          return (
            <li key={i} className="flex gap-3 items-start">
              <div className="mt-1 shrink-0">{icon || <CheckCircle2 className="w-5 h-5 text-primary" />}</div>
              <div>
                {titleStr && <strong className="text-foreground font-bold block sm:inline">{titleStr}: </strong>}
                <div className="text-foreground/75 inline"><ReactMarkdown>{descStr}</ReactMarkdown></div>
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
          <li key={i} className="flex gap-3 items-start">
            <div className="mt-1 shrink-0">{icon || <CheckCircle2 className="w-5 h-5 text-primary" />}</div>
            <div>
              <strong className="text-foreground font-semibold block sm:inline">{key}: </strong>
              <div className="text-foreground/80 inline"><ReactMarkdown>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</ReactMarkdown></div>
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
  const [lessonLoading, setLessonLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLessonLoading(true);

    // Step 1: Fetch lesson (backend returns course_id)
    api.lesson(lessonId)
      .then(async (lessonData) => {
        if (cancelled) return;
        setLesson(lessonData);
        setLessonLoading(false);

        // Step 2: Use course_id from lesson to directly fetch the parent course
        const courseId = lessonData.course_id;
        if (!courseId) throw new Error("Lesson not associated with a course.");
        const full = await api.course(courseId);
        if (cancelled) return;
        setCourse(full);

        // Open the chapter that contains this lesson in the sidebar
        const owningChapter = full.chapters.find((ch) =>
          ch.topics.some((tp) => tp.lessons.some((l) => l.id === lessonId))
        );
        setActiveChapterId(owningChapter?.id ?? full.chapters[0]?.id ?? null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load lesson");
        setLessonLoading(false);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [lessonId]);

  const flat = useMemo(() => (course ? flattenLessons(course) : []), [course]);
  const currentIndex = useMemo(() => flat.findIndex((l) => l.id === lessonId), [flat, lessonId]);
  const prevLesson = currentIndex > 0 ? flat[currentIndex - 1] : undefined;
  const nextLesson = currentIndex > -1 && currentIndex < flat.length - 1 ? flat[currentIndex + 1] : undefined;
  const [sessionTimeSpent, setSessionTimeSpent] = useState(0);

  // Active time tracker
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Silent sync every 30 seconds
  useEffect(() => {
    if (sessionTimeSpent > 0 && sessionTimeSpent % 30 === 0 && lesson) {
      api.completeLesson(lessonId, { 
        completed: !!lesson?.completed, 
        time_spent: (lesson?.time_spent ?? 0) + sessionTimeSpent 
      }).catch(console.error);
    }
  }, [sessionTimeSpent, lesson, lessonId]);

  const markComplete = async (completed: boolean) => {
    if (!lesson) return;
    setSaving(true);
    try {
      const totalTime = (lesson.time_spent ?? 0) + sessionTimeSpent;
      await api.completeLesson(lessonId, { completed, time_spent: totalTime });
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

  if (loading || lessonLoading) return <PageLoader label="Loading lesson…" />;
  if (error || !course) return (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="text-xl font-semibold">{error || "Lesson not found"}</h1>
      <Button asChild className="mt-4"><Link href="/dashboard">Back to dashboard</Link></Button>
    </div>
  );
  if (!lesson) return (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="text-xl font-semibold">Loading lesson content…</h1>
    </div>
  );

  const currentChapter = course.chapters.find((ch) => ch.topics.some((tp) => tp.lessons.some((l) => l.id === lessonId)));

  // Use rich structured content if available, otherwise fall back to raw markdown
  const hasRichContent = !!(lesson.introduction || lesson.explanation || lesson.concepts || (lesson.key_takeaways && lesson.key_takeaways.length > 0));
  const hasAnyContent = hasRichContent || (lesson.content && lesson.content.trim() && !lesson.content.includes("Content coming soon"));

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Sidebar Navigation */}
      <aside className="lg:sticky lg:top-24 lg:self-start hidden lg:block">
        <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden flex flex-col max-h-[80vh]">
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
                      <li key={tp.id} className="space-y-1 pb-2">
                        <p className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">{tp.title}</p>
                        <ul className="space-y-0.5">
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
                        </ul>
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

          {!hasAnyContent ? (
            <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Content is being generated</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                AI is writing this lesson. Reload in a few seconds, or click <strong>Next</strong> to continue and come back.
              </p>
            </div>
          ) : !hasRichContent ? (
            <div className="prose prose-invert prose-lg max-w-none text-foreground/80 leading-relaxed">
              <ReactMarkdown>{lesson.content}</ReactMarkdown>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Introduction & Explanation Section */}
              <section id="theory" className="scroll-mt-24 space-y-8">
                {lesson.introduction && (
                  <div className="text-xl leading-relaxed text-foreground/90 font-medium">
                    <ReactMarkdown>{lesson.introduction}</ReactMarkdown>
                  </div>
                )}
                
                {lesson.explanation && (
                  <div className="bg-background rounded-2xl p-6 sm:p-10 border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground">Deep Dive</h2>
                    </div>
                    <div className="prose prose-invert prose-lg max-w-none text-foreground/90 leading-relaxed space-y-4">
                      <ReactMarkdown>{lesson.explanation}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Concepts & Examples */}
                <div className="grid sm:grid-cols-2 gap-6">
                  {Boolean(lesson.concepts && (Array.isArray(lesson.concepts) ? lesson.concepts.length > 0 : Object.keys(lesson.concepts).length > 0)) && (
                    <div className="bg-indigo-950/40 rounded-2xl p-6 border border-indigo-500/20">
                      <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-300 mb-2">
                        <Target className="w-5 h-5 text-indigo-400" /> Key Concepts
                      </h3>
                      {renderDict(lesson.concepts, <Sparkles className="w-4 h-4 text-indigo-400" />)}
                    </div>
                  )}
                  {Boolean(lesson.examples && (Array.isArray(lesson.examples) ? lesson.examples.length > 0 : Object.keys(lesson.examples).length > 0)) && (
                    <div className="bg-emerald-950/40 rounded-2xl p-6 border border-emerald-500/20">
                      <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-300 mb-2">
                        <Lightbulb className="w-5 h-5 text-emerald-400" /> Real Examples
                      </h3>
                      {renderDict(lesson.examples, <CheckCircle2 className="w-4 h-4 text-emerald-400" />)}
                    </div>
                  )}
                </div>

                {lesson.important_notes && lesson.important_notes.length > 0 && (
                  <div className="bg-rose-950/40 rounded-2xl p-6 border border-rose-500/25 mt-6">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-rose-300 mb-4">
                      <AlertCircle className="w-5 h-5 text-rose-400" /> Important Notes
                    </h3>
                    <ul className="space-y-3">
                      {lesson.important_notes.map((note, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-rose-200/80">
                          <CheckCircle2 className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              {/* Stories / Analogies */}
              {lesson.stories && lesson.stories.length > 0 && (
                <section id="story" className="scroll-mt-24">
                  <hr className="border-border my-12" />
                  <div className="space-y-6">
                    {lesson.stories.map((story) => (
                      <div key={story.id} className="bg-amber-950/40 rounded-2xl p-6 sm:p-10 border border-amber-500/25 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                          <Lightbulb className="w-32 h-32 text-amber-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-amber-200 mb-6 flex items-center gap-3">
                          <span className="bg-amber-500/20 text-amber-300 p-2 rounded-xl"><Lightbulb className="w-6 h-6" /></span>
                          Analogy & Story
                        </h2>
                        {story.analogy && <p className="text-lg font-medium text-amber-300 mb-4 italic">&quot;{story.analogy}&quot;</p>}
                        {story.story && <p className="text-amber-100/80 leading-relaxed mb-6">{story.story}</p>}
                        
                        {(story.real_world_example || story.beginner_explanation) && (
                          <div className="bg-white/5 rounded-xl p-5 mt-6 border border-amber-400/20">
                            {story.real_world_example && (
                              <div className="mb-3">
                                <strong className="text-amber-300">Real World: </strong>
                                <span className="text-amber-100/80">{story.real_world_example}</span>
                              </div>
                            )}
                            {story.beginner_explanation && (
                              <div>
                                <strong className="text-amber-300">In Simple Terms: </strong>
                                <span className="text-amber-100/80">{story.beginner_explanation}</span>
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

              {/* Key Takeaways */}
              {lesson.key_takeaways && lesson.key_takeaways.length > 0 && (
                <section className="bg-primary/5 rounded-2xl p-8 border border-primary/10">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-primary">
                    <Target className="w-5 h-5" /> Key Takeaways
                  </h3>
                  <ul className="space-y-3">
                    {(Array.isArray(lesson.key_takeaways) ? lesson.key_takeaways : []).map((tk: any, idx: number) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="leading-relaxed font-medium">{typeof tk === 'string' ? tk : JSON.stringify(tk)}</span>
                      </li>
                    ))}
                  </ul>
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
                  <QuizEngine 
                    questions={lesson.quizzes} 
                    onComplete={(score) => {
                      api.completeLesson(lessonId, { 
                        completed: true, 
                        time_spent: (lesson?.time_spent ?? 0) + sessionTimeSpent,
                        quiz_score: score
                      }).catch(console.error);
                      markComplete(true);
                    }} 
                  />
                </section>
              )}
            </div>
          )}
        </motion.div>

        {/* Footer Actions */}
        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-6 bg-background border border-border rounded-2xl shadow-sm">
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
