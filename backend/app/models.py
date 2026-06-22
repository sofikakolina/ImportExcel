from sqlalchemy import Column, Integer, String, Date, Numeric, ForeignKey, Enum, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), unique=True, nullable=False, index=True)

    employments = relationship("Employment", foreign_keys="Employment.employee_id", back_populates="employee")
    supervised_employments = relationship("Employment", foreign_keys="Employment.supervisor_id", back_populates="supervisor")

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)

    divisions = relationship("Division", back_populates="department")

class Division(Base):
    __tablename__ = "divisions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)

    department = relationship("Department", back_populates="divisions")
    employments = relationship("Employment", back_populates="division")

class Position(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), unique=True, nullable=False)

    employments = relationship("Employment", back_populates="position")

class EmploymentStatus(str, enum.Enum):
    active = "Работает"
    fired = "Уволен"

class EmploymentType(str, enum.Enum):
    staff = "Штатный сотрудник"
    freelance = "Внештатный сотрудник"

class Employment(Base):
    __tablename__ = "employments"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    division_id = Column(Integer, ForeignKey("divisions.id"), nullable=False)
    position_id = Column(Integer, ForeignKey("positions.id"), nullable=False)
    supervisor_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    hire_date = Column(Date, nullable=False)
    fire_date = Column(Date, nullable=True)
    status = Column(Enum(EmploymentStatus), nullable=False, default=EmploymentStatus.active)
    employment_type = Column(Enum(EmploymentType), nullable=False)
    salary = Column(Numeric(10,2), nullable=False)
    actual_date = Column(Date, nullable=False)  # дата актуальности из файла

    employee = relationship("Employee", foreign_keys=[employee_id], back_populates="employments")
    supervisor = relationship("Employee", foreign_keys=[supervisor_id], back_populates="supervised_employments")
    division = relationship("Division", back_populates="employments")
    position = relationship("Position", back_populates="employments")

    __table_args__ = (UniqueConstraint('employee_id', 'division_id', 'position_id', 'hire_date', name='uix_employment'),)

class OperationHistory(Base):
    __tablename__ = "operation_history"

    id = Column(String(36), primary_key=True, index=True)  # UUID
    type = Column(String(20), nullable=False)  # import / export
    status = Column(String(30), nullable=False, default="pending")  # pending, running, completed, completed_with_warnings, failed
    started_at = Column(DateTime, server_default=func.now())
    finished_at = Column(DateTime, nullable=True)
    file_name = Column(String(255), nullable=True)  # для импорта
    tables = Column(String(255), nullable=True)  # для экспорта, список таблиц через запятую
    result = Column(String(500), nullable=True)  # краткий результат
    errors = Column(String(2000), nullable=True)  # ошибки
    warnings = Column(String(2000), nullable=True)  # предупреждения
    progress = Column(Integer, default=0)  # 0-100