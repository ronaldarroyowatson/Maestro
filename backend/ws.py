# backend/ws.py
# ============================================================
# Maestro 2.0 WebSocket Manager (Drop‑in Replacement)
# ------------------------------------------------------------
# Goals:
# - Centralize WebSocket connection tracking
# - Add rich debug logging for connects, disconnects, broadcasts
# - Make it obvious when/why messages are (not) being sent
# - Keep API identical: ws_manager.connect / disconnect / broadcast / has_connections
# ============================================================

import asyncio
import time
from typing import List

from fastapi import WebSocket


# ------------------------------------------------------------
# Simple debug helper so all WS logs are clearly tagged
# ------------------------------------------------------------
def ws_debug(msg: str) -> None:
    """Timestamped debug print for WebSocket layer."""
    print(f"[MAESTRO-WS][{time.strftime('%H:%M:%S')}] {msg}")


class WebSocketManager:
    """
    Tracks active WebSocket connections and provides a broadcast API.

    Public methods (same as before, so this is drop‑in compatible):
    - connect(websocket: WebSocket) -> None
    - disconnect(websocket: WebSocket) -> None
    - has_connections() -> bool
    - broadcast(data: dict | str) -> Awaitable[None]
    """

    def __init__(self) -> None:
        self.active: List[WebSocket] = []
        self._lock = asyncio.Lock()
        ws_debug("WebSocketManager initialized")

    # --------------------------------------------------------
    # Connection management
    # --------------------------------------------------------
    async def connect(self, websocket: WebSocket) -> None:
        """
        Register a new WebSocket connection.
        NOTE: In your main.py, you already call websocket.accept() before this.
        """
        async with self._lock:
            self.active.append(websocket)
            ws_debug(f"CONNECT → {self._client_repr(websocket)} | total={len(self.active)}")

    def disconnect(self, websocket: WebSocket) -> None:
        """
        Remove a WebSocket connection if present.
        This is intentionally sync so it can be called from finally blocks.
        """
        try:
            self.active.remove(websocket)
            ws_debug(f"DISCONNECT → {self._client_repr(websocket)} | total={len(self.active)}")
        except ValueError:
            ws_debug(f"DISCONNECT (not found) → {self._client_repr(websocket)}")

    def has_connections(self) -> bool:
        """
        Returns True if at least one WebSocket is connected.
        Used by /start to decide whether to wait before launching the task.
        """
        has_any = len(self.active) > 0
        ws_debug(f"CHECK has_connections → {has_any} (total={len(self.active)})")
        return has_any

    # --------------------------------------------------------
    # Broadcast
    # --------------------------------------------------------
    async def broadcast(self, data) -> None:
        """
        Broadcast a JSON‑serializable object or string to all active clients.

        This is called from maestro_runner.broadcast_state() via
        asyncio.run_coroutine_threadsafe(...), so any exceptions here
        should be logged but must not crash the server.
        """
        async with self._lock:
            if not self.active:
                ws_debug("BROADCAST skipped → no active clients")
                return

            ws_debug(f"BROADCAST → {len(self.active)} clients | payload_type={type(data).__name__}")

            dead_clients = []

            for ws in list(self.active):
                try:
                    # FastAPI WebSocket has .send_json and .send_text; we support both.
                    if isinstance(data, (dict, list)):
                        await ws.send_json(data)
                    else:
                        await ws.send_text(str(data))
                except Exception as e:
                    ws_debug(f"ERROR sending to {self._client_repr(ws)}: {e}")
                    dead_clients.append(ws)

            # Clean up any dead connections
            for ws in dead_clients:
                try:
                    self.active.remove(ws)
                    ws_debug(f"REMOVED dead client → {self._client_repr(ws)} | total={len(self.active)}")
                except ValueError:
                    pass

    # --------------------------------------------------------
    # Helpers
    # --------------------------------------------------------
    def _client_repr(self, websocket: WebSocket) -> str:
        """
        Safe representation of a WebSocket client (host:port) for logging.
        """
        try:
            client = websocket.client
            if client:
                return f"{client.host}:{client.port}"
        except Exception:
            pass
        return "unknown-client"


# Single shared instance, imported as `ws_manager` everywhere else.
ws_manager = WebSocketManager()
