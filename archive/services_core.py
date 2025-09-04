"""
Prototype 3 — services_core.py
CONTRACTS:
- place cross-cutting domain functions here
TOC:
- SECTION: imports
- SECTION: schema_version_check
"""

# === SECTION: imports
from database import ensure_schema_current

# === SECTION: schema_version_check
def startup_checks() -> None:
    ensure_schema_current()

# >>> RUNBOOK (last_updated=init):
# python -c "import services_core as s; s.startup_checks(); print('ok')"
