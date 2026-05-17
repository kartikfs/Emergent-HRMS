import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, toast } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Lock, Mail, Eye, EyeOff, Shield } from "lucide-react";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, formData);
      const { token, user, role } = response.data;
      
      if (role !== "admin") {
        toast.error("Access denied. Admin credentials required.");
        setLoading(false);
        return;
      }
      
      // Store token and user data
      localStorage.setItem("admin_token", token);
      localStorage.setItem("admin_data", JSON.stringify(user));
      
      toast.success(`Welcome back, ${user.full_name}!`);
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.response?.data?.detail || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PeopleHub HRMS</h1>
          <p className="text-gray-600">Administrator Portal</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Admin Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label>Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="email"
                    placeholder="admin@peoplehub.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    required
                    data-testid="admin-email-input"
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
                    data-testid="admin-password-input"
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
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={loading}
                data-testid="admin-login-btn"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
              <div className="text-center text-sm text-gray-600">
                Don't have an account?{" "}
                <button
                  onClick={() => navigate("/signup")}
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Sign Up
                </button>
              </div>
              <button
                onClick={() => navigate("/employee/login")}
                className="w-full text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4" />
                Employee Portal →
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-600 bg-white p-4 rounded-lg shadow">
          <p className="font-semibold mb-2">Demo Admin Credentials:</p>
          <p className="font-mono text-xs">admin@peoplehub.com / admin123</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
