from typing import List
import fitz  # PyMuPDF
from .bm25f_index import StructuredChunk


def parse_pdf_to_structured_chunks(
    pdf_bytes: bytes,
    filename: str,
    chunk_size_words: int = 220,
    overlap_words: int = 40,
) -> List[StructuredChunk]:
    """
    Parses a PDF from raw bytes, separates Section Headers from Body Text
    using font-size/bold span heuristics, and builds overlapping StructuredChunks.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    doc_id = filename.replace(" ", "_").rsplit(".", 1)[0]
    doc_title = doc.metadata.get("title") or filename

    structured_chunks: List[StructuredChunk] = []
    current_header = "Introduction & Overview"
    global_chunk_counter = 0

    for page_idx, page in enumerate(doc):
        page_dict = page.get_text("dict")
        page_words: List[str] = []

        for block in page_dict.get("blocks", []):
            if "lines" not in block:
                continue
            for line in block["lines"]:
                line_text_parts = []
                is_heading_line = False

                for span in line.get("spans", []):
                    text = span.get("text", "").strip()
                    if not text:
                        continue
                    if span.get("size", 11.0) >= 13.0 or (span.get("flags", 0) & 16):
                        is_heading_line = True
                    line_text_parts.append(text)

                full_line = " ".join(line_text_parts).strip()
                if not full_line:
                    continue

                if is_heading_line and len(full_line.split()) <= 14:
                    current_header = full_line
                else:
                    page_words.extend(full_line.split())

        if not page_words:
            # Fallback to raw page text if dict blocks were empty
            fallback_text = page.get_text("text").strip()
            if fallback_text:
                page_words = fallback_text.split()

        if not page_words:
            continue

        step = max(1, chunk_size_words - overlap_words)
        for start_idx in range(0, len(page_words), step):
            window_words = page_words[start_idx : start_idx + chunk_size_words]
            if len(window_words) < 15 and start_idx > 0:
                break

            body_text = " ".join(window_words)
            global_chunk_counter += 1
            chunk_id = f"{doc_id}_p{page_idx + 1}_c{global_chunk_counter}"

            structured_chunks.append(
                StructuredChunk(
                    chunk_id=chunk_id,
                    doc_id=doc_id,
                    page_number=page_idx + 1,
                    fields={
                        "doc_title": doc_title,
                        "section_header": current_header,
                        "body": body_text,
                    },
                    metadata={
                        "source": filename,
                        "page": page_idx + 1,
                        "header": current_header,
                        "full_text": f"[{current_header}] {body_text}",
                    },
                )
            )

    doc.close()
    return structured_chunks

