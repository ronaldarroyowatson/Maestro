from fastapi import WebSocket, WebSocketDisconnect
import json

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active:
            self.active.remove(websocket)

    def has_connections(self):
        return len(self.active) > 0

    async def broadcast(self, data: dict):
        text = json.dumps(data, default=str)
        dead = []

        for ws in self.active:
            try:
                await ws.send_text(text)
            except WebSocketDisconnect:
                dead.append(ws)
            except Exception:
                dead.append(ws)

        for ws in dead:
            self.disconnect(ws)

ws_manager = ConnectionManager()