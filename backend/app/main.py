from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import employees, departments, imports, exports
from app.services.websocket_manager import manager
import asyncio

app = FastAPI(title="Excel Import API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # для разработки
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Роутеры
app.include_router(employees.router)
app.include_router(departments.router)
app.include_router(imports.router)
app.include_router(exports.router)

# WebSocket
@app.websocket("/ws/{operation_id}")
async def websocket_endpoint(websocket: WebSocket, operation_id: str):
    await manager.connect(operation_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # просто поддерживаем соединение
    except WebSocketDisconnect:
        manager.disconnect(operation_id)

@app.on_event("startup")
async def startup():
    # Создаем таблицы (в продакшене использовать миграции)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/")
async def root():
    return {"message": "Excel Import API"}