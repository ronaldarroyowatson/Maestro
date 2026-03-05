# backend/state.py
# ============================================================
# Maestro 2.0 Shared State (Drop‑in Replacement)
# ------------------------------------------------------------
# Responsibilities:
# - Hold all runtime state for a single Maestro run
# - Provide a thread‑safe reset() and to_dict()
# - Represent individual agent messages
# - Be the single source of truth for the frontend
# ============================================================

from dataclasses import dataclass, asdict
from typing import List, Optional, Any
import threading
import time


# ------------------------------------------------------------
# Debug helper (kept minimal to avoid noise)
# ------------------------------------------------------------
def debug(msg: str):
    print(f"[MAESTRO-STATE][{time.strftime('%H:%M:%S')}] {msg}")


# ============================================================
# AgentMessage: one entry in the conversation timeline
# ============================================================

@dataclass
class AgentMessage:
    agent: str
    model: str
    content: str
    timestamp: float


# ============================================================
# State: global, shared, thread‑safe Maestro run state
# ============================================================

class State:
    def __init__(self):
        # Lock to protect all mutations
        self.lock = threading.Lock()
        # Core fields
        self.running: bool = False
        self.original_task: str = ""
        self.current_agent: str = ""
        self.current_model: str = ""
        self.current_code: str = ""
        self.conversation: List[AgentMessage] = []
        self.error: Optional[str] = None

    # --------------------------------------------------------
    # Reset state for a new run
    # --------------------------------------------------------
    def reset(self):
        debug("State.reset() called")
        self.running = False
        self.original_task = ""
        self.current_agent = ""
        self.current_model = ""
        self.current_code = ""
        self.conversation = []
        self.error = None
        debug("State.reset() completed")

    # --------------------------------------------------------
    # Serialize to dict for WebSocket broadcast / frontend
    # --------------------------------------------------------
    def to_dict(self) -> dict:
        with self.lock:
            return {
                "running": self.running,
                "original_task": self.original_task,
                "current_agent": self.current_agent,
                "current_model": self.current_model,
                "current_code": self.current_code,
                "conversation": [asdict(msg) for msg in self.conversation],
                "error": self.error,
            }


# Single shared instance imported as STATE everywhere else
STATE = State()
