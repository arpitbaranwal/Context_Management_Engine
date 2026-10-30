from __future__ import annotations
import math
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple


@dataclass(frozen=True)
class FieldConfig:
    """Hyperparameters for a specific structural field in a PDF chunk."""
    weight: float = 1.0
    b: float = 0.75


@dataclass
class StructuredChunk:
    """Represents a parsed PDF chunk with separated structural fields."""
    chunk_id: str
    doc_id: str
    page_number: int
    fields: Dict[str, str]  # keys: "doc_title", "section_header", "body"
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BM25FSearchResult:
    chunk_id: str
    score: float
    idf_coverage: float
    matched_terms: List[str]
    field_contributions: Dict[str, float]


class AcademicTokenizer:
    """
    Custom tokenizer for academic PDFs and technical documentation.
    Preserves compound terms while decomposing CamelCase, snake_case, and hyphenated tokens.
    """
    CONVERSATIONAL_STOPWORDS: Set[str] = {
        "a", "an", "the", "and", "or", "but", "if", "then", "else", "when",
        "at", "by", "for", "with", "about", "against", "between", "into",
        "through", "during", "before", "after", "above", "below", "to", "from",
        "up", "down", "in", "out", "on", "off", "over", "under", "again",
        "further", "once", "here", "there", "all", "any", "both", "each",
        "few", "more", "most", "other", "some", "such", "no", "nor", "not",
        "only", "own", "same", "so", "than", "too", "very", "can", "will",
        "just", "should", "now", "what", "which", "who", "whom", "this",
        "that", "these", "those", "am", "is", "are", "was", "were", "be",
        "been", "being", "have", "has", "had", "having", "do", "does", "did",
        "doing", "explain", "tell", "me", "please", "how", "work", "describe",
        "summary", "summarize", "context", "according", "okay", "ok", "you", "your",
        "give", "help", "hello", "hi", "also", "well"
    }

    TOKEN_PATTERN = re.compile(r"[A-Za-z0-9]+(?:[-_@.+/][A-Za-z0-9]+)*")
    CAMEL_SPLIT = re.compile(r"(?<=[a-z])(?=[A-Z])|(?=[A-Z][a-z])")

    @classmethod
    def tokenize(cls, text: str, keep_compounds: bool = True) -> List[str]:
        if not text:
            return []

        raw_matches = cls.TOKEN_PATTERN.findall(text)
        tokens: List[str] = []

        for raw in raw_matches:
            lower_raw = raw.lower()
            if lower_raw in cls.CONVERSATIONAL_STOPWORDS or len(lower_raw) < 2:
                continue

            tokens.append(lower_raw)

            if keep_compounds and any(sep in raw for sep in ("-", "_", "/", ".")):
                sub_parts = re.split(r"[-_/.]", lower_raw)
                for part in sub_parts:
                    if len(part) >= 2 and part not in cls.CONVERSATIONAL_STOPWORDS:
                        tokens.append(part)
            elif keep_compounds:
                camel_parts = [p for p in cls.CAMEL_SPLIT.split(raw) if p]
                if len(camel_parts) > 1:
                    for part in camel_parts:
                        p_low = part.lower()
                        if len(p_low) >= 2 and p_low not in cls.CONVERSATIONAL_STOPWORDS:
                            tokens.append(p_low)

        return tokens


class CustomBM25FIndex:
    """
    From-scratch Fielded BM25 (BM25F) Inverted Index (Robertson & Zaragoza formulation).
    Normalizes per-field lengths prior to non-linear saturation k1 and supports O(1) soft deletion.
    """

    def __init__(
        self,
        k1: float = 1.5,
        field_configs: Optional[Dict[str, FieldConfig]] = None,
    ):
        self.k1 = k1
        self.field_configs: Dict[str, FieldConfig] = field_configs or {
            "doc_title": FieldConfig(weight=2.5, b=0.15),
            "section_header": FieldConfig(weight=3.0, b=0.15),
            "body": FieldConfig(weight=1.0, b=0.75),
        }

        self._chunks: Dict[str, StructuredChunk] = {}
        self._active_chunk_ids: Set[str] = set()
        self._doc_to_chunks: Dict[str, Set[str]] = defaultdict(set)
        self._postings: Dict[str, Dict[str, Dict[str, int]]] = defaultdict(dict)

        self._field_lengths: Dict[str, Dict[str, int]] = {
            f: {} for f in self.field_configs
        }
        self._field_length_sums: Dict[str, int] = {
            f: 0 for f in self.field_configs
        }

    @property
    def active_count(self) -> int:
        return len(self._active_chunk_ids)

    def _avg_field_length(self, field_name: str) -> float:
        n = self.active_count
        if n == 0:
            return 1.0
        avg = self._field_length_sums.get(field_name, 0) / n
        return max(avg, 1.0)

    def add_chunk(self, chunk: StructuredChunk) -> None:
        cid = chunk.chunk_id
        if cid in self._active_chunk_ids:
            self.remove_chunk(cid)

        self._chunks[cid] = chunk
        self._active_chunk_ids.add(cid)
        self._doc_to_chunks[chunk.doc_id].add(cid)

        for field_name in self.field_configs:
            raw_text = chunk.fields.get(field_name, "")
            tokens = AcademicTokenizer.tokenize(raw_text)
            length = len(tokens)

            self._field_lengths[field_name][cid] = length
            self._field_length_sums[field_name] += length

            term_counts = Counter(tokens)
            for term, tf in term_counts.items():
                if cid not in self._postings[term]:
                    self._postings[term][cid] = {}
                self._postings[term][cid][field_name] = tf

    def add_chunks(self, chunks: List[StructuredChunk]) -> None:
        for chunk in chunks:
            self.add_chunk(chunk)

    def remove_chunk(self, chunk_id: str) -> bool:
        if chunk_id not in self._active_chunk_ids:
            return False

        self._active_chunk_ids.remove(chunk_id)
        for field_name in self.field_configs:
            length = self._field_lengths[field_name].pop(chunk_id, 0)
            self._field_length_sums[field_name] -= length
        return True

    def remove_document(self, doc_id: str) -> int:
        chunk_ids = list(self._doc_to_chunks.get(doc_id, []))
        removed = sum(1 for cid in chunk_ids if self.remove_chunk(cid))
        self._doc_to_chunks.pop(doc_id, None)
        return removed

    def _compute_idf(self, term: str) -> Tuple[float, Dict[str, Dict[str, int]]]:
        raw_postings = self._postings.get(term, {})
        if not raw_postings:
            return 0.0, {}

        active_postings = {
            cid: field_tfs
            for cid, field_tfs in raw_postings.items()
            if cid in self._active_chunk_ids
        }
        df = len(active_postings)
        if df == 0:
            return 0.0, {}

        n = self.active_count
        idf = math.log(1.0 + (n - df + 0.5) / (df + 0.5))
        return idf, active_postings

    def search(self, query: str, top_k: int = 20) -> List[BM25FSearchResult]:
        if self.active_count == 0:
            return []

        query_tokens = list(dict.fromkeys(AcademicTokenizer.tokenize(query)))
        if not query_tokens:
            return []

        avg_lengths = {f: self._avg_field_length(f) for f in self.field_configs}

        scores: Dict[str, float] = defaultdict(float)
        matched_idf_sum: Dict[str, float] = defaultdict(float)
        matched_terms_map: Dict[str, List[str]] = defaultdict(list)
        field_contrib_map: Dict[str, Dict[str, float]] = defaultdict(
            lambda: defaultdict(float)
        )

        total_query_idf = 0.0

        for term in query_tokens:
            idf, active_postings = self._compute_idf(term)
            if idf <= 0.0:
                continue

            total_query_idf += idf

            for cid, field_tfs in active_postings.items():
                pseudo_tf = 0.0
                per_field_pseudo: Dict[str, float] = {}

                for field_name, tf in field_tfs.items():
                    cfg = self.field_configs[field_name]
                    dl = self._field_lengths[field_name].get(cid, 0)
                    avgdl = avg_lengths[field_name]

                    norm_denom = 1.0 - cfg.b + cfg.b * (dl / avgdl)
                    weighted_tf = cfg.weight * (tf / norm_denom)

                    pseudo_tf += weighted_tf
                    per_field_pseudo[field_name] = weighted_tf

                if pseudo_tf <= 0.0:
                    continue

                term_score = idf * (pseudo_tf / (self.k1 + pseudo_tf))
                scores[cid] += term_score
                matched_idf_sum[cid] += idf
                matched_terms_map[cid].append(term)

                for field_name, f_tf in per_field_pseudo.items():
                    proportion = f_tf / pseudo_tf
                    field_contrib_map[cid][field_name] += term_score * proportion

        if not scores:
            return []

        ranked_cids = sorted(scores.keys(), key=lambda c: scores[c], reverse=True)[:top_k]

        results: List[BM25FSearchResult] = []
        for cid in ranked_cids:
            coverage = (
                matched_idf_sum[cid] / total_query_idf
                if total_query_idf > 0
                else 0.0
            )
            results.append(
                BM25FSearchResult(
                    chunk_id=cid,
                    score=round(scores[cid], 5),
                    idf_coverage=round(coverage, 4),
                    matched_terms=matched_terms_map[cid],
                    field_contributions={
                        k: round(v, 4) for k, v in field_contrib_map[cid].items()
                    },
                )
            )

        return results

