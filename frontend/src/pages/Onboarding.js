import { useState, useEffect } from "react";
import axios from "axios";
import { API, toast } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CheckCircle, Clock, Circle } from "lucide-react";

const Onboarding = () => {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    task_title: "",
    task_description: "",
    due_date: "",
    assigned_to: "HR Team"
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tasksRes, employeesRes] = await Promise.all([
        axios.get(`${API}/onboarding-tasks`),
        axios.get(`${API}/employees?status=active`)
      ]);
      setTasks(tasksRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load onboarding data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/onboarding-tasks`, formData);
      toast.success("Onboarding task created successfully");
      setIsDialogOpen(false);
      setFormData({
        employee_id: "",
        task_title: "",
        task_description: "",
        due_date: "",
        assigned_to: "HR Team"
      });
      fetchData();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    }
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await axios.put(`${API}/onboarding-tasks/${taskId}/status`, {
        status: newStatus
      });
      toast.success("Task status updated");
      fetchData();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const getEmployeeName = (empId) => {
    const emp = employees.find(e => e.id === empId);
    return emp ? `${emp.first_name} ${emp.last_name}` : "Unknown";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const groupedTasks = employees.map(emp => ({
    employee: emp,
    tasks: tasks.filter(t => t.employee_id === emp.id)
  })).filter(group => group.tasks.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div data-testid="onboarding-page">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Onboarding</h1>
          <p className="text-gray-600">Track and manage employee onboarding process</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="create-task-btn">
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Onboarding Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Employee</Label>
                <Select value={formData.employee_id} onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))} required>
                  <SelectTrigger data-testid="task-employee-select">
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
                <Label>Task Title</Label>
                <Input 
                  value={formData.task_title} 
                  onChange={(e) => setFormData(prev => ({ ...prev, task_title: e.target.value }))}
                  placeholder="e.g., Complete HR paperwork"
                  required
                  data-testid="task-title-input"
                />
              </div>

              <div>
                <Label>Task Description</Label>
                <Textarea 
                  value={formData.task_description} 
                  onChange={(e) => setFormData(prev => ({ ...prev, task_description: e.target.value }))}
                  placeholder="Describe the task in detail"
                  rows={3}
                  required
                  data-testid="task-description-input"
                />
              </div>

              <div>
                <Label>Due Date</Label>
                <Input 
                  type="date"
                  value={formData.due_date} 
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  required
                  data-testid="task-due-date-input"
                />
              </div>

              <div>
                <Label>Assigned To</Label>
                <Input 
                  value={formData.assigned_to} 
                  onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                  required
                  data-testid="task-assigned-to-input"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" data-testid="submit-task-btn">
                  Create Task
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {groupedTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No onboarding tasks found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedTasks.map(group => (
            <Card key={group.employee.id} className="hover-card" data-testid={`onboarding-card-${group.employee.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">
                      {group.employee.first_name} {group.employee.last_name}
                    </h3>
                    <p className="text-sm font-normal text-gray-600 mt-1">
                      {group.employee.position} • {group.employee.department}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      {group.tasks.filter(t => t.status === 'completed').length} / {group.tasks.length} completed
                    </div>
                    <div className="w-32 h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                        style={{ width: `${(group.tasks.filter(t => t.status === 'completed').length / group.tasks.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {group.tasks.map(task => (
                    <div 
                      key={task.id} 
                      className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                      data-testid={`task-item-${task.id}`}
                    >
                      <div className="mt-1">
                        {getStatusIcon(task.status)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{task.task_title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{task.task_description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>Due: {task.due_date}</span>
                          <span>•</span>
                          <span>Assigned to: {task.assigned_to}</span>
                        </div>
                      </div>
                      <div>
                        <Select 
                          value={task.status} 
                          onValueChange={(value) => handleStatusUpdate(task.id, value)}
                        >
                          <SelectTrigger className="w-36" data-testid={`task-status-select-${task.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Onboarding;
