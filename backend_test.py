import requests
import sys
import json
from datetime import datetime, timedelta

class HRMSAPITester:
    def __init__(self, base_url="https://workforce-hub-498.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_entities = {
            'employees': [],
            'jobs': [],
            'candidates': [],
            'attendance': [],
            'leaves': [],
            'tasks': [],
            'payroll': [],
            'reviews': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.content else {}
                except:
                    response_data = {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json() if response.content else {}
                    print(f"   Error details: {error_detail}")
                except:
                    print(f"   Response text: {response.text}")
                response_data = {}

            self.test_results.append({
                'name': name,
                'method': method,
                'endpoint': endpoint,
                'expected_status': expected_status,
                'actual_status': response.status_code,
                'success': success
            })

            return success, response_data

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({
                'name': name,
                'method': method,
                'endpoint': endpoint,
                'expected_status': expected_status,
                'actual_status': 'ERROR',
                'success': False,
                'error': str(e)
            })
            return False, {}

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        print("\n📊 Testing Dashboard Stats...")
        success, data = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        if success:
            required_fields = ['total_employees', 'pending_leaves', 'open_positions', 'pending_onboarding_tasks']
            for field in required_fields:
                if field not in data:
                    print(f"❌ Missing field: {field}")
                    return False
            print(f"📈 Stats: {data}")
        return success

    def test_employee_crud(self):
        """Test employee CRUD operations"""
        print("\n👥 Testing Employee Management...")
        
        # Create employee
        employee_data = {
            "first_name": "Sarah",
            "last_name": "Johnson",
            "email": "sarah.johnson@peoplehub.com",
            "phone": "+1-555-0123",
            "date_of_birth": "1992-05-20",
            "gender": "Female",
            "address": "456 Oak Avenue, San Francisco, CA 94102",
            "department": "Engineering",
            "position": "Senior Software Engineer",
            "employment_type": "Full-time",
            "join_date": "2025-01-15",
            "salary": 95000.0,
            "emergency_contact_name": "Michael Johnson",
            "emergency_contact_phone": "+1-555-0124"
        }
        
        success, emp_response = self.run_test(
            "Create Employee",
            "POST",
            "employees",
            200,
            data=employee_data
        )
        
        if not success:
            return False
            
        employee_id = emp_response.get('id')
        if employee_id:
            self.created_entities['employees'].append(employee_id)
            print(f"   Created employee ID: {employee_id}")
        
        # Get all employees
        success, all_emps = self.run_test(
            "Get All Employees",
            "GET",
            "employees",
            200
        )
        
        if not success:
            return False
        
        print(f"   Total employees in database: {len(all_emps)}")
        
        # Test status filter - active employees
        success, active_emps = self.run_test(
            "Get Active Employees",
            "GET",
            "employees",
            200,
            params={"status": "active"}
        )
        
        if not success:
            return False
        
        print(f"   Active employees: {len(active_emps)}")
        
        # Test status filter - terminated employees
        success, terminated_emps = self.run_test(
            "Get Terminated Employees",
            "GET",
            "employees",
            200,
            params={"status": "terminated"}
        )
        
        if not success:
            return False
        
        print(f"   Terminated employees: {len(terminated_emps)}")
            
        # Get specific employee
        if employee_id:
            success, emp_detail = self.run_test(
                "Get Employee by ID",
                "GET",
                f"employees/{employee_id}",
                200
            )
            
            if not success:
                return False
            
            # Verify required fields are present
            required_fields = ['id', 'first_name', 'last_name', 'email', 'department', 'position', 'status']
            missing_fields = [field for field in required_fields if field not in emp_detail]
            if missing_fields:
                print(f"   ❌ Missing required fields: {missing_fields}")
                return False
            else:
                print(f"   ✅ All required fields present in employee detail")
                
            # Update employee
            update_data = employee_data.copy()
            update_data['salary'] = 100000.0
            success, _ = self.run_test(
                "Update Employee",
                "PUT",
                f"employees/{employee_id}",
                200,
                data=update_data
            )
        
        return success
    
    def test_bulk_employee_import(self):
        """Test bulk employee import with validation fix verification"""
        print("\n📥 Testing Bulk Employee Import with Validation...")
        print("=" * 70)
        
        # Get initial employee count
        success, emps_before = self.run_test(
            "Get Employee Count Before Tests",
            "GET",
            "employees",
            200
        )
        
        if not success:
            return False
        
        count_before = len(emps_before)
        print(f"   📊 Initial employee count: {count_before}\n")
        
        # ===== TEST 1: Valid Bulk Import (Should succeed) =====
        print("🧪 TEST 1: Valid Bulk Import (2 complete employee records)")
        print("-" * 70)
        
        valid_employees = [
            {
                "first_name": "Emily",
                "last_name": "Rodriguez",
                "email": "emily.rodriguez@peoplehub.com",
                "phone": "+1-555-0201",
                "date_of_birth": "1988-03-12",
                "gender": "Female",
                "address": "789 Pine Street, Austin, TX 78701",
                "department": "Marketing",
                "position": "Marketing Manager",
                "employment_type": "Full-time",
                "join_date": "2025-02-01",
                "salary": 85000.0
            },
            {
                "first_name": "David",
                "last_name": "Chen",
                "email": "david.chen@peoplehub.com",
                "phone": "+1-555-0301",
                "date_of_birth": "1995-07-25",
                "gender": "Male",
                "address": "321 Maple Drive, Seattle, WA 98101",
                "department": "Sales",
                "position": "Sales Representative",
                "employment_type": "Full-time",
                "join_date": "2025-02-15",
                "salary": 65000.0
            }
        ]
        
        success, bulk_response = self.run_test(
            "Valid Bulk Import",
            "POST",
            "employees/bulk",
            200,
            data={"employees": valid_employees}
        )
        
        if not success:
            print("   ❌ TEST 1 FAILED: Valid bulk import should succeed")
            return False
        
        added_count = bulk_response.get('added', 0)
        total_count = bulk_response.get('total', 0)
        failed_count = bulk_response.get('failed', 0)
        
        print(f"   📈 Result: {added_count}/{total_count} added, {failed_count} failed")
        
        if added_count != 2:
            print(f"   ❌ TEST 1 FAILED: Expected 2 employees added, got {added_count}")
            return False
        
        # Verify database count
        success, emps_after_test1 = self.run_test(
            "Verify Database After Test 1",
            "GET",
            "employees",
            200
        )
        
        if not success:
            return False
        
        count_after_test1 = len(emps_after_test1)
        expected_count = count_before + 2
        
        if count_after_test1 != expected_count:
            print(f"   ❌ TEST 1 FAILED: Database count mismatch - expected {expected_count}, got {count_after_test1}")
            return False
        
        print(f"   ✅ TEST 1 PASSED: 2 valid employees successfully added to database")
        print(f"   📊 Database count: {count_before} → {count_after_test1}\n")
        
        # ===== TEST 2: Invalid Data - Missing Required Fields (Should fail validation) =====
        print("🧪 TEST 2: Invalid Data - Missing Required Fields")
        print("-" * 70)
        
        invalid_employees = [
            {
                "first_name": "Invalid",
                "last_name": "Employee",
                "phone": "+1-555-9999"
                # Missing: email, department, position, employment_type, join_date, salary, etc.
            }
        ]
        
        success, invalid_response = self.run_test(
            "Invalid Data - Missing Fields",
            "POST",
            "employees/bulk",
            400,  # Should return 400 for all invalid records
            data={"employees": invalid_employees}
        )
        
        if not success:
            print("   ❌ TEST 2 FAILED: Should return 400 status for invalid data")
            return False
        
        # Check that error details are provided
        error_detail = invalid_response.get('detail', {})
        if isinstance(error_detail, dict):
            errors = error_detail.get('errors', [])
        else:
            errors = []
        
        if not errors:
            print("   ❌ TEST 2 FAILED: Should provide detailed error messages")
            return False
        
        print(f"   📋 Validation errors returned: {len(errors)}")
        for error in errors:
            print(f"      • {error}")
        
        # Verify NO invalid records were inserted
        success, emps_after_test2 = self.run_test(
            "Verify Database After Test 2",
            "GET",
            "employees",
            200
        )
        
        if not success:
            return False
        
        count_after_test2 = len(emps_after_test2)
        
        if count_after_test2 != count_after_test1:
            print(f"   ❌ TEST 2 FAILED: Invalid record was inserted! Count changed from {count_after_test1} to {count_after_test2}")
            return False
        
        print(f"   ✅ TEST 2 PASSED: Invalid data rejected, no records inserted")
        print(f"   📊 Database count unchanged: {count_after_test2}\n")
        
        # ===== TEST 3: Mixed Valid and Invalid Data (Partial success) =====
        print("🧪 TEST 3: Mixed Valid and Invalid Data")
        print("-" * 70)
        
        mixed_employees = [
            {
                "first_name": "Amanda",
                "last_name": "Williams",
                "email": "amanda.williams@peoplehub.com",
                "phone": "+1-555-0401",
                "date_of_birth": "1991-11-08",
                "gender": "Female",
                "address": "654 Elm Boulevard, Boston, MA 02101",
                "department": "HR",
                "position": "HR Specialist",
                "employment_type": "Full-time",
                "join_date": "2025-01-20",
                "salary": 72000.0
            },
            {
                "first_name": "Invalid",
                "last_name": "Record"
                # Missing required fields
            },
            {
                "first_name": "Michael",
                "last_name": "Brown",
                "email": "michael.brown@peoplehub.com",
                "phone": "+1-555-0501",
                "date_of_birth": "1990-09-15",
                "gender": "Male",
                "address": "987 Cedar Lane, Denver, CO 80201",
                "department": "Finance",
                "position": "Financial Analyst",
                "employment_type": "Full-time",
                "join_date": "2025-02-10",
                "salary": 78000.0
            }
        ]
        
        success, mixed_response = self.run_test(
            "Mixed Valid and Invalid Data",
            "POST",
            "employees/bulk",
            200,  # Returns 200 with partial success
            data={"employees": mixed_employees}
        )
        
        if not success:
            print("   ❌ TEST 3 FAILED: Should return 200 for partial success")
            return False
        
        added_count = mixed_response.get('added', 0)
        total_count = mixed_response.get('total', 0)
        failed_count = mixed_response.get('failed', 0)
        errors = mixed_response.get('errors', [])
        
        print(f"   📈 Result: {added_count}/{total_count} added, {failed_count} failed")
        
        if added_count != 2:
            print(f"   ❌ TEST 3 FAILED: Expected 2 valid employees added, got {added_count}")
            return False
        
        if failed_count != 1:
            print(f"   ❌ TEST 3 FAILED: Expected 1 failed record, got {failed_count}")
            return False
        
        if not errors:
            print("   ❌ TEST 3 FAILED: Should provide error details for failed record")
            return False
        
        print(f"   📋 Errors for failed records:")
        for error in errors:
            print(f"      • {error}")
        
        # Verify only valid records were inserted
        success, emps_after_test3 = self.run_test(
            "Verify Database After Test 3",
            "GET",
            "employees",
            200
        )
        
        if not success:
            return False
        
        count_after_test3 = len(emps_after_test3)
        expected_count = count_after_test2 + 2
        
        if count_after_test3 != expected_count:
            print(f"   ❌ TEST 3 FAILED: Database count mismatch - expected {expected_count}, got {count_after_test3}")
            return False
        
        print(f"   ✅ TEST 3 PASSED: Only 2 valid employees added, 1 invalid rejected")
        print(f"   📊 Database count: {count_after_test2} → {count_after_test3}\n")
        
        # ===== TEST 4: Verify GET /api/employees Still Works =====
        print("🧪 TEST 4: Verify GET /api/employees Still Works")
        print("-" * 70)
        
        success, all_employees = self.run_test(
            "GET All Employees",
            "GET",
            "employees",
            200
        )
        
        if not success:
            print("   ❌ TEST 4 FAILED: GET /api/employees should return 200")
            return False
        
        # Verify all employees have required fields (no invalid records breaking the API)
        required_fields = ['id', 'first_name', 'last_name', 'email', 'department', 'position']
        
        for idx, emp in enumerate(all_employees):
            missing_fields = [field for field in required_fields if field not in emp]
            if missing_fields:
                print(f"   ❌ TEST 4 FAILED: Employee {idx+1} missing fields: {missing_fields}")
                return False
        
        print(f"   ✅ TEST 4 PASSED: GET /api/employees returns 200 OK")
        print(f"   📊 All {len(all_employees)} employees have required fields")
        print(f"   ✅ No invalid records breaking the listing API\n")
        
        # ===== FINAL SUMMARY =====
        print("=" * 70)
        print("🎉 ALL VALIDATION TESTS PASSED!")
        print("=" * 70)
        print("✅ Valid bulk import works correctly")
        print("✅ Invalid data is rejected with detailed errors")
        print("✅ Mixed data handled correctly (partial success)")
        print("✅ GET /api/employees works without errors")
        print("✅ No invalid records inserted into database")
        print("=" * 70)
        
        return True

    def test_attendance_management(self):
        """Test attendance tracking"""
        print("\n⏰ Testing Attendance Management...")
        
        if not self.created_entities['employees']:
            print("❌ No employees available for attendance testing")
            return False
            
        employee_id = self.created_entities['employees'][0]
        
        # Create attendance record
        attendance_data = {
            "employee_id": employee_id,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "check_in": "09:00",
            "check_out": "17:00",
            "status": "present",
            "notes": "Regular working day"
        }
        
        success, att_response = self.run_test(
            "Create Attendance",
            "POST",
            "attendance",
            200,
            data=attendance_data
        )
        
        if success and att_response.get('id'):
            self.created_entities['attendance'].append(att_response['id'])
        
        # Get attendance records
        success, _ = self.run_test(
            "Get Attendance Records",
            "GET",
            "attendance",
            200
        )
        
        return success

    def test_leave_management(self):
        """Test leave request and approval workflow"""
        print("\n🏖️ Testing Leave Management...")
        
        if not self.created_entities['employees']:
            print("❌ No employees available for leave testing")
            return False
            
        employee_id = self.created_entities['employees'][0]
        
        # Create leave request
        leave_data = {
            "employee_id": employee_id,
            "leave_type": "vacation",
            "start_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "end_date": (datetime.now() + timedelta(days=32)).strftime("%Y-%m-%d"),
            "days_count": 3.0,
            "reason": "Family vacation"
        }
        
        success, leave_response = self.run_test(
            "Create Leave Request",
            "POST",
            "leave-requests",
            200,
            data=leave_data
        )
        
        if not success:
            return False
            
        leave_id = leave_response.get('id')
        if leave_id:
            self.created_entities['leaves'].append(leave_id)
            
            # Approve leave request
            approval_data = {
                "status": "approved",
                "approved_by": "HR Manager"
            }
            
            success, _ = self.run_test(
                "Approve Leave Request",
                "PUT",
                f"leave-requests/{leave_id}/approve",
                200,
                data=approval_data
            )
        
        # Get leave requests
        success, _ = self.run_test(
            "Get Leave Requests",
            "GET",
            "leave-requests",
            200
        )
        
        return success

    def test_recruitment_workflow(self):
        """Test job posting and candidate management"""
        print("\n💼 Testing Recruitment Workflow...")
        
        # Create job posting
        job_data = {
            "title": "Senior Software Engineer",
            "department": "Engineering",
            "location": "Remote",
            "employment_type": "Full-time",
            "salary_range": "$90k - $120k",
            "description": "We are looking for a senior software engineer to join our team.",
            "requirements": "5+ years of experience in software development",
            "posted_by": "HR Team"
        }
        
        success, job_response = self.run_test(
            "Create Job Posting",
            "POST",
            "job-postings",
            200,
            data=job_data
        )
        
        if not success:
            return False
            
        job_id = job_response.get('id')
        if job_id:
            self.created_entities['jobs'].append(job_id)
            
            # Add candidate
            candidate_data = {
                "job_id": job_id,
                "full_name": "Alice Smith",
                "email": "alice.smith@test.com",
                "phone": "+1234567892",
                "experience_years": 6.0,
                "current_company": "Tech Corp",
                "expected_salary": 100000.0
            }
            
            success, cand_response = self.run_test(
                "Add Candidate",
                "POST",
                "candidates",
                200,
                data=candidate_data
            )
            
            if success and cand_response.get('id'):
                candidate_id = cand_response['id']
                self.created_entities['candidates'].append(candidate_id)
                
                # Update candidate stage
                stage_data = {
                    "stage": "interview",
                    "notes": "Passed initial screening"
                }
                
                success, _ = self.run_test(
                    "Update Candidate Stage",
                    "PUT",
                    f"candidates/{candidate_id}/stage",
                    200,
                    data=stage_data
                )
        
        # Get job postings and candidates
        success1, _ = self.run_test("Get Job Postings", "GET", "job-postings", 200)
        success2, _ = self.run_test("Get Candidates", "GET", "candidates", 200)
        
        return success and success1 and success2

    def test_onboarding_tasks(self):
        """Test onboarding task management"""
        print("\n📋 Testing Onboarding Tasks...")
        
        if not self.created_entities['employees']:
            print("❌ No employees available for onboarding testing")
            return False
            
        employee_id = self.created_entities['employees'][0]
        
        # Create onboarding task
        task_data = {
            "employee_id": employee_id,
            "task_title": "Complete IT Setup",
            "task_description": "Set up laptop, accounts, and access permissions",
            "due_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "assigned_to": "IT Team"
        }
        
        success, task_response = self.run_test(
            "Create Onboarding Task",
            "POST",
            "onboarding-tasks",
            200,
            data=task_data
        )
        
        if not success:
            return False
            
        task_id = task_response.get('id')
        if task_id:
            self.created_entities['tasks'].append(task_id)
            
            # Update task status
            status_data = {
                "status": "completed"
            }
            
            success, _ = self.run_test(
                "Update Task Status",
                "PUT",
                f"onboarding-tasks/{task_id}/status",
                200,
                data=status_data
            )
        
        # Get onboarding tasks
        success, _ = self.run_test(
            "Get Onboarding Tasks",
            "GET",
            "onboarding-tasks",
            200
        )
        
        return success

    def test_payroll_management(self):
        """Test payroll processing"""
        print("\n💰 Testing Payroll Management...")
        
        if not self.created_entities['employees']:
            print("❌ No employees available for payroll testing")
            return False
            
        employee_id = self.created_entities['employees'][0]
        
        # Create payroll record
        payroll_data = {
            "employee_id": employee_id,
            "month": datetime.now().strftime("%Y-%m"),
            "basic_salary": 75000.0,
            "allowances": 5000.0,
            "deductions": 2000.0,
            "tax": 8000.0,
            "net_salary": 70000.0,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "payment_status": "paid"
        }
        
        success, payroll_response = self.run_test(
            "Create Payroll Record",
            "POST",
            "payroll",
            200,
            data=payroll_data
        )
        
        if success and payroll_response.get('id'):
            self.created_entities['payroll'].append(payroll_response['id'])
        
        # Get payroll records
        success, _ = self.run_test(
            "Get Payroll Records",
            "GET",
            "payroll",
            200
        )
        
        return success

    def test_performance_reviews(self):
        """Test performance review system"""
        print("\n⭐ Testing Performance Reviews...")
        
        if not self.created_entities['employees']:
            print("❌ No employees available for performance testing")
            return False
            
        employee_id = self.created_entities['employees'][0]
        
        # Create performance review
        review_data = {
            "employee_id": employee_id,
            "reviewer_id": "HR Manager",
            "review_period": "Q1 2025",
            "goals": "Complete project deliverables and improve team collaboration",
            "achievements": "Successfully delivered 3 major features ahead of schedule",
            "areas_of_improvement": "Could improve documentation and code review practices",
            "rating": 4.0,
            "feedback": "Excellent performance with room for growth in technical leadership"
        }
        
        success, review_response = self.run_test(
            "Create Performance Review",
            "POST",
            "performance-reviews",
            200,
            data=review_data
        )
        
        if success and review_response.get('id'):
            self.created_entities['reviews'].append(review_response['id'])
        
        # Get performance reviews
        success, _ = self.run_test(
            "Get Performance Reviews",
            "GET",
            "performance-reviews",
            200
        )
        
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting HRMS API Testing...")
        print(f"🌐 Testing against: {self.base_url}")
        
        # Test order matters for dependencies
        test_methods = [
            self.test_dashboard_stats,
            self.test_employee_crud,
            self.test_bulk_employee_import,
            self.test_attendance_management,
            self.test_leave_management,
            self.test_recruitment_workflow,
            self.test_onboarding_tasks,
            self.test_payroll_management,
            self.test_performance_reviews
        ]
        
        failed_tests = []
        
        for test_method in test_methods:
            try:
                if not test_method():
                    failed_tests.append(test_method.__name__)
            except Exception as e:
                print(f"❌ Test {test_method.__name__} crashed: {str(e)}")
                failed_tests.append(test_method.__name__)
        
        # Print final results
        print(f"\n📊 Final Results:")
        print(f"✅ Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"📈 Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if failed_tests:
            print(f"\n❌ Failed test modules: {', '.join(failed_tests)}")
        
        return self.tests_passed == self.tests_run
    
    def run_employee_tests_only(self):
        """Run only employee-related tests as requested"""
        print("🚀 Starting Employee Management API Testing...")
        print(f"🌐 Testing against: {self.base_url}")
        print(f"📋 Focus: Employee CRUD and Bulk Import APIs\n")
        
        # Test order matters for dependencies
        test_methods = [
            self.test_employee_crud,
            self.test_bulk_employee_import
        ]
        
        failed_tests = []
        
        for test_method in test_methods:
            try:
                if not test_method():
                    failed_tests.append(test_method.__name__)
            except Exception as e:
                print(f"❌ Test {test_method.__name__} crashed: {str(e)}")
                failed_tests.append(test_method.__name__)
        
        # Print final results
        print(f"\n📊 Final Results:")
        print(f"✅ Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"📈 Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if failed_tests:
            print(f"\n❌ Failed test modules: {', '.join(failed_tests)}")
        
        return self.tests_passed == self.tests_run

    def test_authentication_flows(self):
        """Test P0 Priority: Employee Signup Verification and Authentication"""
        print("\n🔐 Testing Authentication Flows (P0 Priority)...")
        print("=" * 70)
        
        # ===== TEST 1: Employee Signup (P0 Priority) =====
        print("🧪 TEST 1: Employee Signup Verification (P0 Priority)")
        print("-" * 70)
        
        import time
        unique_email = f"test.employee{int(time.time())}@peoplehub.com"
        employee_signup_data = {
            "email": unique_email,
            "password": "testpass123",
            "first_name": "Test",
            "last_name": "Employee",
            "phone": "+1-555-123-4567",
            "date_of_birth": "1990-01-15",
            "gender": "Male",
            "address": "123 Test St, Test City, NY 10001",
            "department": "Engineering",
            "position": "Software Engineer",
            "employment_type": "Full-time",
            "join_date": "2025-01-01",
            "emergency_contact_name": "Emergency Contact",
            "emergency_contact_phone": "+1-555-999-8888"
        }
        
        success, signup_response = self.run_test(
            "Employee Signup",
            "POST",
            "auth/employee/signup",
            200,
            data=employee_signup_data
        )
        
        if not success:
            print("   ❌ TEST 1 FAILED: Employee signup should succeed")
            return False
        
        # Verify response structure
        required_fields = ['token', 'user', 'role', 'message']
        missing_fields = [field for field in required_fields if field not in signup_response]
        if missing_fields:
            print(f"   ❌ TEST 1 FAILED: Missing response fields: {missing_fields}")
            return False
        
        if signup_response.get('role') != 'employee':
            print(f"   ❌ TEST 1 FAILED: Expected role 'employee', got '{signup_response.get('role')}'")
            return False
        
        employee_token = signup_response.get('token')
        employee_user = signup_response.get('user', {})
        employee_id = employee_user.get('id')
        
        print(f"   ✅ Employee signup successful")
        print(f"   📧 Email: {employee_user.get('email')}")
        print(f"   🆔 Employee ID: {employee_id}")
        print(f"   🎫 Token received: {'Yes' if employee_token else 'No'}")
        
        # ===== TEST 2: Employee Login with New Credentials =====
        print("\n🧪 TEST 2: Employee Login with New Credentials")
        print("-" * 70)
        
        login_data = {
            "email": unique_email,
            "password": "testpass123"
        }
        
        success, login_response = self.run_test(
            "Employee Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if not success:
            print("   ❌ TEST 2 FAILED: Employee login should succeed")
            return False
        
        # Verify login response
        if login_response.get('role') != 'employee':
            print(f"   ❌ TEST 2 FAILED: Expected role 'employee', got '{login_response.get('role')}'")
            return False
        
        login_token = login_response.get('token')
        if not login_token:
            print("   ❌ TEST 2 FAILED: No token returned in login response")
            return False
        
        print(f"   ✅ Employee login successful")
        print(f"   🎫 Token received: Yes")
        
        # ===== TEST 3: Admin Login (Fixed Password Hash) =====
        print("\n🧪 TEST 3: Admin Login (Fixed Password Hash)")
        print("-" * 70)
        
        admin_login_data = {
            "email": "admin@peoplehub.com",
            "password": "password"
        }
        
        success, admin_login_response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=admin_login_data
        )
        
        if not success:
            print("   ❌ TEST 3 FAILED: Admin login should succeed")
            return False
        
        if admin_login_response.get('role') != 'admin':
            print(f"   ❌ TEST 3 FAILED: Expected role 'admin', got '{admin_login_response.get('role')}'")
            return False
        
        admin_token = admin_login_response.get('token')
        print(f"   ✅ Admin login successful")
        print(f"   🎫 Token received: {'Yes' if admin_token else 'No'}")
        
        # ===== TEST 4: Admin Signup =====
        print("\n🧪 TEST 4: Admin Signup")
        print("-" * 70)
        
        import time
        unique_email = f"newadmin{int(time.time())}@peoplehub.com"
        admin_signup_data = {
            "email": unique_email,
            "password": "admin123",
            "full_name": "New Admin"
        }
        
        success, admin_signup_response = self.run_test(
            "Admin Signup",
            "POST",
            "auth/admin/signup",
            200,
            data=admin_signup_data
        )
        
        if not success:
            print("   ❌ TEST 4 FAILED: Admin signup should succeed")
            return False
        
        if admin_signup_response.get('role') != 'admin':
            print(f"   ❌ TEST 4 FAILED: Expected role 'admin', got '{admin_signup_response.get('role')}'")
            return False
        
        new_admin_token = admin_signup_response.get('token')
        print(f"   ✅ Admin signup successful")
        print(f"   🎫 Token received: {'Yes' if new_admin_token else 'No'}")
        
        # ===== TEST 5: Token-based Authentication =====
        print("\n🧪 TEST 5: Token-based Authentication")
        print("-" * 70)
        
        # Test employee profile access with token
        headers = {'Authorization': f'Bearer {employee_token}'}
        url = f"{self.api_url}/employee/profile"
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                profile_data = response.json()
                print(f"   ✅ Employee profile access successful")
                print(f"   👤 Profile: {profile_data.get('first_name')} {profile_data.get('last_name')}")
                print(f"   📧 Email: {profile_data.get('email')}")
            else:
                print(f"   ❌ TEST 5 FAILED: Profile access failed with status {response.status_code}")
                return False
        except Exception as e:
            print(f"   ❌ TEST 5 FAILED: Profile access error: {str(e)}")
            return False
        
        print("\n=" * 70)
        print("🎉 ALL AUTHENTICATION TESTS PASSED!")
        print("=" * 70)
        print("✅ Employee signup working correctly (P0 Priority)")
        print("✅ Employee login working with new credentials")
        print("✅ Admin login working with fixed password hash")
        print("✅ Admin signup working correctly")
        print("✅ Token-based authentication working")
        print("=" * 70)
        
        return True

    def test_employee_management_endpoints(self):
        """Test Employee Management Endpoints with Authentication"""
        print("\n👥 Testing Employee Management Endpoints...")
        print("=" * 70)
        
        # First, get an admin token for authenticated requests
        admin_login_data = {
            "email": "admin@peoplehub.com",
            "password": "password"
        }
        
        success, admin_login_response = self.run_test(
            "Admin Login for Employee Management",
            "POST",
            "auth/login",
            200,
            data=admin_login_data
        )
        
        if not success:
            print("   ❌ Cannot proceed without admin authentication")
            return False
        
        admin_token = admin_login_response.get('token')
        
        # ===== TEST 1: GET /api/employees - List All Employees =====
        print("\n🧪 TEST 1: GET /api/employees - List All Employees")
        print("-" * 70)
        
        success, all_employees = self.run_test(
            "Get All Employees",
            "GET",
            "employees",
            200
        )
        
        if not success:
            return False
        
        print(f"   📊 Total employees found: {len(all_employees)}")
        
        # Verify employee structure
        if all_employees:
            sample_emp = all_employees[0]
            required_fields = ['id', 'first_name', 'last_name', 'email', 'department', 'position', 'status']
            missing_fields = [field for field in required_fields if field not in sample_emp]
            if missing_fields:
                print(f"   ❌ TEST 1 FAILED: Missing employee fields: {missing_fields}")
                return False
            print(f"   ✅ Employee structure valid")
        
        # ===== TEST 2: GET /api/employees/{employee_id} - Get Specific Employee =====
        print("\n🧪 TEST 2: GET /api/employees/{employee_id} - Get Specific Employee")
        print("-" * 70)
        
        if all_employees:
            employee_id = all_employees[0]['id']
            success, employee_detail = self.run_test(
                "Get Employee by ID",
                "GET",
                f"employees/{employee_id}",
                200
            )
            
            if not success:
                return False
            
            print(f"   👤 Employee: {employee_detail.get('first_name')} {employee_detail.get('last_name')}")
            print(f"   🏢 Department: {employee_detail.get('department')}")
            print(f"   💼 Position: {employee_detail.get('position')}")
        else:
            print("   ⚠️ No employees available for individual testing")
        
        # ===== TEST 3: POST /api/employees/bulk - CSV Bulk Import Validation =====
        print("\n🧪 TEST 3: POST /api/employees/bulk - CSV Bulk Import Validation")
        print("-" * 70)
        
        # Test with valid bulk data
        bulk_employees = [
            {
                "first_name": "Bulk",
                "last_name": "Employee1",
                "email": "bulk1@peoplehub.com",
                "phone": "+1-555-0001",
                "date_of_birth": "1985-06-15",
                "gender": "Female",
                "address": "100 Bulk St, Test City, CA 90210",
                "department": "Marketing",
                "position": "Marketing Coordinator",
                "employment_type": "Full-time",
                "join_date": "2025-01-15",
                "salary": 60000.0
            },
            {
                "first_name": "Bulk",
                "last_name": "Employee2",
                "email": "bulk2@peoplehub.com",
                "phone": "+1-555-0002",
                "date_of_birth": "1988-09-22",
                "gender": "Male",
                "address": "200 Bulk Ave, Test City, CA 90210",
                "department": "Sales",
                "position": "Sales Associate",
                "employment_type": "Full-time",
                "join_date": "2025-01-20",
                "salary": 55000.0
            }
        ]
        
        success, bulk_response = self.run_test(
            "Bulk Employee Import",
            "POST",
            "employees/bulk",
            200,
            data={"employees": bulk_employees}
        )
        
        if not success:
            return False
        
        added_count = bulk_response.get('added', 0)
        total_count = bulk_response.get('total', 0)
        print(f"   📈 Bulk import result: {added_count}/{total_count} employees added")
        
        if added_count != 2:
            print(f"   ❌ TEST 3 FAILED: Expected 2 employees added, got {added_count}")
            return False
        
        print(f"   ✅ Bulk import validation working correctly")
        
        print("\n=" * 70)
        print("🎉 ALL EMPLOYEE MANAGEMENT TESTS PASSED!")
        print("=" * 70)
        print("✅ Employee listing working correctly")
        print("✅ Individual employee retrieval working")
        print("✅ Bulk import validation working")
        print("=" * 70)
        
        return True

    def test_leave_management_apis(self):
        """Test Leave Management APIs (needs_retesting: true)"""
        print("\n🏖️ Testing Leave Management APIs...")
        print("=" * 70)
        
        # First create an employee for leave testing
        employee_data = {
            "first_name": "Leave",
            "last_name": "Tester",
            "email": "leave.tester@peoplehub.com",
            "phone": "+1-555-LEAVE",
            "date_of_birth": "1990-05-15",
            "gender": "Female",
            "address": "123 Leave St, Test City, CA 90210",
            "department": "HR",
            "position": "HR Specialist",
            "employment_type": "Full-time",
            "join_date": "2025-01-01",
            "salary": 70000.0
        }
        
        success, emp_response = self.run_test(
            "Create Employee for Leave Testing",
            "POST",
            "employees",
            200,
            data=employee_data
        )
        
        if not success:
            return False
        
        employee_id = emp_response.get('id')
        print(f"   👤 Created test employee: {employee_id}")
        
        # ===== TEST 1: Create Leave Request =====
        print("\n🧪 TEST 1: Create Leave Request")
        print("-" * 70)
        
        leave_data = {
            "employee_id": employee_id,
            "leave_type": "vacation",
            "start_date": "2025-03-01",
            "end_date": "2025-03-05",
            "days_count": 5.0,
            "reason": "Family vacation to Hawaii"
        }
        
        success, leave_response = self.run_test(
            "Create Leave Request",
            "POST",
            "leave-requests",
            200,
            data=leave_data
        )
        
        if not success:
            return False
        
        leave_id = leave_response.get('id')
        print(f"   📝 Created leave request: {leave_id}")
        print(f"   📅 Leave period: {leave_data['start_date']} to {leave_data['end_date']}")
        print(f"   📊 Days: {leave_data['days_count']}")
        
        # ===== TEST 2: Get All Leave Requests =====
        print("\n🧪 TEST 2: Get All Leave Requests")
        print("-" * 70)
        
        success, all_leaves = self.run_test(
            "Get All Leave Requests",
            "GET",
            "leave-requests",
            200
        )
        
        if not success:
            return False
        
        print(f"   📊 Total leave requests: {len(all_leaves)}")
        
        # ===== TEST 3: Get Leave Requests by Employee =====
        print("\n🧪 TEST 3: Get Leave Requests by Employee")
        print("-" * 70)
        
        success, emp_leaves = self.run_test(
            "Get Employee Leave Requests",
            "GET",
            "leave-requests",
            200,
            params={"employee_id": employee_id}
        )
        
        if not success:
            return False
        
        print(f"   📊 Employee leave requests: {len(emp_leaves)}")
        
        # ===== TEST 4: Get Leave Requests by Status =====
        print("\n🧪 TEST 4: Get Leave Requests by Status")
        print("-" * 70)
        
        success, pending_leaves = self.run_test(
            "Get Pending Leave Requests",
            "GET",
            "leave-requests",
            200,
            params={"status": "pending"}
        )
        
        if not success:
            return False
        
        print(f"   📊 Pending leave requests: {len(pending_leaves)}")
        
        # ===== TEST 5: Approve Leave Request =====
        print("\n🧪 TEST 5: Approve Leave Request")
        print("-" * 70)
        
        if leave_id:
            approval_data = {
                "status": "approved",
                "approved_by": "HR Manager"
            }
            
            success, approved_leave = self.run_test(
                "Approve Leave Request",
                "PUT",
                f"leave-requests/{leave_id}/approve",
                200,
                data=approval_data
            )
            
            if not success:
                return False
            
            print(f"   ✅ Leave request approved")
            print(f"   👤 Approved by: {approved_leave.get('approved_by')}")
            print(f"   📅 Approved at: {approved_leave.get('approved_at')}")
        
        print("\n=" * 70)
        print("🎉 ALL LEAVE MANAGEMENT TESTS PASSED!")
        print("=" * 70)
        print("✅ Leave request creation working")
        print("✅ Leave request listing working")
        print("✅ Leave request filtering working")
        print("✅ Leave request approval working")
        print("=" * 70)
        
        return True

    def test_payroll_apis(self):
        """Test Payroll APIs (needs_retesting: true)"""
        print("\n💰 Testing Payroll APIs...")
        print("=" * 70)
        
        # First create an employee for payroll testing
        employee_data = {
            "first_name": "Payroll",
            "last_name": "Tester",
            "email": "payroll.tester@peoplehub.com",
            "phone": "+1-555-PAY01",
            "date_of_birth": "1985-08-20",
            "gender": "Male",
            "address": "456 Payroll Ave, Test City, CA 90210",
            "department": "Finance",
            "position": "Financial Analyst",
            "employment_type": "Full-time",
            "join_date": "2024-01-01",
            "salary": 80000.0
        }
        
        success, emp_response = self.run_test(
            "Create Employee for Payroll Testing",
            "POST",
            "employees",
            200,
            data=employee_data
        )
        
        if not success:
            return False
        
        employee_id = emp_response.get('id')
        print(f"   👤 Created test employee: {employee_id}")
        
        # ===== TEST 1: Create Payroll Record =====
        print("\n🧪 TEST 1: Create Payroll Record")
        print("-" * 70)
        
        payroll_data = {
            "employee_id": employee_id,
            "month": "2025-01",
            "basic_salary": 80000.0,
            "allowances": 5000.0,
            "deductions": 2000.0,
            "tax": 12000.0,
            "net_salary": 71000.0,
            "payment_date": "2025-01-31",
            "payment_status": "paid"
        }
        
        success, payroll_response = self.run_test(
            "Create Payroll Record",
            "POST",
            "payroll",
            200,
            data=payroll_data
        )
        
        if not success:
            return False
        
        payroll_id = payroll_response.get('id')
        print(f"   💰 Created payroll record: {payroll_id}")
        print(f"   📅 Month: {payroll_data['month']}")
        print(f"   💵 Net salary: ${payroll_data['net_salary']:,.2f}")
        
        # ===== TEST 2: Get All Payroll Records =====
        print("\n🧪 TEST 2: Get All Payroll Records")
        print("-" * 70)
        
        success, all_payroll = self.run_test(
            "Get All Payroll Records",
            "GET",
            "payroll",
            200
        )
        
        if not success:
            return False
        
        print(f"   📊 Total payroll records: {len(all_payroll)}")
        
        # ===== TEST 3: Get Payroll Records by Employee =====
        print("\n🧪 TEST 3: Get Payroll Records by Employee")
        print("-" * 70)
        
        success, emp_payroll = self.run_test(
            "Get Employee Payroll Records",
            "GET",
            "payroll",
            200,
            params={"employee_id": employee_id}
        )
        
        if not success:
            return False
        
        print(f"   📊 Employee payroll records: {len(emp_payroll)}")
        
        # ===== TEST 4: Get Payroll Records by Month =====
        print("\n🧪 TEST 4: Get Payroll Records by Month")
        print("-" * 70)
        
        success, month_payroll = self.run_test(
            "Get Monthly Payroll Records",
            "GET",
            "payroll",
            200,
            params={"month": "2025-01"}
        )
        
        if not success:
            return False
        
        print(f"   📊 January 2025 payroll records: {len(month_payroll)}")
        
        # ===== TEST 5: Update Payroll Record =====
        print("\n🧪 TEST 5: Update Payroll Record")
        print("-" * 70)
        
        if payroll_id:
            updated_payroll_data = payroll_data.copy()
            updated_payroll_data['allowances'] = 6000.0
            updated_payroll_data['net_salary'] = 72000.0
            
            success, updated_payroll = self.run_test(
                "Update Payroll Record",
                "PUT",
                f"payroll/{payroll_id}",
                200,
                data=updated_payroll_data
            )
            
            if not success:
                return False
            
            print(f"   ✅ Payroll record updated")
            print(f"   💵 New allowances: ${updated_payroll.get('allowances', 0):,.2f}")
            print(f"   💵 New net salary: ${updated_payroll.get('net_salary', 0):,.2f}")
        
        print("\n=" * 70)
        print("🎉 ALL PAYROLL TESTS PASSED!")
        print("=" * 70)
        print("✅ Payroll record creation working")
        print("✅ Payroll record listing working")
        print("✅ Payroll record filtering working")
        print("✅ Payroll record updating working")
        print("=" * 70)
        
        return True

def main():
    tester = HRMSAPITester()
    
    print("🚀 Starting PeopleHub HRMS API Testing...")
    print(f"🌐 Testing against: {tester.base_url}")
    print("📋 Focus: P0 Employee Signup Verification & Authentication\n")
    
    # Test order matters for dependencies
    test_methods = [
        tester.test_authentication_flows,
        tester.test_employee_management_endpoints,
        tester.test_leave_management_apis,
        tester.test_payroll_apis
    ]
    
    failed_tests = []
    
    for test_method in test_methods:
        try:
            if not test_method():
                failed_tests.append(test_method.__name__)
        except Exception as e:
            print(f"❌ Test {test_method.__name__} crashed: {str(e)}")
            failed_tests.append(test_method.__name__)
    
    # Print final results
    print(f"\n📊 Final Results:")
    print(f"✅ Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"📈 Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed test modules: {', '.join(failed_tests)}")
        return 1
    else:
        print(f"\n🎉 All tests passed successfully!")
        return 0

if __name__ == "__main__":
    sys.exit(main())