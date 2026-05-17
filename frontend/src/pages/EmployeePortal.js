import { useEffect } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { Users, LayoutDashboard, Calendar, Clock, FileText, Upload, User, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

const EmployeePortal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("employee_token");
    const employeeData = localStorage.getItem("employee_data");
    
    if (!token || !employeeData) {
      navigate("/employee/login");
      return;
    }
    
    setEmployee(JSON.parse(employeeData));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("employee_token");
    localStorage.removeItem("employee_data");
    toast.success("Logged out successfully");
    navigate("/employee/login");
  };

  const menuItems = [
    { path: "/employee/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/employee/profile", icon: User, label: "My Profile" },
    { path: "/employee/attendance", icon: Clock, label: "Attendance" },
    { path: "/employee/leaves", icon: Calendar, label: "Leave Requests" },
    { path: "/employee/payslips", icon: FileText, label: "Payslips" },
    { path: "/employee/documents", icon: Upload, label: "Documents" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50
        transition-transform duration-300 w-64
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">PeopleHub</h1>
                <p className="text-xs text-gray-500">Employee Portal</p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden absolute top-6 right-6 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Info */}
          {employee && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                  {employee.first_name[0]}{employee.last_name[0]}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{employee.first_name} {employee.last_name}</p>
                  <p className="text-xs text-gray-500">{employee.position}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg
                        transition-colors duration-200
                        ${isActive 
                          ? 'bg-blue-50 text-blue-700 font-medium' 
                          : 'text-gray-700 hover:bg-gray-50'
                        }
                      `}
                      data-testid={`nav-${item.label.toLowerCase().replace(/ /g, '-')}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-700 hover:text-gray-900"
              data-testid="open-sidebar-btn"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1 lg:ml-0 ml-4">
              <h2 className="text-xl font-semibold text-gray-900">Employee Self-Service</h2>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default EmployeePortal;
