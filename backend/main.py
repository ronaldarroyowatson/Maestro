# backend/main.py
# ============================================================
# Maestro 2.0 FastAPI App (Drop‑in Replacement)
# ------------------------------------------------------------
# Responsibilities:
# - Expose /ws WebSocket endpoint
# - Serve static frontend at /ui
# - Capture and share the main event loop
# - Expose /start to launch maestro_runner.run_maestro_task()
# - Add rich debug tracing for connections and task starts
# ============================================================

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import asyncio
import os

from .models import StartRequest
from .maestro_runner import run_maestro_task
from .ws import ws_manager
import backend.event_loop as event_loop


# ------------------------------------------------------------
# Debug helper
# ------------------------------------------------------------
def debug(msg: str):
    import time
    print(f"[MAESTRO-MAIN][{time.strftime('%H:%M:%S')}] {msg}")


app = FastAPI()


# ============================================================
# WebSocket Endpoint (must be defined before static mount)
# ============================================================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Small delay to let server fully settle before accepting
    await asyncio.sleep(0.05)

    try:
        await websocket.accept()
        await ws_manager.connect(websocket)
        debug("WebSocket fully connected")
    except Exception as e:
        debug(f"WebSocket accept/connect failed: {e}")
        return

    try:
        while True:
            await asyncio.sleep(0.1)
    except Exception:
        ws_manager.disconnect(websocket)
        debug("WebSocket disconnected")


# ============================================================
# Serve Frontend at /ui
# ============================================================

frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/ui", StaticFiles(directory=frontend_path, html=True), name="frontend")


# ============================================================
# Startup: capture event loop
# ============================================================

@app.on_event("startup")
async def startup_event():
    event_loop.MAIN_LOOP = asyncio.get_running_loop()
    debug(f"MAIN_LOOP SET: {event_loop.MAIN_LOOP}")


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Start Task (runs in background thread via maestro_runner)
# ============================================================

@app.post("/start")
async def start_task(req: StartRequest):
    debug(f"/start called with task: {req.task!r}")

    # Wait up to 2 seconds for at least one WebSocket connection
    for _ in range(20):
        if ws_manager.has_connections():
            debug("WebSocket connection detected before launching task")
            break
        await asyncio.sleep(0.1)
    else:
        debug("No WebSocket connections detected after wait window")

    loop = asyncio.get_running_loop()
    debug("Submitting run_maestro_task() to executor")
    loop.run_in_executor(None, run_maestro_task, req.task)

    debug("/start returning status=started")
    return {"status": "started"}
