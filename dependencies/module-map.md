# Module map

## Python

| Imported module | Installable package | Used for |
| --- | --- | --- |
| `fastapi`, `fastapi.middleware.cors` | `fastapi` | REST API and CORS |
| `uvicorn` | `uvicorn[standard]` | ASGI development server |
| `dotenv` | `python-dotenv` | Loads `.env` configuration |
| `pydantic` | `pydantic` | Request validation |
| `numpy` | `numpy` | Numeric ranking operations |
| `pymupdf` | `PyMuPDF` | PDF text extraction |
| `PIL` | `Pillow` | Image loading |
| `pytesseract` | `pytesseract` + Tesseract app | OCR bridge |
| `rank_bm25` | `rank-bm25` | BM25 lexical retrieval |
| `sentence_transformers` | `sentence-transformers` | Dense embeddings (`all-MiniLM-L6-v2`) |
| `faiss` | `faiss-cpu` | Vector similarity index |
| `google.generativeai` | `google-generativeai` | Gemini answer generation |
| `streamlit` | `streamlit` | Standalone prototype and engine cache decorator |

## Frontend

`frontend/package.json` and `frontend/package-lock.json` define the frontend. The direct production modules are React, React DOM, Motion, Lucide React, Geist, Newsreader, and `clsx`. Vite, TypeScript, Tailwind CSS, React types, and Vite plugins are development/build modules.

Use `npm ci --prefix frontend` rather than manually installing each package; it respects the checked-in lockfile.
