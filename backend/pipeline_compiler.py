# =====================================================================
# backend/pipeline_compiler.py
# Converts a PipelineConfig into runtime AutoGen objects and metadata:
# - Validates configuration completeness
# - Builds AssistantAgent instances with Ollama backend
# - Extracts agent metadata (roles, capabilities, routing info)
# - Structures edges and execution conditions
# - Creates GroupChat + GroupChatManager
# =====================================================================

from typing import Dict, List, Any, Optional

from autogen import AssistantAgent
from autogen import GroupChat, GroupChatManager

from .debug import log_debug
from .pipeline_config import PipelineConfig


# =====================================================================
# Configuration validation
# =====================================================================

def _validate_config(config: PipelineConfig) -> bool:
    """Validate that PipelineConfig has required fields for compilation."""
    log_debug("pipeline_compiler", f"Validating config: {config.id}")

    if not config.agents or len(config.agents) == 0:
        log_debug("pipeline_compiler", "ERROR: No agents defined in pipeline")
        return False

    if not config.execution:
        log_debug("pipeline_compiler", "ERROR: No execution config defined")
        return False

    if config.execution.max_turns is None or config.execution.max_turns <= 0:
        log_debug("pipeline_compiler", f"WARNING: Invalid max_turns {config.execution.max_turns}; using default 12")
        config.execution.max_turns = 12

    composer = next((a for a in config.agents if a.id == "composer"), None)
    if not composer:
        log_debug("pipeline_compiler", "WARNING: No 'composer' agent found; pipeline may fail to start")

    log_debug("pipeline_compiler", "Config validation passed")
    return True


# =====================================================================
# Agent metadata extraction
# =====================================================================

def _extract_agent_metadata(agent_cfg) -> Dict[str, Any]:
    """Extract structured metadata from agent config."""
    return {
        "id": agent_cfg.id,
        "role": agent_cfg.role,
        "model": agent_cfg.model,
        "temperature": agent_cfg.parameters.temperature,
        "max_tokens": agent_cfg.parameters.max_tokens,
        "tools": [
            {"name": tool.name, "enabled": tool.enabled}
            for tool in agent_cfg.tools
        ] if agent_cfg.tools else [],
        "memory_strategy": agent_cfg.memory.strategy if agent_cfg.memory else "stateless",
    }


# =====================================================================
# Edge and routing metadata
# =====================================================================

def _build_routing_metadata(edges: List) -> Dict[str, Any]:
    """Build routing information from edges."""
    if not edges:
        log_debug("pipeline_compiler", "No edges defined; using default round-robin routing")
        return {"strategy": "round_robin", "edges": []}

    edge_map = {}
    for edge in edges:
        edge_map.setdefault(edge.source, []).append(edge.target)

    log_debug("pipeline_compiler", f"Built edge map with {len(edge_map)} source agents")

    return {
        "strategy": "conditional",
        "edges": [
            {"source": e.source, "target": e.target, "condition": e.condition}
            for e in edges
        ],
        "edge_map": edge_map,
    }


# =====================================================================
# Execution conditions extraction
# =====================================================================

def _extract_execution_conditions(execution_config) -> Dict[str, Any]:
    """Extract structured stop conditions and execution parameters."""
    return {
        "mode": execution_config.mode or "round_robin",
        "max_turns": execution_config.max_turns or 12,
        "stop_on_first_success": execution_config.stop_on_first_success or False,
        "conditions": {
            "max_turns_reached": {"max_turns": execution_config.max_turns or 12},
            "stop_on_success": {"enabled": execution_config.stop_on_first_success or False},
        },
    }


# =====================================================================
# GroupChat + GroupChatManager builder
# =====================================================================

def _build_groupchat_and_manager(
    config: PipelineConfig,
    agents_map: Dict[str, AssistantAgent],
) -> GroupChatManager:
    """Build GroupChat and manager with compatibility patches."""
    log_debug("pipeline_compiler", "Building GroupChat and GroupChatManager")

    agent_list: List[AssistantAgent] = [agents_map[a.id] for a in config.agents]
    max_rounds = config.execution.max_turns or 12

    log_debug("pipeline_compiler", f"GroupChat will contain {len(agent_list)} agents with max_round={max_rounds}")

    groupchat = GroupChat(
        agents=agent_list,
        messages=[],
        max_round=max_rounds,
    )

    manager = GroupChatManager(groupchat=groupchat)

    # Defensive compatibility for AutoGen version differences
    if getattr(manager, "max_round", None) is None:
        manager.max_round = max_rounds
        log_debug("pipeline_compiler", "Set manager.max_round (was missing)")

    if getattr(manager, "groupchat", None) is not None:
        if getattr(manager.groupchat, "max_round", None) is None:
            manager.groupchat.max_round = max_rounds
            log_debug("pipeline_compiler", "Set manager.groupchat.max_round (was missing)")

    log_debug("pipeline_compiler", f"GroupChatManager created successfully")
    return manager


# =====================================================================
# Main compilation function
# =====================================================================

def compile_pipeline(config: PipelineConfig) -> Dict[str, Any]:
    """
    Convert PipelineConfig into runtime AutoGen objects and structured metadata.

    Returns a compiled dict with:
    - agents_map: Dict[agent_id, AssistantAgent]
    - manager: GroupChatManager
    - agents_metadata: Structured metadata for each agent
    - routing: Routing strategy and edges
    - execution: Execution parameters and stop conditions
    - edges: Raw edges from config (for backward compatibility)
    """
    log_debug("pipeline_compiler", f"=== COMPILATION START: {config.id} ===")

    # Validate before compiling
    if not _validate_config(config):
        log_debug("pipeline_compiler", "Config validation failed; aborting compilation")
        raise ValueError("PipelineConfig validation failed")

    agents_map: Dict[str, AssistantAgent] = {}
    agents_metadata: Dict[str, Any] = {}

    # Build AssistantAgent objects and metadata
    for agent_cfg in config.agents:
        log_debug("pipeline_compiler", f"Compiling agent: {agent_cfg.id} (model: {agent_cfg.model})")

        # Configure LLM for local Ollama models
        # Use base_url to point to local Ollama instance
        llm_config = {
            "config_list": [
                {
                    "model": agent_cfg.model,
                    "base_url": "http://localhost:11434/v1",
                    "api_key": "ollama",
                    "api_type": "openai",  # Treat Ollama as OpenAI-compatible API
                    "price": [0.0, 0.0],  # Dummy pricing to suppress warnings
                }
            ],
            "temperature": agent_cfg.parameters.temperature,
            "max_tokens": agent_cfg.parameters.max_tokens,
        }

        log_debug(
            "pipeline_compiler",
            f"Agent LLM config: model={agent_cfg.model}, base_url=http://localhost:11434/v1, temp={agent_cfg.parameters.temperature}, max_tokens={agent_cfg.parameters.max_tokens}"
        )

        agent = AssistantAgent(
            name=agent_cfg.id,
            system_message=agent_cfg.prompt,
            llm_config=llm_config,
        )

        agents_map[agent_cfg.id] = agent
        agents_metadata[agent_cfg.id] = _extract_agent_metadata(agent_cfg)

    # Build GroupChat and manager
    manager = _build_groupchat_and_manager(config, agents_map)

    # Extract metadata
    routing = _build_routing_metadata(config.edges)
    execution = _extract_execution_conditions(config.execution)

    log_debug("pipeline_compiler", f"Compiled {len(agents_map)} agents")
    log_debug("pipeline_compiler", f"Routing strategy: {routing['strategy']}")
    log_debug("pipeline_compiler", f"Execution mode: {execution['mode']}")
    log_debug("pipeline_compiler", f"Max turns: {execution['max_turns']}")
    log_debug("pipeline_compiler", f"Stop on success: {execution['stop_on_first_success']}")

    compiled = {
        "metadata": {
            "pipeline_id": config.id,
            "pipeline_version": config.version,
            "name": config.name,
            "description": config.description,
        },
        "agents_map": agents_map,
        "agents_metadata": agents_metadata,
        "manager": manager,
        "routing": routing,
        "execution": execution,
        "edges": config.edges,
    }

    log_debug("pipeline_compiler", f"=== COMPILATION COMPLETE: {config.id} ===")
    return compiled
