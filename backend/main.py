# =====================================================================
# backend/main.py
# Clean, single-responsibility FastAPI entrypoint.
# Loads the pipeline once, creates one global MaestroRunner, and exposes
# the /start endpoint to run tasks. Includes rich debug instrumentation.
# =====================================================================

import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect

from .debug import log_debug
from .pipeline_loader import load_default_pipeline
from .maestro_runner import MaestroRunner
from .state import STATE


# ---------------------------------------------------------------------
# FastAPI app setup
# ---------------------------------------------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------
# Load pipeline ONCE and create a single global MaestroRunner
# ---------------------------------------------------------------------
log_debug("main", "Loading default pipeline at startup.")
pipeline_config = load_default_pipeline()

log_debug("main", "Creating global MaestroRunner instance.")
runner = MaestroRunner(pipeline_config)

log_debug("main", "Global MaestroRunner ready.")


# ---------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------
@app.post("/start")
async def start_task(payload: dict):
    """
    Start a new Maestro task using the global runner.
    Initializes STATE and spawns executor thread.
    
    Request body:
        {
            "task": "User task description (required, non-empty)"
        }
    
    Response:
        {
            "status": "started",
            "task": "task summary"
        } on success
        
        {
            "error": "error message"
        } on failure
    """
    # Validate input
    if not payload or not isinstance(payload, dict):
        log_debug("main", f"ERROR: Invalid payload type: {type(payload)}")
        return {"error": "Request body must be a JSON object"}
    
    user_task = payload.get("task", "").strip()
    
    if not user_task:
        log_debug("main", "ERROR: Task is empty")
        return {"error": "Task cannot be empty. Please provide a task description."}
    
    if len(user_task) > 10000:
        log_debug("main", f"ERROR: Task too long ({len(user_task)} chars)")
        return {"error": "Task is too long (max 10000 characters)"}

    log_debug("main", "=== TASK INITIALIZATION SEQUENCE START ===")

    # Step 1: Initialize state for new run (clears old data for multi-pipeline support)
    log_debug("main", "Resetting STATE for clean execution")
    STATE.reset()
    
    # Step 2: Set task
    log_debug("main", f"Setting STATE.original_task: {user_task[:80]}...")
    STATE.original_task = user_task

    # Step 3: Mark as running
    log_debug("main", "Setting STATE.running = True")
    STATE.set_running(True)

    # Step 4: Spawn execution thread
    log_debug("main", "Passing to runner.run_task()...")
    try:
        runner.run_task(user_task)
        log_debug("main", "=== TASK INITIALIZATION SEQUENCE COMPLETE ===")
        return {"status": "started", "task": user_task[:100]}
    except Exception as e:
        error_msg = f"Failed to start task: {e}"
        log_debug("main", f"ERROR: {error_msg}")
        STATE.set_running(False)
        STATE.add_message("system", "system", f"ERROR: {error_msg}")
        return {"error": error_msg}


@app.get("/state")
async def get_state():
    """
    Return the current global state for the frontend.
    """
    return STATE.to_dict()


@app.get("/")
async def root():
    return {"message": "Maestro backend is running."}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    log_debug("ws", "WebSocket client connected")

    last_state = None

    try:
        while True:
            current = STATE.to_dict()

            # Only send when state actually changes
            if current != last_state:
                await websocket.send_json(current)
                last_state = current

            await asyncio.sleep(0.1)  # light polling without spamming
    except WebSocketDisconnect:
        log_debug("ws", "WebSocket client disconnected")