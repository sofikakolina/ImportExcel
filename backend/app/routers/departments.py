from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from typing import List, Optional

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/departments", tags=["departments"])

@router.get("/", response_model=List[schemas.DepartmentResponse])
async def get_departments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Department))
    return result.scalars().all()

@router.get("/divisions", response_model=List[schemas.DivisionResponse])
async def get_divisions(
    department_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(models.Division)
        .options(joinedload(models.Division.department))  # ← загружаем department явно
    )
    if department_id:
        query = query.where(models.Division.department_id == department_id)
    result = await db.execute(query)
    return result.unique().scalars().all()