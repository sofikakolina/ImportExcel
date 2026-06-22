import io
import openpyxl
from datetime import date, datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import joinedload
from app import models


async def export_data(tables_str: Optional[str], as_of_date: Optional[datetime], format: str, db: AsyncSession):
    tables = ["employees", "departments"]
    if tables_str:
        tables = [t.strip() for t in tables_str.split(",")]

    data = {}

    if "employees" in tables or "employments" in tables:
        # Явно подгружаем все связи через joinedload
        query = (
            select(models.Employment)
            .options(
                joinedload(models.Employment.employee),
                joinedload(models.Employment.division).joinedload(models.Division.department),
                joinedload(models.Employment.position),
                joinedload(models.Employment.supervisor),
            )
        )
        if as_of_date:
            query = query.where(
                models.Employment.hire_date <= as_of_date.date(),
                or_(
                    models.Employment.fire_date.is_(None),
                    models.Employment.fire_date >= as_of_date.date()
                )
            )
        result = await db.execute(query)
        employments = result.unique().scalars().all()

        data["employees"] = [
            {
                "ID": e.id,
                "ФИО": e.employee.full_name if e.employee else "",
                "Департамент": e.division.department.name if e.division and e.division.department else "",
                "Отдел": e.division.name if e.division else "",
                "Должность": e.position.title if e.position else "",
                "Руководитель": e.supervisor.full_name if e.supervisor else "",
                "Дата приема": e.hire_date,
                "Дата увольнения": e.fire_date or "",
                "Статус": e.status,
                "Тип занятости": e.employment_type,
                "Зарплата": float(e.salary) if e.salary else 0,
                "Дата актуальности": e.actual_date,
            }
            for e in employments
        ]

    if "departments" in tables:
        result = await db.execute(
            select(models.Department).options(joinedload(models.Department.divisions))
        )
        depts = result.unique().scalars().all()
        data["departments"] = [
            {
                "ID": d.id,
                "Название": d.name,
                "Количество отделов": len(d.divisions),
            }
            for d in depts
        ]

    if "divisions" in tables:
        result = await db.execute(
            select(models.Division).options(joinedload(models.Division.department))
        )
        divs = result.unique().scalars().all()
        data["divisions"] = [
            {
                "ID": d.id,
                "Название": d.name,
                "Департамент": d.department.name if d.department else "",
            }
            for d in divs
        ]

    if "positions" in tables:
        result = await db.execute(select(models.Position))
        positions = result.scalars().all()
        data["positions"] = [
            {"ID": p.id, "Должность": p.title}
            for p in positions
        ]

    if format == "xlsx":
        return generate_xlsx(data), "export.xlsx"
    elif format == "csv":
        return generate_csv(data), "export.zip"
    else:
        raise ValueError("Unsupported format")


def generate_xlsx(data: dict) -> bytes:
    wb = openpyxl.Workbook()
    first = True
    for sheet_name, rows in data.items():
        if first:
            ws = wb.active
            ws.title = sheet_name[:31]
            first = False
        else:
            ws = wb.create_sheet(title=sheet_name[:31])
        if rows:
            headers = list(rows[0].keys())
            ws.append(headers)
            for row in rows:
                ws.append([row.get(h) for h in headers])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def generate_csv(data: dict) -> bytes:
    import zipfile
    import csv
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for sheet_name, rows in data.items():
            if not rows:
                continue
            csv_buf = io.StringIO()
            writer = csv.DictWriter(csv_buf, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
            zf.writestr(f"{sheet_name}.csv", csv_buf.getvalue())
    return buf.getvalue()