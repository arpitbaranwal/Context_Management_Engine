# 📦 Dependency Architecture & Installation Guide

This directory serves as the centralized source of truth for all runtime dependencies, native extensions, and system-level prerequisites.

---

## Quick Reference

| Component | Installation Command | Description |
| :--- | :--- | :--- |
| **Complete Python Stack** | `python -m pip install -r requirements.txt` | Installs FastAPI, PyMuPDF, FAISS, Sentence-Transformers, BM25, and Gemini SDK |
| **React Frontend Stack** | `npm ci --prefix frontend` | Installs Vite, React 19, Tailwind CSS v4, Motion, and icons via reproducible lockfile |
| **Streamlit Prototype** | *(uses Python stack above)* | Run directly via `streamlit run Context_Management_Engine-main/app.py` |

---

## Detailed Specifications

- 📄 **[Python Packages](python-requirements.txt)** — Exhaustive list of pinned and bounded Python libraries for Python 3.10–3.13.
- 🗺️ **[Module Import Map](module-map.md)** — Maps import identifiers (e.g. `pymupdf`, `PIL`, `google.generativeai`) to PyPI distribution names.
- ⚙️ **[System Prerequisites](system-requirements.md)** — Guide for non-pip tools such as Tesseract OCR and platform-specific vector libraries.

---

> [!NOTE]
> When adding new dependencies, maintain reproducibility by adding Python packages to `dependencies/python-requirements.txt` and updating `frontend/package.json` with `npm install` inside `frontend/`.
