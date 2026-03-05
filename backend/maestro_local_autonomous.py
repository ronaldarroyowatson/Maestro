# backend/maestro_local_autonomous.py
# ============================================================
# Maestro 2.0 — Local Autonomous Pipeline
# AutoGen 0.6.0 + Ollama (Drop‑in Replacement)
# ------------------------------------------------------------
# Responsibilities:
# - Define Composer / Coder / Critic / Archivist agents
# - Wire them into a deterministic GroupChat
# - Expose run_autonomous_task(task: str) for maestro_runner.py
# - Provide rich debug tracing for imports, LLM calls, and flow
# ============================================================

import time
from autogen import ConversableAgent, GroupChat, GroupChatManager

# ------------------------------------------------------------
# Debug helper
# ------------------------------------------------------------
def debug(msg: str):
    print(f"[MAESTRO-AUTO][{time.strftime('%H:%M:%S')}] {msg}")


debug(f"LOADED maestro_local_autonomous.py FROM: {__file__}")


# ============================================================
# Ollama LLM CONFIGS (AutoGen 0.6.0 correct format)
# ============================================================

OLLAMA_BASE = "http://localhost:11434"

composer_llm = {
    "model": "mistral:instruct",
    "api_type": "ollama",
    "api_base": OLLAMA_BASE,
}

coder_llm = {
    "model": "deepseek-coder:6.7b",
    "api_type": "ollama",
    "api_base": OLLAMA_BASE,
}

critic_llm = {
    "model": "mistral:instruct",
    "api_type": "ollama",
    "api_base": OLLAMA_BASE,
}

archivist_llm = {
    "model": "phi3",
    "api_type": "ollama",
    "api_base": OLLAMA_BASE,
}


# ============================================================
# Agent definitions
# ============================================================

debug("Initializing agents...")

composer = ConversableAgent(
    name="Composer",
    system_message=(
        "You are the Composer. Your job is to break the user's task into a clear, "
        "step-by-step plan for the Coder. Output ONLY the plan, no code."
    ),
    llm_config=composer_llm,
)

coder = ConversableAgent(
    name="Coder",
    system_message=(
        "You are the Coder. Write clean, correct Python code that satisfies the plan. "
        "Output ONLY code inside triple backticks."
    ),
    llm_config=coder_llm,
)

critic = ConversableAgent(
    name="Critic",
    system_message=(
        "You are the Critic. Review the Coder's output. Identify bugs, logic issues, "
        "or missing requirements. Output ONLY critique text."
    ),
    llm_config=critic_llm,
)

archivist = ConversableAgent(
    name="Archivist",
    system_message=(
        "You are the Archivist. Summarize the final solution and provide a clean final answer "
        "for the user, referencing the code and critique."
    ),
    llm_config=archivist_llm,
)

debug("Agents initialized.")


# ============================================================
# Optional: simple agent message tracing
# ============================================================

def _on_message(agent, message):
    # This fires whenever an agent sends a message
    preview = message.replace("\n", " ")[:120]
    debug(f"AGENT → {agent.name}: {preview!r}")

composer.on_message = _on_message
coder.on_message = _on_message
critic.on_message = _on_message
archivist.on_message = _on_message


# ============================================================
# GroupChat wiring (deterministic round‑robin)
# ============================================================

debug("Configuring GroupChat...")

groupchat = GroupChat(
    agents=[composer, coder, critic, archivist],
    messages=[],
    max_round=12,
    speaker_selection_method="round_robin",  # Composer → Coder → Critic → Archivist → repeat
)

manager = GroupChatManager(
    groupchat=groupchat,
    llm_config=composer_llm,  # manager uses a lightweight config; same Ollama endpoint
)

debug("GroupChat configured.")


# Optional: trace speaker selection
def _on_select_speaker(speaker):
    debug(f"MANAGER → Next speaker: {speaker.name}")

manager.on_select_speaker = _on_select_speaker


# ============================================================
# Main task runner
# ============================================================

def run_autonomous_task(task: str):
    """
    Runs the full Composer → Coder → Critic → Archivist pipeline.
    Called from maestro_runner.run_maestro_task() inside a background thread.
    """
    debug("=== MAESTRO LOCAL RUN START ===")
    debug(f"Task received: {task!r}")

    try:
        debug("Initiating chat via GroupChatManager.initiate_chat()...")
        result = manager.initiate_chat(
            recipient=composer,
            message=task,
        )
        debug("Chat completed successfully.")
        return result

    except Exception as e:
        debug(f"ERROR inside run_autonomous_task: {e}")
        # Re-raise so maestro_runner can capture and surface in STATE.error
        raise

    finally:
        debug("=== MAESTRO LOCAL RUN END ===")
