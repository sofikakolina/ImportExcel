from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from typing import Optional, List
from datetime import date
from app.services.parser import get_or_create_employee, get_or_create_position

from app.database import get_db
from app import models, schemas
from app.schemas import EmployeeFilterParams

router = APIRouter(prefix="/employees", tags=["employees"])

from sqlalchemy.orm import joinedload

@router.get("/", response_model=List[schemas.EmploymentResponse])
async def get_employees(
    search: Optional[str] = Query(None),
    department_id: Optional[int] = Query(None),
    division_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    as_of_date: Optional[date] = Query(None),
    employment_type: Optional[str] = Query(None),  # ← добавить сюда
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(models.Employment)
        .options(
            joinedload(models.Employment.employee),
            joinedload(models.Employment.division).joinedload(models.Division.department),
            joinedload(models.Employment.position),
            joinedload(models.Employment.supervisor),
        )
        .join(models.Employee, models.Employment.employee_id == models.Employee.id)
        .join(models.Division, models.Employment.division_id == models.Division.id)
        .join(models.Department, models.Division.department_id == models.Department.id)
    )

    if search:
        query = query.where(models.Employee.full_name.ilike(f"%{search}%"))
    if department_id:
        query = query.where(models.Department.id == department_id)
    if division_id:
        query = query.where(models.Division.id == division_id)
    if status:
        query = query.where(models.Employment.status == status)
    if employment_type:                                                    # ← один блок
        query = query.where(models.Employment.employment_type == employment_type)
    if as_of_date:
        query = query.where(
            models.Employment.hire_date <= as_of_date,
            or_(
                models.Employment.fire_date.is_(None),
                models.Employment.fire_date >= as_of_date
            )
        )

    result = await db.execute(query)
    employments = result.unique().scalars().all()
    return employments

@router.get("/{employment_id}", response_model=schemas.EmploymentResponse)
async def get_employment(employment_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Employment)
        .options(
            joinedload(models.Employment.employee),
            joinedload(models.Employment.division).joinedload(models.Division.department),
            joinedload(models.Employment.position),
            joinedload(models.Employment.supervisor),
        )
        .where(models.Employment.id == employment_id)
    )
    employment = result.unique().scalar_one_or_none()
    if not employment:
        raise HTTPException(status_code=404, detail="Employment not found")
    return employment

@router.post("/", response_model=schemas.EmploymentResponse)
async def create_employment(data: schemas.EmploymentCreateFront, db: AsyncSession = Depends(get_db)):
    # Находим или создаём сотрудника
    emp_cache, pos_cache = {}, {}
    emp = await get_or_create_employee(db, data.full_name, emp_cache)
    pos = await get_or_create_position(db, data.position_title, pos_cache)
    supervisor = None
    if data.supervisor_name:
        supervisor = await get_or_create_employee(db, data.supervisor_name, emp_cache)

    from datetime import date
    new_emp = models.Employment(
        employee_id=emp.id,
        division_id=data.division_id,
        position_id=pos.id,
        supervisor_id=supervisor.id if supervisor else None,
        hire_date=data.hire_date,
        fire_date=data.fire_date,
        status=data.status,
        employment_type=data.employment_type,
        salary=data.salary,
        actual_date=date.today(),
    )
    db.add(new_emp)
    await db.commit()

    # Возвращаем с загруженными связями
    result = await db.execute(
        select(models.Employment)
        .options(
            joinedload(models.Employment.employee),
            joinedload(models.Employment.division).joinedload(models.Division.department),
            joinedload(models.Employment.position),
            joinedload(models.Employment.supervisor),
        )
        .where(models.Employment.id == new_emp.id)
    )
    return result.unique().scalar_one()

@router.patch("/{employment_id}", response_model=schemas.EmploymentResponse)
async def update_employment(employment_id: int, employment_update: schemas.EmploymentUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Employment).where(models.Employment.id == employment_id))
    employment = result.scalar_one_or_none()
    if not employment:
        raise HTTPException(status_code=404, detail="Employment not found")
    for key, value in employment_update.model_dump(exclude_unset=True).items():
        setattr(employment, key, value)
    await db.commit()
    await db.refresh(employment)
    return employment

@router.delete("/{employment_id}")
async def delete_employment(employment_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Employment).where(models.Employment.id == employment_id))
    employment = result.scalar_one_or_none()
    if not employment:
        raise HTTPException(status_code=404, detail="Employment not found")
    await db.delete(employment)
    await db.commit()
    return {"detail": "Deleted"}