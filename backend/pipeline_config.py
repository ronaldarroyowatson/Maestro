# =====================================================================
# backend/pipeline_config.py
# Strongly-typed configuration objects that mirror the XML schema.
# =====================================================================

from dataclasses import dataclass
from typing import List, Dict


@dataclass
class AgentDisplay:
    label: str
    color: str
    icon: str
    position: Dict[str, int]


@dataclass
class AgentParameters:
    temperature: float
    max_tokens: int


@dataclass
class AgentTool:
    name: str
    enabled: bool


@dataclass
class AgentMemory:
    strategy: str


@dataclass
class AgentConfig:
    id: str
    role: str
    model: str
    display: AgentDisplay
    prompt: str
    parameters: AgentParameters
    tools: List[AgentTool]
    memory: AgentMemory


@dataclass
class EdgeConfig:
    source: str
    target: str
    condition: str


@dataclass
class ExecutionConfig:
    mode: str
    max_turns: int
    stop_on_first_success: bool


@dataclass
class PipelineConfig:
    id: str
    version: str
    name: str
    description: str
    agents: List[AgentConfig]
    edges: List[EdgeConfig]
    execution: ExecutionConfig