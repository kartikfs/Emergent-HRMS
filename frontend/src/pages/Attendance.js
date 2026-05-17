import { useState, useEffect } from "react";
import axios from "axios";
import { API, toast } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Clock, Search, Filter, X, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

const Attendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    date: new Date().toISOString().split('T')[0],
    check_in: "",
    check_out: "",
    status: "present",
    notes: ""
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [timeFilter, setTimeFilter] = useState(""); // early, on-time, late
  const [selectedDepartments, setSelectedDepartments] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [attendanceRes, employeesRes] = await Promise.all([
        axios.get(`${API}/attendance`),
        axios.get(`${API}/employees?status=active`)
      ]);
      setAttendance(attendanceRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/attendance`, formData);
      toast.success("Attendance recorded successfully");
      setIsDialogOpen(false);
      setFormData({
        employee_id: "",
        date: new Date().toISOString().split('T')[0],
        check_in: "",
        check_out: "",
        status: "present",
        notes: ""
      });
      fetchData();
    } catch (error) {
      console.error("Error creating attendance:", error);
      toast.error("Failed to record attendance");
    }
  };

  const getEmployeeName = (empId) => {
    const emp = employees.find(e => e.id === empId);
    return emp ? `${emp.first_name} ${emp.last_name}` : "Unknown";
  };

  const getEmployeeDepartment = (empId) => {
    const emp = employees.find(e => e.id === empId);
    return emp ? emp.department : "Unknown";
  };

  // Get unique departments
  const uniqueDepartments = [...new Set(employees.map(e => e.department))].filter(Boolean);

  // Status options
  const statuses = ["present", "absent", "late", "half-day", "on-leave"];

  // Toggle functions for multi-select
  const toggleEmployee = (empId) => {
    setSelectedEmployees(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const toggleStatus = (status) => {
    setSelectedStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const toggleDepartment = (dept) => {
    setSelectedDepartments(prev => 
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  // Check if check-in time is early, on-time, or late
  const getTimeCategory = (checkIn) => {
    if (!checkIn) return null;
    const [hours, minutes] = checkIn.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const nineAM = 9 * 60; // 9:00 AM in minutes
    
    if (totalMinutes < nineAM - 15) return "early"; // Before 8:45 AM
    if (totalMinutes <= nineAM) return "on-time"; // 8:45 AM - 9:00 AM
    return "late"; // After 9:00 AM
  };

  // Filter attendance records
  const filteredAttendance = attendance.filter(record => {
    // Search filter
    if (searchTerm) {
      const empName = getEmployeeName(record.employee_id).toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        empName.includes(searchLower) ||
        record.date.includes(searchLower) ||
        record.status.toLowerCase().includes(searchLower) ||
        (record.check_in && record.check_in.includes(searchLower)) ||
        (record.check_out && record.check_out.includes(searchLower));
      
      if (!matchesSearch) return false;
    }

    // Date range filter
    if (dateFrom && record.date < dateFrom) return false;
    if (dateTo && record.date > dateTo) return false;

    // Employee filter
    if (selectedEmployees.length > 0 && !selectedEmployees.includes(record.employee_id)) {
      return false;
    }

    // Status filter
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(record.status)) {
      return false;
    }

    // Department filter
    if (selectedDepartments.length > 0) {
      const empDept = getEmployeeDepartment(record.employee_id);
      if (!selectedDepartments.includes(empDept)) return false;
    }

    // Time filter (early/on-time/late)
    if (timeFilter) {
      const category = getTimeCategory(record.check_in);
      if (category !== timeFilter) return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div data-testid="attendance-page">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Attendance Tracking</h1>
          <p className="text-gray-600">Monitor employee attendance and work hours</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="mark-attendance-btn">
              <Plus className="w-4 h-4 mr-2" />
              Mark Attendance
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark Attendance</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Employee</Label>
                <Select value={formData.employee_id} onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))} required>
                  <SelectTrigger data-testid="employee-select">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date</Label>
                <Input 
                  type="date"
                  value={formData.date} 
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                  data-testid="date-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Check In</Label>
                  <Input 
                    type="time"
                    value={formData.check_in} 
                    onChange={(e) => setFormData(prev => ({ ...prev, check_in: e.target.value }))}
                    required
                    data-testid="check-in-input"
                  />
                </div>
                <div>
                  <Label>Check Out</Label>
                  <Input 
                    type="time"
                    value={formData.check_out} 
                    onChange={(e) => setFormData(prev => ({ ...prev, check_out: e.target.value }))}
                    data-testid="check-out-input"
                  />
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger data-testid="status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="half-day">Half Day</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes</Label>
                <Input 
                  value={formData.notes} 
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes"
                  data-testid="notes-input"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" data-testid="submit-attendance-btn">
                  Mark Attendance
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters Section */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by employee name, date, status, time..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm("")}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-gray-500" />
            <Input
              type="date"
              placeholder="From"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36 h-8 text-sm"
            />
            <span className="text-gray-500">to</span>
            <Input
              type="date"
              placeholder="To"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36 h-8 text-sm"
            />
          </div>

          {/* Employee Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                Employee {selectedEmployees.length > 0 && `(${selectedEmployees.length})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                <p className="text-sm font-medium mb-2">Select Employees</p>
                {employees.map((emp) => (
                  <div key={emp.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`emp-${emp.id}`}
                      checked={selectedEmployees.includes(emp.id)}
                      onCheckedChange={() => toggleEmployee(emp.id)}
                    />
                    <label htmlFor={`emp-${emp.id}`} className="text-sm cursor-pointer">
                      {emp.first_name} {emp.last_name}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Department Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                Department {selectedDepartments.length > 0 && `(${selectedDepartments.length})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <p className="text-sm font-medium mb-2">Select Departments</p>
                {uniqueDepartments.map((dept) => (
                  <div key={dept} className="flex items-center space-x-2">
                    <Checkbox
                      id={`dept-${dept}`}
                      checked={selectedDepartments.includes(dept)}
                      onCheckedChange={() => toggleDepartment(dept)}
                    />
                    <label htmlFor={`dept-${dept}`} className="text-sm cursor-pointer">
                      {dept}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Status Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                Status {selectedStatuses.length > 0 && `(${selectedStatuses.length})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <p className="text-sm font-medium mb-2">Select Status</p>
                {statuses.map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={selectedStatuses.includes(status)}
                      onCheckedChange={() => toggleStatus(status)}
                    />
                    <label htmlFor={`status-${status}`} className="text-sm cursor-pointer capitalize">
                      {status}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Time Filter */}
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Times</SelectItem>
              <SelectItem value="early">Early (&lt; 8:45)</SelectItem>
              <SelectItem value="on-time">On Time</SelectItem>
              <SelectItem value="late">Late (&gt; 9:00)</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear All Filters */}
          {(searchTerm || dateFrom || dateTo || selectedEmployees.length > 0 || 
            selectedStatuses.length > 0 || selectedDepartments.length > 0 || timeFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setDateFrom("");
                setDateTo("");
                setSelectedEmployees([]);
                setSelectedStatuses([]);
                setSelectedDepartments([]);
                setTimeFilter("");
              }}
              className="h-8 text-red-600 hover:text-red-700"
            >
              Clear All
            </Button>
          )}
        </div>

        {/* Active Filters Display */}
        {(selectedEmployees.length > 0 || selectedStatuses.length > 0 || 
          selectedDepartments.length > 0 || dateFrom || dateTo || timeFilter) && (
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="text-gray-600">Active filters:</span>
            {dateFrom && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                From: {dateFrom}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setDateFrom("")} />
              </span>
            )}
            {dateTo && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                To: {dateTo}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setDateTo("")} />
              </span>
            )}
            {selectedEmployees.slice(0, 3).map((empId) => (
              <span key={empId} className="px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                {getEmployeeName(empId)}
                <X className="w-3 h-3 cursor-pointer" onClick={() => toggleEmployee(empId)} />
              </span>
            ))}
            {selectedEmployees.length > 3 && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                +{selectedEmployees.length - 3} more
              </span>
            )}
            {selectedDepartments.map((dept) => (
              <span key={dept} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                {dept}
                <X className="w-3 h-3 cursor-pointer" onClick={() => toggleDepartment(dept)} />
              </span>
            ))}
            {selectedStatuses.map((status) => (
              <span key={status} className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1 capitalize">
                {status}
                <X className="w-3 h-3 cursor-pointer" onClick={() => toggleStatus(status)} />
              </span>
            ))}
            {timeFilter && (
              <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full flex items-center gap-1 capitalize">
                {timeFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setTimeFilter("")} />
              </span>
            )}
          </div>
        )}

        {/* Results Counter */}
        <div className="text-sm text-gray-600">
          Showing {filteredAttendance.length} of {attendance.length} records
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Records ({filteredAttendance.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    {attendance.length === 0 ? "No attendance records found" : "No records match the selected filters"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttendance.map((record) => (
                  <TableRow key={record.id} data-testid={`attendance-row-${record.id}`}>
                    <TableCell className="font-medium">{getEmployeeName(record.employee_id)}</TableCell>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {record.check_in}
                      </div>
                    </TableCell>
                    <TableCell>{record.check_out || "-"}</TableCell>
                    <TableCell>
                      <span className={`status-badge ${
                        record.status === 'present' ? 'status-active' :
                        record.status === 'absent' ? 'status-rejected' :
                        'status-pending'
                      }`}>
                        {record.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{record.notes || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;
