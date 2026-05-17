from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, date, timedelta
import io
import base64
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============ HELPER FUNCTIONS ============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        employee_id: str = payload.get("sub")
        if employee_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
        if employee is None:
            raise HTTPException(status_code=401, detail="User not found")
        return employee
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# ============ MODELS ============

# Auth Models
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str
    employee: dict

class PasswordResetRequest(BaseModel):
    email: str
    new_password: str

class ProfileUpdateRequest(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

# Employee Models
class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    date_of_birth: str
    gender: str
    address: str
    department: str
    position: str
    employment_type: str  # Full-time, Part-time, Contract
    join_date: str
    salary: float
    password: Optional[str] = None  # For employee login
    manager_id: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

class Employee(EmployeeCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "active"  # active, inactive, terminated
    hashed_password: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Attendance Models
class AttendanceCreate(BaseModel):
    employee_id: str
    date: str
    check_in: str
    check_out: Optional[str] = None
    status: str = "present"  # present, absent, half-day, late
    notes: Optional[str] = None

class Attendance(AttendanceCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Leave Models
class LeaveRequestCreate(BaseModel):
    employee_id: str
    leave_type: str  # sick, casual, vacation, unpaid
    start_date: str
    end_date: str
    days_count: float
    reason: str

class LeaveRequest(LeaveRequestCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"  # pending, approved, rejected
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LeaveApproval(BaseModel):
    status: str  # approved, rejected
    approved_by: str

# Recruitment Models
class JobPostingCreate(BaseModel):
    title: str
    department: str
    location: str
    employment_type: str
    salary_range: str
    description: str
    requirements: str
    posted_by: str

class JobPosting(JobPostingCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "open"  # open, closed
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CandidateCreate(BaseModel):
    job_id: str
    full_name: str
    email: EmailStr
    phone: str
    experience_years: float
    current_company: Optional[str] = None
    expected_salary: float
    resume_url: Optional[str] = None

class Candidate(CandidateCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stage: str = "applied"  # applied, screening, interview, offered, rejected, hired
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CandidateStageUpdate(BaseModel):
    stage: str
    notes: Optional[str] = None

# Onboarding Models
class OnboardingTaskCreate(BaseModel):
    employee_id: str
    task_title: str
    task_description: str
    due_date: str
    assigned_to: str

class OnboardingTask(OnboardingTaskCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"  # pending, in_progress, completed
    completed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TaskStatusUpdate(BaseModel):
    status: str

# Payroll Models
class PayrollRecordCreate(BaseModel):
    employee_id: str
    month: str  # YYYY-MM format
    basic_salary: float
    allowances: float = 0
    deductions: float = 0
    tax: float = 0
    net_salary: float
    payment_date: str
    payment_status: str = "pending"  # pending, paid

class PayrollRecord(PayrollRecordCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Performance Models
class PerformanceReviewCreate(BaseModel):
    employee_id: str
    reviewer_id: str
    review_period: str  # e.g., "Q1 2025"
    goals: str
    achievements: str
    areas_of_improvement: str
    rating: float  # 1-5 scale
    feedback: str

class PerformanceReview(PerformanceReviewCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "draft"  # draft, completed
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Document Models
class DocumentUpload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entity_type: str  # employee, candidate, payroll
    entity_id: str
    document_type: str  # resume, contract, id_proof, salary_slip
    file_name: str
    file_data: str  # base64 encoded
    uploaded_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============ AUTHENTICATION ROUTES ============

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_request: LoginRequest):
    employee = await db.employees.find_one({"email": login_request.email}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not employee.get("hashed_password"):
        raise HTTPException(status_code=401, detail="Password not set. Contact HR.")
    
    if not verify_password(login_request.password, employee["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if employee.get("status") != "active":
        raise HTTPException(status_code=401, detail="Account is not active")
    
    token = create_access_token({"sub": employee["id"], "email": employee["email"]})
    
    # Remove sensitive data
    employee_data = {k: v for k, v in employee.items() if k != "hashed_password"}
    
    return {"token": token, "employee": employee_data}

@api_router.post("/auth/reset-password")
async def reset_password(reset_request: PasswordResetRequest):
    employee = await db.employees.find_one({"email": reset_request.email})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    hashed_password = hash_password(reset_request.new_password)
    await db.employees.update_one(
        {"email": reset_request.email},
        {"$set": {"hashed_password": hashed_password}}
    )
    
    return {"message": "Password reset successfully"}

# ============ EMPLOYEE PORTAL ROUTES ============

@api_router.get("/employee/profile")
async def get_employee_profile(current_user: dict = Depends(get_current_user)):
    # Remove sensitive data
    profile = {k: v for k, v in current_user.items() if k not in ["hashed_password"]}
    return profile

@api_router.put("/employee/profile")
async def update_employee_profile(
    profile_update: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    update_data = {k: v for k, v in profile_update.model_dump().items() if v is not None}
    
    await db.employees.update_one(
        {"id": current_user["id"]},
        {"$set": update_data}
    )
    
    updated_employee = await db.employees.find_one({"id": current_user["id"]}, {"_id": 0, "hashed_password": 0})
    return updated_employee

@api_router.get("/employee/attendance")
async def get_employee_attendance(current_user: dict = Depends(get_current_user)):
    attendance_records = await db.attendance.find(
        {"employee_id": current_user["id"]},
        {"_id": 0}
    ).sort("date", -1).to_list(100)
    return attendance_records

@api_router.get("/employee/leaves")
async def get_employee_leaves(current_user: dict = Depends(get_current_user)):
    leave_requests = await db.leave_requests.find(
        {"employee_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return leave_requests

@api_router.post("/employee/leaves")
async def create_employee_leave_request(
    leave: LeaveRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    # Override employee_id with current user
    leave_data = leave.model_dump()
    leave_data["employee_id"] = current_user["id"]
    
    leave_obj = LeaveRequest(**leave_data)
    doc = leave_obj.model_dump()
    await db.leave_requests.insert_one(doc)
    return leave_obj

@api_router.get("/employee/payslips")
async def get_employee_payslips(current_user: dict = Depends(get_current_user)):
    payslips = await db.payroll_records.find(
        {"employee_id": current_user["id"]},
        {"_id": 0}
    ).sort("month", -1).to_list(100)
    return payslips

@api_router.get("/employee/documents")
async def get_employee_documents(current_user: dict = Depends(get_current_user)):
    documents = await db.documents.find(
        {"entity_type": "employee", "entity_id": current_user["id"]},
        {"_id": 0, "file_data": 0}
    ).to_list(100)
    return documents

@api_router.post("/employee/documents/upload")
async def upload_employee_document(
    file: UploadFile,
    document_type: str,
    current_user: dict = Depends(get_current_user)
):
    file_data = await file.read()
    encoded_file = base64.b64encode(file_data).decode('utf-8')
    
    doc = DocumentUpload(
        entity_type="employee",
        entity_id=current_user["id"],
        document_type=document_type,
        file_name=file.filename,
        file_data=encoded_file
    )
    
    await db.documents.insert_one(doc.model_dump())
    return {"message": "Document uploaded successfully", "document_id": doc.id}

@api_router.get("/employee/dashboard")
async def get_employee_dashboard(current_user: dict = Depends(get_current_user)):
    # Get upcoming leaves
    today = datetime.now().strftime("%Y-%m-%d")
    upcoming_leaves = await db.leave_requests.find(
        {
            "employee_id": current_user["id"],
            "status": "approved",
            "start_date": {"$gte": today}
        },
        {"_id": 0}
    ).sort("start_date", 1).to_list(5)
    
    # Get pending leave requests
    pending_leaves = await db.leave_requests.count_documents(
        {"employee_id": current_user["id"], "status": "pending"}
    )
    
    # Get onboarding tasks
    pending_tasks = await db.onboarding_tasks.find(
        {
            "employee_id": current_user["id"],
            "status": {"$in": ["pending", "in_progress"]}
        },
        {"_id": 0}
    ).to_list(10)
    
    # Get recent attendance (last 7 days)
    seven_days_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    recent_attendance = await db.attendance.count_documents(
        {
            "employee_id": current_user["id"],
            "date": {"$gte": seven_days_ago},
            "status": "present"
        }
    )
    
    return {
        "upcoming_leaves": upcoming_leaves,
        "pending_leave_count": pending_leaves,
        "pending_tasks": pending_tasks,
        "attendance_last_7_days": recent_attendance
    }

# ============ EMPLOYEE ROUTES ============

@api_router.post("/employees", response_model=Employee)
async def create_employee(employee: EmployeeCreate):
    emp_data = employee.model_dump()
    
    # Hash password if provided
    if emp_data.get("password"):
        emp_data["hashed_password"] = hash_password(emp_data["password"])
        del emp_data["password"]
    
    emp_obj = Employee(**emp_data)
    doc = emp_obj.model_dump()
    await db.employees.insert_one(doc)
    
    # Remove sensitive data from response
    response_data = {k: v for k, v in emp_obj.model_dump().items() if k != "hashed_password"}
    return response_data

@api_router.get("/employees", response_model=List[Employee])
async def get_employees(status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    employees = await db.employees.find(query, {"_id": 0}).to_list(1000)
    return employees

@api_router.get("/employees/{employee_id}", response_model=Employee)
async def get_employee(employee_id: str):
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@api_router.put("/employees/{employee_id}", response_model=Employee)
async def update_employee(employee_id: str, employee: EmployeeCreate):
    result = await db.employees.update_one(
        {"id": employee_id},
        {"$set": employee.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    updated_employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    return updated_employee

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str):
    result = await db.employees.update_one(
        {"id": employee_id},
        {"$set": {"status": "terminated"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee status updated to terminated"}

# ============ ATTENDANCE ROUTES ============

@api_router.post("/attendance", response_model=Attendance)
async def create_attendance(attendance: AttendanceCreate):
    att_obj = Attendance(**attendance.model_dump())
    doc = att_obj.model_dump()
    await db.attendance.insert_one(doc)
    return att_obj

@api_router.get("/attendance", response_model=List[Attendance])
async def get_attendance(employee_id: Optional[str] = None, date: Optional[str] = None):
    query = {}
    if employee_id:
        query["employee_id"] = employee_id
    if date:
        query["date"] = date
    attendance_records = await db.attendance.find(query, {"_id": 0}).to_list(1000)
    return attendance_records

@api_router.put("/attendance/{attendance_id}", response_model=Attendance)
async def update_attendance(attendance_id: str, attendance: AttendanceCreate):
    result = await db.attendance.update_one(
        {"id": attendance_id},
        {"$set": attendance.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    updated_record = await db.attendance.find_one({"id": attendance_id}, {"_id": 0})
    return updated_record

# ============ LEAVE ROUTES ============

@api_router.post("/leave-requests", response_model=LeaveRequest)
async def create_leave_request(leave: LeaveRequestCreate):
    leave_obj = LeaveRequest(**leave.model_dump())
    doc = leave_obj.model_dump()
    await db.leave_requests.insert_one(doc)
    return leave_obj

@api_router.get("/leave-requests", response_model=List[LeaveRequest])
async def get_leave_requests(employee_id: Optional[str] = None, status: Optional[str] = None):
    query = {}
    if employee_id:
        query["employee_id"] = employee_id
    if status:
        query["status"] = status
    leave_requests = await db.leave_requests.find(query, {"_id": 0}).to_list(1000)
    return leave_requests

@api_router.put("/leave-requests/{leave_id}/approve", response_model=LeaveRequest)
async def approve_leave_request(leave_id: str, approval: LeaveApproval):
    result = await db.leave_requests.update_one(
        {"id": leave_id},
        {"$set": {
            "status": approval.status,
            "approved_by": approval.approved_by,
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found")
    updated_request = await db.leave_requests.find_one({"id": leave_id}, {"_id": 0})
    return updated_request

# ============ RECRUITMENT ROUTES ============

@api_router.post("/job-postings", response_model=JobPosting)
async def create_job_posting(job: JobPostingCreate):
    job_obj = JobPosting(**job.model_dump())
    doc = job_obj.model_dump()
    await db.job_postings.insert_one(doc)
    return job_obj

@api_router.get("/job-postings", response_model=List[JobPosting])
async def get_job_postings(status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    job_postings = await db.job_postings.find(query, {"_id": 0}).to_list(1000)
    return job_postings

@api_router.put("/job-postings/{job_id}", response_model=JobPosting)
async def update_job_posting(job_id: str, job: JobPostingCreate):
    result = await db.job_postings.update_one(
        {"id": job_id},
        {"$set": job.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job posting not found")
    updated_job = await db.job_postings.find_one({"id": job_id}, {"_id": 0})
    return updated_job

@api_router.post("/candidates", response_model=Candidate)
async def create_candidate(candidate: CandidateCreate):
    cand_obj = Candidate(**candidate.model_dump())
    doc = cand_obj.model_dump()
    await db.candidates.insert_one(doc)
    return cand_obj

@api_router.get("/candidates", response_model=List[Candidate])
async def get_candidates(job_id: Optional[str] = None, stage: Optional[str] = None):
    query = {}
    if job_id:
        query["job_id"] = job_id
    if stage:
        query["stage"] = stage
    candidates = await db.candidates.find(query, {"_id": 0}).to_list(1000)
    return candidates

@api_router.put("/candidates/{candidate_id}/stage", response_model=Candidate)
async def update_candidate_stage(candidate_id: str, stage_update: CandidateStageUpdate):
    result = await db.candidates.update_one(
        {"id": candidate_id},
        {"$set": stage_update.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")
    updated_candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    return updated_candidate

# ============ ONBOARDING ROUTES ============

@api_router.post("/onboarding-tasks", response_model=OnboardingTask)
async def create_onboarding_task(task: OnboardingTaskCreate):
    task_obj = OnboardingTask(**task.model_dump())
    doc = task_obj.model_dump()
    await db.onboarding_tasks.insert_one(doc)
    return task_obj

@api_router.get("/onboarding-tasks", response_model=List[OnboardingTask])
async def get_onboarding_tasks(employee_id: Optional[str] = None, status: Optional[str] = None):
    query = {}
    if employee_id:
        query["employee_id"] = employee_id
    if status:
        query["status"] = status
    tasks = await db.onboarding_tasks.find(query, {"_id": 0}).to_list(1000)
    return tasks

@api_router.put("/onboarding-tasks/{task_id}/status", response_model=OnboardingTask)
async def update_task_status(task_id: str, status_update: TaskStatusUpdate):
    update_data = {"status": status_update.status}
    if status_update.status == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.onboarding_tasks.update_one(
        {"id": task_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    updated_task = await db.onboarding_tasks.find_one({"id": task_id}, {"_id": 0})
    return updated_task

# ============ PAYROLL ROUTES ============

@api_router.post("/payroll", response_model=PayrollRecord)
async def create_payroll_record(payroll: PayrollRecordCreate):
    payroll_obj = PayrollRecord(**payroll.model_dump())
    doc = payroll_obj.model_dump()
    await db.payroll_records.insert_one(doc)
    return payroll_obj

@api_router.get("/payroll", response_model=List[PayrollRecord])
async def get_payroll_records(employee_id: Optional[str] = None, month: Optional[str] = None):
    query = {}
    if employee_id:
        query["employee_id"] = employee_id
    if month:
        query["month"] = month
    payroll_records = await db.payroll_records.find(query, {"_id": 0}).to_list(1000)
    return payroll_records

@api_router.put("/payroll/{payroll_id}", response_model=PayrollRecord)
async def update_payroll_record(payroll_id: str, payroll: PayrollRecordCreate):
    result = await db.payroll_records.update_one(
        {"id": payroll_id},
        {"$set": payroll.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    updated_record = await db.payroll_records.find_one({"id": payroll_id}, {"_id": 0})
    return updated_record

# ============ PERFORMANCE ROUTES ============

@api_router.post("/performance-reviews", response_model=PerformanceReview)
async def create_performance_review(review: PerformanceReviewCreate):
    review_obj = PerformanceReview(**review.model_dump())
    doc = review_obj.model_dump()
    await db.performance_reviews.insert_one(doc)
    return review_obj

@api_router.get("/performance-reviews", response_model=List[PerformanceReview])
async def get_performance_reviews(employee_id: Optional[str] = None):
    query = {}
    if employee_id:
        query["employee_id"] = employee_id
    reviews = await db.performance_reviews.find(query, {"_id": 0}).to_list(1000)
    return reviews

@api_router.put("/performance-reviews/{review_id}", response_model=PerformanceReview)
async def update_performance_review(review_id: str, review: PerformanceReviewCreate):
    result = await db.performance_reviews.update_one(
        {"id": review_id},
        {"$set": review.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Performance review not found")
    updated_review = await db.performance_reviews.find_one({"id": review_id}, {"_id": 0})
    return updated_review

# ============ DOCUMENT ROUTES ============

@api_router.post("/documents/upload")
async def upload_document(file: UploadFile, entity_type: str, entity_id: str, document_type: str):
    file_data = await file.read()
    encoded_file = base64.b64encode(file_data).decode('utf-8')
    
    doc = DocumentUpload(
        entity_type=entity_type,
        entity_id=entity_id,
        document_type=document_type,
        file_name=file.filename,
        file_data=encoded_file
    )
    
    await db.documents.insert_one(doc.model_dump())
    return {"message": "Document uploaded successfully", "document_id": doc.id}

@api_router.get("/documents")
async def get_documents(entity_type: Optional[str] = None, entity_id: Optional[str] = None):
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    documents = await db.documents.find(query, {"_id": 0, "file_data": 0}).to_list(1000)
    return documents

@api_router.get("/documents/{document_id}/download")
async def download_document(document_id: str):
    document = await db.documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_data = base64.b64decode(document["file_data"])
    return StreamingResponse(
        io.BytesIO(file_data),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={document['file_name']}"}
    )

# ============ DASHBOARD/STATS ROUTES ============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    total_employees = await db.employees.count_documents({"status": "active"})
    pending_leaves = await db.leave_requests.count_documents({"status": "pending"})
    open_positions = await db.job_postings.count_documents({"status": "open"})
    pending_onboarding = await db.onboarding_tasks.count_documents({"status": "pending"})
    
    return {
        "total_employees": total_employees,
        "pending_leaves": pending_leaves,
        "open_positions": open_positions,
        "pending_onboarding_tasks": pending_onboarding
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
