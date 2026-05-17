import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, toast } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText } from "lucide-react";

const EmployeePayslips = () => {
  const navigate = useNavigate();
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayslips();
  }, []);

  const fetchPayslips = async () => {
    const token = localStorage.getItem("employee_token");
    try {
      const response = await axios.get(`${API}/employee/payslips`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayslips(response.data);
    } catch (error) {
      if (error.response?.status === 401) navigate("/employee/login");
      toast.error("Failed to load payslips");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div data-testid="employee-payslips">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Payslips</h1>
        <p className="text-gray-600">View and download your salary slips</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-gray-600">Total Payslips</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{payslips.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-gray-600">Latest Month</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{payslips[0]?.month || "-"}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-gray-600">Latest Net Pay</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-green-700">${payslips[0]?.net_salary?.toLocaleString() || 0}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Payslip History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Month</TableHead><TableHead>Basic Salary</TableHead><TableHead>Allowances</TableHead><TableHead>Deductions</TableHead><TableHead>Tax</TableHead><TableHead>Net Salary</TableHead><TableHead>Payment Date</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {payslips.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">No payslips found</TableCell></TableRow>
              ) : (
                payslips.map((slip) => (
                  <TableRow key={slip.id}>
                    <TableCell className="font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" />{slip.month}</TableCell>
                    <TableCell>${slip.basic_salary.toLocaleString()}</TableCell>
                    <TableCell className="text-green-600">+${slip.allowances.toLocaleString()}</TableCell>
                    <TableCell className="text-red-600">-${slip.deductions.toLocaleString()}</TableCell>
                    <TableCell className="text-red-600">-${slip.tax.toLocaleString()}</TableCell>
                    <TableCell className="font-bold">${slip.net_salary.toLocaleString()}</TableCell>
                    <TableCell>{slip.payment_date}</TableCell>
                    <TableCell><span className={`status-badge ${slip.payment_status === 'paid' ? 'status-approved' : 'status-pending'}`}>{slip.payment_status}</span></TableCell>
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

export default EmployeePayslips;
