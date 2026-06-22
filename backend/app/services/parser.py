import io
import pandas as pd
from datetime import datetime, date
from decimal import Decimal
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models, schemas


def _parse_date(val):
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    if isinstance(val, (int, float)):
        # Excel serial date (приходит из pyxlsb)
        from datetime import timedelta
        return (date(1899, 12, 30) + timedelta(days=int(val)))
    if isinstance(val, str):
        val = val.strip()
        if not val:
            return None
        for fmt in ("%d.%m.%Y", "%Y-%m-%d", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(val, fmt).date()
            except ValueError:
                continue
        raise ValueError(f"Не удалось распарсить дату: {val}")
    return None


def _load_dataframe(contents: bytes, filename: str) -> pd.DataFrame:
    buf = io.BytesIO(contents)
    is_xlsb = filename and filename.lower().endswith(".xlsb")

    if is_xlsb:
        df = pd.read_excel(buf, engine="pyxlsb", header=None)
    else:
        df = pd.read_excel(buf, header=None)

    # Строки 0,1,2 — заголовки/мусор, данные с индекса 3
    df = df.iloc[3:].reset_index(drop=True)

    # Колонки: 0=мусор, 1=dept, 2=div, 3=pos, 4=supervisor, 5=employee,
    #          6=hire_date, 7=fire_date, 8=status, 9=emp_type, 10=salary
    df.columns = range(len(df.columns))
    return df


def _get_actual_date(contents: bytes, filename: str) -> date:
    """Читаем дату актуальности из ячейки K1 (колонка 10, строка 0)"""
    try:
        buf = io.BytesIO(contents)
        is_xlsb = filename and filename.lower().endswith(".xlsb")
        if is_xlsb:
            df_head = pd.read_excel(buf, engine="pyxlsb", header=None, nrows=1)
        else:
            df_head = pd.read_excel(buf, header=None, nrows=1)

        val = df_head.iloc[0, 10] if df_head.shape[1] > 10 else None
        parsed = _parse_date(val)
        return parsed if parsed else date.today()
    except Exception:
        return date.today()


async def parse_excel(contents: bytes, db: AsyncSession, filename: str = "") -> schemas.ImportResult:
    actual_date = _get_actual_date(contents, filename)
    df = _load_dataframe(contents, filename)

    total_rows = len(df)
    processed = 0
    skipped = 0
    errors = []
    warnings = []

    dept_cache = {}
    div_cache = {}
    pos_cache = {}
    emp_cache = {}

    for idx, row in df.iterrows():
        row_num = idx + 4  # для сообщений об ошибках
        try:
            dept_name        = str(row[1]).strip() if pd.notna(row[1]) else None
            division_name    = str(row[2]).strip() if pd.notna(row[2]) else None
            position_title   = str(row[3]).strip() if pd.notna(row[3]) else None
            supervisor_name  = str(row[4]).strip() if pd.notna(row[4]) else None
            employee_name    = str(row[5]).strip() if pd.notna(row[5]) else None
            hire_date_val    = row[6]
            fire_date_val    = row[7] if pd.notna(row[7]) else None
            status_val       = str(row[8]).strip() if pd.notna(row[8]) else None
            emp_type_val     = str(row[9]).strip() if pd.notna(row[9]) else None
            salary_val       = row[10]

            if not employee_name:
                raise ValueError(f"Строка {row_num}: отсутствует ФИО сотрудника")

            hire_date = _parse_date(hire_date_val)
            if not hire_date:
                raise ValueError(f"Строка {row_num}: дата приема не распознана")

            fire_date = _parse_date(fire_date_val)

            if status_val not in ["Работает", "Уволен"]:
                raise ValueError(f"Строка {row_num}: неверный статус '{status_val}'")

            if emp_type_val not in ["Штатный сотрудник", "Внештатный сотрудник"]:
                raise ValueError(f"Строка {row_num}: неверный тип занятости '{emp_type_val}'")

            salary = Decimal(str(int(salary_val))) if pd.notna(salary_val) else Decimal("0")

            dept = await get_or_create_department(db, dept_name, dept_cache)
            div  = await get_or_create_division(db, dept.id, division_name or "Без отдела", div_cache)
            pos  = await get_or_create_position(db, position_title, pos_cache)
            emp  = await get_or_create_employee(db, employee_name, emp_cache)
            supervisor = await get_or_create_employee(db, supervisor_name, emp_cache) if supervisor_name else None

            stmt = select(models.Employment).where(
                models.Employment.employee_id == emp.id,
                models.Employment.division_id == div.id,
                models.Employment.position_id == pos.id,
                models.Employment.hire_date == hire_date,
            )
            result = await db.execute(stmt)
            existing = result.scalar_one_or_none()

            if existing:
                existing.fire_date      = fire_date
                existing.status         = status_val
                existing.employment_type = emp_type_val
                existing.salary         = salary
                existing.supervisor_id  = supervisor.id if supervisor else None
                existing.actual_date    = actual_date
                warnings.append(f"Строка {row_num}: обновлена существующая запись")
            else:
                db.add(models.Employment(
                    employee_id     = emp.id,
                    division_id     = div.id,
                    position_id     = pos.id,
                    supervisor_id   = supervisor.id if supervisor else None,
                    hire_date       = hire_date,
                    fire_date       = fire_date,
                    status          = status_val,
                    employment_type = emp_type_val,
                    salary          = salary,
                    actual_date     = actual_date,
                ))

            processed += 1

        except Exception as e:
            errors.append(str(e))
            skipped += 1

    await db.commit()
    return schemas.ImportResult(
        total_rows=total_rows,
        processed_rows=processed,
        skipped_rows=skipped,
        errors=errors,
        warnings=warnings,
    )


async def get_or_create_department(db, name, cache):
    name = name or "Без департамента"
    if name in cache:
        return cache[name]
    result = await db.execute(select(models.Department).where(models.Department.name == name))
    dept = result.scalar_one_or_none()
    if not dept:
        dept = models.Department(name=name)
        db.add(dept)
        await db.flush()
    cache[name] = dept
    return dept


async def get_or_create_division(db, dept_id, name, cache):
    key = (dept_id, name)
    if key in cache:
        return cache[key]
    result = await db.execute(
        select(models.Division).where(models.Division.department_id == dept_id, models.Division.name == name)
    )
    div = result.scalar_one_or_none()
    if not div:
        div = models.Division(name=name, department_id=dept_id)
        db.add(div)
        await db.flush()
    cache[key] = div
    return div


async def get_or_create_position(db, title, cache):
    title = title or "Неизвестная должность"
    if title in cache:
        return cache[title]
    result = await db.execute(select(models.Position).where(models.Position.title == title))
    pos = result.scalar_one_or_none()
    if not pos:
        pos = models.Position(title=title)
        db.add(pos)
        await db.flush()
    cache[title] = pos
    return pos


async def get_or_create_employee(db, full_name, cache):
    if not full_name or full_name.lower() == "nan":
        return None
    if full_name in cache:
        return cache[full_name]
    result = await db.execute(select(models.Employee).where(models.Employee.full_name == full_name))
    emp = result.scalar_one_or_none()
    if not emp:
        emp = models.Employee(full_name=full_name)
        db.add(emp)
        await db.flush()
    cache[full_name] = emp
    return emp