# 💻 Context Management Engine — Web Workspace

<div align="center">

[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=111827)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.1-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**An editorial-grade document intelligence interface featuring live retrieval diagnostics, dual adapter architecture, and seamless dark/light modes.**

</div>

---

## ✨ Features

- **Adaptive API Architecture** — Automatically transitions between a standalone Mock Adapter (with built-in fixture corpus) and Live FastAPI Bridge (`/api/health`).
- **Explainable Retrieval Telemetry** — Inspect exact BM25 keyword match scores, FAISS Euclidean distances, stopword pruning, and hybrid reciprocal ranks.
- **Multimodal Document Management** — Drag-and-drop batch upload supporting PDFs and scanned images, real-time chunk inspectors, and progress indicators.
- **Typography & Motion** — Built with Geist & Newsreader variable fonts, accessible motion primitives (`AnimatedBackground`, `TransitionPanel`), and responsive layouts.
- **Strict Client-Side Security** — Zero API keys stored in client bundles. All LLM calls and credentials remain isolated on the backend server.

---

## 🚀 Quickstart

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies with reproducible lockfile
npm ci

# 3. Configure environment
# Copy template: leave VITE_API_BASE_URL empty for mock demo mode,
# or set to http://localhost:8000 for live backend mode.
cp .env.example .env

# 4. Start local development server
npm run dev

# 5. Typecheck and build for production
npm run typecheck
npm run build
```

---

## 📁 Source Directory Map

```text
src/
├── api/             # HTTP client, typed interfaces, and dual adapters (mock vs live)
│   ├── adapters/    # live.ts (FastAPI bridge) and mock.ts (offline fixtures)
│   └── mock/        # Deterministic sample passages and document fixtures
├── components/      # Reusable UI primitives and layout containers
│   ├── layout/      # AppShell, Brand, ThemeToggle, TopNav
│   └── ui/          # Button, Field, Overlay, Tabs, AnimatedBackground, TransitionPanel
├── features/        # High-level domain workflows
│   ├── documents/   # Document listing, filters, and chunk inspectors
│   ├── research/    # DocPicker, Composer, ResearchEntry, RetrievalPanel, SourceDrawer
│   └── upload/      # Drag-and-drop upload dialog and queue manager
├── pages/           # Route views (Dashboard, Documents, DocumentDetail, Research, Auth)
├── state/           # React context providers (Auth, Documents, Selection, Theme, History)
└── lib/             # Formatters, routing utilities, and class merge helpers (cn)
```

---

> [!TIP]
> For backend configuration, RAG engine details, and root launcher instructions, refer to the [Root README](../README.md).
