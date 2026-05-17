import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, toast } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock } from "lucide-react";

const EmployeeAttendance = () => {
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    const token = localStorage.getItem("employee_token");
    try {
      const response = await axios.get(`${API}/employee/attendance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendance(response.data);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      if (error.response?.status === 401) {
        navigate("/employee/login");
      }
      toast.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  return (
    <div data-testid="employee-attendance">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Attendance</h1>
        <p className="text-gray-600">View your attendance history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Records ({attendance.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No attendance records</TableCell></TableRow>
              ) : (
                attendance.map((record) => {
                  const checkIn = new Date(`2000-01-01 ${record.check_in}`);
                  const checkOut = record.check_out ? new Date(`2000-01-01 ${record.check_out}`) : null;
                  const hours = checkOut ? ((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(1) : '-';
                  
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.date}</TableCell>
                      <TableCell><div className="flex items-center gap-2"><Clock className="w-3 h-3 text-gray-400" />{record.check_in}</div></TableCell>
                      <TableCell>{record.check_out || "-"}</TableCell>
                      <TableCell>{hours} hrs</TableCell>
                      <TableCell>
                        <span className={`status-badge ${
                          record.status === 'present' ? 'status-active' :
                          record.status === 'absent' ? 'status-rejected' : 'status-pending'
                        }`}>{record.status}</span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeAttendance;
