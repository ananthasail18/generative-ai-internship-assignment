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
