import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, toast } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Mail, Phone, Briefcase, Calendar, MapPin, User, Download, Upload, FileUp, Check, X as XIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Employees = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [csvData, setCsvData] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    address: "",
    department: "",
    position: "",
    employment_type: "Full-time",
    join_date: "",
    salary: "",
    emergency_contact_name: "",
    emergency_contact_phone: ""
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const statusParam = statusFilter === "all" ? "" : `?status=${statusFilter}`;
      const response = await axios.get(`${API}/employees${statusParam}`);
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [statusFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/employees`, {
        ...formData,
        salary: parseFloat(formData.salary)
      });
      toast.success("Employee added successfully");
      setIsDialogOpen(false);
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        date_of_birth: "",
        gender: "",
        address: "",
        department: "",
        position: "",
        employment_type: "Full-time",
        join_date: "",
        salary: "",
        emergency_contact_name: "",
        emergency_contact_phone: ""
      });
      fetchEmployees();
    } catch (error) {
      console.error("Error creating employee:", error);
      toast.error("Failed to add employee");
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === "all" || emp.department === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  });

  const uniqueDepartments = [...new Set(employees.map(e => e.department))];

  const exportCSV = () => {
    const headers = ["First Name", "Last Name", "Email", "Department", "Position", "Employment Type", "Join Date", "Status"];
    const rows = filteredEmployees.map(emp => [
      emp.first_name,
      emp.last_name,
      emp.email,
      emp.department,
      emp.position,
      emp.employment_type,
      emp.join_date,
      emp.status
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees.csv";
    a.click();
    toast.success("Employee data exported");
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error("CSV file is empty or invalid");
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length === headers.length) {
            const employee = {
              first_name: values[0],
              last_name: values[1],
              email: values[2],
              phone: values[3] || "",
              date_of_birth: values[4] || "",
              gender: values[5] || "",
              address: values[6] || "",
              department: values[7],
              position: values[8],
              employment_type: values[9] || "Full-time",
              join_date: values[10] || new Date().toISOString().split('T')[0],
              salary: parseFloat(values[11]) || 0,
              status: values[12] || "active",
              emergency_contact_name: values[13] || "",
              emergency_contact_phone: values[14] || ""
            };
            data.push(employee);
          }
        }

        if (data.length === 0) {
          toast.error("No valid employee data found in CSV");
          return;
        }

        setCsvData(data);
        setActiveTab("new");
        toast.success(`Loaded ${data.length} employees from CSV. Please review and confirm.`);
      } catch (error) {
        console.error("Error parsing CSV:", error);
        toast.error("Failed to parse CSV file");
      }
    };

    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleConfirmImport = async () => {
    try {
      const response = await axios.post(`${API}/employees/bulk`, { employees: csvData });
      toast.success(`Successfully added ${response.data.added} employees`);
      setCsvData([]);
      setActiveTab("all");
      fetchEmployees();
    } catch (error) {
      console.error("Error importing employees:", error);
      toast.error(error.response?.data?.detail || "Failed to import employees");
    }
  };

  const handleCancelImport = () => {
    setCsvData([]);
    setActiveTab("all");
    toast.info("CSV import cancelled");
  };

  const removeCSVEmployee = (index) => {
    setCsvData(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div data-testid="employees-page">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Employee Management</h1>
          <p className="text-gray-600">Manage employee information and records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => document.getElementById('csv-upload').click()}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700" data-testid="add-employee-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input 
                      value={formData.first_name} 
                      onChange={(e) => handleChange('first_name', e.target.value)}
                      required
                      data-testid="first-name-input"
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input 
                      value={formData.last_name} 
                      onChange={(e) => handleChange('last_name', e.target.value)}
                      required
                      data-testid="last-name-input"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={formData.email} 
                      onChange={(e) => handleChange('email', e.target.value)}
                      required
                      data-testid="email-input"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input 
                      value={formData.phone} 
                      onChange={(e) => handleChange('phone', e.target.value)}
                      required
                      data-testid="phone-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date of Birth</Label>
                    <Input 
                      type="date"
                      value={formData.date_of_birth} 
                      onChange={(e) => handleChange('date_of_birth', e.target.value)}
                      required
                      data-testid="dob-input"
                    />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)}>
                      <SelectTrigger data-testid="gender-select">
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
                    value={formData.address} 
                    onChange={(e) => handleChange('address', e.target.value)}
                    required
                    data-testid="address-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Department</Label>
                    <Input 
                      value={formData.department} 
                      onChange={(e) => handleChange('department', e.target.value)}
                      required
                      data-testid="department-input"
                    />
                  </div>
                  <div>
                    <Label>Position</Label>
                    <Input 
                      value={formData.position} 
                      onChange={(e) => handleChange('position', e.target.value)}
                      required
                      data-testid="position-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Employment Type</Label>
                    <Select value={formData.employment_type} onValueChange={(value) => handleChange('employment_type', value)}>
                      <SelectTrigger data-testid="employment-type-select">
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
                      value={formData.join_date} 
                      onChange={(e) => handleChange('join_date', e.target.value)}
                      required
                      data-testid="join-date-input"
                    />
                  </div>
                </div>

                <div>
                  <Label>Annual Salary</Label>
                  <Input 
                    type="number"
                    value={formData.salary} 
                    onChange={(e) => handleChange('salary', e.target.value)}
                    required
                    data-testid="salary-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Emergency Contact Name</Label>
                    <Input 
                      value={formData.emergency_contact_name} 
                      onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                      data-testid="emergency-name-input"
                    />
                  </div>
                  <div>
                    <Label>Emergency Contact Phone</Label>
                    <Input 
                      value={formData.emergency_contact_phone} 
                      onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                      data-testid="emergency-phone-input"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" data-testid="submit-employee-btn">
                    Add Employee
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1" data-testid="cancel-employee-btn">
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="all">
            All Employees ({employees.length})
          </TabsTrigger>
          <TabsTrigger value="new" className="relative">
            <FileUp className="w-4 h-4 mr-2" />
            New Imports ({csvData.length})
            {csvData.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {csvData.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Employees Tab */}
        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <CardTitle>Active Employees ({filteredEmployees.length})</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant={statusFilter === "active" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("active")}
                        data-testid="filter-active-btn"
                      >
                        Active
                      </Button>
                      <Button
                        variant={statusFilter === "terminated" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("terminated")}
                        data-testid="filter-terminated-btn"
                      >
                        Terminated
                      </Button>
                      <Button
                        variant={statusFilter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("all")}
                        data-testid="filter-all-btn"
                      >
                        All
                      </Button>
                    </div>
                  </div>
                </div>
            
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input 
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-employees-input"
                />
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-48" data-testid="department-filter">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {uniqueDepartments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => (
                  <TableRow 
                    key={employee.id} 
                    data-testid={`employee-row-${employee.id}`}
                    onClick={() => navigate(`/employees/${employee.id}`)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <TableCell className="font-medium">
                      {employee.first_name} {employee.last_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {employee.email}
                      </div>
                    </TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>{employee.employment_type}</TableCell>
                    <TableCell>{employee.join_date}</TableCell>
                    <TableCell>
                      <span className={`status-badge ${
                        employee.status === 'active' ? 'status-active' : 
                        employee.status === 'terminated' ? 'status-rejected' : 
                        'status-inactive'
                      }`}>
                        {employee.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>

        {/* New Imports Tab */}
        <TabsContent value="new" className="mt-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Review CSV Import ({csvData.length} employees)</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Review the uploaded employee data and confirm to add them to the system
              </p>
            </div>
            {csvData.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancelImport}
                  className="text-red-600 hover:text-red-700"
                >
                  <XIcon className="w-4 h-4 mr-2" />
                  Cancel Import
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Confirm & Add All
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {csvData.length === 0 ? (
            <div className="text-center py-12">
              <FileUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No CSV Data Loaded</h3>
              <p className="text-gray-600 mb-4">
                Click "Import CSV" button above to upload an employee list
              </p>
              <div className="bg-blue-50 p-4 rounded-lg max-w-2xl mx-auto text-left">
                <p className="text-sm font-medium text-blue-900 mb-2">CSV Format Requirements:</p>
                <p className="text-xs text-blue-800">
                  Columns (in order): First Name, Last Name, Email, Phone, Date of Birth, Gender, Address, 
                  Department, Position, Employment Type, Join Date, Salary, Status, Emergency Contact Name, 
                  Emergency Contact Phone
                </p>
                <p className="text-xs text-blue-800 mt-2">
                  Example: John,Doe,john@company.com,555-0100,1990-01-15,Male,123 Main St,Engineering,Developer,Full-time,2024-01-01,75000,active,Jane Doe,555-0101
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-800">
                  ✓ Successfully loaded {csvData.length} employees. Review the data below and click "Confirm & Add All" when ready.
                </p>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-20">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.map((emp, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-gray-500">{index + 1}</TableCell>
                        <TableCell className="font-medium">
                          {emp.first_name} {emp.last_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3 h-3 text-gray-400" />
                            {emp.email}
                          </div>
                        </TableCell>
                        <TableCell>{emp.department}</TableCell>
                        <TableCell>{emp.position}</TableCell>
                        <TableCell>{emp.employment_type}</TableCell>
                        <TableCell>{emp.join_date}</TableCell>
                        <TableCell>
                          <span className={`status-badge ${
                            emp.status === 'active' ? 'status-active' : 'status-inactive'
                          }`}>
                            {emp.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCSVEmployee(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <XIcon className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Employees;
