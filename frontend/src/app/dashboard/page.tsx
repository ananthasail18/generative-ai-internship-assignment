"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Clock,
  FileText,
  GraduationCap,
  TrendingUp,
  Upload,
  Target,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/dashboard/stat-card";
import { PipelineProgress } from "@/components/dashboard/PipelineProgress";
import type { Course, DashboardProgress, Document } from "@/types";
import { cn, formatBytes, formatDate, formatDuration } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Document[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<DashboardProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    Promise.all([api.documents(), api.courses(), api.dashboard()])
      .then(([d, c, p]) => {
        setDocs(d);
        setCourses(c);
        setProgress(p);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-secondary/60" />
        ))}
      </div>
    );
  }

  const recent = docs.slice(0, 5);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-10">
      {/* Welcome */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Welcome back, {user?.name?.split(" ")[0] ?? "Learner"} 👋</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Your learning workspace
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick up a course, upload a new PDF, or check your overall progress.
          </p>
        </div>
        <Button asChild>
          <Link href="/upload">
            <Upload className="h-4 w-4" />
            Upload PDF
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={GraduationCap}
          label="Courses"
          value={progress?.total_courses ?? 0}
          hint="Generated from your PDFs"
        />
        <StatCard
          icon={BookOpen}
          label="Lessons completed"
          value={progress?.total_lessons_completed ?? 0}
          hint={`of ${progress?.total_lessons ?? 0} total`}
        />
        <StatCard
          icon={TrendingUp}
          label="Overall progress"
          value={`${progress?.overall_progress_percent ?? 0}%`}
          hint={progress?.total_lessons ? "Across all courses" : undefined}
        />
        <StatCard
          icon={FileText}
          label="Uploaded PDFs"
          value={docs.filter(d => d.has_course).length}
          hint={docs.filter(d => d.has_course)[0] ? `Last: ${formatDate(docs.filter(d => d.has_course)[0].upload_date)}` : undefined}
        />
        <StatCard
          icon={Clock}
          label="Time spent learning"
          value={formatDuration(Math.floor((progress?.total_time_spent_seconds ?? 0) / 60))}
        />
        <StatCard
          icon={Target}
          label="Avg Quiz Score"
          value={progress?.average_quiz_score ? `${Math.round(progress.average_quiz_score)}%` : "N/A"}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="uploads">Upload Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="m-0">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Courses */}
            <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Your courses</h2>
            <span className="text-sm text-muted-foreground">{courses.length} total</span>
          </div>
          {courses.length === 0 ? (
            <EmptyState
              icon={<GraduationCap className="h-5 w-5" />}
              title="No courses yet"
              description="Upload your first PDF and CourseForge will scaffold a course for you in seconds."
              action={
                <Button asChild>
                  <Link href="/upload">
                    <Upload className="h-4 w-4" /> Upload a PDF
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {courses.map((c) => (
                <Card key={c.id} className="transition hover:-translate-y-0.5 hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="truncate text-base">{c.title}</CardTitle>
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                        {c.difficulty}
                      </span>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {c.description ?? "Auto-generated from your PDF."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress value={c.progress_percent} />
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{c.completed_lessons}/{c.total_lessons} lessons</span>
                      <span>{formatDuration(c.estimated_time)}</span>
                    </div>
                    <Button asChild className="mt-4 w-full" variant="outline">
                      <Link href={`/course/${c.id}`}>Continue learning</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Continue learning + Recent uploads */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" /> Continue learning
              </CardTitle>
              <CardDescription>Resume where you left off.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(progress?.continue_learning ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No in-progress courses yet.
                </p>
              ) : (
                progress!.continue_learning.map((c) => (
                  <Link
                    key={c.id}
                    href={`/course/${c.id}`}
                    className="block rounded-xl border border-border p-3 transition hover:border-primary/40 hover:bg-secondary/40"
                  >
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={c.progress_percent} className="h-1.5" />
                      <span className="text-xs text-muted-foreground">
                        {Math.round(c.progress_percent)}%
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TabsContent>

        <TabsContent value="uploads" className="space-y-6 m-0">
          {/* Live pipeline progress */}
          <PipelineProgress docs={docs} onCourseReady={reload} />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" /> All Upload Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {docs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No uploads yet.</p>
              ) : (
                docs.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition hover:bg-secondary/40"
                  >
                    <div className="min-w-0 flex flex-col gap-1">
                      <p className="truncate text-sm font-medium">{d.title ?? d.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.page_count} pages · {formatBytes(d.file_size)} · {formatDate(d.upload_date)}
                      </p>
                    </div>
                    {d.has_course ? (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        Course ready
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        Processing
                      </span>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
