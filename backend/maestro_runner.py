# backend/maestro_runner.py
# ============================================================
# Maestro 2.0 Runner (Drop‑in Replacement)
# ------------------------------------------------------------
# Responsibilities:
# - Launch background agent pipeline
# - Launch streamer thread to push messages to STATE
# - Broadcast state to WebSocket clients
# - Provide deep debug instrumentation for every step
# ============================================================

import threading
import time
import asyncio

import backend.event_loop as event_loop
from .state import STATE, AgentMessage
from .ws import ws_manager

# Import the autonomous pipeline
from .maestro_local_autonomous import (
    composer,
    coder,
    critic,
    archivist,
    manager,
    groupchat,
    run_autonomous_task,
)


# ------------------------------------------------------------
# Debug helper
# ------------------------------------------------------------
def debug(msg: str):
    print(f"[MAESTRO-RUNNER][{time.strftime('%H:%M:%S')}] {msg}")


debug(f"LOADED maestro_runner.py FROM: {__file__}")


# ------------------------------------------------------------
# Broadcast STATE to all WebSocket clients
# ------------------------------------------------------------
def broadcast_state():
    debug("broadcast_state() called")

    loop = event_loop.MAIN_LOOP
    if loop is None:
        debug("MAIN_LOOP is None → cannot broadcast")
        return

    try:
        asyncio.run_coroutine_threadsafe(
            ws_manager.broadcast(STATE.to_dict()),
            loop,
        )
        debug("broadcast_state() → submitted to event loop")
    except Exception as e:
        debug(f"ERROR in broadcast_state: {e}")


# ------------------------------------------------------------
# Stream messages from AutoGen into STATE
# ------------------------------------------------------------
def stream_messages_to_state():
    debug("STREAMER THREAD ENTERED")
    last_index = 0

    while True:
        time.sleep(0.1)

        # Determine which message list exists
        if hasattr(groupchat, "messages"):
            messages = groupchat.messages
        elif hasattr(groupchat, "history"):
            messages = groupchat.history
        elif hasattr(manager, "chat_messages"):
            messages = manager.chat_messages
        elif hasattr(manager, "_messages"):
            messages = manager._messages
        else:
            messages = []

        # Exit when run is over and all messages consumed
        if not STATE.running and last_index >= len(messages):
            debug("STREAMER EXIT → no more messages and STATE.running=False")
            return

        if len(messages) == last_index:
            continue

        new_messages = messages[last_index:]
        last_index = len(messages)

        for msg in new_messages:
            name = msg.get("name", "Unknown")
            content = msg.get("content", "")
            timestamp = time.time()

            # Determine model
            model = "unknown"
            if name == "Composer":
                model = composer.llm_config.get("model", "unknown")
            elif name == "Coder":
                model = coder.llm_config.get("model", "unknown")
            elif name == "Critic":
                model = critic.llm_config.get("model", "unknown")
            elif name == "Archivist":
                model = archivist.llm_config.get("model", "unknown")

            # Update shared state
            with STATE.lock:
                STATE.current_agent = name
                STATE.current_model = model

                STATE.conversation.append(
                    AgentMessage(
                        agent=name,
                        model=model,
                        content=content,
                        timestamp=timestamp,
                    )
                )

                # Capture code if Coder posts fenced code
                if name == "Coder" and "```" in content:
                    STATE.current_code = content

            debug(f"STREAM → {name} ({model})")
            broadcast_state()


# ------------------------------------------------------------
# Main entry point called by /start
# ------------------------------------------------------------
def run_maestro_task(task: str):
    debug(f"run_maestro_task() ENTERED with task: {task}")

    # Reset state
    with STATE.lock:
        STATE.reset()
        STATE.original_task = task
        STATE.running = True

    broadcast_state()

    # --------------------------------------------------------
    # Start streamer thread
    # --------------------------------------------------------
    debug("Starting STREAMER thread...")
    streamer = threading.Thread(target=stream_messages_to_state, daemon=True)
    streamer.start()

    # --------------------------------------------------------
    # Background execution thread
    # --------------------------------------------------------
    def background():
        debug("BACKGROUND THREAD ENTERED")
        try:
            debug("Calling run_autonomous_task()...")
            run_autonomous_task(task)
            debug("run_autonomous_task() returned successfully")
        except Exception as e:
            debug(f"ERROR inside background thread: {e}")
            with STATE.lock:
                STATE.error = str(e)
        finally:
            with STATE.lock:
                STATE.running = False
            broadcast_state()
            debug("BACKGROUND THREAD EXITING (STATE.running=False)")

    debug("Starting BACKGROUND thread...")
    thread = threading.Thread(target=background, daemon=True)
    thread.start()

    debug("run_maestro_task() EXITING (threads launched)")
