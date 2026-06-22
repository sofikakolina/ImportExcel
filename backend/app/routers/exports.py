from fastapi import APIRouter, Depends, Query, BackgroundTasks, Response, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from datetime import datetime
from typing import Optional, List
import io

from app.database import get_db
from app import models, schemas
from app.services.exporter import export_data
from app.services.websocket_manager import manager

router = APIRouter(prefix="/exports", tags=["exports"])

@router.get("/")
async def export_data_endpoint(
    tables: Optional[str] = Query(None),  # comma-separated, e.g. "employees,departments"
    as_of_date: Optional[datetime] = Query(None),
    format: str = Query("xlsx"),  # xlsx or csv
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db)
):
    # Создаем операцию
    operation_id = str(uuid.uuid4())
    operation = models.OperationHistory(
        id=operation_id,
        type="export",
        status="pending",
        tables=tables,
        started_at=datetime.utcnow(),
        progress=0
    )
    db.add(operation)
    await db.commit()

    background_tasks.add_task(process_export, operation_id, tables, as_of_date, format)

    return {"operation_id": operation_id, "status": "started"}

async def process_export(operation_id: str, tables: str, as_of_date: datetime, format: str):
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            file_data, filename = await export_data(tables, as_of_date, format, db)

            import os
            os.makedirs("/tmp/exports", exist_ok=True)
            file_path = f"/tmp/exports/{operation_id}.{format}"
            with open(file_path, "wb") as f:
                f.write(file_data)

            operation = await db.get(models.OperationHistory, operation_id)
            if operation:
                operation.status = "completed"
                operation.result = f"Exported to {filename}"
                operation.progress = 100
                operation.finished_at = datetime.utcnow()
                await db.commit()

            await manager.send_progress(operation_id, 100, "completed", {"file_url": f"/exports/download/{operation_id}"})

        except Exception as e:
            operation = await db.get(models.OperationHistory, operation_id)
            if operation:
                operation.status = "failed"
                operation.errors = str(e)
                operation.progress = 0
                operation.finished_at = datetime.utcnow()
                await db.commit()
            await manager.send_progress(operation_id, 0, "failed", {"error": str(e)})

@router.get("/download/{operation_id}")
async def download_export(operation_id: str):
    # Проверяем, существует ли файл
    import os
    file_path = f"/tmp/exports/{operation_id}.*"
    import glob
    files = glob.glob(file_path)
    if not files:
        raise HTTPException(404, "File not found")
    file_path = files[0]
    ext = file_path.split('.')[-1]
    media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if ext == "xlsx" else "text/csv"
    filename = f"export.{ext}"
    return FileResponse(file_path, media_type=media_type, filename=filename)

@router.get("/history", response_model=List[schemas.OperationHistoryResponse])
async def get_export_history(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.OperationHistory)
        .where(models.OperationHistory.type == "export")
        .order_by(models.OperationHistory.started_at.desc())
    )
    return result.scalars().all()