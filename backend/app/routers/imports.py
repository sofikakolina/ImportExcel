from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime
import uuid

from app.database import get_db
from app import models, schemas
from app.services.parser import parse_excel
from app.services.websocket_manager import manager

router = APIRouter(prefix="/imports", tags=["imports"])


@router.post("/")
async def import_file(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db)
):
    contents = await file.read()
    filename = file.filename

    operation_id = str(uuid.uuid4())
    operation = models.OperationHistory(
        id=operation_id,
        type="import",
        status="pending",
        file_name=filename,
        started_at=datetime.utcnow(),
        progress=0
    )
    db.add(operation)
    await db.commit()

    background_tasks.add_task(process_import, operation_id, contents, filename)

    return {"operation_id": operation_id, "status": "started"}


async def process_import(operation_id: str, contents: bytes, filename: str):
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            result = await parse_excel(contents, db, filename)

            operation = await db.get(models.OperationHistory, operation_id)
            if operation:
                operation.status = "completed" if not result.errors else "completed_with_warnings"
                operation.result = f"Processed {result.processed_rows} of {result.total_rows}, skipped {result.skipped_rows}"
                operation.errors = "\n".join(result.errors) if result.errors else None
                operation.warnings = "\n".join(result.warnings) if result.warnings else None
                operation.progress = 100
                operation.finished_at = datetime.utcnow()
                await db.commit()

            await manager.send_progress(operation_id, 100, operation.status if operation else "failed", result.model_dump())

        except Exception as e:
            operation = await db.get(models.OperationHistory, operation_id)
            if operation:
                operation.status = "failed"
                operation.errors = str(e)
                operation.progress = 0
                operation.finished_at = datetime.utcnow()
                await db.commit()
            await manager.send_progress(operation_id, 0, "failed", {"error": str(e)})


@router.get("/history", response_model=List[schemas.OperationHistoryResponse])
async def get_import_history(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.OperationHistory)
        .where(models.OperationHistory.type == "import")
        .order_by(models.OperationHistory.started_at.desc())
    )
    return result.scalars().all()