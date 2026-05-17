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
import { Plus, Download, DollarSign } from "lucide-react";

const Payroll = () => {
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    month: "",
    basic_salary: "",
    allowances: "0",
    deductions: "0",
    tax: "0",
    net_salary: "",
    payment_date: "",
    payment_status: "pending"
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Calculate net salary when fields change
    const basic = parseFloat(formData.basic_salary) || 0;
    const allowances = parseFloat(formData.allowances) || 0;
    const deductions = parseFloat(formData.deductions) || 0;
    const tax = parseFloat(formData.tax) || 0;
    const netSalary = basic + allowances - deductions - tax;
    setFormData(prev => ({ ...prev, net_salary: netSalary.toString() }));
  }, [formData.basic_salary, formData.allowances, formData.deductions, formData.tax]);

  const fetchData = async () => {
    try {
      const [payrollRes, employeesRes] = await Promise.all([
        axios.get(`${API}/payroll`),
        axios.get(`${API}/employees?status=active`)
      ]);
      setPayrollRecords(payrollRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/payroll`, {
        ...formData,
        basic_salary: parseFloat(formData.basic_salary),
        allowances: parseFloat(formData.allowances),
        deductions: parseFloat(formData.deductions),
        tax: parseFloat(formData.tax),
        net_salary: parseFloat(formData.net_salary)
      });
      toast.success("Payroll record created successfully");
      setIsDialogOpen(false);
      setFormData({
        employee_id: "",
        month: "",
        basic_salary: "",
        allowances: "0",
        deductions: "0",
        tax: "0",
        net_salary: "",
        payment_date: "",
        payment_status: "pending"
      });
      fetchData();
    } catch (error) {
      console.error("Error creating payroll record:", error);
      toast.error("Failed to create payroll record");
    }
  };

  const getEmployeeName = (empId) => {
    const emp = employees.find(e => e.id === empId);
    return emp ? `${emp.first_name} ${emp.last_name}` : "Unknown";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalPayroll = payrollRecords.reduce((sum, record) => sum + record.net_salary, 0);
  const paidAmount = payrollRecords.filter(r => r.payment_status === 'paid').reduce((sum, record) => sum + record.net_salary, 0);
  const pendingAmount = payrollRecords.filter(r => r.payment_status === 'pending').reduce((sum, record) => sum + record.net_salary, 0);

  return (
    <div data-testid="payroll-page">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Payroll Management</h1>
          <p className="text-gray-600">Manage employee compensation and salary records</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="process-payroll-btn">
              <Plus className="w-4 h-4 mr-2" />
              Process Payroll
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Process Payroll</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employee</Label>
                  <Select value={formData.employee_id} onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))} required>
                    <SelectTrigger data-testid="payroll-employee-select">
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
                  <Label>Month (YYYY-MM)</Label>
                  <Input 
                    type="month"
                    value={formData.month} 
                    onChange={(e) => setFormData(prev => ({ ...prev, month: e.target.value }))}
                    required
                    data-testid="payroll-month-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Basic Salary</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={formData.basic_salary} 
                    onChange={(e) => setFormData(prev => ({ ...prev, basic_salary: e.target.value }))}
                    required
                    data-testid="basic-salary-input"
                  />
                </div>
                <div>
                  <Label>Allowances</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={formData.allowances} 
                    onChange={(e) => setFormData(prev => ({ ...prev, allowances: e.target.value }))}
                    data-testid="allowances-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Deductions</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={formData.deductions} 
                    onChange={(e) => setFormData(prev => ({ ...prev, deductions: e.target.value }))}
                    data-testid="deductions-input"
                  />
                </div>
                <div>
                  <Label>Tax</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={formData.tax} 
                    onChange={(e) => setFormData(prev => ({ ...prev, tax: e.target.value }))}
                    data-testid="tax-input"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <Label className="text-sm text-gray-600">Net Salary (Calculated)</Label>
                <p className="text-2xl font-bold text-blue-900" data-testid="net-salary-display">
                  ${parseFloat(formData.net_salary || 0).toLocaleString()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payment Date</Label>
                  <Input 
                    type="date"
                    value={formData.payment_date} 
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                    required
                    data-testid="payment-date-input"
                  />
                </div>
                <div>
                  <Label>Payment Status</Label>
                  <Select value={formData.payment_status} onValueChange={(value) => setFormData(prev => ({ ...prev, payment_status: value }))}>
                    <SelectTrigger data-testid="payment-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" data-testid="submit-payroll-btn">
                  Process Payroll
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Payroll</CardTitle>
            <DollarSign className="w-8 h-8 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900" data-testid="total-payroll-value">
              ${totalPayroll.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Paid</CardTitle>
            <DollarSign className="w-8 h-8 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900" data-testid="paid-amount-value">
              ${paidAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
            <DollarSign className="w-8 h-8 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900" data-testid="pending-amount-value">
              ${pendingAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll Records ({payrollRecords.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Basic Salary</TableHead>
                <TableHead>Allowances</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No payroll records found
                  </TableCell>
                </TableRow>
              ) : (
                payrollRecords.map((record) => (
                  <TableRow key={record.id} data-testid={`payroll-row-${record.id}`}>
                    <TableCell className="font-medium">{getEmployeeName(record.employee_id)}</TableCell>
                    <TableCell>{record.month}</TableCell>
                    <TableCell>${record.basic_salary.toLocaleString()}</TableCell>
                    <TableCell>${record.allowances.toLocaleString()}</TableCell>
                    <TableCell>${record.deductions.toLocaleString()}</TableCell>
                    <TableCell>${record.tax.toLocaleString()}</TableCell>
                    <TableCell className="font-bold">${record.net_salary.toLocaleString()}</TableCell>
                    <TableCell>{record.payment_date}</TableCell>
                    <TableCell>
                      <span className={`status-badge ${
                        record.payment_status === 'paid' ? 'status-approved' : 'status-pending'
                      }`}>
                        {record.payment_status}
                      </span>
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

export default Payroll;
