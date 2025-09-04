"""
Prototype 3 — adapter_printer.py
Thin adapter for printer output (text only).
FEATURE-GATED: choose real vs mock via features.py
CONTRACTS:
- send_text(text: str) -> bool
"""

from features import FEATURES

def send_text(text: str) -> bool:
    if FEATURES.get("printer_mock_mode", True):
        return _send_text_mock(text)
    return _send_text_real(text)

def _send_text_mock(text: str) -> bool:
    # In mock mode we just succeed and maybe log
    from trace_utils import log_event
    log_event("PRINTER_MOCK_SEND", {"chars": len(text)})
    return True

def _send_text_real(text: str) -> bool:
    # Replace with your real printing path when ready
    # e.g., write to a txt file for iPad app pickup
    with open("last_print.txt", "w", encoding="utf-8") as f:
        f.write(text)
    from trace_utils import log_event
    log_event("PRINTER_REAL_SEND", {"file": "last_print.txt"})
    return True
