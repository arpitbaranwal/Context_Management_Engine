import re
from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass
class ControlDecision:
    status: str  # "PROCEED" or "ABSTAIN_LOW_CONFIDENCE"
    sub_queries: List[str]
    confidence_score: float
    reason: str


class ReflectiveController:
    """
    Dimension 3: Self-Correcting Control Flow.
    Splits multi-hop comparative queries pre-retrieval and gates confidence post-retrieval.
    """

    COMPARISON_PATTERNS = [
        r"\bcompare\s+(.+?)\s+(?:and|with|vs\.?|versus)\s+(.+)",
        r"\bdifference\s+between\s+(.+?)\s+and\s+(.+)",
        r"\bhow\s+does\s+(.+?)\s+differ\s+from\s+(.+)",
    ]

    @staticmethod
    def expand_follow_up_query(user_query: str, chat_history: List[Dict[str, Any]]) -> str:
        """
        If a follow-up query is short or relies on contextual pronouns/topics,
        prepend semantic keywords from the preceding conversation turn.
        """
        if not chat_history or len(chat_history) < 2:
            return user_query

        # Find the preceding user message in conversation history
        prev_user_msgs = [
            m["content"] for m in chat_history
            if m.get("role") == "user" and m.get("content") != user_query
        ]
        last_user_msg = prev_user_msgs[-1] if prev_user_msgs else chat_history[-2].get("content", "")

        if not last_user_msg:
            return user_query

        # Extract root topic if preceding message was already an expanded query
        root_topic = last_user_msg.split(" -> ")[0].strip()

        words = user_query.strip().split()

        # Check if query is short (< 8 words)
        if len(words) < 8:
            return f"{root_topic} -> {user_query}"

        # Contextual pronouns, parts/examples, and anaphoric markers indicating continuation
        anaphoric_cues = {
            "it", "its", "they", "them", "their", "these", "those", "this", "that",
            "component", "components", "part", "parts", "element", "elements",
            "step", "steps", "example", "examples", "real life", "real-life",
            "analogy", "analogies", "four", "three", "two", "types", "formula",
            "matrix", "table", "above", "more", "why", "how", "elaborate", "details",
        }
        query_lower = user_query.lower()
        has_anaphora = any(
            re.search(r"\b" + re.escape(cue) + r"\b", query_lower)
            for cue in anaphoric_cues
        )

        # Conversational continuation starters
        continuation_starters = (
            "okay", "ok", "so", "then", "now", "and", "also", "what about",
            "how about", "can you", "could you", "tell me", "explain me",
            "give me", "please explain",
        )
        starts_continuation = any(query_lower.startswith(prefix) for prefix in continuation_starters)

        if has_anaphora or starts_continuation:
            return f"{root_topic} -> {user_query}"

        return user_query

    @classmethod
    def decompose_query(cls, query: str) -> List[str]:
        clean_q = query.strip().rstrip("?.!")
        for pattern in cls.COMPARISON_PATTERNS:
            match = re.search(pattern, clean_q, flags=re.IGNORECASE)
            if match:
                topic_a, topic_b = match.group(1).strip(), match.group(2).strip()
                if len(topic_a) >= 3 and len(topic_b) >= 3:
                    return [topic_a, topic_b]
        if " -> " in query:
            parts = [p.strip() for p in query.split(" -> ") if p.strip()]
            if len(parts) >= 2:
                return [parts[0], f"{parts[0]} {parts[1]}"]
        return [query]

    @staticmethod
    def evaluate_retrieval_confidence(
        rrf_scores: List[float],
        bm25f_coverages: List[float],
        sub_queries: List[str],
        min_coverage_floor: float = 0.20,
        has_prior_context: bool = False,
    ) -> ControlDecision:
        if not rrf_scores or not bm25f_coverages:
            if has_prior_context:
                return ControlDecision(
                    status="PROCEED",
                    sub_queries=sub_queries,
                    confidence_score=0.60,
                    reason="Grounding maintained via multi-turn active working memory context.",
                )
            return ControlDecision(
                status="ABSTAIN_LOW_CONFIDENCE",
                sub_queries=sub_queries,
                confidence_score=0.0,
                reason="Zero matching chunks returned by hybrid index.",
            )

        peak_coverage = max(bm25f_coverages)
        top_score = rrf_scores[0]
        tail_score = rrf_scores[-1] if len(rrf_scores) > 1 else top_score * 0.5

        separation_ratio = (top_score - tail_score) / max(top_score, 1e-6)
        confidence = round((0.65 * peak_coverage) + (0.35 * separation_ratio), 4)

        # In multi-turn dialogues, if active working memory exists and retrieval finds candidates, proceed
        if has_prior_context and (top_score >= 0.015 or peak_coverage > 0.0):
            adjusted_confidence = max(confidence, 0.65)
            return ControlDecision(
                status="PROCEED",
                sub_queries=sub_queries,
                confidence_score=adjusted_confidence,
                reason="Multi-turn conversation: context grounded via working memory and semantic retrieval.",
            )

        if peak_coverage < min_coverage_floor and not has_prior_context:
            return ControlDecision(
                status="ABSTAIN_LOW_CONFIDENCE",
                sub_queries=sub_queries,
                confidence_score=confidence,
                reason=(
                    f"Peak lexical IDF coverage ({peak_coverage:.0%}) fell below "
                    f"the {min_coverage_floor:.0%} grounding safety threshold."
                ),
            )

        return ControlDecision(
            status="PROCEED",
            sub_queries=sub_queries,
            confidence_score=confidence,
            reason="Retrieval passed lexical IDF coverage and rank separation gates.",
        )

