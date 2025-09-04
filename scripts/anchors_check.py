# Simple anchor checker: verifies "=== SECTION" exists after TOC mentions
import sys, re, pathlib

SECT = re.compile(r"^#\s*===\s*SECTION:", re.I)
REGN = re.compile(r"^\s*//\s*===\s*REGION:", re.I)

def has_anchor(line: str) -> bool:
    return bool(SECT.search(line) or REGN.search(line))

def check_file(p: pathlib.Path) -> list[str]:
    errors = []
    lines = p.read_text(encoding="utf-8", errors="ignore").splitlines()
    if not any("TOC:" in ln for ln in lines):
        return errors  # no TOC, skip
    if not any(has_anchor(ln) for ln in lines):
        errors.append(f"{p.name}: TOC present but no SECTION/REGION anchors found")
    return errors

def main():
    root = pathlib.Path(".")
    bad = []
    for p in root.glob("*.*"):
        if p.name.endswith((".py",".ts",".tsx",".md",".txt",".html")):
            bad.extend(check_file(p))
    for p in root.glob("scripts/*.py"):
        bad.extend(check_file(p))
    if bad:
        print("\n".join(bad))
        sys.exit(1)
    print("Anchors OK")

if __name__ == "__main__":
    main()
