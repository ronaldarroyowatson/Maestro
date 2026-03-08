# backend/state.py
# ============================================================
# Maestro Shared State (Thread‑Safe, Global)
# ------------------------------------------------------------
# Responsibilities:
# - Hold all runtime state for a single Maestro run
# - Provide thread‑safe reset(), add_message(), and to_dict()
# - Represent individual agent messages
# - Be the single source of truth for the frontend
# ============================================================

from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any
import threading
import time
import re

from .debug import log_debug


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
        self.lock = threading.Lock()
        self.running: bool = False
        self.original_task: str = ""
        self.current_agent: str = ""
        self.current_model: str = ""
        self.current_code: str = ""
        self.conversation: List[AgentMessage] = []
        self.error: Optional[str] = None
        self.last_event: Optional[Dict[str, Any]] = None

    # --------------------------------------------------------
    # Reset state for a new run
    # --------------------------------------------------------
    def reset(self):
        log_debug("state", "State.reset() called")
        with self.lock:
            self.running = False
            self.original_task = ""
            self.current_agent = ""
            self.current_model = ""
            self.current_code = ""
            self.conversation = []
            self.error = None
            self.last_event = None
        log_debug("state", "State.reset() completed")

    # --------------------------------------------------------
    # Add a message to the conversation timeline
    # --------------------------------------------------------
    def add_message(self, agent: str, model: str, content: str):
        if not agent or not model:
            log_debug("state", f"Invalid message parameters: agent='{agent}', model='{model}'")
            return
        with self.lock:
            msg = AgentMessage(
                agent=agent,
                model=model,
                content=content,
                timestamp=time.time()
            )
            self.conversation.append(msg)

            # Keep latest coder code in state so frontend can recover even if
            # event ordering causes agent_message to be missed.
            if agent == "coder" and content:
                code = self._extract_code_block(content)
                if code:
                    self.current_code = code
            log_debug("state", f"Message added: {agent} ({model})")

    @staticmethod
    def _extract_code_block(content: str) -> str:
        """Extract the latest fenced code block from agent output."""
        matches = re.findall(r"```(?:[\w+-]+)?\n([\s\S]*?)```", content)
        if not matches:
            return ""
        return matches[-1].strip()

    # --------------------------------------------------------
    # Set running state
    # --------------------------------------------------------
    def set_running(self, value: bool):
        if not isinstance(value, bool):
            log_debug("state", f"Invalid running value: {value} (expected bool)")
            return
        with self.lock:
            self.running = value
            log_debug("state", f"Running state set to: {value}")

    # --------------------------------------------------------
    # Broadcast execution event for WebSocket polling
    # --------------------------------------------------------
    def broadcast_event(self, event: Dict[str, Any]):
        if not isinstance(event, dict):
            log_debug("state", f"Invalid event format: {event} (expected dict)")
            return
        with self.lock:
            self.last_event = event
            log_debug("state", f"Event broadcasted: {event.get('type', 'unknown')}")

    # --------------------------------------------------------
    # Handle incoming WebSocket messages
    # --------------------------------------------------------
    def handle_ws_message(self, msg: str):
        if not msg:
            log_debug("state", "Empty WebSocket message received")
            return
        log_debug("state", f"WebSocket message received: {msg}")
        # Implement specific message handling logic here if needed

    # --------------------------------------------------------
    # Set current execution context
    # --------------------------------------------------------
    def set_current_execution(self, agent: str, model: str, role: str):
        if not agent or not model or not role:
            log_debug("state", f"Invalid execution parameters: agent='{agent}', model='{model}', role='{role}'")
            return
        with self.lock:
            self.current_agent = agent
            self.current_model = model
            log_debug("state", f"Current execution set: {agent} ({model}) as {role}")

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
                "last_event": self.last_event,
            }


# ============================================================
# Global shared instance
# ============================================================
STATE = State()
