from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone

# ============ ORGANIZATIONAL STRUCTURE MODELS ============

class DepartmentCreate(BaseModel):
    name: str
    code: str
    head_employee_id: Optional[str] = None
    description: Optional[str] = None
    cost_center: Optional[str] = None

class Department(DepartmentCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LocationCreate(BaseModel):
    name: str
    code: str
    address: str
    city: str
    state: str
    country: str
    is_head_office: bool = False

class Location(LocationCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DesignationCreate(BaseModel):
    title: str
    level: int  # 1=Entry, 2=Mid, 3=Senior, 4=Lead, 5=Manager, 6=Director
    department_id: str
    reports_to_designation_id: Optional[str] = None

class Designation(DesignationCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EmployeeTransferCreate(BaseModel):
    employee_id: str
    from_department: str
    to_department: str
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    from_designation: Optional[str] = None
    to_designation: Optional[str] = None
    effective_date: str
    reason: str
    approved_by: str

class EmployeeTransfer(EmployeeTransferCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"  # pending, approved, rejected
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============ PAYROLL ENHANCED MODELS ============

class SalaryComponentCreate(BaseModel):
    component_name: str
    component_type: str  # earning, deduction, statutory
    calculation_type: str  # fixed, percentage
    value: float
    is_taxable: bool = True
    is_part_of_ctc: bool = True

class SalaryComponent(SalaryComponentCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class SalaryStructureCreate(BaseModel):
    employee_id: str
    ctc_annual: float
    basic_salary: float
    hra: float
    special_allowance: float
    other_allowances: float
    pf_employee: float
    pf_employer: float
    esi_employee: float
    esi_employer: float
    professional_tax: float
    effective_date: str

class SalaryStructure(SalaryStructureCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "active"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LoanAdvanceCreate(BaseModel):
    employee_id: str
    loan_type: str  # personal_loan, advance, emergency
    amount: float
    emi_amount: float
    tenure_months: int
    start_date: str
    reason: str

class LoanAdvance(LoanAdvanceCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    balance_amount: float
    status: str = "active"  # active, closed
    approved_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReimbursementCreate(BaseModel):
    employee_id: str
    reimbursement_type: str  # medical, travel, internet, mobile
    amount: float
    expense_date: str
    description: str
    receipt_document_id: Optional[str] = None

class Reimbursement(ReimbursementCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"  # pending, approved, rejected, paid
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    payment_date: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InvestmentDeclarationCreate(BaseModel):
    employee_id: str
    financial_year: str
    section_80c: float = 0
    section_80d: float = 0
    hra_rent_paid: float = 0
    home_loan_interest: float = 0
    other_deductions: float = 0

class InvestmentDeclaration(InvestmentDeclarationCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "draft"  # draft, submitted, approved
    submitted_at: Optional[str] = None
    approved_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============ ONBOARDING ENHANCED MODELS ============

class OnboardingTemplateCreate(BaseModel):
    template_name: str
    department: str
    role: str
    tasks: List[dict]  # [{"title": "", "description": "", "due_days": 7, "assigned_to": ""}]

class OnboardingTemplate(OnboardingTemplateCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EquipmentAssignmentCreate(BaseModel):
    employee_id: str
    equipment_type: str  # laptop, phone, access_card, id_card
    equipment_id: str
    brand_model: Optional[str] = None
    serial_number: Optional[str] = None
    assigned_date: str
    return_date: Optional[str] = None

class EquipmentAssignment(EquipmentAssignmentCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "assigned"  # assigned, returned, damaged, lost
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProbationReviewCreate(BaseModel):
    employee_id: str
    review_date: str
    reviewer_id: str
    performance_rating: float  # 1-5
    attendance_rating: float
    behavior_rating: float
    strengths: str
    areas_of_improvement: str
    recommendation: str  # confirm, extend, terminate

class ProbationReview(ProbationReviewCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "draft"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TrainingModuleCreate(BaseModel):
    module_name: str
    description: str
    duration_hours: float
    trainer: str
    is_mandatory: bool = False

class TrainingModule(TrainingModuleCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TrainingAssignmentCreate(BaseModel):
    employee_id: str
    training_module_id: str
    assigned_date: str
    due_date: str

class TrainingAssignment(TrainingAssignmentCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "assigned"  # assigned, in_progress, completed
    completion_date: Optional[str] = None
    score: Optional[float] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
