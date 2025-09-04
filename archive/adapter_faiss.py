"""
Prototype 3 — adapter_faiss.py
Local vector search adapter with mock fallback.
CONTRACTS:
- upsert(id: str, text: str) -> None
- search(query: str, k: int=5) -> list[str]
"""

from features import FEATURES
from trace_utils import log_event

# Simple in-memory fallback
_MEM = {}

def upsert(id: str, text: str) -> None:
    if FEATURES.get("faiss_mock_mode", True):
        _MEM[id] = text
        log_event("FAISS_MOCK_UPSERT", {"id": id, "len": len(text)})
        return
    # TODO: plug real FAISS here

def search(query: str, k: int = 5) -> list[str]:
    if FEATURES.get("faiss_mock_mode", True):
        # naive contains search
        hits = [i for i, t in _MEM.items() if query.lower() in t.lower()]
        log_event("FAISS_MOCK_SEARCH", {"q": query, "hits": len(hits)})
        return hits[:k]
    # TODO: call real FAISS
    return []
