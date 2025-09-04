"""
Prototype 3 — printer_formatter.py
Pure text formatter for thermal printers (40 cols).
CONTRACTS:
- format_checklist(title: str, items: list[tuple[str,bool]], width=40) -> str
"""

from datetime import datetime
from typing import Iterable, List, Tuple

MAX_WIDTH_DEFAULT = 40

def wrap(text: str, width: int) -> List[str]:
    words = (text or "").split()
    if not words:
        return [""]
    lines, current = [], words[0]
    for w in words[1:]:
        if len(current) + 1 + len(w) <= width:
            current += " " + w
        else:
            lines.append(current)
            current = w
    lines.append(current)
    return lines

def format_checklist(title: str, items: Iterable[Tuple[str, bool]], width: int = MAX_WIDTH_DEFAULT) -> str:
    bar = "=" * width
    lines: List[str] = [bar]
    t = (title or "CHECKLIST").upper()
    pad = max(0, (width - len(t)) // 2)
    lines.append(" " * pad + t)
    lines.append(bar)
    lines.append(f"Printed: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append("-" * width)
    for i, (text, checked) in enumerate(items, start=1):
        box = "[x]" if checked else "[ ]"
        prefix = f"{box} {i}. "
        first = wrap(text or "", max(0, width - len(prefix)))
        if first:
            lines.append(prefix + first[0])
            indent = " " * len(prefix)
            for extra in first[1:]:
                lines.append(indent + extra)
        else:
            lines.append(prefix)
    lines.append("-" * width)
    lines.append("END")
    lines.append(bar)
    return "\n".join(lines) + "\n"

# >>> RUNBOOK (last_updated=init):
# python -c "from printer_formatter import format_checklist; print(format_checklist('Demo',[('Item A',False),('Item B',True)]))"
