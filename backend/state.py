from dataclasses import dataclass, field, asdict
from threading import Lock
from typing import List, Optional
import time


@dataclass
class AgentMessage:
    agent: str
    model: str
    content: str
    timestamp: float


@dataclass
class MaestroState:
    running: bool = False
    original_task: str = ""
    current_agent: Optional[str] = None
    current_model: Optional[str] = None
    current_code: str = ""
    error: Optional[str] = None
    conversation: List[AgentMessage] = field(default_factory=list)

    # not serialized
    lock: Lock = field(default_factory=Lock, repr=False, compare=False)

    def reset(self):
        with self.lock:
            self.running = False
            self.original_task = ""
            self.current_agent = None
            self.current_model = None
            self.current_code = ""
            self.error = None
            self.conversation.clear()

    def to_dict(self) -> dict:
        with self.lock:
            return {
                "running": self.running,
                "original_task": self.original_task,
                "current_agent": self.current_agent,
                "current_model": self.current_model,
                "current_code": self.current_code,
                "error": self.error,
                "conversation": [
                    {
                        "agent": m.agent,
                        "model": m.model,
                        "content": m.content,
                        "timestamp": m.timestamp,
                    }
                    for m in self.conversation
                ],
            }


STATE = MaestroState()