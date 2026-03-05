# backend/models.py
# ============================================================
# Maestro 2.0 Pydantic Models (Drop‑in Replacement)
# ------------------------------------------------------------
# Responsibilities:
# - Define request/response schemas for FastAPI endpoints
# - Keep things minimal but explicit
# - Add light debug hooks if we ever need to extend later
# ============================================================

from pydantic import BaseModel


class StartRequest(BaseModel):
    """
    Request body for POST /start

    Fields:
    - task: the natural language instruction Maestro should execute
    """
    task: str
