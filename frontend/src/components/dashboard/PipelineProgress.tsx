"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { Document } from "@/types";

type JobStatus = {
  document_id: number;
  status: string;
  stage: string | null;
  lessons_done: number;
  lessons_total: number;
  percent: number;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
};

type Props = {
  docs: Document[];
  onCourseReady?: () => void; // callback to refresh the dashboard
};

export function PipelineProgress({ docs, onCourseReady }: Props) {
  const [jobs, setJobs] = useState<Record<number, JobStatus>>({});
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const poll = useCallback(async () => {
    if (docs.length === 0) return;
    const results = await Promise.allSettled(
      docs.map((d) => api.pipelineStatus(d.id))
    );
    const next: Record<number, JobStatus> = {};
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        const job = r.value;
        // Only track active or recently finished jobs
        if (job.status !== "not_started") {
          next[docs[i].id] = job;
        }
      }
    });

    // Check if any new "done" jobs have appeared since last poll
    setJobs((prev) => {
      const prevDoneIds = new Set(
        Object.values(prev)
          .filter((j) => j.status === "done")
          .map((j) => j.document_id)
      );
      const newDoneIds = Object.values(next)
        .filter((j) => j.status === "done")
        .map((j) => j.document_id);
      const hasNew = newDoneIds.some((id) => !prevDoneIds.has(id));
      if (hasNew && onCourseReady) {
        onCourseReady();
      }
      return next;
    });
  }, [docs, onCourseReady]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [poll]);

  const activeJobs = Object.values(jobs).filter(
    (j) => !dismissed.has(j.document_id) && (j.status === "running" || j.status === "failed" || j.status === "done")
  );

  if (activeJobs.length === 0) return null;

  const runningCount = activeJobs.filter((j) => j.status === "running").length;
  const doneCount = activeJobs.filter((j) => j.status === "done").length;
  const failedCount = activeJobs.filter((j) => j.status === "failed").length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 shadow-sm overflow-hidden"
      >
        {/* Header row */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-primary/5 transition"
        >
          <div className="flex items-center gap-3">
            {runningCount > 0 ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </span>
            ) : doneCount > 0 ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </span>
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-4 w-4 text-red-500" />
              </span>
            )}
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {runningCount > 0
                  ? `AI is building ${runningCount} course${runningCount > 1 ? "s" : ""}…`
                  : doneCount > 0
                  ? `${doneCount} course${doneCount > 1 ? "s" : ""} ready!`
                  : `Generation failed`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {runningCount > 0
                  ? "Lessons, stories and quizzes are being written by AI"
                  : doneCount > 0
                  ? "Your new course content is live on the dashboard"
                  : "Check details below"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {/* Expanded job list */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t border-primary/10 px-5 py-3 space-y-4">
                {activeJobs.map((job) => {
                  const doc = docs.find((d) => d.id === job.document_id);
                  return (
                    <div key={job.document_id} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-foreground truncate flex-1">
                          {doc?.title ?? doc?.filename ?? `Document #${job.document_id}`}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          {job.status === "done" && (
                            <button
                              onClick={() => setDismissed((s) => new Set([...s, job.document_id]))}
                              className="text-[10px] text-muted-foreground hover:text-foreground underline"
                            >
                              dismiss
                            </button>
                          )}
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              job.status === "done"
                                ? "bg-emerald-100 text-emerald-700"
                                : job.status === "failed"
                                ? "bg-red-100 text-red-600"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {job.status === "done"
                              ? "Done"
                              : job.status === "failed"
                              ? "Failed"
                              : `${job.percent}%`}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            job.status === "done"
                              ? "bg-emerald-500"
                              : job.status === "failed"
                              ? "bg-red-400"
                              : "bg-primary"
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${job.status === "done" ? 100 : job.percent}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>

                      {/* Stage label */}
                      <p className="text-[11px] text-muted-foreground truncate">
                        {job.status === "failed"
                          ? `⚠️ ${job.error ?? "Unknown error"}`
                          : job.stage ?? "Preparing…"}
                        {job.lessons_total > 0 && job.status !== "done" && (
                          <span className="ml-1 text-primary/70">
                            ({job.lessons_done}/{job.lessons_total} lessons)
                          </span>
                        )}
                        {job.status === "done" && job.started_at && job.finished_at && (
                          <span className="ml-1 text-emerald-600 font-medium">
                            (Took {(() => {
                              const diff = new Date(job.finished_at).getTime() - new Date(job.started_at).getTime();
                              const m = Math.floor(diff / 60000);
                              const s = Math.floor((diff % 60000) / 1000);
                              return `${m}m ${s}s`;
                            })()})
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
