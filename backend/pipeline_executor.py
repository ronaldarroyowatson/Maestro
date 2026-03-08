# =====================================================================
# backend/pipeline_executor.py
# Production-ready pipeline execution engine
# Coordinates turn-by-turn agent execution, state tracking, and events
# =====================================================================
#
# EVENT PROTOCOL (WebSocket Events)
# ====================================
# All events are broadcast via STATE.broadcast_event() and delivered to
# frontend via WebSocket polling. Events have a "type" field and context-specific
# fields documented below:
#
# 1. pipeline_start
#    - Fired when pipeline execution begins
#    - Fields: agents (list), agents_metadata (dict), max_rounds (int),
#              routing_strategy (str), mode (str)
#    - Frontend action: Initialize UI, clear conversation, show progress bar
#
# 2. agent_turn_start
#    - Fired when an agent begins processing (before message generation)
#    - Fields: round (int), agent (str), agent_role (str), model (str)
#    - Frontend action: Update agent indicator, show active status
#
# 3. agent_message
#    - Fired when an agent completes and emits a message
#    - Fields: round (int), agent (str), agent_role (str), model (str), content (str)
#    - Frontend action: Add message to conversation, extract code if present
#
# 4. agent_turn_end
#    - Fired when an agent finishes its turn
#    - Fields: round (int), agent (str), agent_role (str), model (str)
#    - Frontend action: Update agent indicator to idle
#
# 5. pipeline_complete
#    - Fired when pipeline execution finishes successfully
#    - Fields: rounds (int), final_response (str or null)
#    - Frontend action: Update status to "Completed", enable start button
#
# 6. pipeline_error
#    - Fired when pipeline execution fails or is interrupted
#    - Fields: error (str), rounds (int)
#    - Frontend action: Update status to "Error", display error message
#
# 7. heartbeat
#    - Sent periodically by WebSocket handler to keep connection alive
#    - Fields: none
#    - Frontend action: Ignore (connection keep-alive only)
# =====================================================================

from typing import Dict, Any, Optional
import re

from .debug import log_debug
from .state import STATE
from .pipeline_config import ExecutionConfig, EdgeConfig


# =====================================================================
# Turn-by-turn execution wrapper
# =====================================================================

class PipelineExecutor:
    """
    Orchestrates pipeline execution with real-time state updates,
    edge-based routing, and event broadcasting.
    Consumes structured compilation output from pipeline_compiler.
    """

    def __init__(
        self,
        agents_map: Dict[str, Any],
        manager: Any,
        edges: list,
        execution_config: Any,
        agents_metadata: Optional[Dict[str, Any]] = None,
        routing: Optional[Dict[str, Any]] = None,
    ):
        self.agents_map = agents_map
        self.manager = manager
        self.edges = edges if edges else []
        self.execution_config = execution_config
        self.agents_metadata = agents_metadata or {}
        self.routing = routing or {"strategy": "round_robin", "edges": []}
        self.round_num = 0
        self.should_stop = False

        log_debug(
            "pipeline_executor",
            f"Executor initialized with {len(agents_map)} agents, strategy={self.routing.get('strategy', 'unknown')}"
        )







    def _should_stop_execution(self, message: str) -> bool:
        """Determine if execution should stop based on message and config."""
        # Handle both dict and ExecutionConfig formats
        max_turns = (
            self.execution_config.get("max_turns")
            if isinstance(self.execution_config, dict)
            else getattr(self.execution_config, "max_turns", 12)
        )
        stop_on_success = (
            self.execution_config.get("stop_on_first_success")
            if isinstance(self.execution_config, dict)
            else getattr(self.execution_config, "stop_on_first_success", False)
        )

        if self.round_num >= max_turns:
            log_debug("pipeline_executor", f"Max rounds {max_turns} reached")
            return True

        if stop_on_success:
            if self._is_success_message(message):
                log_debug("pipeline_executor", "Success indicator detected")
                return True

        return False

    @staticmethod
    def _is_success_message(message: str) -> bool:
        """Heuristic to detect if message indicates task completion."""
        success_markers = [
            r"(?i)(complete|done|finished|success|solved)",
            r"(?i)(final answer|solution is)",
            r"(?i)(code is ready|implementation complete)",
        ]
        return any(re.search(pattern, message) for pattern in success_markers)

    # =====================================================================
    # Edge-based routing support
    # =====================================================================

    def _apply_edge_routing(self):
        """Configure conditional speaker selection based on edges."""
        if not self.edges:
            log_debug("pipeline_executor", "No edges defined; using default round-robin")
            return

        log_debug("pipeline_executor", f"Configuring edge-based routing ({len(self.edges)} edges)")

        # Build edge map from edges (handle both dict and object formats)
        edge_map = {}
        for edge in self.edges:
            source = edge.source if hasattr(edge, "source") else edge.get("source")
            target = edge.target if hasattr(edge, "target") else edge.get("target")

            if source and target:
                edge_map.setdefault(source, []).append(target)

        self.edge_map = edge_map
        log_debug("pipeline_executor", f"Built edge map from {len(self.edges)} edges")

    # =====================================================================
    # Main execution entry point
    # =====================================================================

    def run(self) -> bool:
        """
        Execute the pipeline with real-time state tracking.
        Returns True if completed successfully, False if interrupted.
        """
        try:
            log_debug("pipeline_executor", "Pipeline execution starting")

            # Extract execution parameters
            max_turns = (
                self.execution_config.get("max_turns", 12)
                if isinstance(self.execution_config, dict)
                else getattr(self.execution_config, "max_turns", 12)
            )
            mode = (
                self.execution_config.get("mode", "round_robin")
                if isinstance(self.execution_config, dict)
                else getattr(self.execution_config, "mode", "round_robin")
            )

            STATE.broadcast_event({
                "type": "pipeline_start",
                "agents": list(self.agents_map.keys()),
                "agents_metadata": self.agents_metadata,
                "max_rounds": max_turns,
                "routing_strategy": self.routing.get("strategy", "unknown"),
                "mode": mode,
            })

            # Build edge map for routing
            self._apply_edge_routing()

            # Get task from state
            task = STATE.original_task or "No task provided"
            log_debug("pipeline_executor", f"Task acquired from STATE: {task[:100]}...")

            # Initialize messages with user task
            messages = [{"role": "user", "content": task}]
            conversation_history = [messages[0]]  # Keep full history for context
            
            # Test agent connectivity before starting
            log_debug("pipeline_executor", "Testing agent connectivity...")
            test_agent = self.agents_map.get("composer")
            if test_agent:
                log_debug("pipeline_executor", f"Test agent type: {type(test_agent)}")
                log_debug("pipeline_executor", f"Test agent name: {test_agent.name}")
                log_debug("pipeline_executor", f"Test agent system_message: {test_agent.system_message[:100]}...")
                log_debug("pipeline_executor", f"Test agent llm_config: {test_agent.llm_config}")
                try:
                    test_messages = [{"role": "user", "content": "Hello, test message"}]
                    log_debug("pipeline_executor", f"Calling generate_reply with messages: {test_messages}")
                    test_reply = test_agent.generate_reply(test_messages)
                    log_debug("pipeline_executor", f"Test reply from composer: '{test_reply}' (length: {len(test_reply)})")
                    if not test_reply:
                        log_debug("pipeline_executor", "WARNING: Test reply is empty!")
                except Exception as e:
                    log_debug("pipeline_executor", f"WARNING: Test reply failed: {e}")
                    import traceback
                    log_debug("pipeline_executor", f"Test traceback: {traceback.format_exc()}")
                    # Continue anyway, might still work

            # Determine starting agent (assume 'composer' for now)
            current_agent_id = "composer"
            if current_agent_id not in self.agents_map:
                error_msg = f"Starting agent '{current_agent_id}' not found in agent map"
                log_debug("pipeline_executor", f"ERROR: {error_msg}")
                STATE.add_message("system", "system", f"ERROR: {error_msg}")
                STATE.broadcast_event({
                    "type": "pipeline_error",
                    "error": error_msg,
                    "rounds": 0,
                })
                return False

            current_agent = self.agents_map[current_agent_id]
            self.round_num = 0

            # Custom turn-by-turn execution loop
            while not self.should_stop and self.round_num < max_turns:
                self.round_num += 1

                agent_metadata = self.agents_metadata.get(current_agent_id, {})
                # Extract model name from llm_config
                model = "unknown"
                if hasattr(current_agent, 'llm_config') and current_agent.llm_config:
                    if isinstance(current_agent.llm_config, dict):
                        # New config_list format
                        config_list = current_agent.llm_config.get("config_list", [])
                        if config_list and len(config_list) > 0:
                            model = config_list[0].get("model", "unknown")
                        else:
                            model = current_agent.llm_config.get("model", "unknown")
                    else:
                        # Legacy format
                        model = getattr(current_agent.llm_config, "model", "unknown")

                # Broadcast agent turn start
                STATE.broadcast_event({
                    "type": "agent_turn_start",
                    "round": self.round_num,
                    "agent": current_agent_id,
                    "agent_role": agent_metadata.get("role", "unknown"),
                    "model": model,
                })

                # Build per-turn input so each agent receives explicit user-style context.
                # This avoids empty responses when the previous turn ended with an assistant-role message.
                agent_input_messages = conversation_history
                if conversation_history and conversation_history[-1].get("role") == "assistant":
                    recent_lines = []
                    for msg in conversation_history[-4:]:
                        speaker = msg.get("name") or msg.get("role", "unknown")
                        text = (msg.get("content") or "").strip()
                        if len(text) > 600:
                            text = text[:600] + "..."
                        recent_lines.append(f"{speaker}: {text}")

                    handoff_prompt = (
                        f"Original task:\n{task}\n\n"
                        f"Recent context:\n{chr(10).join(recent_lines)}\n\n"
                        f"You are '{current_agent_id}' with role '{agent_metadata.get('role', 'agent')}'. "
                        "Continue the work from the latest context. "
                        "If code is needed, output complete code in fenced blocks."
                    )
                    agent_input_messages = [{"role": "user", "content": handoff_prompt}]

                # Generate reply - use conversation history for context
                try:
                    log_debug("pipeline_executor", f"Calling generate_reply for agent '{current_agent_id}' with {len(agent_input_messages)} messages")
                    log_debug("pipeline_executor", f"Last message: {agent_input_messages[-1] if agent_input_messages else 'None'}")
                    
                    # Try generate_reply first
                    reply = current_agent.generate_reply(agent_input_messages, sender=None)
                    
                    log_debug("pipeline_executor", f"Agent '{current_agent_id}' generate_reply returned: '{reply[:100]}...' (length: {len(reply)})")
                    
                    if not reply or reply.strip() == "":
                        log_debug("pipeline_executor", f"WARNING: Agent '{current_agent_id}' returned empty reply, trying alternative method")
                        
                        # Try alternative: use the LLM client directly
                        try:
                            from autogen.oai import OpenAIWrapper
                            client = OpenAIWrapper(**current_agent.llm_config)
                            response = client.create(
                                messages=agent_input_messages,
                                model=current_agent.llm_config.get("config_list", [{}])[0].get("model")
                            )
                            reply = response.choices[0].message.content if response.choices else ""
                            log_debug("pipeline_executor", f"Direct LLM call returned: '{reply[:100]}...'")
                            
                        except Exception as alt_e:
                            log_debug("pipeline_executor", f"Direct LLM call also failed: {alt_e}")
                            reply = f"[Agent {current_agent_id} could not generate response]"
                    
                except Exception as e:
                    log_debug("pipeline_executor", f"Exception in generate_reply: {e}")
                    import traceback
                    log_debug("pipeline_executor", f"Traceback: {traceback.format_exc()}")
                    error_msg = f"Error generating reply from agent '{current_agent_id}': {str(e)}"
                    log_debug("pipeline_executor", f"ERROR: {error_msg}")
                    STATE.add_message("system", "system", f"ERROR: {error_msg}")
                    STATE.broadcast_event({
                        "type": "pipeline_error",
                        "error": error_msg,
                        "rounds": self.round_num,
                    })
                    return False

                # Add reply to conversation history
                conversation_history.append({"role": "assistant", "content": reply, "name": current_agent_id})

                # Log coder output for debugging
                if current_agent_id == "coder":
                    log_debug("pipeline_executor", f"Coder output: {reply[:200]}...")
                    if "```" not in reply and "def " not in reply and "class " not in reply:
                        log_debug("pipeline_executor", "WARNING: Coder output does not appear to contain code!")

                # Update state
                STATE.set_current_execution(current_agent_id, model, agent_metadata.get("role", "unknown"))
                STATE.add_message(current_agent_id, model, reply)

                # Broadcast agent message
                STATE.broadcast_event({
                    "type": "agent_message",
                    "round": self.round_num,
                    "agent": current_agent_id,
                    "agent_role": agent_metadata.get("role", "unknown"),
                    "model": model,
                    "content": reply,
                })

                # Broadcast agent turn end
                STATE.broadcast_event({
                    "type": "agent_turn_end",
                    "round": self.round_num,
                    "agent": current_agent_id,
                    "agent_role": agent_metadata.get("role", "unknown"),
                    "model": model,
                })

                # Check stop condition
                if self._should_stop_execution(reply):
                    log_debug("pipeline_executor", "Stop condition detected; halting execution")
                    self.should_stop = True
                    break

                # Select next agent based on edge routing
                next_agents = getattr(self, 'edge_map', {}).get(current_agent_id, [])
                if not next_agents:
                    log_debug("pipeline_executor", f"No next agents for '{current_agent_id}'; ending execution")
                    break

                current_agent_id = next_agents[0]  # Assume sequential for now
                if current_agent_id not in self.agents_map:
                    error_msg = f"Next agent '{current_agent_id}' not found in agent map"
                    log_debug("pipeline_executor", f"ERROR: {error_msg}")
                    STATE.add_message("system", "system", f"ERROR: {error_msg}")
                    STATE.broadcast_event({
                        "type": "pipeline_error",
                        "error": error_msg,
                        "rounds": self.round_num,
                    })
                    return False
                current_agent = self.agents_map[current_agent_id]

            log_debug("pipeline_executor", f"Pipeline execution completed after {self.round_num} rounds")
            STATE.broadcast_event({
                "type": "pipeline_complete",
                "rounds": self.round_num,
                "final_response": conversation_history[-1]["content"] if conversation_history else None,
            })

            return True

        except KeyError as e:
            error_msg = f"Configuration error: Missing key {e}"
            log_debug("pipeline_executor", f"ERROR: {error_msg}")
            STATE.add_message("system", "system", f"ERROR: {error_msg}")
            STATE.broadcast_event({
                "type": "pipeline_error",
                "error": error_msg,
                "rounds": self.round_num,
            })
            return False
        
        except TypeError as e:
            error_msg = f"Type error during execution: {e}"
            log_debug("pipeline_executor", f"ERROR: {error_msg}")
            STATE.add_message("system", "system", f"ERROR: {error_msg}")
            STATE.broadcast_event({
                "type": "pipeline_error",
                "error": error_msg,
                "rounds": self.round_num,
            })
            return False
        
        except Exception as e:
            error_msg = f"Pipeline execution error: {str(e)[:200]}"
            log_debug("pipeline_executor", f"ERROR: {error_msg}")
            STATE.add_message("system", "system", f"ERROR: {error_msg}")
            STATE.broadcast_event({
                "type": "pipeline_error",
                "error": error_msg,
                "rounds": self.round_num,
            })
            return False

        finally:
            STATE.set_running(False)
            log_debug("pipeline_executor", "Pipeline execution cleanup complete")


# =====================================================================
# Module-level convenience function
# =====================================================================

def execute_pipeline(compiled: Dict[str, Any]) -> bool:
    """
    High-level entry point for pipeline execution.

    Consumes structured output from pipeline_compiler and executes the pipeline.

    Args:
        compiled: Dict from pipeline_compiler containing:
            - agents_map: Dict[agent_id, Agent]
            - manager: GroupChatManager
            - execution: Execution config (dict or ExecutionConfig)
            - routing: Routing metadata (optional)
            - agents_metadata: Structured agent data (optional)
            - edges: Raw edges (optional, for backward compatibility)

    Returns:
        True if execution completed successfully, False otherwise.
    """
    log_debug("pipeline_executor", "=== EXECUTION START ===")

    # Extract core components
    agents_map = compiled.get("agents_map", {})
    manager = compiled.get("manager")
    edges = compiled.get("edges", [])
    execution_config = compiled.get("execution")
    agents_metadata = compiled.get("agents_metadata", {})
    routing = compiled.get("routing", {"strategy": "round_robin"})

    # Validate required fields
    if not manager:
        log_debug("pipeline_executor", "ERROR: No manager in compiled dict")
        return False

    if not agents_map:
        log_debug("pipeline_executor", "ERROR: No agents in compiled dict")
        return False

    if not execution_config:
        log_debug("pipeline_executor", "WARNING: No execution config; using defaults")
        execution_config = {
            "mode": "round_robin",
            "max_turns": 12,
            "stop_on_first_success": False,
        }

    log_debug("pipeline_executor", f"Initialized executor with {len(agents_map)} agents")

    executor = PipelineExecutor(
        agents_map=agents_map,
        manager=manager,
        edges=edges,
        execution_config=execution_config,
        agents_metadata=agents_metadata,
        routing=routing,
    )

    log_debug("pipeline_executor", "=== EXECUTION END ===")
    return executor.run()
