"""
maestro_local_autonomous.py
---------------------------------
Maestro 3.2 — local, autonomous multi-agent pipeline using AutoGen 0.6.0 and Ollama.

Architecture (flexible branching):
- Composer  (Planner)      → mistral:instruct
- Coder     (Implementer)  → deepseek-coder:6.7b
- Critic    (Reviewer)     → mistral:instruct
- Archivist (Summarizer)   → phi3

Key behaviors:
- Agents hand off using <TO:...> tags, enforced by a custom speaker_selection_method.
- Coder, Critic, Archivist NEVER ask the user questions.
- Composer may ask ONE clarifying question only if absolutely required.
- Drift detection: soft correction → soft correction → hard stop (<TO:STOP>).
- STOP logic: <TO:STOP> ends the run; user typing STOP ends the run.
- AutoGen early‑termination and default planner behavior are disabled.
"""

from autogen import ConversableAgent, GroupChat, GroupChatManager

# ============================================================
# Local LLM configuration for Ollama
# ============================================================

OLLAMA_BASE_URL = "http://localhost:11434/v1"
OLLAMA_API_KEY = "ollama"  # Dummy key; required by client, ignored by Ollama.

composer_llm = {
    "model": "mistral:instruct",
    "base_url": OLLAMA_BASE_URL,
    "api_key": OLLAMA_API_KEY,
}

coder_llm = {
    "model": "deepseek-coder:6.7b",
    "base_url": OLLAMA_BASE_URL,
    "api_key": OLLAMA_API_KEY,
}

critic_llm = {
    "model": "mistral:instruct",
    "base_url": OLLAMA_BASE_URL,
    "api_key": OLLAMA_API_KEY,
}

archivist_llm = {
    "model": "phi3",
    "base_url": OLLAMA_BASE_URL,
    "api_key": OLLAMA_API_KEY,
}

# ============================================================
# Safety and control parameters
# ============================================================

MAX_TURNS = 24

ERROR_KEYWORDS = [
    "traceback",
    "exception",
    "error:",
    "failed",
    "cannot",
    "infinite loop",
    "stuck",
    "out of scope",
]


def looks_like_error(text: str) -> bool:
    """Return True if the text appears to contain error-like content."""
    lowered = text.lower()
    return any(keyword in lowered for keyword in ERROR_KEYWORDS)


# ============================================================
# Conversation contract and handoff protocol
# ============================================================

CONTRACT_SUFFIX = (
    "\n\n"
    "CONVERSATION CONTRACT:\n"
    "- You are part of a multi-agent team (Composer, Coder, Critic, Archivist).\n"
    "- Do NOT ask the user questions unless you are the Composer.\n"
    "- Coder, Critic, Archivist MUST NEVER ask the user questions.\n"
    "- Do NOT repeat introductions or restate the task unless explicitly asked.\n"
    "- At the END of every message, emit exactly ONE handoff tag on its own line:\n"
    "    <TO:Composer>, <TO:Coder>, <TO:Critic>, <TO:Archivist>, or <TO:STOP>.\n"
    "- Choose the tag based on who should speak next.\n"
    "- If the conversation becomes repetitive, circular, or off-task:\n"
    "    * First time: say 'Loop detected. Soft correction.' and hand off to Composer.\n"
    "    * Second time: same soft correction.\n"
    "    * Third time: say 'Loop detected. Hard stop.' and emit <TO:STOP>.\n"
    "- If the work appears complete and stable, hand off to Archivist or <TO:STOP>.\n"
)

# ============================================================
# Agent definitions
# ============================================================

composer = ConversableAgent(
    name="Composer",
    system_message=(
        "ROLE: Planner.\n"
        "RESPONSIBILITY:\n"
        "- Read the user's task.\n"
        "- Break it into clear, numbered steps.\n"
        "- Keep scope tight and focused.\n"
        "- You may ask ONE clarifying question to the USER if absolutely required.\n"
        "- Otherwise assume reasonable defaults and proceed.\n"
        "- When the plan is ready, hand off to Coder with <TO:Coder>.\n"
        "- ALWAYS end your message with exactly one tag line.\n"
        + CONTRACT_SUFFIX
    ),
    llm_config=composer_llm,
    human_input_mode="NEVER",
)

coder = ConversableAgent(
    name="Coder",
    system_message=(
        "ROLE: Coder.\n"
        "RESPONSIBILITY:\n"
        "- Implement the Composer's plan as clean, well-structured code.\n"
        "- Use clear names, docstrings, and minimal comments.\n"
        "- NEVER ask the user questions.\n"
        "- If something is unclear, state a reasonable assumption and proceed.\n"
        "- ALWAYS end your message with exactly one tag line.\n"
        "- When the code is ready for review, ALWAYS end with <TO:Critic>.\n"
        "- NEVER end with <TO:Coder>.\n"
        + CONTRACT_SUFFIX
    ),
    llm_config=coder_llm,
)

critic = ConversableAgent(
    name="Critic",
    system_message=(
        "ROLE: Critic.\n"
        "RESPONSIBILITY:\n"
        "- Review the Coder's work for correctness and clarity.\n"
        "- Provide specific, actionable fixes.\n"
        "- NEVER ask the user questions.\n"
        "- If issues exist, clearly describe them and hand back to Coder with <TO:Coder>.\n"
        "- If the code is acceptable, hand off to Archivist with <TO:Archivist>.\n"
        "- ALWAYS end your message with exactly one tag line.\n"
        + CONTRACT_SUFFIX
    ),
    llm_config=critic_llm,
)

archivist = ConversableAgent(
    name="Archivist",
    system_message=(
        "ROLE: Archivist.\n"
        "RESPONSIBILITY:\n"
        "- Provide a concise summary of the final result.\n"
        "- Include:\n"
        "    1) A short summary of what was built.\n"
        "    2) The final cleaned-up code block.\n"
        "    3) Any key caveats or next steps.\n"
        "- NEVER ask the user questions.\n"
        "- Do NOT add meta-commentary or long narratives.\n"
        "- When you believe the work is complete, ALWAYS end with <TO:STOP>.\n"
        "- ALWAYS end your message with exactly one tag line.\n"
        + CONTRACT_SUFFIX
    ),
    llm_config=archivist_llm,
)

agents = [composer, coder, critic, archivist]

# ============================================================
# Manual STOP handling
# ============================================================

def is_manual_stop_command(text: str) -> bool:
    """Return True if the user issued a standalone STOP command (case-insensitive)."""
    return text.strip().upper() == "STOP"


# ============================================================
# Speaker selection based on <TO:...> tags
# ============================================================

def select_next_speaker(last_speaker, groupchat: GroupChat):
    """
    Choose the next speaker based on the last <TO:...> tag in the conversation.
    - If there are no messages yet, start with Composer.
    - Look at the last non-empty line of the last message's content.
    - If it is a known <TO:...> tag, route to that agent.
    - If it is <TO:STOP>, return None to end the conversation.
    - If no tag is found, return None and let the manager stop or default.
    """

    # --- Pacing added to stabilize routing and prevent hallucinations ---
    import time
    time.sleep(0.15)   # 150 ms pacing between agent turns
    # -------------------------------------------------------------------

    if not groupchat.messages:
        return composer

    last_message = groupchat.messages[-1]
    content = last_message.get("content", "") or ""

    if not isinstance(content, str):
        return None

    lines = [line.strip() for line in content.splitlines() if line.strip()]
    if not lines:
        return None

    last_line = lines[-1]

    tag_to_agent = {
        "<TO:Composer>": composer,
        "<TO:Coder>": coder,
        "<TO:Critic>": critic,
        "<TO:Archivist>": archivist,
    }

    if last_line == "<TO:STOP>":
        return None

    return tag_to_agent.get(last_line, None)

# ============================================================
# GroupChat and Manager
# ============================================================

groupchat = GroupChat(
    agents=agents,
    messages=[],
    max_round=MAX_TURNS,
    send_introductions=False,
    speaker_selection_method=select_next_speaker,
)

manager = GroupChatManager(
    groupchat=groupchat,
    llm_config=composer_llm,
    is_termination_msg=lambda msg: False,
)

# ============================================================
# Autonomous task execution
# ============================================================

def run_autonomous_task(user_task: str):
    """
    Run the full autonomous multi-agent pipeline on a user task.
    - Checks for manual STOP.
    - Starts the conversation with Composer.
    - Collects chat history.
    - Runs a simple post-run safety scan.
    """
    if is_manual_stop_command(user_task):
        print("Manual STOP command detected before start.")
        return

    print("\n=== MAESTRO LOCAL RUN START ===\n")
    print(f"USER TASK:\n{user_task}\n")

    chat_result = manager.initiate_chat(
        recipient=composer,
        message=f"User task: {user_task}\n\nPlease begin planning."
    )

    history = chat_result.chat_history

    print("\n=== POST-RUN SAFETY SCAN ===\n")
    any_error = False

    for message in history:
        role = message.get("name") or message.get("role", "unknown")
        content = message.get("content", "")

        if isinstance(content, str) and looks_like_error(content):
            any_error = True
            print(f"[POSSIBLE ISSUE from {role}]:\n{content[:400]}\n---\n")

    if any_error:
        print("⚠ Possible issues detected. Review recommended.")
    else:
        print("✅ No obvious error patterns detected.")

    print("\n=== MAESTRO LOCAL RUN END ===\n")


# ============================================================
# Entry point
# ============================================================

if __name__ == "__main__":
    task = (
        "Create a small Python script that reads a text file, counts word frequencies, "
        "and prints the top 10 words with counts. Assume the file path is 'input.txt'."
    )
    run_autonomous_task(task)