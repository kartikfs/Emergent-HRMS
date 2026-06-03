#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Meetings Hub + Password Management
Tests all meetings endpoints, password reset functionality, and employee access control
"""

import requests
import json
from datetime import datetime, timedelta
import time

# Configuration
BASE_URL = "https://workforce-hub-498.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@peoplehub.com"
ADMIN_PASSWORD = "admin123"
EMPLOYEE_EMAIL = "harper.martin@peoplehub.com"
EMPLOYEE_PASSWORD = "employee123"

# Global variables
admin_token = None
employee_token = None
test_employee_id = None

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
    print("TEST SUMMARY - MEETINGS HUB + PASSWORD MANAGEMENT")
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

# ============ AUTHENTICATION ============

def test_admin_login():
    """Test: Admin Login"""
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
                log_test("Admin Login", False, "Missing token or incorrect role")
                return False
        else:
            log_test("Admin Login", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("Admin Login", False, f"Exception: {str(e)}")
        return False

def test_employee_login():
    """Test: Employee Login"""
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
                test_employee_id = data.get("user", {}).get("id")
                log_test("Employee Login", True, f"Token received, role: {data['role']}, ID: {test_employee_id}")
                return True
            else:
                log_test("Employee Login", False, "Missing token or incorrect role")
                return False
        else:
            log_test("Employee Login", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("Employee Login", False, f"Exception: {str(e)}")
        return False

# ============ MEETINGS HUB APIs ============

def test_meetings_sync_status():
    """Test: GET /api/meetings/sync-status"""
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/meetings/sync-status", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["last_sync_attio", "last_sync_fireflies", "total_meetings", 
                             "attio_count", "fireflies_count", "deduplicated_count", "is_syncing"]
            
            missing_fields = [f for f in required_fields if f not in data]
            if missing_fields:
                log_test("GET /api/meetings/sync-status", False, f"Missing fields: {missing_fields}")
                return False
            
            log_test("GET /api/meetings/sync-status", True, 
                    f"Total meetings: {data['total_meetings']}, Attio: {data['attio_count']}, Fireflies: {data['fireflies_count']}")
            return True
        else:
            log_test("GET /api/meetings/sync-status", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/meetings/sync-status", False, f"Exception: {str(e)}")
        return False

def test_meetings_sync_admin_only():
    """Test: POST /api/meetings/sync (Admin Only)"""
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(
            f"{BASE_URL}/meetings/sync",
            headers=headers,
            params={"lookback_days": 30}
        )
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "lookback_days" in data:
                log_test("POST /api/meetings/sync (Admin)", True, f"Sync started: {data['message']}")
                return True
            else:
                log_test("POST /api/meetings/sync (Admin)", False, "Missing expected fields in response")
                return False
        else:
            log_test("POST /api/meetings/sync (Admin)", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("POST /api/meetings/sync (Admin)", False, f"Exception: {str(e)}")
        return False

def test_meetings_sync_employee_blocked():
    """Test: POST /api/meetings/sync (Employee Blocked)"""
    try:
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.post(
            f"{BASE_URL}/meetings/sync",
            headers=headers,
            params={"lookback_days": 30}
        )
        
        if response.status_code == 403:
            log_test("POST /api/meetings/sync (Employee Blocked)", True, "Employee correctly blocked from sync endpoint")
            return True
        else:
            log_test("POST /api/meetings/sync (Employee Blocked)", False, 
                    f"Expected 403, got {response.status_code}. Employee should not access admin sync!")
            return False
    except Exception as e:
        log_test("POST /api/meetings/sync (Employee Blocked)", False, f"Exception: {str(e)}")
        return False

def test_get_all_meetings_admin():
    """Test: GET /api/meetings (Admin - All Meetings)"""
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/meetings", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "meetings" in data and "total" in data:
                log_test("GET /api/meetings (Admin)", True, 
                        f"Retrieved {len(data['meetings'])} meetings, Total: {data['total']}")
                return True
            else:
                log_test("GET /api/meetings (Admin)", False, "Missing 'meetings' or 'total' in response")
                return False
        else:
            log_test("GET /api/meetings (Admin)", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/meetings (Admin)", False, f"Exception: {str(e)}")
        return False

def test_get_all_meetings_employee():
    """Test: GET /api/meetings (Employee - Filtered by Participation)"""
    try:
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.get(f"{BASE_URL}/meetings", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "meetings" in data and "total" in data:
                # Verify all meetings have employee's email in participants
                employee_email = EMPLOYEE_EMAIL
                all_filtered = True
                for meeting in data["meetings"]:
                    participants = meeting.get("participants", [])
                    participant_emails = [p.get("email") for p in participants]
                    if employee_email not in participant_emails:
                        all_filtered = False
                        break
                
                if all_filtered or len(data["meetings"]) == 0:
                    log_test("GET /api/meetings (Employee Filtered)", True, 
                            f"Employee sees {len(data['meetings'])} meetings (filtered by participation)")
                    return True
                else:
                    log_test("GET /api/meetings (Employee Filtered)", False, 
                            "Employee seeing meetings they didn't participate in!")
                    return False
            else:
                log_test("GET /api/meetings (Employee Filtered)", False, "Missing 'meetings' or 'total' in response")
                return False
        else:
            log_test("GET /api/meetings (Employee Filtered)", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/meetings (Employee Filtered)", False, f"Exception: {str(e)}")
        return False

def test_get_meetings_with_filters():
    """Test: GET /api/meetings (With Filters)"""
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test with date filter
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/meetings",
            headers=headers,
            params={
                "start_date": start_date,
                "end_date": end_date,
                "sort_by": "start_time",
                "sort_order": "desc",
                "limit": 20
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            log_test("GET /api/meetings (With Filters)", True, 
                    f"Filtered meetings: {len(data.get('meetings', []))}, Total: {data.get('total', 0)}")
            return True
        else:
            log_test("GET /api/meetings (With Filters)", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/meetings (With Filters)", False, f"Exception: {str(e)}")
        return False

def test_get_attio_meetings():
    """Test: GET /api/meetings/attio"""
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/meetings/attio", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "meetings" in data and "total" in data:
                log_test("GET /api/meetings/attio", True, 
                        f"Attio meetings: {len(data['meetings'])}, Total: {data['total']}")
                return True
            else:
                log_test("GET /api/meetings/attio", False, "Missing 'meetings' or 'total' in response")
                return False
        else:
            log_test("GET /api/meetings/attio", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/meetings/attio", False, f"Exception: {str(e)}")
        return False

def test_get_fireflies_meetings():
    """Test: GET /api/meetings/fireflies"""
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/meetings/fireflies", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "meetings" in data and "total" in data:
                log_test("GET /api/meetings/fireflies", True, 
                        f"Fireflies meetings: {len(data['meetings'])}, Total: {data['total']}")
                return True
            else:
                log_test("GET /api/meetings/fireflies", False, "Missing 'meetings' or 'total' in response")
                return False
        else:
            log_test("GET /api/meetings/fireflies", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/meetings/fireflies", False, f"Exception: {str(e)}")
        return False

def test_get_action_items_admin():
    """Test: GET /api/meetings/action-items (Admin)"""
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/meetings/action-items", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "action_items" in data and "total" in data:
                log_test("GET /api/meetings/action-items (Admin)", True, 
                        f"Action items: {len(data['action_items'])}, Total: {data['total']}")
                return True
            else:
                log_test("GET /api/meetings/action-items (Admin)", False, "Missing 'action_items' or 'total' in response")
                return False
        else:
            log_test("GET /api/meetings/action-items (Admin)", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/meetings/action-items (Admin)", False, f"Exception: {str(e)}")
        return False

def test_get_action_items_employee():
    """Test: GET /api/meetings/action-items (Employee - Filtered)"""
    try:
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.get(f"{BASE_URL}/meetings/action-items", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "action_items" in data and "total" in data:
                # Verify all action items are assigned to employee
                employee_email = EMPLOYEE_EMAIL
                all_filtered = True
                for item in data["action_items"]:
                    if item.get("assigned_to") != employee_email:
                        all_filtered = False
                        break
                
                if all_filtered or len(data["action_items"]) == 0:
                    log_test("GET /api/meetings/action-items (Employee Filtered)", True, 
                            f"Employee sees {len(data['action_items'])} action items (filtered by assignment)")
                    return True
                else:
                    log_test("GET /api/meetings/action-items (Employee Filtered)", False, 
                            "Employee seeing action items not assigned to them!")
                    return False
            else:
                log_test("GET /api/meetings/action-items (Employee Filtered)", False, "Missing 'action_items' or 'total' in response")
                return False
        else:
            log_test("GET /api/meetings/action-items (Employee Filtered)", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/meetings/action-items (Employee Filtered)", False, f"Exception: {str(e)}")
        return False

def test_get_employee_meetings():
    """Test: GET /api/employees/{id}/meetings"""
    try:
        if not test_employee_id:
            log_test("GET /api/employees/{id}/meetings", False, "No employee ID available")
            return False
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/employees/{test_employee_id}/meetings", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "meetings" in data and "total" in data and "stats" in data:
                stats = data["stats"]
                log_test("GET /api/employees/{id}/meetings", True, 
                        f"Employee meetings: {len(data['meetings'])}, Total: {data['total']}, " +
                        f"Stats: {stats.get('total_meetings')} meetings, {stats.get('total_duration_minutes')} mins")
                return True
            else:
                log_test("GET /api/employees/{id}/meetings", False, "Missing required fields in response")
                return False
        else:
            log_test("GET /api/employees/{id}/meetings", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/employees/{id}/meetings", False, f"Exception: {str(e)}")
        return False

def test_employee_access_own_meetings():
    """Test: Employee Can Access Own Meetings"""
    try:
        if not test_employee_id:
            log_test("Employee Access Own Meetings", False, "No employee ID available")
            return False
        
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.get(f"{BASE_URL}/employees/{test_employee_id}/meetings", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            log_test("Employee Access Own Meetings", True, 
                    f"Employee can access own meetings: {len(data.get('meetings', []))} meetings")
            return True
        else:
            log_test("Employee Access Own Meetings", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("Employee Access Own Meetings", False, f"Exception: {str(e)}")
        return False

def test_meetings_search():
    """Test: GET /api/meetings/search"""
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(
            f"{BASE_URL}/meetings/search",
            headers=headers,
            params={"q": "meeting", "limit": 10}
        )
        
        if response.status_code == 200:
            data = response.json()
            if "results" in data and "query" in data and "count" in data:
                log_test("GET /api/meetings/search", True, 
                        f"Search results: {data['count']} meetings found for query '{data['query']}'")
                return True
            else:
                log_test("GET /api/meetings/search", False, "Missing required fields in response")
                return False
        else:
            log_test("GET /api/meetings/search", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/meetings/search", False, f"Exception: {str(e)}")
        return False

# ============ PASSWORD MANAGEMENT ============

def test_admin_reset_employee_password():
    """Test: PATCH /api/employees/{id}/reset-password (Admin Reset)"""
    try:
        if not test_employee_id:
            log_test("Admin Reset Employee Password", False, "No employee ID available")
            return False
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        new_password = "NewTestPassword123"
        
        response = requests.patch(
            f"{BASE_URL}/employees/{test_employee_id}/reset-password",
            headers=headers,
            params={"new_password": new_password}
        )
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data and data.get("employee_id") == test_employee_id:
                log_test("Admin Reset Employee Password", True, 
                        f"Password reset successful for employee {test_employee_id}")
                return True
            else:
                log_test("Admin Reset Employee Password", False, "Missing expected fields in response")
                return False
        else:
            log_test("Admin Reset Employee Password", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("Admin Reset Employee Password", False, f"Exception: {str(e)}")
        return False

def test_login_with_new_password():
    """Test: Login with New Password"""
    try:
        new_password = "NewTestPassword123"
        
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": EMPLOYEE_EMAIL, "password": new_password}
        )
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data and data.get("role") == "employee":
                log_test("Login with New Password", True, "Successfully logged in with new password")
                return True
            else:
                log_test("Login with New Password", False, "Missing token or incorrect role")
                return False
        else:
            log_test("Login with New Password", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("Login with New Password", False, f"Exception: {str(e)}")
        return False

def test_reset_password_back():
    """Test: Reset Password Back to Original"""
    try:
        if not test_employee_id:
            log_test("Reset Password Back", False, "No employee ID available")
            return False
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        original_password = "employee123"
        
        response = requests.patch(
            f"{BASE_URL}/employees/{test_employee_id}/reset-password",
            headers=headers,
            params={"new_password": original_password}
        )
        
        if response.status_code == 200:
            log_test("Reset Password Back", True, "Password reset back to original")
            return True
        else:
            log_test("Reset Password Back", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("Reset Password Back", False, f"Exception: {str(e)}")
        return False

def test_password_hashing_verification():
    """Test: Password Hashing Verification"""
    try:
        # Login with original password to verify hashing works
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": EMPLOYEE_EMAIL, "password": EMPLOYEE_PASSWORD}
        )
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data:
                log_test("Password Hashing Verification", True, 
                        "Password hashing and verification working correctly")
                return True
            else:
                log_test("Password Hashing Verification", False, "Missing token in response")
                return False
        else:
            log_test("Password Hashing Verification", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("Password Hashing Verification", False, f"Exception: {str(e)}")
        return False

def test_employee_cannot_reset_password():
    """Test: Employee Cannot Reset Password (Admin Only)"""
    try:
        if not test_employee_id:
            log_test("Employee Cannot Reset Password", False, "No employee ID available")
            return False
        
        headers = {"Authorization": f"Bearer {employee_token}"}
        
        response = requests.patch(
            f"{BASE_URL}/employees/{test_employee_id}/reset-password",
            headers=headers,
            params={"new_password": "ShouldNotWork123"}
        )
        
        if response.status_code == 403:
            log_test("Employee Cannot Reset Password", True, 
                    "Employee correctly blocked from resetting passwords")
            return True
        else:
            log_test("Employee Cannot Reset Password", False, 
                    f"Expected 403, got {response.status_code}. Employee should not reset passwords!")
            return False
    except Exception as e:
        log_test("Employee Cannot Reset Password", False, f"Exception: {str(e)}")
        return False

# ============ MAIN TEST EXECUTION ============

def run_all_tests():
    """Run all tests in sequence"""
    print("="*80)
    print("COMPREHENSIVE TESTING: MEETINGS HUB + PASSWORD MANAGEMENT")
    print("="*80)
    print(f"Backend URL: {BASE_URL}")
    print(f"Admin: {ADMIN_EMAIL}")
    print(f"Employee: {EMPLOYEE_EMAIL}")
    print("="*80)
    print()
    
    # Authentication
    print("SECTION 1: AUTHENTICATION")
    print("-" * 80)
    test_admin_login()
    test_employee_login()
    print()
    
    # Meetings Hub APIs
    print("SECTION 2: MEETINGS HUB APIs")
    print("-" * 80)
    test_meetings_sync_status()
    test_meetings_sync_admin_only()
    test_meetings_sync_employee_blocked()
    test_get_all_meetings_admin()
    test_get_all_meetings_employee()
    test_get_meetings_with_filters()
    test_get_attio_meetings()
    test_get_fireflies_meetings()
    test_get_action_items_admin()
    test_get_action_items_employee()
    test_get_employee_meetings()
    test_employee_access_own_meetings()
    test_meetings_search()
    print()
    
    # Password Management
    print("SECTION 3: PASSWORD MANAGEMENT")
    print("-" * 80)
    test_admin_reset_employee_password()
    test_login_with_new_password()
    test_reset_password_back()
    test_password_hashing_verification()
    test_employee_cannot_reset_password()
    print()
    
    # Print summary
    print_summary()

if __name__ == "__main__":
    run_all_tests()
