import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, Building2, TrendingUp } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PeopleHub HRMS</h1>
              <p className="text-sm text-gray-600">Professional HR Management System</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to PeopleHub
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive HR management platform for modern organizations. Choose your portal to get started.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Admin Portal Card */}
          <Card className="hover-card cursor-pointer border-2" onClick={() => navigate("/login")}>
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl">Administrator Portal</CardTitle>
              <p className="text-gray-600 text-sm">Full HR management access</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <TrendingUp className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Complete HR Suite</p>
                  <p className="text-gray-600">Manage employees, payroll, recruitment & more</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <TrendingUp className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Advanced Analytics</p>
                  <p className="text-gray-600">Org structure, compliance & reporting</p>
                </div>
              </div>
              <Button 
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => navigate("/login")}
                data-testid="admin-portal-btn"
              >
                Access Admin Portal
              </Button>
              <p className="text-xs text-center text-gray-500 mt-2">
                For HR team and administrators
              </p>
            </CardContent>
          </Card>

          {/* Employee Portal Card */}
          <Card className="hover-card cursor-pointer border-2" onClick={() => navigate("/employee/login")}>
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                <Users className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl">Employee Portal</CardTitle>
              <p className="text-gray-600 text-sm">Self-service access</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Personal Dashboard</p>
                  <p className="text-gray-600">View profile, attendance & payslips</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Self Service</p>
                  <p className="text-gray-600">Apply leaves, upload documents & training</p>
                </div>
              </div>
              <Button 
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                onClick={() => navigate("/employee/login")}
                data-testid="employee-portal-btn"
              >
                Access Employee Portal
              </Button>
              <p className="text-xs text-center text-gray-500 mt-2">
                For all employees
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Demo Credentials Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
            <CardHeader>
              <CardTitle className="text-center">🎯 Demo Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <p className="font-semibold text-gray-900 mb-2">Admin Access:</p>
                  <p className="text-sm font-mono text-gray-700">admin@peoplehub.com</p>
                  <p className="text-sm font-mono text-gray-700">admin123</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="font-semibold text-gray-900 mb-2">Employee Access:</p>
                  <p className="text-sm font-mono text-gray-700">harper.martin@peoplehub.com</p>
                  <p className="text-sm font-mono text-gray-700">employee123</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/80 backdrop-blur-sm mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-600">
          <p>© 2025 PeopleHub HRMS - Professional HR Management System</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
