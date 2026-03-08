# =====================================================================
# backend/ws.py
# WebSocket handler with state polling, heartbeat keep-alive, and message handling
# =====================================================================

import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from .state import STATE
from .debug import log_debug

router = APIRouter()

HEARTBEAT_INTERVAL = 5
STATE_POLL_INTERVAL = 0.1
CLIENT_TIMEOUT = 120


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    log_debug("ws", "WebSocket client connected")

    last_state = None
    heartbeat_task = None

    try:
        heartbeat_task = asyncio.create_task(_heartbeat(ws))

        while True:
            try:
                msg = await asyncio.wait_for(ws.receive_text(), timeout=CLIENT_TIMEOUT)
                if msg:
                    STATE.handle_ws_message(msg)

            except asyncio.TimeoutError:
                pass

            current_state = STATE.to_dict()

            if current_state != last_state:
                try:
                    await ws.send_json(current_state)
                    last_state = current_state
                except Exception as send_err:
                    log_debug("ws", f"Failed to send state: {send_err}")
                    break

            await asyncio.sleep(STATE_POLL_INTERVAL)

    except WebSocketDisconnect:
        log_debug("ws", "WebSocket client disconnected")

    finally:
        if heartbeat_task:
            heartbeat_task.cancel()
        log_debug("ws", "WebSocket connection closed")


async def _heartbeat(ws: WebSocket):
    """Send heartbeat to keep WebSocket alive."""
    while True:
        await asyncio.sleep(HEARTBEAT_INTERVAL)
        try:
            await ws.send_json({"type": "heartbeat"})
        except Exception:
            break
