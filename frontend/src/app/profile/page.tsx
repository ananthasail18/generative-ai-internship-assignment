"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, FileText, GraduationCap, Mail, LogOut, TrendingUp } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import type { Course, DashboardProgress, Document } from "@/types";
import { formatBytes, formatDate } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [docs, setDocs] = useState<Document[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<DashboardProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.documents(), api.courses(), api.dashboard()])
      .then(([d, c, p]) => {
        setDocs(d);
        setCourses(c);
        setProgress(p);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  if (!user || loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-secondary/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-2xl font-semibold text-primary">
            {user.image ? (
              <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              user.name?.[0]?.toUpperCase() ?? "U"
            )}
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {user.name}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" /> Member since {formatDate(user.created_at)}
              {user.oauth_provider ? (
                <Badge variant="primary" className="ml-1 capitalize">{user.oauth_provider}</Badge>
              ) : null}
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={FileText}
          label="Uploaded PDFs"
          value={docs.length}
          hint={`Total ${formatBytes(docs.reduce((s, d) => s + d.file_size, 0))}`}
        />
        <StatCard
          icon={GraduationCap}
          label="Courses"
          value={courses.length}
          hint="From your uploads"
        />
        <StatCard
          icon={TrendingUp}
          label="Overall progress"
          value={`${progress?.overall_progress_percent ?? 0}%`}
          hint={`${progress?.total_lessons_completed ?? 0} of ${progress?.total_lessons ?? 0} lessons`}
        />
      </div>

      {/* Account details */}
      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>Profile information synced from email or OAuth.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Detail icon={<Mail className="h-4 w-4" />} label="Email" value={user.email} />
          <Detail icon={<GraduationCap className="h-4 w-4" />} label="Name" value={user.name} />
          <Detail
            icon={<CalendarDays className="h-4 w-4" />}
            label="Created"
            value={formatDate(user.created_at)}
          />
          <Detail
            icon={<Mail className="h-4 w-4" />}
            label="Auth method"
            value={user.oauth_provider ? `OAuth (${user.oauth_provider})` : "Email & password"}
          />
        </CardContent>
      </Card>

      {/* Uploaded PDFs */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded PDFs</CardTitle>
          <CardDescription>All documents you’ve uploaded.</CardDescription>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No uploads yet.{" "}
              <Link href="/upload" className="font-medium text-primary hover:underline">
                Upload a PDF
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.title ?? d.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.page_count} pages · {formatBytes(d.file_size)} · {formatDate(d.upload_date)}
                    </p>
                  </div>
                  {d.has_course ? (
                    <Badge variant="success">Course ready</Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
          <CardDescription>Your completion progress across all courses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses yet.</p>
          ) : (
            courses.map((c) => (
              <div key={c.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <Link href={`/course/${c.id}`} className="truncate font-medium hover:text-primary">
                    {c.title}
                  </Link>
                  <span className="text-muted-foreground">
                    {c.completed_lessons}/{c.total_lessons}
                  </span>
                </div>
                <Progress value={c.progress_percent} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
