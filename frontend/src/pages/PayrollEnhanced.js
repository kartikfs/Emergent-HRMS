import { useState, useEffect } from "react";
import axios from "axios";
import { API, toast } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, CreditCard, FileText, TrendingUp, Download, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const PayrollEnhanced = () => {
  const [salaryStructures, setSalaryStructures] = useState([]);
  const [loans, setLoans] = useState([]);
  const [reimbursements, setReimbursements] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [empFilter, setEmpFilter] = useState("");
  const [loanStatusFilter, setLoanStatusFilter] = useState("all");
  const [reimbStatusFilter, setReimbStatusFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [salRes, loanRes, reimbRes, empRes] = await Promise.all([
        axios.get(`${API}/salary-structures`),
        axios.get(`${API}/loans`),
        axios.get(`${API}/reimbursements`),
        axios.get(`${API}/employees?status=active`)
      ]);
      setSalaryStructures(salRes.data);
      setLoans(loanRes.data);
      setReimbursements(reimbRes.data);
      setEmployees(empRes.data);
    } catch (error) {
      toast.error("Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (empId) => {
    const emp = employees.find(e => e.id === empId);
    return emp ? `${emp.first_name} ${emp.last_name}` : "Unknown";
  };

  const approveReimbursement = async (reimbId) => {
    try {
      await axios.put(`${API}/reimbursements/${reimbId}/approve?approved_by=HR Manager`);
      toast.success("Reimbursement approved");
      fetchData();
    } catch (error) {
      toast.error("Failed to approve");
    }
  };

  const exportSalaryStructures = () => {
    const csv = [
      ["Employee", "CTC Annual", "Basic", "HRA", "Special Allowance", "PF", "PT", "Effective Date"],
      ...salaryStructures.map(s => [
        getEmployeeName(s.employee_id),
        s.ctc_annual,
        s.basic_salary,
        s.hra,
        s.special_allowance,
        s.pf_employee,
        s.professional_tax,
        s.effective_date
      ])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "salary_structures.csv";
    a.click();
    toast.success("Salary structures exported");
  };

  const exportLoans = () => {
    const csv = [
      ["Employee", "Type", "Amount", "EMI", "Balance", "Tenure", "Start Date", "Status"],
      ...loans.map(l => [
        getEmployeeName(l.employee_id),
        l.loan_type,
        l.amount,
        l.emi_amount,
        l.balance_amount,
        l.tenure_months,
        l.start_date,
        l.status
      ])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "loans.csv";
    a.click();
    toast.success("Loans exported");
  };

  const exportReimbursements = () => {
    const csv = [
      ["Employee", "Type", "Amount", "Date", "Description", "Status"],
      ...reimbursements.map(r => [
        getEmployeeName(r.employee_id),
        r.reimbursement_type,
        r.amount,
        r.expense_date,
        r.description,
        r.status
      ])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reimbursements.csv";
    a.click();
    toast.success("Reimbursements exported");
  };

  const filteredSalaryStructures = salaryStructures.filter(s =>
    empFilter === "" || getEmployeeName(s.employee_id).toLowerCase().includes(empFilter.toLowerCase())
  );

  const filteredLoans = loans.filter(l =>
    (loanStatusFilter === "all" || l.status === loanStatusFilter) &&
    (empFilter === "" || getEmployeeName(l.employee_id).toLowerCase().includes(empFilter.toLowerCase()))
  );

  const filteredReimbursements = reimbursements.filter(r =>
    (reimbStatusFilter === "all" || r.status === reimbStatusFilter) &&
    (empFilter === "" || getEmployeeName(r.employee_id).toLowerCase().includes(empFilter.toLowerCase()))
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const totalLoanAmount = loans.reduce((sum, l) => sum + l.balance_amount, 0);
  const pendingReimb = reimbursements.filter(r => r.status === "pending").reduce((sum, r) => sum + r.amount, 0);

  return (
    <div data-testid="payroll-enhanced-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Advanced Payroll Management</h1>
        <p className="text-gray-600">Salary structures, loans, reimbursements & compliance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="hover-card">
          <CardHeader><CardTitle className="text-sm font-medium text-gray-600">Total Active Structures</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{salaryStructures.length}</div></CardContent>
        </Card>
        <Card className="hover-card">
          <CardHeader><CardTitle className="text-sm font-medium text-gray-600">Active Loans Balance</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-red-700">${totalLoanAmount.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="hover-card">
          <CardHeader><CardTitle className="text-sm font-medium text-gray-600">Pending Reimbursements</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-amber-700">${pendingReimb.toLocaleString()}</div></CardContent>
        </Card>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <Filter className="w-4 h-4 text-gray-400" />
        <Input
          placeholder="Filter by employee name..."
          value={empFilter}
          onChange={(e) => setEmpFilter(e.target.value)}
          className="max-w-sm"
          data-testid="employee-filter-input"
        />
      </div>

      <Tabs defaultValue="structures">
        <TabsList>
          <TabsTrigger value="structures" data-testid="structures-tab"><DollarSign className="w-4 h-4 mr-2" />Salary Structures</TabsTrigger>
          <TabsTrigger value="loans" data-testid="loans-tab"><CreditCard className="w-4 h-4 mr-2" />Loans & Advances</TabsTrigger>
          <TabsTrigger value="reimbursements" data-testid="reimbursements-tab"><FileText className="w-4 h-4 mr-2" />Reimbursements</TabsTrigger>
        </TabsList>

        <TabsContent value="structures">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Salary Structures ({filteredSalaryStructures.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={exportSalaryStructures} data-testid="export-salary-btn">
                  <Download className="w-4 h-4 mr-2" />Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Employee</TableHead><TableHead>CTC (Annual)</TableHead><TableHead>Basic</TableHead><TableHead>HRA</TableHead><TableHead>Special Allow.</TableHead><TableHead>PF</TableHead><TableHead>PT</TableHead><TableHead>Effective Date</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSalaryStructures.map((sal) => (
                    <TableRow key={sal.id} data-testid={`salary-row-${sal.id}`}>
                      <TableCell className="font-medium">{getEmployeeName(sal.employee_id)}</TableCell>
                      <TableCell>${sal.ctc_annual.toLocaleString()}</TableCell>
                      <TableCell>${sal.basic_salary.toLocaleString()}</TableCell>
                      <TableCell>${sal.hra.toLocaleString()}</TableCell>
                      <TableCell>${sal.special_allowance.toLocaleString()}</TableCell>
                      <TableCell className="text-red-600">${sal.pf_employee.toLocaleString()}</TableCell>
                      <TableCell className="text-red-600">${sal.professional_tax}</TableCell>
                      <TableCell>{sal.effective_date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle>Active Loans ({filteredLoans.length})</CardTitle>
                  <Select value={loanStatusFilter} onValueChange={setLoanStatusFilter}>
                    <SelectTrigger className="w-36" data-testid="loan-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" onClick={exportLoans} data-testid="export-loans-btn">
                  <Download className="w-4 h-4 mr-2" />Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>EMI</TableHead><TableHead>Balance</TableHead><TableHead>Tenure</TableHead><TableHead>Start Date</TableHead><TableHead>Status</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.map((loan) => (
                    <TableRow key={loan.id} data-testid={`loan-row-${loan.id}`}>
                      <TableCell className="font-medium">{getEmployeeName(loan.employee_id)}</TableCell>
                      <TableCell className="capitalize">{loan.loan_type.replace(/_/g, ' ')}</TableCell>
                      <TableCell>${loan.amount.toLocaleString()}</TableCell>
                      <TableCell>${loan.emi_amount.toLocaleString()}</TableCell>
                      <TableCell className="font-bold text-red-700">${loan.balance_amount.toLocaleString()}</TableCell>
                      <TableCell>{loan.tenure_months} months</TableCell>
                      <TableCell>{loan.start_date}</TableCell>
                      <TableCell><span className={`status-badge ${loan.status === 'active' ? 'status-active' : 'status-inactive'}`}>{loan.status}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reimbursements">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle>Reimbursement Requests ({filteredReimbursements.length})</CardTitle>
                  <Select value={reimbStatusFilter} onValueChange={setReimbStatusFilter}>
                    <SelectTrigger className="w-36" data-testid="reimb-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" onClick={exportReimbursements} data-testid="export-reimb-btn">
                  <Download className="w-4 h-4 mr-2" />Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReimbursements.map((reimb) => (
                    <TableRow key={reimb.id} data-testid={`reimb-row-${reimb.id}`}>
                      <TableCell className="font-medium">{getEmployeeName(reimb.employee_id)}</TableCell>
                      <TableCell className="capitalize">{reimb.reimbursement_type}</TableCell>
                      <TableCell>${reimb.amount.toLocaleString()}</TableCell>
                      <TableCell>{reimb.expense_date}</TableCell>
                      <TableCell className="max-w-xs truncate">{reimb.description}</TableCell>
                      <TableCell>
                        <span className={`status-badge ${
                          reimb.status === 'approved' || reimb.status === 'paid' ? 'status-approved' :
                          reimb.status === 'rejected' ? 'status-rejected' : 'status-pending'
                        }`}>{reimb.status}</span>
                      </TableCell>
                      <TableCell>
                        {reimb.status === 'pending' && (
                          <button onClick={() => approveReimbursement(reimb.id)} className="text-sm text-blue-600 hover:text-blue-700" data-testid={`approve-reimb-${reimb.id}`}>Approve</button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PayrollEnhanced;
