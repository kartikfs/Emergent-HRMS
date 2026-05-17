import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, toast } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle, Clock, FileText } from "lucide-react";

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    const employeeData = localStorage.getItem("employee_data");
    if (!employeeData) {
      navigate("/employee/login");
      return;
    }
    setEmployee(JSON.parse(employeeData));
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    const token = localStorage.getItem("employee_token");
    try {
      const response = await axios.get(`${API}/employee/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("employee_token");
        localStorage.removeItem("employee_data");
        navigate("/employee/login");
      }
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div data-testid="employee-dashboard">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Welcome back, {employee?.first_name}!
        </h1>
        <p className="text-gray-600">{employee?.position} • {employee?.department}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Attendance (7 days)</CardTitle>
            <Clock className="w-8 h-8 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {dashboardData?.attendance_last_7_days || 0}/7
            </div>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Leaves</CardTitle>
            <Calendar className="w-8 h-8 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {dashboardData?.pending_leave_count || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Upcoming Leaves</CardTitle>
            <FileText className="w-8 h-8 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {dashboardData?.upcoming_leaves?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Tasks</CardTitle>
            <CheckCircle className="w-8 h-8 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {dashboardData?.pending_tasks?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Leaves */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Leaves</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData?.upcoming_leaves?.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.upcoming_leaves.map((leave, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{leave.leave_type}</p>
                        <p className="text-sm text-gray-600">
                          {leave.start_date} to {leave.end_date} ({leave.days_count} days)
                        </p>
                      </div>
                      <span className="status-badge status-approved">Approved</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500">No upcoming leaves</p>
            )}
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData?.pending_tasks?.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.pending_tasks.map((task, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 w-2 h-2 rounded-full ${
                        task.status === 'completed' ? 'bg-green-500' :
                        task.status === 'in_progress' ? 'bg-blue-500' :
                        'bg-gray-400'
                      }`} />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{task.task_title}</p>
                        <p className="text-sm text-gray-600">Due: {task.due_date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500">No pending tasks</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
