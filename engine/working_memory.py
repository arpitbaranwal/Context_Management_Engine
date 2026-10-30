import math
from dataclasses import dataclass
from typing import Any, Dict, List, Set


@dataclass
class DeskSlot:
    """Represents a single chunk actively held in the LLM's working memory desk."""
    chunk_id: str
    text: str
    page: int
    header: str
    token_count: int
    initial_score: float
    turn_added: int
    last_cited_turn: int = -1
    times_cited: int = 0

    @property
    def is_pinned(self) -> bool:
        return self.times_cited > 0

    def compute_utility(self, current_turn: int, decay_rate: float = 0.35) -> float:
        age = max(0, current_turn - self.turn_added)
        recency_factor = math.exp(-decay_rate * age)
        cited_recently = 1.0 if (self.last_cited_turn == current_turn - 1) else 0.0
        citation_bonus = min(1.0, (0.6 * cited_recently) + (0.2 * self.times_cited))
        return round(
            (0.50 * self.initial_score) + (0.35 * citation_bonus) + (0.15 * recency_factor),
            4,
        )


class WorkingMemoryDesk:
    """
    Dimension 2: Temporal Context Manager.
    Manages the active multi-turn context window like an OS cache using utility-based eviction.
    """

    def __init__(self, max_token_budget: int = 2000):
        self.max_token_budget = max_token_budget
        self.current_turn: int = 0
        self.active_slots: Dict[str, DeskSlot] = {}
        self.eviction_log: List[Dict[str, Any]] = []

    @property
    def used_tokens(self) -> int:
        return sum(slot.token_count for slot in self.active_slots.values())

    def allocate_turn_context(
        self, candidate_chunks: List[Dict[str, Any]]
    ) -> List[DeskSlot]:
        self.current_turn += 1

        for item in candidate_chunks:
            cid = item["chunk_id"]
            if cid in self.active_slots:
                slot = self.active_slots[cid]
                slot.initial_score = max(slot.initial_score, item["normalized_score"])
                slot.turn_added = self.current_turn
            else:
                self.active_slots[cid] = DeskSlot(
                    chunk_id=cid,
                    text=item["text"],
                    page=item.get("page", 1),
                    header=item.get("header", ""),
                    token_count=max(1, len(item["text"].split())),
                    initial_score=item["normalized_score"],
                    turn_added=self.current_turn,
                )

        ranked_slots = sorted(
            self.active_slots.values(),
            key=lambda s: (s.is_pinned, s.compute_utility(self.current_turn)),
            reverse=True,
        )

        kept_slots: Dict[str, DeskSlot] = {}
        running_tokens = 0

        for slot in ranked_slots:
            if running_tokens + slot.token_count <= self.max_token_budget:
                kept_slots[slot.chunk_id] = slot
                running_tokens += slot.token_count
            else:
                self.eviction_log.append({
                    "turn": self.current_turn,
                    "evicted_chunk_id": slot.chunk_id,
                    "utility_at_eviction": slot.compute_utility(self.current_turn),
                })

        self.active_slots = kept_slots
        return self.get_active_chunks()

    def get_active_chunks(self) -> List[DeskSlot]:
        """
        Returns all chunks currently held in the working memory desk,
        prioritizing pinned chunks followed by utility-ranked chunks.
        """
        return sorted(
            self.active_slots.values(),
            key=lambda s: (s.is_pinned, s.compute_utility(self.current_turn)),
            reverse=True,
        )

    def register_llm_citations(self, cited_chunk_ids: Set[Any]) -> None:
        c_set = {str(cid) for cid in cited_chunk_ids}
        for cid, slot in self.active_slots.items():
            if str(cid) in c_set or str(slot.chunk_id) in c_set:
                slot.last_cited_turn = self.current_turn
                slot.times_cited += 1

    def clear(self) -> None:
        self.current_turn = 0
        self.active_slots.clear()
        self.eviction_log.clear()

