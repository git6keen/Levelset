# Prototype 3 (single-folder)

- One backend entrypoint: `main.py`
- One frontend entrypoint: `main.tsx`
- Only shallow subfolders: `/scripts`, `/tests`
- Anchors/TOC in big files; RUNBOOKs inline
- Trace: GET /dev/trace • Health: GET /healthz

## Quick start
# Backend (Python 3.10+)
pip install fastapi uvicorn pydantic
python main.py

# Frontend (Vite-like dev simplest path)
# If you prefer, serve index.html with any static server; we will add bundler later.

## Pre-commit hygiene
python .\scripts\anchors_check.py
