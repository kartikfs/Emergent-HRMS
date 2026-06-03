#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for PeopleHub HRMS
Tests all authentication flows, admin management, and HR module APIs
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://workforce-hub-498.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@peoplehub.com"
ADMIN_PASSWORD = "admin123"
SECONDARY_ADMIN_EMAIL = "hr.admin@peoplehub.com"
SECONDARY_ADMIN_PASSWORD = "admin123"
EMPLOYEE_EMAIL = "harper.thomas@peoplehub.com"
EMPLOYEE_PASSWORD = "employee123"

# Global variables to store tokens and IDs
admin_token = None
employee_token = None
test_employee_id = None
test_admin_id = None
test_leave_id = None
test_payroll_id = None
test_attendance_id = None
test_job_id = None
test_candidate_id = None
test_onboarding_task_id = None
test_performance_review_id = None

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}

def log_test(test_name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {test_name}")
    if details:
        print(f"   Details: {details}")
    
    test_results["tests"].append({
        "name": test_name,
        "passed": passed,
        "details": details
    })
    
    if passed:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1

def print_summary():
    """Print test summary"""
    total = test_results["passed"] + test_results["failed"]
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Total Tests: {total}")
    print(f"Passed: {test_results['passed']} ({test_results['passed']/total*100:.1f}%)")
    print(f"Failed: {test_results['failed']} ({test_results['failed']/total*100:.1f}%)")
    print("="*80)
    
    if test_results["failed"] > 0:
        print("\nFailed Tests:")
        for test in test_results["tests"]:
            if not test["passed"]:
                print(f"  ❌ {test['name']}")
                if test["details"]:
                    print(f"     {test['details']}")

# ============ PRIORITY 1: AUTHENTICATION & USER MANAGEMENT ============

def test_admin_login():
    """Test 1: Admin Login Flow"""
    global admin_token
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data and data.get("role") == "admin":
                admin_token = data["token"]
                log_test("Admin Login", True, f"Token received, role: {data['role']}")
                return True
            else:
                log_test("Admin Login", False, "Missing token or incorrect role in response")
                return False
        else:
            log_test("Admin Login", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("Admin Login", False, f"Exception: {str(e)}")
        return False

def test_admin_login_invalid_credentials():
    """Test 2: Admin Login with Invalid Credentials"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": "wrongpassword"}
        )
        
        if response.status_code == 401:
            log_test("Admin Login - Invalid Credentials", True, "Correctly rejected with 401")
            return True
        else:
            log_test("Admin Login - Invalid Credentials", False, f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Admin Login - Invalid Credentials", False, f"Exception: {str(e)}")
        return False

def test_employee_login():
    """Test 3: Employee Login Flow"""
    global employee_token, test_employee_id
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": EMPLOYEE_EMAIL, "password": EMPLOYEE_PASSWORD}
        )
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data and data.get("role") == "employee":
                employee_token = data["token"]
                test_employee_id = data["user"].get("id")
                log_test("Employee Login", True, f"Token received, role: {data['role']}, ID: {test_employee_id}")
                return True
            else:
                log_test("Employee Login", False, "Missing token or incorrect role in response")
                return False
        else:
            log_test("Employee Login", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("Employee Login", False, f"Exception: {str(e)}")
        return False

def test_admin_signup():
    """Test 4: Admin Signup (Create New Admin)"""
    global test_admin_id
    
    try:
        # Generate unique email for new admin
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        new_admin_email = f"test.admin.{timestamp}@peoplehub.com"
        
        response = requests.post(
            f"{BASE_URL}/auth/admin/signup",
            json={
                "email": new_admin_email,
                "password": "admin123",
                "full_name": "Test Admin User"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data and data.get("role") == "admin":
                test_admin_id = data["user"].get("id")
                log_test("Admin Signup", True, f"New admin created: {new_admin_email}, ID: {test_admin_id}")
                return True
            else:
                log_test("Admin Signup", False, "Missing token or incorrect role in response")
                return False
        else:
            log_test("Admin Signup", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("Admin Signup", False, f"Exception: {str(e)}")
        return False

def test_admin_signup_duplicate_email():
    """Test 5: Admin Signup - Duplicate Email Validation"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/admin/signup",
            json={
                "email": ADMIN_EMAIL,  # Existing admin email
                "password": "admin123",
                "full_name": "Duplicate Admin"
            }
        )
        
        if response.status_code == 400:
            log_test("Admin Signup - Duplicate Email", True, "Correctly rejected duplicate email with 400")
            return True
        else:
            log_test("Admin Signup - Duplicate Email", False, f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Admin Signup - Duplicate Email", False, f"Exception: {str(e)}")
        return False

def test_employee_signup():
    """Test 6: Employee Signup (Self-Registration)"""
    try:
        # Generate unique email for new employee
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        new_employee_email = f"test.employee.{timestamp}@peoplehub.com"
        
        response = requests.post(
            f"{BASE_URL}/auth/employee/signup",
            json={
                "email": new_employee_email,
                "password": "employee123",
                "first_name": "Test",
                "last_name": "Employee",
                "phone": "+1-555-0199",
                "date_of_birth": "1995-05-15",
                "gender": "Male",
                "address": "123 Test Street, Test City, TC 12345",
                "department": "Engineering",
                "position": "Software Engineer",
                "employment_type": "Full-time",
                "join_date": datetime.now().strftime("%Y-%m-%d"),
                "emergency_contact_name": "Emergency Contact",
                "emergency_contact_phone": "+1-555-0100"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data and data.get("role") == "employee":
                log_test("Employee Signup", True, f"New employee created: {new_employee_email}")
                return True
            else:
                log_test("Employee Signup", False, "Missing token or incorrect role in response")
                return False
        else:
            log_test("Employee Signup", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("Employee Signup", False, f"Exception: {str(e)}")
        return False

def test_get_all_users():
    """Test 7: GET /api/admin/users (Admin Only)"""
    if not admin_token:
        log_test("GET /api/admin/users", False, "No admin token available")
        return False
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if "total_users" in data and "total_admins" in data and "total_employees" in data:
                log_test("GET /api/admin/users", True, 
                        f"Total users: {data['total_users']}, Admins: {data['total_admins']}, Employees: {data['total_employees']}")
                return True
            else:
                log_test("GET /api/admin/users", False, "Missing required fields in response")
                return False
        else:
            log_test("GET /api/admin/users", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/admin/users", False, f"Exception: {str(e)}")
        return False

def test_get_all_admins():
    """Test 8: GET /api/admin/list (Admin Only)"""
    if not admin_token:
        log_test("GET /api/admin/list", False, "No admin token available")
        return False
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                log_test("GET /api/admin/list", True, f"Retrieved {len(data)} admins")
                return True
            else:
                log_test("GET /api/admin/list", False, "Response is not a list")
                return False
        else:
            log_test("GET /api/admin/list", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/admin/list", False, f"Exception: {str(e)}")
        return False

def test_delete_admin():
    """Test 9: DELETE /api/admin/{id} (Admin Only)"""
    if not admin_token or not test_admin_id:
        log_test("DELETE /api/admin/{id}", False, "No admin token or test admin ID available")
        return False
    
    try:
        response = requests.delete(
            f"{BASE_URL}/admin/{test_admin_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 200:
            log_test("DELETE /api/admin/{id}", True, f"Successfully deleted admin: {test_admin_id}")
            return True
        else:
            log_test("DELETE /api/admin/{id}", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("DELETE /api/admin/{id}", False, f"Exception: {str(e)}")
        return False

def test_delete_admin_self_prevention():
    """Test 10: DELETE /api/admin/{id} - Self-Deletion Prevention"""
    if not admin_token:
        log_test("DELETE Admin - Self-Deletion Prevention", False, "No admin token available")
        return False
    
    try:
        # Get current admin's ID from token
        response = requests.get(
            f"{BASE_URL}/employee/profile",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 200:
            current_admin_id = response.json().get("id")
            
            # Try to delete self
            delete_response = requests.delete(
                f"{BASE_URL}/admin/{current_admin_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            
            if delete_response.status_code == 400:
                log_test("DELETE Admin - Self-Deletion Prevention", True, "Correctly prevented self-deletion with 400")
                return True
            else:
                log_test("DELETE Admin - Self-Deletion Prevention", False, 
                        f"Expected 400, got {delete_response.status_code}")
                return False
        else:
            log_test("DELETE Admin - Self-Deletion Prevention", False, "Could not get current admin ID")
            return False
    except Exception as e:
        log_test("DELETE Admin - Self-Deletion Prevention", False, f"Exception: {str(e)}")
        return False

def test_get_recent_signups():
    """Test 11: GET /api/admin/recent-signups (Admin Only)"""
    if not admin_token:
        log_test("GET /api/admin/recent-signups", False, "No admin token available")
        return False
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/recent-signups?days=7",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if "recent_signups" in data and "total_recent" in data:
                log_test("GET /api/admin/recent-signups", True, 
                        f"Total recent: {data['total_recent']}, Admins: {data['recent_admins']}, Employees: {data['recent_employees']}")
                return True
            else:
                log_test("GET /api/admin/recent-signups", False, "Missing required fields in response")
                return False
        else:
            log_test("GET /api/admin/recent-signups", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/admin/recent-signups", False, f"Exception: {str(e)}")
        return False

def test_admin_endpoint_requires_auth():
    """Test 12: Admin Endpoints Require Authentication"""
    try:
        response = requests.get(f"{BASE_URL}/admin/users")
        
        if response.status_code == 403:
            log_test("Admin Endpoints - Auth Required", True, "Correctly rejected unauthenticated request with 403")
            return True
        else:
            log_test("Admin Endpoints - Auth Required", False, f"Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Admin Endpoints - Auth Required", False, f"Exception: {str(e)}")
        return False

def test_employee_cannot_access_admin_endpoints():
    """Test 13: Employee Token Cannot Access Admin Endpoints"""
    if not employee_token:
        log_test("Employee Cannot Access Admin Endpoints", False, "No employee token available")
        return False
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/users",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        
        if response.status_code == 403:
            log_test("Employee Cannot Access Admin Endpoints", True, "Correctly rejected employee token with 403")
            return True
        else:
            log_test("Employee Cannot Access Admin Endpoints", False, f"Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Employee Cannot Access Admin Endpoints", False, f"Exception: {str(e)}")
        return False

# ============ PRIORITY 2: CORE HR MODULES ============

def test_dashboard_stats():
    """Test 14: GET /api/dashboard/stats"""
    try:
        response = requests.get(f"{BASE_URL}/dashboard/stats")
        
        if response.status_code == 200:
            data = response.json()
            if all(key in data for key in ["total_employees", "pending_leaves", "open_positions", "pending_onboarding_tasks"]):
                log_test("GET /api/dashboard/stats", True, 
                        f"Employees: {data['total_employees']}, Leaves: {data['pending_leaves']}, Positions: {data['open_positions']}, Tasks: {data['pending_onboarding_tasks']}")
                return True
            else:
                log_test("GET /api/dashboard/stats", False, "Missing required fields in response")
                return False
        else:
            log_test("GET /api/dashboard/stats", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/dashboard/stats", False, f"Exception: {str(e)}")
        return False

def test_dashboard_trends():
    """Test 15: GET /api/dashboard/trends"""
    try:
        for period in ["day", "week", "month"]:
            response = requests.get(f"{BASE_URL}/dashboard/trends?period={period}")
            
            if response.status_code != 200:
                log_test(f"GET /api/dashboard/trends?period={period}", False, 
                        f"Status: {response.status_code}, Response: {response.text}")
                return False
        
        log_test("GET /api/dashboard/trends", True, "All periods (day/week/month) working")
        return True
    except Exception as e:
        log_test("GET /api/dashboard/trends", False, f"Exception: {str(e)}")
        return False

def test_get_all_employees():
    """Test 16: GET /api/employees"""
    try:
        response = requests.get(f"{BASE_URL}/employees")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                log_test("GET /api/employees", True, f"Retrieved {len(data)} employees")
                return True
            else:
                log_test("GET /api/employees", False, "Response is not a list")
                return False
        else:
            log_test("GET /api/employees", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/employees", False, f"Exception: {str(e)}")
        return False

def test_get_employees_by_status():
    """Test 17: GET /api/employees?status=active"""
    try:
        response = requests.get(f"{BASE_URL}/employees?status=active")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                log_test("GET /api/employees?status=active", True, f"Retrieved {len(data)} active employees")
                return True
            else:
                log_test("GET /api/employees?status=active", False, "Response is not a list")
                return False
        else:
            log_test("GET /api/employees?status=active", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/employees?status=active", False, f"Exception: {str(e)}")
        return False

def test_create_attendance():
    """Test 18: POST /api/attendance"""
    global test_attendance_id
    
    if not test_employee_id:
        log_test("POST /api/attendance", False, "No test employee ID available")
        return False
    
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.post(
            f"{BASE_URL}/attendance",
            json={
                "employee_id": test_employee_id,
                "date": today,
                "check_in": "09:00:00",
                "check_out": "18:00:00",
                "status": "present",
                "notes": "Test attendance record"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            test_attendance_id = data.get("id")
            log_test("POST /api/attendance", True, f"Created attendance record: {test_attendance_id}")
            return True
        else:
            log_test("POST /api/attendance", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("POST /api/attendance", False, f"Exception: {str(e)}")
        return False

def test_get_attendance():
    """Test 19: GET /api/attendance"""
    if not test_employee_id:
        log_test("GET /api/attendance", False, "No test employee ID available")
        return False
    
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/attendance?employee_id={test_employee_id}&date={today}")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                log_test("GET /api/attendance", True, f"Retrieved {len(data)} attendance records")
                return True
            else:
                log_test("GET /api/attendance", False, "Response is not a list")
                return False
        else:
            log_test("GET /api/attendance", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/attendance", False, f"Exception: {str(e)}")
        return False

def test_update_attendance():
    """Test 20: PUT /api/attendance/{id}"""
    if not test_attendance_id:
        log_test("PUT /api/attendance/{id}", False, "No test attendance ID available")
        return False
    
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.put(
            f"{BASE_URL}/attendance/{test_attendance_id}",
            json={
                "employee_id": test_employee_id,
                "date": today,
                "check_in": "09:00:00",
                "check_out": "19:00:00",  # Updated check-out time
                "status": "present",
                "notes": "Updated attendance record"
            }
        )
        
        if response.status_code == 200:
            log_test("PUT /api/attendance/{id}", True, "Successfully updated attendance record")
            return True
        else:
            log_test("PUT /api/attendance/{id}", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("PUT /api/attendance/{id}", False, f"Exception: {str(e)}")
        return False

def test_create_leave_request():
    """Test 21: POST /api/leave-requests"""
    global test_leave_id
    
    if not test_employee_id:
        log_test("POST /api/leave-requests", False, "No test employee ID available")
        return False
    
    try:
        start_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=9)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/leave-requests",
            json={
                "employee_id": test_employee_id,
                "leave_type": "vacation",
                "start_date": start_date,
                "end_date": end_date,
                "days_count": 3,
                "reason": "Family vacation"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            test_leave_id = data.get("id")
            log_test("POST /api/leave-requests", True, f"Created leave request: {test_leave_id}")
            return True
        else:
            log_test("POST /api/leave-requests", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("POST /api/leave-requests", False, f"Exception: {str(e)}")
        return False

def test_get_leave_requests():
    """Test 22: GET /api/leave-requests"""
    try:
        response = requests.get(f"{BASE_URL}/leave-requests?status=pending")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                log_test("GET /api/leave-requests", True, f"Retrieved {len(data)} pending leave requests")
                return True
            else:
                log_test("GET /api/leave-requests", False, "Response is not a list")
                return False
        else:
            log_test("GET /api/leave-requests", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/leave-requests", False, f"Exception: {str(e)}")
        return False

def test_approve_leave_request():
    """Test 23: PUT /api/leave-requests/{id}/approve"""
    if not test_leave_id:
        log_test("PUT /api/leave-requests/{id}/approve", False, "No test leave ID available")
        return False
    
    try:
        response = requests.put(
            f"{BASE_URL}/leave-requests/{test_leave_id}/approve",
            json={
                "status": "approved",
                "approved_by": "admin@peoplehub.com"
            }
        )
        
        if response.status_code == 200:
            log_test("PUT /api/leave-requests/{id}/approve", True, "Successfully approved leave request")
            return True
        else:
            log_test("PUT /api/leave-requests/{id}/approve", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("PUT /api/leave-requests/{id}/approve", False, f"Exception: {str(e)}")
        return False

def test_create_payroll():
    """Test 24: POST /api/payroll"""
    global test_payroll_id
    
    if not test_employee_id:
        log_test("POST /api/payroll", False, "No test employee ID available")
        return False
    
    try:
        current_month = datetime.now().strftime("%Y-%m")
        
        response = requests.post(
            f"{BASE_URL}/payroll",
            json={
                "employee_id": test_employee_id,
                "month": current_month,
                "basic_salary": 60000,
                "allowances": 10000,
                "deductions": 5000,
                "tax": 8000,
                "net_salary": 57000,
                "payment_date": datetime.now().strftime("%Y-%m-%d"),
                "payment_status": "pending"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            test_payroll_id = data.get("id")
            log_test("POST /api/payroll", True, f"Created payroll record: {test_payroll_id}")
            return True
        else:
            log_test("POST /api/payroll", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("POST /api/payroll", False, f"Exception: {str(e)}")
        return False

def test_get_payroll():
    """Test 25: GET /api/payroll"""
    if not test_employee_id:
        log_test("GET /api/payroll", False, "No test employee ID available")
        return False
    
    try:
        current_month = datetime.now().strftime("%Y-%m")
        response = requests.get(f"{BASE_URL}/payroll?employee_id={test_employee_id}&month={current_month}")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                log_test("GET /api/payroll", True, f"Retrieved {len(data)} payroll records")
                return True
            else:
                log_test("GET /api/payroll", False, "Response is not a list")
                return False
        else:
            log_test("GET /api/payroll", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/payroll", False, f"Exception: {str(e)}")
        return False

def test_update_payroll():
    """Test 26: PUT /api/payroll/{id}"""
    if not test_payroll_id:
        log_test("PUT /api/payroll/{id}", False, "No test payroll ID available")
        return False
    
    try:
        current_month = datetime.now().strftime("%Y-%m")
        
        response = requests.put(
            f"{BASE_URL}/payroll/{test_payroll_id}",
            json={
                "employee_id": test_employee_id,
                "month": current_month,
                "basic_salary": 60000,
                "allowances": 12000,  # Updated allowances
                "deductions": 5000,
                "tax": 8000,
                "net_salary": 59000,  # Updated net salary
                "payment_date": datetime.now().strftime("%Y-%m-%d"),
                "payment_status": "paid"  # Updated status
            }
        )
        
        if response.status_code == 200:
            log_test("PUT /api/payroll/{id}", True, "Successfully updated payroll record")
            return True
        else:
            log_test("PUT /api/payroll/{id}", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("PUT /api/payroll/{id}", False, f"Exception: {str(e)}")
        return False

def test_create_job_posting():
    """Test 27: POST /api/job-postings"""
    global test_job_id
    
    try:
        response = requests.post(
            f"{BASE_URL}/job-postings",
            json={
                "title": "Senior Software Engineer",
                "department": "Engineering",
                "location": "San Francisco, CA",
                "employment_type": "Full-time",
                "salary_range": "$120,000 - $160,000",
                "description": "We are looking for an experienced software engineer...",
                "requirements": "5+ years of experience, Python, React, AWS",
                "posted_by": "admin@peoplehub.com"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            test_job_id = data.get("id")
            log_test("POST /api/job-postings", True, f"Created job posting: {test_job_id}")
            return True
        else:
            log_test("POST /api/job-postings", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("POST /api/job-postings", False, f"Exception: {str(e)}")
        return False

def test_get_job_postings():
    """Test 28: GET /api/job-postings"""
    try:
        response = requests.get(f"{BASE_URL}/job-postings?status=open")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                log_test("GET /api/job-postings", True, f"Retrieved {len(data)} open job postings")
                return True
            else:
                log_test("GET /api/job-postings", False, "Response is not a list")
                return False
        else:
            log_test("GET /api/job-postings", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/job-postings", False, f"Exception: {str(e)}")
        return False

def test_create_candidate():
    """Test 29: POST /api/candidates"""
    global test_candidate_id
    
    if not test_job_id:
        log_test("POST /api/candidates", False, "No test job ID available")
        return False
    
    try:
        response = requests.post(
            f"{BASE_URL}/candidates",
            json={
                "job_id": test_job_id,
                "full_name": "Jane Smith",
                "email": "jane.smith@example.com",
                "phone": "+1-555-0123",
                "experience_years": 6,
                "current_company": "Tech Corp",
                "expected_salary": 140000,
                "resume_url": "https://example.com/resume.pdf"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            test_candidate_id = data.get("id")
            log_test("POST /api/candidates", True, f"Created candidate: {test_candidate_id}")
            return True
        else:
            log_test("POST /api/candidates", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("POST /api/candidates", False, f"Exception: {str(e)}")
        return False

def test_update_candidate():
    """Test 30: PUT /api/candidates/{id}/stage"""
    if not test_candidate_id:
        log_test("PUT /api/candidates/{id}/stage", False, "No test candidate ID available")
        return False
    
    try:
        response = requests.put(
            f"{BASE_URL}/candidates/{test_candidate_id}/stage",
            json={
                "stage": "interview",
                "notes": "Scheduled for technical interview"
            }
        )
        
        if response.status_code == 200:
            log_test("PUT /api/candidates/{id}/stage", True, "Successfully updated candidate stage")
            return True
        else:
            log_test("PUT /api/candidates/{id}/stage", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("PUT /api/candidates/{id}/stage", False, f"Exception: {str(e)}")
        return False

def test_create_onboarding_task():
    """Test 31: POST /api/onboarding-tasks"""
    global test_onboarding_task_id
    
    if not test_employee_id:
        log_test("POST /api/onboarding-tasks", False, "No test employee ID available")
        return False
    
    try:
        due_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/onboarding-tasks",
            json={
                "employee_id": test_employee_id,
                "task_title": "Complete IT Security Training",
                "task_description": "Complete the mandatory IT security training module",
                "due_date": due_date,
                "assigned_to": "admin@peoplehub.com"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            test_onboarding_task_id = data.get("id")
            log_test("POST /api/onboarding-tasks", True, f"Created onboarding task: {test_onboarding_task_id}")
            return True
        else:
            log_test("POST /api/onboarding-tasks", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("POST /api/onboarding-tasks", False, f"Exception: {str(e)}")
        return False

def test_get_onboarding_tasks():
    """Test 32: GET /api/onboarding-tasks"""
    if not test_employee_id:
        log_test("GET /api/onboarding-tasks", False, "No test employee ID available")
        return False
    
    try:
        response = requests.get(f"{BASE_URL}/onboarding-tasks?employee_id={test_employee_id}")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                log_test("GET /api/onboarding-tasks", True, f"Retrieved {len(data)} onboarding tasks")
                return True
            else:
                log_test("GET /api/onboarding-tasks", False, "Response is not a list")
                return False
        else:
            log_test("GET /api/onboarding-tasks", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/onboarding-tasks", False, f"Exception: {str(e)}")
        return False

def test_update_onboarding_task():
    """Test 33: PUT /api/onboarding-tasks/{id}/status"""
    if not test_onboarding_task_id:
        log_test("PUT /api/onboarding-tasks/{id}/status", False, "No test onboarding task ID available")
        return False
    
    try:
        response = requests.put(
            f"{BASE_URL}/onboarding-tasks/{test_onboarding_task_id}/status",
            json={"status": "completed"}
        )
        
        if response.status_code == 200:
            log_test("PUT /api/onboarding-tasks/{id}/status", True, "Successfully updated onboarding task status")
            return True
        else:
            log_test("PUT /api/onboarding-tasks/{id}/status", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("PUT /api/onboarding-tasks/{id}/status", False, f"Exception: {str(e)}")
        return False

def test_create_performance_review():
    """Test 34: POST /api/performance-reviews"""
    global test_performance_review_id
    
    if not test_employee_id:
        log_test("POST /api/performance-reviews", False, "No test employee ID available")
        return False
    
    try:
        response = requests.post(
            f"{BASE_URL}/performance-reviews",
            json={
                "employee_id": test_employee_id,
                "reviewer_id": "admin@peoplehub.com",
                "review_period": "Q1 2025",
                "goals": "Complete project X, improve code quality",
                "achievements": "Successfully delivered project X ahead of schedule",
                "areas_of_improvement": "Communication skills, documentation",
                "rating": 4.5,
                "feedback": "Excellent performance overall"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            test_performance_review_id = data.get("id")
            log_test("POST /api/performance-reviews", True, f"Created performance review: {test_performance_review_id}")
            return True
        else:
            log_test("POST /api/performance-reviews", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("POST /api/performance-reviews", False, f"Exception: {str(e)}")
        return False

def test_get_performance_reviews():
    """Test 35: GET /api/performance-reviews"""
    if not test_employee_id:
        log_test("GET /api/performance-reviews", False, "No test employee ID available")
        return False
    
    try:
        response = requests.get(f"{BASE_URL}/performance-reviews?employee_id={test_employee_id}")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                log_test("GET /api/performance-reviews", True, f"Retrieved {len(data)} performance reviews")
                return True
            else:
                log_test("GET /api/performance-reviews", False, "Response is not a list")
                return False
        else:
            log_test("GET /api/performance-reviews", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/performance-reviews", False, f"Exception: {str(e)}")
        return False

def test_update_performance_review():
    """Test 36: PUT /api/performance-reviews/{id}"""
    if not test_performance_review_id:
        log_test("PUT /api/performance-reviews/{id}", False, "No test performance review ID available")
        return False
    
    try:
        response = requests.put(
            f"{BASE_URL}/performance-reviews/{test_performance_review_id}",
            json={
                "employee_id": test_employee_id,
                "reviewer_id": "admin@peoplehub.com",
                "review_period": "Q1 2025",
                "goals": "Complete project X, improve code quality",
                "achievements": "Successfully delivered project X ahead of schedule with excellent quality",
                "areas_of_improvement": "Communication skills",
                "rating": 4.8,  # Updated rating
                "feedback": "Outstanding performance"  # Updated feedback
            }
        )
        
        if response.status_code == 200:
            log_test("PUT /api/performance-reviews/{id}", True, "Successfully updated performance review")
            return True
        else:
            log_test("PUT /api/performance-reviews/{id}", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("PUT /api/performance-reviews/{id}", False, f"Exception: {str(e)}")
        return False

# ============ MAIN TEST EXECUTION ============

def run_all_tests():
    """Run all backend tests"""
    print("="*80)
    print("PEOPLEHUB HRMS - COMPREHENSIVE BACKEND API TESTING")
    print("="*80)
    print(f"Backend URL: {BASE_URL}")
    print(f"Test Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    print("\n" + "="*80)
    print("PRIORITY 1: AUTHENTICATION & USER MANAGEMENT")
    print("="*80)
    
    # Authentication tests
    test_admin_login()
    test_admin_login_invalid_credentials()
    test_employee_login()
    test_admin_signup()
    test_admin_signup_duplicate_email()
    test_employee_signup()
    
    # Admin management tests
    test_get_all_users()
    test_get_all_admins()
    test_delete_admin()
    test_delete_admin_self_prevention()
    test_get_recent_signups()
    test_admin_endpoint_requires_auth()
    test_employee_cannot_access_admin_endpoints()
    
    print("\n" + "="*80)
    print("PRIORITY 2: CORE HR MODULES")
    print("="*80)
    
    # Dashboard tests
    test_dashboard_stats()
    test_dashboard_trends()
    
    # Employee management tests
    test_get_all_employees()
    test_get_employees_by_status()
    
    # Attendance tests
    test_create_attendance()
    test_get_attendance()
    test_update_attendance()
    
    # Leave management tests
    test_create_leave_request()
    test_get_leave_requests()
    test_approve_leave_request()
    
    # Payroll tests
    test_create_payroll()
    test_get_payroll()
    test_update_payroll()
    
    # Recruitment tests
    test_create_job_posting()
    test_get_job_postings()
    test_create_candidate()
    test_update_candidate()
    
    # Onboarding tests
    test_create_onboarding_task()
    test_get_onboarding_tasks()
    test_update_onboarding_task()
    
    # Performance tests
    test_create_performance_review()
    test_get_performance_reviews()
    test_update_performance_review()
    
    # Print summary
    print_summary()

if __name__ == "__main__":
    run_all_tests()
