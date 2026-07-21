"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  UploadCloud,
} from "lucide-react";

import { api } from "@/lib/api";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Document } from "@/types";
import { formatBytes } from "@/lib/utils";

type Status = "idle" | "validating" | "uploading" | "success" | "error";

const MAX_MB = 100;

export default function UploadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Document | null>(null);

  const validate = useCallback((f: File): string | null => {
    if (!/\.pdf$/i.test(f.name)) return "Only PDF files are allowed.";
    if (f.size > MAX_MB * 1024 * 1024) return `File exceeds the ${MAX_MB} MB limit.`;
    return null;
  }, []);

  const handleFile = useCallback(
    (f: File) => {
      setError(null);
      setResult(null);
      const err = validate(f);
      if (err) {
        setError(err);
        setStatus("error");
        // eslint-disable-next-line no-console
        console.warn("Upload rejected:", err);
        return;
      }
      setFile(f);
      setStatus("validating");
    },
    [validate],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const startUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    setProgress(0);
    try {
      const doc = await api.upload(file, (pct) => setProgress(Math.round(pct * 100)));
      setResult(doc);
      setStatus("success");
      setProgress(100);
      toast({
        title: "Upload complete",
        description: `Extracted ${doc.page_count} pages${
          doc.title ? ` · ${doc.title}` : ""
        }`,
        variant: "success",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStatus("error");
      toast({ title: "Upload failed", variant: "error" });
    }
  };

  const reset = () => {
    setFile(null);
    setError(null);
    setResult(null);
    setProgress(0);
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Upload a PDF
        </h1>
        <p className="text-sm text-muted-foreground">
          Drag & drop or browse. We support PDFs up to {MAX_MB} MB. After
          parsing the metadata, a placeholder course scaffold is created — AI
          content generation will populate it soon.
        </p>
      </header>

      {!file && status !== "success" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed bg-background px-6 py-16 text-center transition ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-secondary/30"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="mt-4 text-base font-semibold text-foreground">
            Drag & drop your PDF here
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            or click to browse — PDF only, up to {MAX_MB} MB
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">{file?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {file ? formatBytes(file.size) : ""}
                  {result ? ` · ${result.page_count} pages` : ""}
                </p>
              </div>
              {status === "idle" || status === "validating" ? (
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                  Ready
                </span>
              ) : status === "uploading" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Loader2 className="h-3 w-3 animate-spin" /> Uploading
                </span>
              ) : status === "success" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Done
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                  <AlertCircle className="h-3 w-3" /> Failed
                </span>
              )}
            </div>

            {status === "uploading" ? (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground">{progress}% uploaded</p>
              </div>
            ) : null}

            {status === "success" && result ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
                <p className="font-medium text-emerald-800">
                  Upload successful — course scaffold created!
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-emerald-800/90">
                  <dt className="text-muted-foreground">Title</dt>
                  <dd>{result.title ?? "Untitled"}</dd>
                  <dt className="text-muted-foreground">Author</dt>
                  <dd>{result.author ?? "—"}</dd>
                  <dt className="text-muted-foreground">Pages</dt>
                  <dd>{result.page_count}</dd>
                  <dt className="text-muted-foreground">File size</dt>
                  <dd>{formatBytes(result.file_size)}</dd>
                </dl>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {status === "idle" || status === "validating" ? (
                <Button onClick={startUpload}>
                  <UploadCloud className="h-4 w-4" /> Upload
                </Button>
              ) : status === "uploading" ? (
                <Button disabled>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                </Button>
              ) : status === "success" ? (
                <Button asChild>
                  <Link href="/dashboard">Go to dashboard</Link>
                </Button>
              ) : null}
              <Button variant="outline" onClick={reset}>
                {status === "success" ? "Upload another" : "Choose different file"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Tip: the AI pipeline ({`extract → chunk → orchestrator → agents → store`})
        is stubbed out for now; uploads currently create a deterministic
        placeholder course scaffold.
      </p>
    </div>
  );
}
