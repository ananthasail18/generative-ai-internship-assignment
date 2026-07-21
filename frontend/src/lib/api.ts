import { auth, NEXT_PUBLIC_API_URL } from "./config";
import type {
  ApiError,
  Course,
  CourseDetail,
  DashboardProgress,
  Document,
  Lesson,
  TokenResponse,
  User,
} from "@/types";

type Query = Record<string, string | number | boolean | undefined>;

type Progress = {
  id: number;
  user_id: number;
  lesson_id: number;
  completed: boolean;
  completed_at: string | null;
  time_spent: number;
};

async function request<T>(
  path: string,
  init: RequestInit = {},
  query?: Query,
): Promise<T> {
  const url = new URL(
    path.startsWith("http") ? path : `${NEXT_PUBLIC_API_URL}${path}`,
  );
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  const headers = new Headers(init.headers || {});
  if (!(init.body instanceof FormData) && !headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  const token = auth.token;
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(url.toString(), { ...init, headers, cache: "no-store" });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      window.localStorage.removeItem("courseforge_token");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    let detail = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as ApiError;
      detail = data.detail || data.message || detail;
    } catch {
      /* ignore */
    }
    const err = new Error(detail) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  health: () => request<{ status: string }>("/api/health"),

  signup: (body: { name: string; email: string; password: string }) =>
    request<TokenResponse>("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<TokenResponse>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  me: () => request<User>("/api/me"),

  oauthUrl: (provider: "google" | "github") =>
    `${NEXT_PUBLIC_API_URL}/api/auth/${provider}`,

  documents: () => request<Document[]>("/api/documents"),
  courses: () => request<Course[]>("/api/courses"),
  course: (id: number | string) => request<CourseDetail>(`/api/course/${id}`),
  lesson: (id: number | string) => request<Lesson>(`/api/lesson/${id}`),
  completeLesson: (
    id: number | string,
    body: { completed: boolean; time_spent?: number; quiz_score?: number },
  ) =>
    request<Progress>(`/api/lesson/${id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  dashboard: () => request<DashboardProgress>("/api/progress"),

  upload: (file: File, onProgress?: (pct: number) => void) =>
    new Promise<Document>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append("file", file);
      xhr.open("POST", `${NEXT_PUBLIC_API_URL}/api/upload`);
      const token = auth.token;
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as Document);
          } catch (err) {
            reject(err);
          }
        } else {
          let detail = `Upload failed (${xhr.status})`;
          try {
            const data = JSON.parse(xhr.responseText) as ApiError;
            detail = data.detail || detail;
          } catch {
            /* ignore */
          }
          reject(new Error(detail));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(fd);
    }),

  // Chat API
  chatSessions: () => request<any[]>("/api/chat/sessions"),
  createChatSession: (body: { lesson_id?: number; course_id?: number }) =>
    request<any>("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  chatSession: (id: number) => request<any>(`/api/chat/sessions/${id}`),
  sendMessage: (sessionId: number, body: { content: string }, lessonId?: number) =>
    request<any>(`/api/chat/sessions/${sessionId}/message${lessonId ? `?lesson_id=${lessonId}` : ''}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  search: (q: string) => request<any[]>(`/api/search`, undefined, { q }),

  pipelineStatus: (documentId: number) =>
    request<{
      document_id: number;
      status: string;
      stage: string | null;
      lessons_done: number;
      lessons_total: number;
      percent: number;
      error: string | null;
      started_at: string | null;
      finished_at: string | null;
    }>(`/api/pipeline/status/${documentId}`),
};
