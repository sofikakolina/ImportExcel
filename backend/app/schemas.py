from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import Optional, List
from decimal import Decimal

# Employee
class EmployeeBase(BaseModel):
    full_name: str

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeResponse(EmployeeBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# Department
class DepartmentBase(BaseModel):
    name: str

class DepartmentResponse(DepartmentBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# Division
class DivisionBase(BaseModel):
    name: str
    department_id: int

class DivisionResponse(BaseModel):
    id: int
    name: str
    department_id: int
    department: Optional[DepartmentResponse] = None  # ← добавить
    model_config = ConfigDict(from_attributes=True)

# Position
class PositionBase(BaseModel):
    title: str

class PositionResponse(PositionBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# Employment
class EmploymentBase(BaseModel):
    employee_id: int
    division_id: int
    position_id: int
    supervisor_id: Optional[int] = None
    hire_date: date
    fire_date: Optional[date] = None
    status: str  # "Работает" / "Уволен"
    employment_type: str  # "Штатный сотрудник" / "Внештатный сотрудник"
    salary: Decimal
    actual_date: date

class EmploymentCreate(EmploymentBase):
    pass

class EmploymentUpdate(BaseModel):
    employee_id: Optional[int] = None
    division_id: Optional[int] = None
    position_id: Optional[int] = None
    supervisor_id: Optional[int] = None
    hire_date: Optional[date] = None
    fire_date: Optional[date] = None
    status: Optional[str] = None
    employment_type: Optional[str] = None
    salary: Optional[Decimal] = None
    actual_date: Optional[date] = None

class EmploymentResponse(EmploymentBase):
    id: int
    employee: Optional[EmployeeResponse] = None
    division: Optional[DivisionResponse] = None
    position: Optional[PositionResponse] = None
    supervisor: Optional[EmployeeResponse] = None
    model_config = ConfigDict(from_attributes=True)

# Filter params
class EmployeeFilterParams(BaseModel):
    search: Optional[str] = None
    department_id: Optional[int] = None
    division_id: Optional[int] = None
    status: Optional[str] = None  # "Работает" / "Уволен"
    as_of_date: Optional[date] = None

# Operation history
class OperationHistoryResponse(BaseModel):
    id: str
    type: str
    status: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    file_name: Optional[str] = None
    tables: Optional[str] = None
    result: Optional[str] = None
    errors: Optional[str] = None
    warnings: Optional[str] = None
    progress: int
    model_config = ConfigDict(from_attributes=True)

# Import result
class ImportResult(BaseModel):
    total_rows: int
    processed_rows: int
    skipped_rows: int
    errors: List[str] = []
    warnings: List[str] = []

class EmploymentCreateFront(BaseModel):
    full_name: str
    division_id: int
    position_title: str
    supervisor_name: Optional[str] = None
    hire_date: date
    fire_date: Optional[date] = None
    status: str = "Работает"
    employment_type: str = "Штатный сотрудник"
    salary: Decimal