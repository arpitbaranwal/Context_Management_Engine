# Context Management Engine — REST API Contract & Integration Specification

This document defines the strict API contract between the **React Frontend** and the **FastAPI Backend / Hybrid RAG Engine**.

---

## 1. Overview & Architecture

```
React Frontend (Vite + TypeScript + Tailwind)
       │  HTTP REST (JSON & Multipart)
       ▼
Backend API Layer (FastAPI / backend_bridge.py)
       │  Native Python Import
       ▼
Context Management Engine (try/try.py)
       ├── PyMuPDF & Tesseract OCR (File extraction)
       ├── Sliding-window Chunker (1000 char / 200 overlap)
       ├── BM25Okapi (Filtered conversational stopwords)
       ├── SentenceTransformer ('all-MiniLM-L6-v2', 384-d)
       ├── FAISS IndexFlatL2 (Exact Euclidean distance)
       └── Gemini 3.5 Flash (Strictly grounded generation)
```

The frontend includes an automatic health detection system (`/api/health`) and an isolated, algorithmically faithful **Mock Adapter** that mirrors `try.py`. When your backend starts on `http://localhost:8000`, the frontend automatically transitions to **Live Backend Mode**.

---

## 2. API Endpoints Specification

### 2.1 Health Check
- **Method / Path:** `GET /api/health`
- **Description:** Verifies server availability and model readiness.
- **Response Format (`200 OK`):**
```json
{
  "status": "healthy",
  "engineLoaded": true,
  "version": "1.0.0",
  "indexedDocuments": 3,
  "totalChunks": 25
}
```

---

### 2.2 List Documents
- **Method / Path:** `GET /api/documents`
- **Description:** Returns metadata for all ingested and indexed documents.
- **Response Format (`200 OK`):**
```json
[
  {
    "id": "doc-1727800000-paper.pdf",
    "name": "paper.pdf",
    "size": 482100,
    "type": "pdf",
    "uploadedAt": "2026-10-02T14:22:00Z",
    "status": "ready",
    "chunksCount": 10,
    "pagesCount": 8,
    "extractedChars": 8740,
    "chunks": [
      {
        "id": 1,
        "source": "paper.pdf",
        "page": 1,
        "tokenCount": 184,
        "text": "Chunk text content..."
      }
    ]
  }
]
```

---

### 2.3 Upload & Index Documents
- **Method / Path:** `POST /api/documents/upload`
- **Content-Type:** `multipart/form-data`
- **Parameters:** `files: List[UploadFile]` (max 5 files matching `try.py`)
- **Supported Formats:** `.pdf`, `.png`, `.jpg`, `.jpeg`
- **Response Format (`200 OK`):** Returns the list of newly indexed `DocumentMetadata` objects.

---

### 2.4 Delete Document
- **Method / Path:** `DELETE /api/documents/{doc_id}`
- **Description:** Removes document from index and updates BM25 + FAISS corpus.
- **Response Format (`200 OK`):**
```json
{
  "success": true
}
```

---

### 2.5 Submit Research Query
- **Method / Path:** `POST /api/research/query`
- **Content-Type:** `application/json`
- **Request Body:**
```json
{
  "query": "What is the formula and scaling factor for Scaled Dot-Product Attention?",
  "documentIds": ["doc-1", "doc-2"],
  "topK": 5
}
```
- **Response Format (`200 OK`):**
```json
{
  "answer": "According to the context [Source 1], Attention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V...",
  "relevantChunks": [
    {
      "id": 7,
      "source": "attention.pdf",
      "text": "The attention function is computed as..."
    }
  ],
  "citations": [
    {
      "citationId": 1,
      "chunkId": 7,
      "source": "attention.pdf",
      "textExcerpt": "The attention function is computed as Attention(Q, K, V)...",
      "page": 3
    }
  ],
  "latencyMs": 420,
  "grounded": true
}
```

---

### 2.6 Inspect Retrieval Pipeline Telemetry
- **Method / Path:** `POST /api/retrieval/inspect`
- **Content-Type:** `application/json`
- **Request Body:**
```json
{
  "query": "Can you please explain in layman terms how FAISS works",
  "topK": 5
}
```
- **Response Format (`200 OK`):**
```json
{
  "rawQuery": "Can you please explain in layman terms how FAISS works",
  "filteredQueryTokens": ["faiss", "works"],
  "removedStopwords": ["can", "you", "please", "explain", "in", "layman", "terms", "how"],
  "topBm25Indices": [2, 5, 1],
  "topFaissIndices": [2, 4, 3],
  "combinedIndices": [1, 2, 3, 4, 5],
  "scoredChunks": [
    {
      "chunk": { "id": 2, "source": "paper.pdf", "text": "..." },
      "bm25Score": 4.12,
      "bm25Rank": 1,
      "faissDistance": 0.412,
      "faissRank": 1,
      "hybridScore": 0.0328,
      "hybridRank": 1,
      "matchedTokens": ["faiss"]
    }
  ],
  "totalCandidates": 25,
  "retrievalLatencyMs": 8,
  "bm25LatencyMs": 2,
  "faissLatencyMs": 5
}
```

---

### 2.7 System Evaluation Metrics
- **Method / Path:** `GET /api/evaluation/metrics`
- **Response Format (`200 OK`):**
```json
{
  "meanPrecisionAtK": 0.942,
  "meanRecallAtK": 0.961,
  "meanReciprocalRank": 0.985,
  "meanNdcgAtK": 0.924,
  "averageRetrievalLatencyMs": 7.9,
  "contextReductionRatio": 88.4,
  "totalEvaluatedQueries": 5,
  "groundednessScore": 0.965,
  "samples": []
}
```

---

## 3. How to Run the Backend Bridge Immediately

We have prepared a ready-to-run FastAPI bridge in `backend_bridge.py`:

```bash
# 1. Install the complete supported backend environment
# Run this from the repository root.
python -m pip install -r requirements.txt

# 2. Run the server
python -m uvicorn backend_bridge:app --host 0.0.0.0 --port 8000 --reload
```

The React frontend will immediately detect `http://localhost:8000/api` and display **"Backend Live"** in the top navigation!
