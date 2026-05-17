import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API, toast } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, Briefcase, DollarSign, Clock, AlertCircle, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  
  // Performance tracking state
  const [performanceView, setPerformanceView] = useState("month"); // month or year
  const [performanceDate, setPerformanceDate] = useState(new Date());
  
  // Leave tracking state
  const [leaveView, setLeaveView] = useState("month"); // month or year
  const [leaveDate, setLeaveDate] = useState(new Date());

  useEffect(() => {
    fetchEmployeeDetails();
  }, [id]);

  const fetchEmployeeDetails = async () => {
    try {
      const response = await axios.get(`${API}/employees/${id}`);
      setEmployee(response.data);
    } catch (error) {
      console.error("Error fetching employee details:", error);
      toast.error("Failed to load employee details");
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  // Generate performance data based on view
  const getPerformanceData = () => {
    if (performanceView === "month") {
      const daysInMonth = new Date(performanceDate.getFullYear(), performanceDate.getMonth() + 1, 0).getDate();
      const data = [];
      for (let i = 1; i <= daysInMonth; i += 3) {
        data.push({
          label: `${i}`,
          rating: 3.5 + Math.random() * 1.5
        });
      }
      return data;
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.map(month => ({
        label: month,
        rating: 3.5 + Math.random() * 1.5
      }));
    }
  };

  // Generate leave data based on view
  const getLeaveData = () => {
    if (leaveView === "month") {
      const daysInMonth = new Date(leaveDate.getFullYear(), leaveDate.getMonth() + 1, 0).getDate();
      const data = [];
      for (let i = 1; i <= daysInMonth; i += 3) {
        data.push({
          label: `${i}`,
          days: Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0
        });
      }
      return data;
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.map(month => ({
        label: month,
        days: Math.floor(Math.random() * 3)
      }));
    }
  };

  // Navigation handlers for performance
  const navigatePerformance = (direction) => {
    const newDate = new Date(performanceDate);
    if (performanceView === "month") {
      newDate.setMonth(newDate.getMonth() + direction);
    } else {
      newDate.setFullYear(newDate.getFullYear() + direction);
    }
    setPerformanceDate(newDate);
  };

  // Navigation handlers for leave
  const navigateLeave = (direction) => {
    const newDate = new Date(leaveDate);
    if (leaveView === "month") {
      newDate.setMonth(newDate.getMonth() + direction);
    } else {
      newDate.setFullYear(newDate.getFullYear() + direction);
    }
    setLeaveDate(newDate);
  };

  const formatDateLabel = (date, view) => {
    if (view === "month") {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      return date.getFullYear().toString();
    }
  };

  // Edit handlers
  const handleEditClick = () => {
    setEditFormData({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone,
      date_of_birth: employee.date_of_birth,
      gender: employee.gender,
      address: employee.address,
      department: employee.department,
      position: employee.position,
      employment_type: employee.employment_type,
      join_date: employee.join_date,
      salary: employee.salary,
      status: employee.status,
      emergency_contact_name: employee.emergency_contact_name || "",
      emergency_contact_phone: employee.emergency_contact_phone || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleEditChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/employees/${id}`, {
        ...editFormData,
        salary: parseFloat(editFormData.salary)
      });
      toast.success("Employee updated successfully");
      setIsEditDialogOpen(false);
      fetchEmployeeDetails();
    } catch (error) {
      console.error("Error updating employee:", error);
      toast.error("Failed to update employee");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
        <p className="text-gray-600">Employee not found</p>
        <Button onClick={() => navigate('/employees')} className="mt-4">
          Back to Employees
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/employees')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Employees
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              {employee.first_name} {employee.last_name}
            </h1>
            <p className="text-gray-600 mt-1">{employee.position} • {employee.department}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
            onClick={handleEditClick}
          >
            Edit Employee
          </Button>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            employee.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {employee.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Personal & Contact Info */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-gray-900 mt-1">{employee.first_name} {employee.last_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                  <p className="text-gray-900 mt-1">{employee.date_of_birth}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Gender</label>
                  <p className="text-gray-900 mt-1">{employee.gender}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Employee ID</label>
                  <p className="text-gray-900 mt-1 font-mono text-sm">{employee.id?.substring(0, 8)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <p className="text-gray-900 mt-1">{employee.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone
                  </label>
                  <p className="text-gray-900 mt-1">{employee.phone}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </label>
                <p className="text-gray-900 mt-1">{employee.address}</p>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Contact Name</label>
                  <p className="text-gray-900 mt-1">{employee.emergency_contact_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Contact Phone</label>
                  <p className="text-gray-900 mt-1">{employee.emergency_contact_phone || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Job & Employment Info */}
        <div className="space-y-6">
          
          {/* Job Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                Job Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Department</label>
                <p className="text-gray-900 mt-1 font-medium">{employee.department}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Position</label>
                <p className="text-gray-900 mt-1 font-medium">{employee.position}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Employment Type</label>
                <p className="text-gray-900 mt-1">{employee.employment_type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Join Date
                </label>
                <p className="text-gray-900 mt-1">{employee.join_date}</p>
              </div>
            </CardContent>
          </Card>

          {/* Compensation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Compensation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="text-sm font-medium text-gray-500">Annual Salary</label>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${employee.salary?.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Work Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Work Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Monday - Friday</span>
                  <span className="text-sm font-medium text-gray-900">9:00 AM - 5:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Working Hours</span>
                  <span className="text-sm font-medium text-gray-900">40 hrs/week</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Performance
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={performanceView === "month" ? "default" : "outline"}
                    onClick={() => setPerformanceView("month")}
                    className="h-7 px-2 text-xs"
                  >
                    Month
                  </Button>
                  <Button
                    size="sm"
                    variant={performanceView === "year" ? "default" : "outline"}
                    onClick={() => setPerformanceView("year")}
                    className="h-7 px-2 text-xs"
                  >
                    Year
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigatePerformance(-1)}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium text-gray-700">
                  {formatDateLabel(performanceDate, performanceView)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigatePerformance(1)}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Current Stats */}
                <div className="flex justify-between items-center pb-2">
                  <span className="text-sm text-gray-500">Overall Rating</span>
                  <span className="text-2xl font-bold text-purple-600">4.5/5</span>
                </div>
                
                {/* Performance Graph */}
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getPerformanceData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fontSize: 10 }}
                        stroke="#999"
                      />
                      <YAxis 
                        domain={[0, 5]}
                        tick={{ fontSize: 10 }}
                        stroke="#999"
                      />
                      <Tooltip 
                        contentStyle={{ fontSize: '12px' }}
                        formatter={(value) => [`${value.toFixed(1)}/5`, 'Rating']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="rating" 
                        stroke="#9333ea" 
                        strokeWidth={2}
                        dot={{ fill: '#9333ea', r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Review Info */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Review</span>
                    <span className="font-medium text-gray-900">Oct 2024</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Next Review</span>
                    <span className="font-medium text-gray-900">Jan 2025</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leave */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  Leave
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={leaveView === "month" ? "default" : "outline"}
                    onClick={() => setLeaveView("month")}
                    className="h-7 px-2 text-xs"
                  >
                    Month
                  </Button>
                  <Button
                    size="sm"
                    variant={leaveView === "year" ? "default" : "outline"}
                    onClick={() => setLeaveView("year")}
                    className="h-7 px-2 text-xs"
                  >
                    Year
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigateLeave(-1)}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium text-gray-700">
                  {formatDateLabel(leaveDate, leaveView)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigateLeave(1)}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Leave Balance Summary */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500">Total</div>
                    <div className="text-lg font-bold text-gray-900">20</div>
                  </div>
                  <div className="bg-red-50 p-2 rounded">
                    <div className="text-xs text-red-600">Used</div>
                    <div className="text-lg font-bold text-red-600">8</div>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <div className="text-xs text-green-600">Left</div>
                    <div className="text-lg font-bold text-green-600">12</div>
                  </div>
                </div>

                {/* Leave Graph */}
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getLeaveData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fontSize: 10 }}
                        stroke="#999"
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        stroke="#999"
                      />
                      <Tooltip 
                        contentStyle={{ fontSize: '12px' }}
                        formatter={(value) => [`${value} day${value !== 1 ? 's' : ''}`, 'Leave']}
                      />
                      <Bar 
                        dataKey="days" 
                        fill="#f97316"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Applied Leaves */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-xs font-medium text-gray-700 mb-2">Applied Leave</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs bg-blue-50 p-2 rounded">
                      <span className="text-gray-600">Dec 20-22, 2024</span>
                      <span className="px-2 py-0.5 bg-blue-200 text-blue-700 rounded-full font-medium">Pending</span>
                    </div>
                    <div className="flex justify-between items-center text-xs bg-amber-50 p-2 rounded">
                      <span className="text-gray-600">Dec 25-26, 2024</span>
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-700 rounded-full font-medium">Approved</span>
                    </div>
                  </div>
                </div>

                {/* Last Leave */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Last Leave</span>
                    <span className="font-medium text-gray-900">Nov 1-3, 2024</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input 
                  value={editFormData.first_name || ''} 
                  onChange={(e) => handleEditChange('first_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input 
                  value={editFormData.last_name || ''} 
                  onChange={(e) => handleEditChange('last_name', e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={editFormData.email || ''} 
                  onChange={(e) => handleEditChange('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input 
                  value={editFormData.phone || ''} 
                  onChange={(e) => handleEditChange('phone', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date of Birth</Label>
                <Input 
                  type="date"
                  value={editFormData.date_of_birth || ''} 
                  onChange={(e) => handleEditChange('date_of_birth', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={editFormData.gender || ''} onValueChange={(value) => handleEditChange('gender', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Address</Label>
              <Input 
                value={editFormData.address || ''} 
                onChange={(e) => handleEditChange('address', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Department</Label>
                <Input 
                  value={editFormData.department || ''} 
                  onChange={(e) => handleEditChange('department', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Position</Label>
                <Input 
                  value={editFormData.position || ''} 
                  onChange={(e) => handleEditChange('position', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Employment Type</Label>
                <Select value={editFormData.employment_type || ''} onValueChange={(value) => handleEditChange('employment_type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Join Date</Label>
                <Input 
                  type="date"
                  value={editFormData.join_date || ''} 
                  onChange={(e) => handleEditChange('join_date', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Annual Salary</Label>
                <Input 
                  type="number"
                  value={editFormData.salary || ''} 
                  onChange={(e) => handleEditChange('salary', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editFormData.status || ''} onValueChange={(value) => handleEditChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Emergency Contact Name</Label>
                <Input 
                  value={editFormData.emergency_contact_name || ''} 
                  onChange={(e) => handleEditChange('emergency_contact_name', e.target.value)}
                />
              </div>
              <div>
                <Label>Emergency Contact Phone</Label>
                <Input 
                  value={editFormData.emergency_contact_phone || ''} 
                  onChange={(e) => handleEditChange('emergency_contact_phone', e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                Save Changes
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeDetail;
