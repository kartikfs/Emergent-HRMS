import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta, timezone
import random
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

# Sample data
FIRST_NAMES = ["Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason", "Isabella", "William",
               "Mia", "James", "Charlotte", "Benjamin", "Amelia", "Lucas", "Harper", "Henry", "Evelyn", "Alexander"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
              "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]

DEPARTMENTS = ["Engineering", "Marketing", "Sales", "HR", "Finance", "Operations", "Product", "Customer Success"]
POSITIONS = {
    "Engineering": ["Software Engineer", "Senior Engineer", "Tech Lead", "Engineering Manager", "DevOps Engineer"],
    "Marketing": ["Marketing Manager", "Content Writer", "SEO Specialist", "Social Media Manager", "Brand Manager"],
    "Sales": ["Sales Representative", "Account Executive", "Sales Manager", "Business Development"],
    "HR": ["HR Manager", "HR Coordinator", "Recruiter", "Talent Acquisition"],
    "Finance": ["Financial Analyst", "Accountant", "Finance Manager", "Controller"],
    "Operations": ["Operations Manager", "Operations Coordinator", "Supply Chain Manager"],
    "Product": ["Product Manager", "Product Designer", "UX Researcher", "Product Analyst"],
    "Customer Success": ["Customer Success Manager", "Support Specialist", "Account Manager"]
}

CITIES = ["New York", "San Francisco", "Austin", "Seattle", "Boston", "Chicago", "Los Angeles", "Denver"]
STREETS = ["Main St", "Oak Ave", "Maple Dr", "Cedar Ln", "Pine Rd", "Elm St", "Park Ave", "Washington Blvd"]

JOB_TITLES = [
    "Senior Software Engineer",
    "Marketing Manager",
    "Sales Representative",
    "Product Manager",
    "DevOps Engineer",
    "Data Analyst",
    "UX Designer",
    "Content Writer",
    "Account Executive",
    "Customer Success Manager"
]

JOB_DESCRIPTIONS = {
    "Senior Software Engineer": "We're looking for an experienced software engineer to join our team and help build scalable solutions.",
    "Marketing Manager": "Lead our marketing initiatives and drive brand awareness across multiple channels.",
    "Sales Representative": "Build relationships with clients and drive revenue growth through consultative selling.",
    "Product Manager": "Define product strategy and roadmap while working closely with engineering and design teams.",
    "DevOps Engineer": "Maintain and improve our infrastructure, CI/CD pipelines, and deployment processes."
}

REVIEW_COMMENTS = {
    "goals": [
        "Complete project deliverables and improve team collaboration",
        "Increase customer satisfaction scores by 15%",
        "Lead 2 major initiatives and mentor junior team members",
        "Improve system performance and reduce technical debt",
        "Expand market share in new territories"
    ],
    "achievements": [
        "Successfully delivered 3 major features ahead of schedule",
        "Improved customer retention rate by 20%",
        "Led cross-functional team to successful product launch",
        "Reduced system downtime by 40% through proactive monitoring",
        "Closed deals worth $500K in new business"
    ],
    "improvements": [
        "Could improve documentation and code review practices",
        "Needs to work on time management for multiple projects",
        "Should focus more on stakeholder communication",
        "Could improve technical leadership skills",
        "Needs to enhance presentation skills"
    ],
    "feedback": [
        "Excellent performance with room for growth in technical leadership",
        "Strong team player who consistently delivers results",
        "Shows great potential and willingness to learn",
        "Valuable contributor to team success and culture",
        "Demonstrates excellent problem-solving abilities"
    ]
}

async def generate_employees(db, count=15):
    """Generate mock employees"""
    employees = []
    employee_ids = []
    
    for i in range(count):
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        department = random.choice(DEPARTMENTS)
        position = random.choice(POSITIONS[department])
        
        # 80% active, 20% terminated
        status = "active" if random.random() < 0.8 else "terminated"
        
        join_date = datetime.now() - timedelta(days=random.randint(30, 1800))
        dob = datetime.now() - timedelta(days=random.randint(8000, 15000))
        
        emp_id = f"emp_{i}_{random.randint(1000, 9999)}"
        employee_ids.append((emp_id, f"{first_name} {last_name}"))
        
        employee = {
            "id": emp_id,
            "first_name": first_name,
            "last_name": last_name,
            "email": f"{first_name.lower()}.{last_name.lower()}@peoplehub.com",
            "phone": f"+1-{random.randint(200, 999)}-{random.randint(200, 999)}-{random.randint(1000, 9999)}",
            "date_of_birth": dob.strftime("%Y-%m-%d"),
            "gender": random.choice(["Male", "Female", "Other"]),
            "address": f"{random.randint(100, 9999)} {random.choice(STREETS)}, {random.choice(CITIES)}, NY {random.randint(10000, 99999)}",
            "department": department,
            "position": position,
            "employment_type": random.choice(["Full-time", "Part-time", "Contract"]),
            "join_date": join_date.strftime("%Y-%m-%d"),
            "salary": random.randint(50000, 150000),
            "status": status,
            "emergency_contact_name": f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
            "emergency_contact_phone": f"+1-{random.randint(200, 999)}-{random.randint(200, 999)}-{random.randint(1000, 9999)}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        employees.append(employee)
    
    if employees:
        await db.employees.insert_many(employees)
        print(f"✅ Created {len(employees)} employees")
    
    return employee_ids

async def generate_attendance(db, employee_ids):
    """Generate attendance records for past 30 days"""
    attendance_records = []
    
    for emp_id, emp_name in employee_ids[:10]:  # Only for active employees
        for days_ago in range(30):
            date = datetime.now() - timedelta(days=days_ago)
            
            # 90% attendance rate
            if random.random() < 0.9:
                check_in_hour = random.randint(8, 10)
                check_in_min = random.randint(0, 59)
                check_out_hour = random.randint(17, 19)
                check_out_min = random.randint(0, 59)
                
                status = "present" if check_in_hour <= 9 else "late"
                
                record = {
                    "id": f"att_{emp_id}_{days_ago}",
                    "employee_id": emp_id,
                    "date": date.strftime("%Y-%m-%d"),
                    "check_in": f"{check_in_hour:02d}:{check_in_min:02d}",
                    "check_out": f"{check_out_hour:02d}:{check_out_min:02d}",
                    "status": status,
                    "notes": "",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                attendance_records.append(record)
    
    if attendance_records:
        await db.attendance.insert_many(attendance_records)
        print(f"✅ Created {len(attendance_records)} attendance records")

async def generate_leave_requests(db, employee_ids):
    """Generate leave requests"""
    leave_requests = []
    leave_types = ["sick", "casual", "vacation", "unpaid"]
    
    for emp_id, emp_name in employee_ids[:12]:
        for i in range(random.randint(2, 5)):
            start_date = datetime.now() + timedelta(days=random.randint(-30, 60))
            days_count = random.choice([1, 2, 3, 5, 7])
            end_date = start_date + timedelta(days=days_count - 1)
            
            # Determine status based on date
            if start_date < datetime.now():
                status = random.choice(["approved", "rejected"])
            else:
                status = "pending"
            
            leave = {
                "id": f"leave_{emp_id}_{i}",
                "employee_id": emp_id,
                "leave_type": random.choice(leave_types),
                "start_date": start_date.strftime("%Y-%m-%d"),
                "end_date": end_date.strftime("%Y-%m-%d"),
                "days_count": float(days_count),
                "reason": random.choice([
                    "Family emergency",
                    "Medical appointment",
                    "Personal matters",
                    "Vacation trip",
                    "Wedding to attend"
                ]),
                "status": status,
                "approved_by": "HR Manager" if status != "pending" else None,
                "approved_at": datetime.now(timezone.utc).isoformat() if status != "pending" else None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            leave_requests.append(leave)
    
    if leave_requests:
        await db.leave_requests.insert_many(leave_requests)
        print(f"✅ Created {len(leave_requests)} leave requests")

async def generate_job_postings(db):
    """Generate job postings"""
    job_postings = []
    
    for i, title in enumerate(JOB_TITLES[:8]):
        department = random.choice(DEPARTMENTS)
        
        job = {
            "id": f"job_{i}",
            "title": title,
            "department": department,
            "location": random.choice(CITIES),
            "employment_type": random.choice(["Full-time", "Part-time", "Contract"]),
            "salary_range": f"${random.randint(60, 100)}k - ${random.randint(100, 180)}k",
            "description": JOB_DESCRIPTIONS.get(title, "Join our growing team and make an impact."),
            "requirements": f"5+ years experience in {department}, strong communication skills, team player",
            "posted_by": "HR Team",
            "status": random.choice(["open", "open", "open", "closed"]),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        job_postings.append(job)
    
    if job_postings:
        job_ids = await db.job_postings.insert_many(job_postings)
        print(f"✅ Created {len(job_postings)} job postings")
        return [job["id"] for job in job_postings]
    return []

async def generate_candidates(db, job_ids):
    """Generate candidates for job postings"""
    candidates = []
    stages = ["applied", "screening", "interview", "offered", "rejected", "hired"]
    
    for job_id in job_ids[:5]:
        for i in range(random.randint(3, 8)):
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            
            candidate = {
                "id": f"cand_{job_id}_{i}",
                "job_id": job_id,
                "full_name": f"{first_name} {last_name}",
                "email": f"{first_name.lower()}.{last_name.lower()}@email.com",
                "phone": f"+1-{random.randint(200, 999)}-{random.randint(200, 999)}-{random.randint(1000, 9999)}",
                "experience_years": float(random.randint(2, 15)),
                "current_company": random.choice(["Tech Corp", "Innovation Inc", "Digital Solutions", "Startup XYZ", None]),
                "expected_salary": float(random.randint(70000, 140000)),
                "stage": random.choice(stages),
                "notes": "",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            candidates.append(candidate)
    
    if candidates:
        await db.candidates.insert_many(candidates)
        print(f"✅ Created {len(candidates)} candidates")

async def generate_onboarding_tasks(db, employee_ids):
    """Generate onboarding tasks for recent hires"""
    tasks = []
    task_templates = [
        ("Complete HR paperwork", "Fill out all required HR forms and submit documents"),
        ("IT Setup", "Set up laptop, accounts, and access permissions"),
        ("Team Introduction", "Meet with team members and key stakeholders"),
        ("Training Sessions", "Complete mandatory training and onboarding sessions"),
        ("Review Company Policies", "Read and acknowledge company policies and handbook"),
    ]
    
    # Only for 5 most recent employees
    for emp_id, emp_name in employee_ids[:5]:
        for i, (title, description) in enumerate(task_templates):
            due_date = datetime.now() + timedelta(days=random.randint(5, 30))
            
            task = {
                "id": f"task_{emp_id}_{i}",
                "employee_id": emp_id,
                "task_title": title,
                "task_description": description,
                "due_date": due_date.strftime("%Y-%m-%d"),
                "assigned_to": random.choice(["IT Team", "HR Team", "Manager", "Admin"]),
                "status": random.choice(["pending", "in_progress", "completed"]),
                "completed_at": datetime.now(timezone.utc).isoformat() if random.random() < 0.3 else None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            tasks.append(task)
    
    if tasks:
        await db.onboarding_tasks.insert_many(tasks)
        print(f"✅ Created {len(tasks)} onboarding tasks")

async def generate_payroll(db, employee_ids):
    """Generate payroll records"""
    payroll_records = []
    
    # Generate for past 3 months
    for months_ago in range(3):
        month_date = datetime.now() - timedelta(days=30 * months_ago)
        month_str = month_date.strftime("%Y-%m")
        
        for emp_id, emp_name in employee_ids[:12]:  # Only active employees
            basic_salary = random.randint(50000, 120000) / 12
            allowances = random.randint(500, 3000)
            deductions = random.randint(200, 1000)
            tax = basic_salary * 0.15
            net_salary = basic_salary + allowances - deductions - tax
            
            record = {
                "id": f"pay_{emp_id}_{months_ago}",
                "employee_id": emp_id,
                "month": month_str,
                "basic_salary": round(basic_salary, 2),
                "allowances": float(allowances),
                "deductions": float(deductions),
                "tax": round(tax, 2),
                "net_salary": round(net_salary, 2),
                "payment_date": month_date.replace(day=25).strftime("%Y-%m-%d"),
                "payment_status": "paid" if months_ago > 0 else random.choice(["paid", "pending"]),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            payroll_records.append(record)
    
    if payroll_records:
        await db.payroll_records.insert_many(payroll_records)
        print(f"✅ Created {len(payroll_records)} payroll records")

async def generate_performance_reviews(db, employee_ids):
    """Generate performance reviews"""
    reviews = []
    quarters = ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2024"]
    
    for emp_id, emp_name in employee_ids[:10]:
        for i, quarter in enumerate(quarters[:2]):
            review = {
                "id": f"review_{emp_id}_{i}",
                "employee_id": emp_id,
                "reviewer_id": "Manager",
                "review_period": quarter,
                "goals": random.choice(REVIEW_COMMENTS["goals"]),
                "achievements": random.choice(REVIEW_COMMENTS["achievements"]),
                "areas_of_improvement": random.choice(REVIEW_COMMENTS["improvements"]),
                "rating": float(random.randint(3, 5)),
                "feedback": random.choice(REVIEW_COMMENTS["feedback"]),
                "status": random.choice(["draft", "completed"]),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            reviews.append(review)
    
    if reviews:
        await db.performance_reviews.insert_many(reviews)
        print(f"✅ Created {len(reviews)} performance reviews")

async def seed_database():
    """Main function to seed all data"""
    print("🌱 Starting database seeding...")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    try:
        # Clear existing data
        print("🗑️  Clearing existing data...")
        await db.employees.delete_many({})
        await db.attendance.delete_many({})
        await db.leave_requests.delete_many({})
        await db.job_postings.delete_many({})
        await db.candidates.delete_many({})
        await db.onboarding_tasks.delete_many({})
        await db.payroll_records.delete_many({})
        await db.performance_reviews.delete_many({})
        
        # Generate all data
        employee_ids = await generate_employees(db, count=15)
        await generate_attendance(db, employee_ids)
        await generate_leave_requests(db, employee_ids)
        job_ids = await generate_job_postings(db)
        await generate_candidates(db, job_ids)
        await generate_onboarding_tasks(db, employee_ids)
        await generate_payroll(db, employee_ids)
        await generate_performance_reviews(db, employee_ids)
        
        print("\n✅ Database seeding completed successfully!")
        print(f"📊 Summary:")
        print(f"   - {len(employee_ids)} employees")
        print(f"   - ~{len(employee_ids) * 25} attendance records")
        print(f"   - ~{len(employee_ids) * 3} leave requests")
        print(f"   - {len(job_ids)} job postings")
        print(f"   - ~{len(job_ids) * 5} candidates")
        print(f"   - ~{len(employee_ids[:5]) * 5} onboarding tasks")
        print(f"   - ~{len(employee_ids) * 3} payroll records")
        print(f"   - ~{len(employee_ids[:10]) * 2} performance reviews")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
