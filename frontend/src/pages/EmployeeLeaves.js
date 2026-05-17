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
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";

const EmployeeLeaves = () => {
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: "casual",
    start_date: "",
    end_date: "",
    days_count: "",
    reason: ""
  });

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    const token = localStorage.getItem("employee_token");
    try {
      const response = await axios.get(`${API}/employee/leaves`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeaves(response.data);
    } catch (error) {
      if (error.response?.status === 401) navigate("/employee/login");
      toast.error("Failed to load leaves");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("employee_token");
    try {
      await axios.post(`${API}/employee/leaves`, {
        ...formData,
        days_count: parseFloat(formData.days_count),
        employee_id: "dummy" // Will be overridden by backend
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Leave request submitted");
      setIsDialogOpen(false);
      setFormData({ leave_type: "casual", start_date: "", end_date: "", days_count: "", reason: "" });
      fetchLeaves();
    } catch (error) {
      toast.error("Failed to submit leave request");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div data-testid="employee-leaves">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Leave Requests</h1>
          <p className="text-gray-600">Apply and track your leave requests</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="apply-leave-btn">
              <Plus className="w-4 h-4 mr-2" />Apply Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Leave Type</Label>
                <Select value={formData.leave_type} onValueChange={(v) => setFormData({...formData, leave_type: v})}>
                  <SelectTrigger data-testid="leave-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="vacation">Vacation</SelectItem>
                    <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date</Label><Input type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} required data-testid="start-date-input" /></div>
                <div><Label>End Date</Label><Input type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} required data-testid="end-date-input" /></div>
              </div>
              <div><Label>Number of Days</Label><Input type="number" step="0.5" value={formData.days_count} onChange={(e) => setFormData({...formData, days_count: e.target.value})} required data-testid="days-input" /></div>
              <div><Label>Reason</Label><Textarea value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} rows={3} required data-testid="reason-input" /></div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" data-testid="submit-leave-btn">Submit</Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle>Leave History ({leaves.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Type</TableHead><TableHead>Start Date</TableHead><TableHead>End Date</TableHead><TableHead>Days</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {leaves.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No leave requests</TableCell></TableRow>
              ) : (
                leaves.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell className="capitalize">{leave.leave_type}</TableCell>
                    <TableCell>{leave.start_date}</TableCell>
                    <TableCell>{leave.end_date}</TableCell>
                    <TableCell>{leave.days_count}</TableCell>
                    <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
                    <TableCell>
                      <span className={`status-badge ${
                        leave.status === 'approved' ? 'status-approved' :
                        leave.status === 'rejected' ? 'status-rejected' : 'status-pending'
                      }`}>{leave.status}</span>
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

export default EmployeeLeaves;
