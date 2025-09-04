"""
Prototype 3 — models.py
Minimal Pydantic models for parity checks.
"""

from pydantic import BaseModel
from typing import List

class ChecklistItem(BaseModel):
    text: str
    completed: bool = False

class Checklist(BaseModel):
    id: str
    name: str
    items: List[ChecklistItem] = []
