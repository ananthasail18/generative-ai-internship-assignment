"""PDF metadata + text extraction service backed by PyMuPDF (fitz)."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger(__name__)

try:
    import fitz  # PyMuPDF
except Exception:  # pragma: no cover
    fitz = None  # type: ignore


@dataclass
class PDFMetadata:
    title: Optional[str]
    author: Optional[str]
    page_count: int
    file_size: int


def extract_metadata(file_path: str | Path) -> PDFMetadata:
    """Return core PDF metadata: title, author, page count."""
    p = Path(file_path)
    if not p.exists():
        raise FileNotFoundError(p)
    if fitz is None:
        raise RuntimeError("PyMuPDF (fitz) is not installed")
    size = p.stat().st_size
    try:
        doc = fitz.open(str(p))
    except Exception as exc:
        logger.error("Failed to open PDF %s: %s", p, exc)
        raise
    try:
        meta = doc.metadata or {}
        title = (meta.get("title") or "").strip() or None
        author = (meta.get("author") or "").strip() or None
        return PDFMetadata(
            title=title,
            author=author,
            page_count=doc.page_count,
            file_size=size,
        )
    finally:
        doc.close()


def extract_page_texts(file_path: str | Path, max_pages: Optional[int] = None) -> List[str]:
    """Return raw text per page. Used in future AI pipeline (not yet wired)."""
    p = Path(file_path)
    if fitz is None:
        raise RuntimeError("PyMuPDF (fitz) is not installed")
    doc = fitz.open(str(p))
    pages: List[str] = []
    try:
        n = doc.page_count if max_pages is None else min(max_pages, doc.page_count)
        for i in range(n):
            pages.append(doc.load_page(i).get_text("text"))
        return pages
    finally:
        doc.close()


def extract_toc_and_context(file_path: str | Path) -> str:
    """Extract outline TOC and smart sampled pages from PDF for full book structure analysis."""
    p = Path(file_path)
    if fitz is None:
        return ""
    doc = fitz.open(str(p))
    try:
        parts: List[str] = []
        
        # 1. Native PyMuPDF Bookmark Table of Contents
        toc = doc.get_toc()
        if toc:
            toc_lines = [f"{'  ' * (item[0]-1)}- {item[1]} (Page {item[2]})" for item in toc[:150]]
            parts.append("PDF BOOKMARK TABLE OF CONTENTS:\n" + "\n".join(toc_lines))
        
        # 2. First 20 pages (usually contains printed TOC, preface, chapter index)
        first_pages_count = min(20, doc.page_count)
        first_pages = [doc.load_page(i).get_text("text") for i in range(first_pages_count)]
        parts.append(f"FIRST {first_pages_count} PAGES (TABLE OF CONTENTS / PREFACE / FRONT MATTER):\n" + "\n\n--- PAGE ---\n\n".join(first_pages))
        
        # 3. Sample pages evenly across the document if > 20 pages
        if doc.page_count > 20:
            step = max(5, doc.page_count // 30)
            sample_indices = list(range(20, doc.page_count, step))[:25]
            sampled_pages = [f"[Page {idx+1}]\n" + doc.load_page(idx).get_text("text")[:800] for idx in sample_indices]
            parts.append("SAMPLED PAGES ACROSS DOCUMENT:\n" + "\n\n".join(sampled_pages))
            
        return "\n\n====================\n\n".join(parts)
    except Exception as e:
        logger.warning("Failed to extract TOC context: %s", e)
        return ""
    finally:
        doc.close()


def infer_title_from_first_page(file_path: str | Path, fallback: str) -> str:
    """Best-effort title inference when PDF metadata is empty."""
    try:
        meta = extract_metadata(file_path)
        if meta.title:
            return meta.title
        pages = extract_page_texts(file_path, max_pages=1)
        if pages:
            for line in pages[0].splitlines():
                line = line.strip()
                if 3 <= len(line) <= 120:
                    return line
    except Exception:
        pass
    return fallback
