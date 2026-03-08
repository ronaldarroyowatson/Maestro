# ============================================================
# DEPRECATED: Local Autonomous Pipeline (Legacy Code)
# ============================================================
# This file is NOT USED. It's kept for reference only.
#
# The new Maestro architecture uses:
# - pipeline_loader.py    → Load XML
# - pipeline_parser.py    → Parse XML to PipelineConfig
# - pipeline_compiler.py  → Compile to AutoGen agents + manager
# - pipeline_executor.py  → Turn-by-turn execution with state tracking
# - maestro_runner.py     → Thread orchestration
#
# This file represents the old pre-XML hardcoded approach.
# For examples of the old pattern, see comments below.
# ============================================================

# DEPRECATED CODE BELOW - see new architecture above

import time
from autogen import ConversableAgent, GroupChat, GroupChatManager

# Debug helper
def debug(msg: str):
    print(f"[MAESTRO-AUTO-DEPRECATED][{time.strftime('%H:%M:%S')}] {msg}")


debug(f"DEPRECATED: maestro_local_autonomous.py loaded")
debug("Use pipeline_loader/parser/compiler/executor instead")


# ============================================================
# DEPRECATED: Old hardcoded agent definitions
# ============================================================
# These were replaced by XML-driven agent configuration

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


def run_autonomous_task(task: str):
    """
    DEPRECATED: This function is not used.
    
    New execution flow:
    1. main.py POST /start
    2. main.py → maestro_runner.run_task()
    3. maestro_runner → pipeline_executor.execute_pipeline()
    4. executor → manager.initiate_chat() with state tracking
    5. Results propagate back through STATE to frontend
    """
    raise NotImplementedError(
        "This function is deprecated. Use pipeline_executor.execute_pipeline() instead. "
        "See pipeline_compiler, pipeline_executor, and maestro_runner for new architecture."
    )

    finally:
        debug("=== MAESTRO LOCAL RUN END ===")
