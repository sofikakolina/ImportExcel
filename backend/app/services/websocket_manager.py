from typing import Dict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, operation_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[operation_id] = websocket

    def disconnect(self, operation_id: str):
        self.active_connections.pop(operation_id, None)

    async def send_progress(self, operation_id: str, progress: int, status: str, data: dict = None):
        if operation_id in self.active_connections:
            await self.active_connections[operation_id].send_json({
                "operation_id": operation_id,
                "progress": progress,
                "status": status,
                "data": data
            })

manager = ConnectionManager()