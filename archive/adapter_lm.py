"""
Prototype 3 — adapter_lm.py
LM Studio model loader/inference with restart hook.
CONTRACTS:
- load_model(name: str) -> bool
- infer(prompt: str, max_tokens: int=256) -> str
- restart_model(name: str) -> bool
"""

from features import FEATURES
from trace_utils import log_event

_current_model = None

def load_model(name: str) -> bool:
    global _current_model
    _current_model = name
    log_event("LM_LOAD", {"model": name})
    return True

def infer(prompt: str, max_tokens: int = 256) -> str:
    # mock inference
    log_event("LM_INFER", {"model": _current_model or "unset", "tok": max_tokens})
    return f"[MOCK({_current_model})] {prompt[:80]}..."

def restart_model(name: str) -> bool:
    log_event("LM_RESTART", {"model": name})
    return load_model(name)
