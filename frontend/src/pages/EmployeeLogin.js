import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, toast } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Lock, Mail, Eye, EyeOff } from "lucide-react";

const EmployeeLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetData, setResetData] = useState({
    email: "",
    new_password: ""
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, formData);
      const { token, user, role } = response.data;
      
      if (role !== "employee") {
        toast.error("Please use the admin portal for administrator access.");
        setLoading(false);
        return;
      }
      
      // Store token and employee data
      localStorage.setItem("employee_token", token);
      localStorage.setItem("employee_data", JSON.stringify(user));
      
      toast.success(`Welcome back, ${user.first_name}!`);
      navigate("/employee/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.response?.data?.detail || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(`${API}/auth/reset-password`, resetData);
      toast.success("Password reset successfully! You can now login.");
      setResetDialogOpen(false);
      setResetData({ email: "", new_password: "" });
    } catch (error) {
      console.error("Reset error:", error);
      toast.error(error.response?.data?.detail || "Failed to reset password");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PeopleHub HRMS</h1>
          <p className="text-gray-600">Employee Portal</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label>Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="email"
                    placeholder="you@peoplehub.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    required
                    data-testid="login-email-input"
                  />
                </div>
              </div>

              <div>
                <Label>Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10"
                    required
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
                data-testid="login-submit-btn"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>

              <div className="text-center">
                <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-700"
                      data-testid="forgot-password-btn"
                    >
                      Forgot password?
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reset Password</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div>
                        <Label>Email Address</Label>
                        <Input
                          type="email"
                          value={resetData.email}
                          onChange={(e) => setResetData({ ...resetData, email: e.target.value })}
                          required
                          data-testid="reset-email-input"
                        />
                      </div>
                      <div>
                        <Label>New Password</Label>
                        <Input
                          type="password"
                          value={resetData.new_password}
                          onChange={(e) => setResetData({ ...resetData, new_password: e.target.value })}
                          required
                          data-testid="reset-password-input"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" data-testid="reset-submit-btn">
                          Reset Password
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setResetDialogOpen(false)} className="flex-1">
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
              <div className="text-center text-sm text-gray-600">
                Don't have an account?{" "}
                <button
                  onClick={() => navigate("/employee/signup")}
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  Sign Up
                </button>
              </div>
              <div className="text-center">
                <button
                  onClick={() => navigate("/")}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  ← Back to HR Portal
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p className="font-semibold mb-2">Demo Employee Credentials:</p>
          <p className="font-mono text-xs">harper.martin@peoplehub.com / employee123</p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLogin;
