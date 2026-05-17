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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Check, X as XIcon, Search, Filter, X, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

const Leaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    leave_type: "casual",
    start_date: "",
    end_date: "",
    days_count: "",
    reason: ""
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [durationFilter, setDurationFilter] = useState(""); // short, medium, long

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leavesRes, employeesRes] = await Promise.all([
        axios.get(`${API}/leave-requests`),
        axios.get(`${API}/employees?status=active`)
      ]);
      setLeaves(leavesRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/leave-requests`, {
        ...formData,
        days_count: parseFloat(formData.days_count)
      });
      toast.success("Leave request submitted successfully");
      setIsDialogOpen(false);
      setFormData({
        employee_id: "",
        leave_type: "casual",
        start_date: "",
        end_date: "",
        days_count: "",
        reason: ""
      });
      fetchData();
    } catch (error) {
      console.error("Error creating leave request:", error);
      toast.error("Failed to submit leave request");
    }
  };

  const handleApproval = async (leaveId, status) => {
    try {
      await axios.put(`${API}/leave-requests/${leaveId}/approve`, {
        status,
        approved_by: "HR Manager"
      });
      toast.success(`Leave request ${status}`);
      fetchData();
    } catch (error) {
      console.error("Error updating leave request:", error);
      toast.error("Failed to update leave request");
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

  // Get unique values
  const uniqueDepartments = [...new Set(employees.map(e => e.department))].filter(Boolean);
  const leaveTypes = ["casual", "sick", "vacation", "personal", "maternity", "paternity"];
  const statuses = ["pending", "approved", "rejected"];

  // Toggle functions for multi-select
  const toggleEmployee = (empId) => {
    setSelectedEmployees(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const toggleLeaveType = (type) => {
    setSelectedLeaveTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
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

  // Check duration category
  const getDurationCategory = (days) => {
    if (days <= 2) return "short";
    if (days <= 5) return "medium";
    return "long";
  };

  // Filter leaves
  const filteredLeaves = leaves.filter(leave => {
    // Search filter
    if (searchTerm) {
      const empName = getEmployeeName(leave.employee_id).toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        empName.includes(searchLower) ||
        leave.leave_type.toLowerCase().includes(searchLower) ||
        leave.status.toLowerCase().includes(searchLower) ||
        leave.start_date.includes(searchLower) ||
        leave.end_date.includes(searchLower) ||
        (leave.reason && leave.reason.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
    }

    // Date range filter (checks if leave overlaps with date range)
    if (dateFrom && leave.end_date < dateFrom) return false;
    if (dateTo && leave.start_date > dateTo) return false;

    // Employee filter
    if (selectedEmployees.length > 0 && !selectedEmployees.includes(leave.employee_id)) {
      return false;
    }

    // Leave type filter
    if (selectedLeaveTypes.length > 0 && !selectedLeaveTypes.includes(leave.leave_type)) {
      return false;
    }

    // Status filter
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(leave.status)) {
      return false;
    }

    // Department filter
    if (selectedDepartments.length > 0) {
      const empDept = getEmployeeDepartment(leave.employee_id);
      if (!selectedDepartments.includes(empDept)) return false;
    }

    // Duration filter
    if (durationFilter) {
      const category = getDurationCategory(leave.days_count);
      if (category !== durationFilter) return false;
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
    <div data-testid="leaves-page">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Leave Management</h1>
          <p className="text-gray-600">Manage employee leave requests and approvals</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="request-leave-btn">
              <Plus className="w-4 h-4 mr-2" />
              Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Leave Request</DialogTitle>
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
                <Label>Leave Type</Label>
                <Select value={formData.leave_type} onValueChange={(value) => setFormData(prev => ({ ...prev, leave_type: value }))}>
                  <SelectTrigger data-testid="leave-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="vacation">Vacation</SelectItem>
                    <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input 
                    type="date"
                    value={formData.start_date} 
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    required
                    data-testid="start-date-input"
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input 
                    type="date"
                    value={formData.end_date} 
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    required
                    data-testid="end-date-input"
                  />
                </div>
              </div>

              <div>
                <Label>Number of Days</Label>
                <Input 
                  type="number"
                  step="0.5"
                  value={formData.days_count} 
                  onChange={(e) => setFormData(prev => ({ ...prev, days_count: e.target.value }))}
                  required
                  data-testid="days-input"
                />
              </div>

              <div>
                <Label>Reason</Label>
                <Textarea 
                  value={formData.reason} 
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Reason for leave"
                  rows={3}
                  required
                  data-testid="reason-input"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" data-testid="submit-leave-btn">
                  Submit Request
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
            placeholder="Search by employee, leave type, status, dates, or reason..."
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

          {/* Leave Type Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                Leave Type {selectedLeaveTypes.length > 0 && `(${selectedLeaveTypes.length})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <p className="text-sm font-medium mb-2">Select Leave Types</p>
                {leaveTypes.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={selectedLeaveTypes.includes(type)}
                      onCheckedChange={() => toggleLeaveType(type)}
                    />
                    <label htmlFor={`type-${type}`} className="text-sm cursor-pointer capitalize">
                      {type}
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

          {/* Duration Filter */}
          <Select value={durationFilter} onValueChange={setDurationFilter}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue placeholder="Duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="short">Short (≤2 days)</SelectItem>
              <SelectItem value="medium">Medium (3-5 days)</SelectItem>
              <SelectItem value="long">Long (&gt;5 days)</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear All Filters */}
          {(searchTerm || dateFrom || dateTo || selectedEmployees.length > 0 || 
            selectedLeaveTypes.length > 0 || selectedStatuses.length > 0 || 
            selectedDepartments.length > 0 || durationFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setDateFrom("");
                setDateTo("");
                setSelectedEmployees([]);
                setSelectedLeaveTypes([]);
                setSelectedStatuses([]);
                setSelectedDepartments([]);
                setDurationFilter("");
              }}
              className="h-8 text-red-600 hover:text-red-700"
            >
              Clear All
            </Button>
          )}
        </div>

        {/* Active Filters Display */}
        {(selectedEmployees.length > 0 || selectedLeaveTypes.length > 0 || 
          selectedStatuses.length > 0 || selectedDepartments.length > 0 || 
          dateFrom || dateTo || durationFilter) && (
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
            {selectedLeaveTypes.map((type) => (
              <span key={type} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full flex items-center gap-1 capitalize">
                {type}
                <X className="w-3 h-3 cursor-pointer" onClick={() => toggleLeaveType(type)} />
              </span>
            ))}
            {selectedStatuses.map((status) => (
              <span key={status} className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1 capitalize">
                {status}
                <X className="w-3 h-3 cursor-pointer" onClick={() => toggleStatus(status)} />
              </span>
            ))}
            {durationFilter && (
              <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full flex items-center gap-1 capitalize">
                {durationFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setDurationFilter("")} />
              </span>
            )}
          </div>
        )}

        {/* Results Counter */}
        <div className="text-sm text-gray-600">
          Showing {filteredLeaves.length} of {leaves.length} leave requests
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Requests ({filteredLeaves.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeaves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    {leaves.length === 0 ? "No leave requests found" : "No leave requests match the selected filters"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeaves.map((leave) => (
                  <TableRow key={leave.id} data-testid={`leave-row-${leave.id}`}>
                    <TableCell className="font-medium">{getEmployeeName(leave.employee_id)}</TableCell>
                    <TableCell className="capitalize">{leave.leave_type}</TableCell>
                    <TableCell>{leave.start_date}</TableCell>
                    <TableCell>{leave.end_date}</TableCell>
                    <TableCell>{leave.days_count}</TableCell>
                    <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
                    <TableCell>
                      <span className={`status-badge ${
                        leave.status === 'approved' ? 'status-approved' :
                        leave.status === 'rejected' ? 'status-rejected' :
                        'status-pending'
                      }`}>
                        {leave.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {leave.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-8 px-2 text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => handleApproval(leave.id, 'approved')}
                            data-testid={`approve-leave-${leave.id}`}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-8 px-2 text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => handleApproval(leave.id, 'rejected')}
                            data-testid={`reject-leave-${leave.id}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
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

export default Leaves;
