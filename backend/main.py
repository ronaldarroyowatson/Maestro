from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import asyncio

from .models import StartRequest
from .state import STATE
from .maestro_runner import run_maestro_task
from .ws import ws_manager
import backend.event_loop as event_loop

app = FastAPI()

@app.on_event("startup")
@app.on_event("startup")
async def startup_event():
    import backend.event_loop as event_loop
    event_loop.MAIN_LOOP = asyncio.get_running_loop()
    print("MAIN_LOOP SET:", event_loop.MAIN_LOOP)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            try:
                await websocket.receive_text()
            except:
                pass
            await asyncio.sleep(0.1)
    except Exception:
        ws_manager.disconnect(websocket)

@app.post("/start")
async def start_task(req: StartRequest):
    run_maestro_task(req.task)
    return {"status": "started"}

@app.get("/state")
async def get_state():
    return STATE.to_dict()