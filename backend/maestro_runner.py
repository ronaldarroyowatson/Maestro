import threading
import time
import asyncio
import backend.event_loop as event_loop

from .state import STATE, AgentMessage
from .ws import ws_manager

from maestro_local_autonomous import (
    composer,
    coder,
    critic,
    archivist,
    manager,
    groupchat,
    run_autonomous_task,
)

def _broadcast():
    print("BROADCAST CALLED")

    if event_loop.MAIN_LOOP is None:
        print("MAIN_LOOP is None")
        return

    asyncio.run_coroutine_threadsafe(
        ws_manager.broadcast(STATE.to_dict()),
        event_loop.MAIN_LOOP
    )

def stream_messages_to_state():
    last_index = 0

    while True:
        time.sleep(0.1)

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

        if not STATE.running and last_index >= len(messages):
            return

        if len(messages) == last_index:
            continue

        new_messages = messages[last_index:]
        last_index = len(messages)

        for msg in new_messages:
            name = msg.get("name", "Unknown")
            content = msg.get("content", "")
            timestamp = time.time()

            model = "unknown"
            if name == "Composer":
                model = composer.llm_config["model"]
            elif name == "Coder":
                model = coder.llm_config["model"]
            elif name == "Critic":
                model = critic.llm_config["model"]
            elif name == "Archivist":
                model = archivist.llm_config["model"]

            with STATE.lock:
                STATE.current_agent = name
                STATE.current_model = model

                STATE.conversation.append(
                    AgentMessage(
                        agent=name,
                        model=model,
                        content=content,
                        timestamp=timestamp
                    )
                )

                if name == "Coder" and "```" in content:
                    STATE.current_code = content

            _broadcast()

def run_maestro_task(task: str):
    STATE.reset()
    STATE.original_task = task
    STATE.running = True
    _broadcast()

    for _ in range(50):
        if ws_manager.has_connections():
            break
        time.sleep(0.1)

    streamer = threading.Thread(target=stream_messages_to_state, daemon=True)
    streamer.start()

    def background():
        try:
            run_autonomous_task(task)
        except Exception as e:
            with STATE.lock:
                STATE.error = str(e)
            _broadcast()
        finally:
            with STATE.lock:
                STATE.running = False
            _broadcast()

    thread = threading.Thread(target=background, daemon=True)
    thread.start()