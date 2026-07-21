"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, Layers, Tag, FileText, ArrowRight, X, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

type SearchResult = {
  type: "course" | "chapter" | "topic" | "lesson";
  id: number;
  title: string;
  subtitle?: string | null;
  course_id?: number | null;
  lesson_id?: number | null;
};

const typeConfig = {
  course: {
    icon: BookOpen,
    label: "Course",
    color: "text-violet-500 bg-violet-50",
    href: (r: SearchResult) => `/course/${r.id}`,
  },
  chapter: {
    icon: Layers,
    label: "Chapter",
    color: "text-blue-500 bg-blue-50",
    href: (r: SearchResult) => `/course/${r.course_id}`,
  },
  topic: {
    icon: Tag,
    label: "Topic",
    color: "text-emerald-500 bg-emerald-50",
    href: (r: SearchResult) => `/course/${r.course_id}`,
  },
  lesson: {
    icon: FileText,
    label: "Lesson",
    color: "text-amber-500 bg-amber-50",
    href: (r: SearchResult) => `/lesson/${r.lesson_id}`,
  },
};

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.search(query);
        setResults(data);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  const navigate = useCallback(
    (result: SearchResult) => {
      const config = typeConfig[result.type];
      router.push(config.href(result));
      setOpen(false);
    },
    [router]
  );

  // Arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      navigate(results[selectedIndex]);
    }
  };

  return (
    <>
      {/* Trigger button in navbar */}
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        id="search-trigger-btn"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search...</span>
        <kbd className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      {/* Mobile icon only */}
      <button
        onClick={() => setOpen(true)}
        className="flex sm:hidden items-center justify-center w-9 h-9 rounded-lg border border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
        id="search-trigger-btn-mobile"
      >
        <Search className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.15 }}
              className="fixed left-1/2 top-[15%] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                {loading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                ) : (
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search courses, chapters, topics, lessons…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Results */}
              <div className="max-h-[400px] overflow-y-auto">
                {!query.trim() && (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                    <Search className="mb-3 h-8 w-8 opacity-30" />
                    <p className="text-sm">Start typing to search your courses</p>
                  </div>
                )}

                {query.trim() && !loading && results.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                    <p className="text-sm">No results found for <strong>&quot;{query}&quot;</strong></p>
                    <p className="text-xs mt-1 opacity-70">Try a different keyword</p>
                  </div>
                )}

                {results.length > 0 && (
                  <ul className="p-2">
                    {results.map((result, index) => {
                      const config = typeConfig[result.type];
                      const Icon = config.icon;
                      const isSelected = index === selectedIndex;
                      return (
                        <li key={`${result.type}-${result.id}`}>
                          <button
                            onMouseEnter={() => setSelectedIndex(index)}
                            onClick={() => navigate(result)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                              isSelected ? "bg-secondary" : "hover:bg-secondary/60"
                            }`}
                          >
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.color}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{result.title}</p>
                              {result.subtitle && (
                                <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                                {config.label}
                              </span>
                              {isSelected && <ArrowRight className="h-3.5 w-3.5 text-primary" />}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-2">
                  <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">↑↓</kbd> navigate
                  <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">↵</kbd> open
                </span>
                <span>
                  <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">Esc</kbd> close
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
