import time
from typing import Any, Dict, List, Optional
import faiss
from sentence_transformers import SentenceTransformer
from .bm25f_index import CustomBM25FIndex, StructuredChunk


class HybridContextRetriever:
    """
    Dimension 1: Spatial Hybrid Retriever.
    Fuses CustomBM25FIndex + FAISS via Confidence-Weighted RRF and Dynamic Thresholding (2-8 chunks).
    """

    def __init__(self, embedding_model_name: str = "all-MiniLM-L6-v2", rrf_k: int = 60):
        self.embedder = SentenceTransformer(embedding_model_name)
        self.bm25f = CustomBM25FIndex()
        self.rrf_k = rrf_k

        self.faiss_index: Optional[faiss.IndexFlatIP] = None
        self.chunk_store: Dict[str, StructuredChunk] = {}
        self.faiss_id_to_chunk_id: List[str] = []

    def index_chunks(self, chunks: List[StructuredChunk]) -> None:
        if not chunks:
            return

        # Filter out chunks already present to prevent duplicate FAISS embeddings
        new_chunks = [c for c in chunks if c.chunk_id not in self.chunk_store]
        if not new_chunks:
            return

        self.bm25f.add_chunks(new_chunks)

        texts_to_embed = []
        for c in new_chunks:
            self.chunk_store[c.chunk_id] = c
            self.faiss_id_to_chunk_id.append(c.chunk_id)
            texts_to_embed.append(c.metadata["full_text"])

        embeddings = self.embedder.encode(
            texts_to_embed, convert_to_numpy=True, normalize_embeddings=True
        ).astype("float32")

        if self.faiss_index is None:
            dim = embeddings.shape[1]
            self.faiss_index = faiss.IndexFlatIP(dim)

        self.faiss_index.add(embeddings)

    def retrieve_dynamic(
        self,
        query: str,
        min_chunks: int = 2,
        max_chunks: int = 8,
        drop_ratio_threshold: float = 0.62,
    ) -> Dict[str, Any]:
        t0 = time.perf_counter()

        if not self.chunk_store or self.faiss_index is None:
            return {
                "selected_chunks": [],
                "rrf_scores": [],
                "bm25f_coverages": [],
                "latency_ms": 0.0,
            }

        top_k_candidates = min(20, len(self.chunk_store))

        # Track 1: Custom BM25F
        bm25f_results = self.bm25f.search(query, top_k=top_k_candidates)
        bm25f_ranks = {res.chunk_id: rank + 1 for rank, res in enumerate(bm25f_results)}
        bm25f_meta = {res.chunk_id: res for res in bm25f_results}

        # Track 2: FAISS Dense Search
        q_emb = self.embedder.encode(
            [query], convert_to_numpy=True, normalize_embeddings=True
        ).astype("float32")
        dense_scores, dense_indices = self.faiss_index.search(q_emb, top_k_candidates)

        faiss_ranks = {}
        faiss_sim = {}
        for rank, idx in enumerate(dense_indices[0]):
            if idx != -1 and idx < len(self.faiss_id_to_chunk_id):
                cid = self.faiss_id_to_chunk_id[idx]
                faiss_ranks[cid] = rank + 1
                faiss_sim[cid] = float(dense_scores[0][rank])

        # Confidence-Weighted RRF
        all_candidate_ids = set(bm25f_ranks.keys()) | set(faiss_ranks.keys())
        rrf_scores: Dict[str, float] = {}

        for cid in all_candidate_ids:
            score = 0.0
            if cid in bm25f_ranks:
                cov = bm25f_meta[cid].idf_coverage
                score += (0.5 + 0.5 * cov) * (1.0 / (self.rrf_k + bm25f_ranks[cid]))
            if cid in faiss_ranks:
                score += 1.0 / (self.rrf_k + faiss_ranks[cid])
            rrf_scores[cid] = score

        ranked_ids = sorted(all_candidate_ids, key=lambda c: rrf_scores[c], reverse=True)
        if not ranked_ids:
            return {
                "selected_chunks": [],
                "rrf_scores": [],
                "bm25f_coverages": [],
                "latency_ms": round((time.perf_counter() - t0) * 1000, 2),
            }

        # Dynamic Thresholding (2 to 8 chunks)
        peak_rrf = rrf_scores[ranked_ids[0]]
        selected_chunks = []

        for idx, cid in enumerate(ranked_ids[:max_chunks]):
            current_rrf = rrf_scores[cid]
            relative_score = current_rrf / max(peak_rrf, 1e-9)

            if idx >= min_chunks and relative_score < drop_ratio_threshold:
                break

            chunk_obj = self.chunk_store[cid]
            bm25_info = bm25f_meta.get(cid)

            selected_chunks.append({
                "chunk_id": cid,
                "text": chunk_obj.metadata["full_text"],
                "page": chunk_obj.page_number,
                "header": chunk_obj.fields.get("section_header", ""),
                "rrf_score": round(current_rrf, 5),
                "normalized_score": round(relative_score, 4),
                "idf_coverage": bm25_info.idf_coverage if bm25_info else 0.0,
                "field_contributions": bm25_info.field_contributions if bm25_info else {},
                "dense_similarity": round(faiss_sim.get(cid, 0.0), 4),
            })

        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        return {
            "selected_chunks": selected_chunks,
            "rrf_scores": [rrf_scores[c] for c in ranked_ids[:max_chunks]],
            "bm25f_coverages": [
                bm25f_meta[c].idf_coverage if c in bm25f_meta else 0.0
                for c in ranked_ids[:max_chunks]
            ],
            "latency_ms": latency_ms,
        }

