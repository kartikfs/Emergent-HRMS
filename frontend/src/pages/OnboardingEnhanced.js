import { useState, useEffect } from "react";
import axios from "axios";
import { API, toast } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Laptop, Award, Calendar, Download, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const OnboardingEnhanced = () => {
  const [templates, setTemplates] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [probationReviews, setProbationReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [empFilter, setEmpFilter] = useState("");
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState("all");
  const [trainingStatusFilter, setTrainingStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [templateSearch, setTemplateSearch] = useState("");
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [trainingSearch, setTrainingSearch] = useState("");
  const [probationSearch, setProbationSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tmpRes, eqRes, trnRes, probRes, empRes] = await Promise.all([
        axios.get(`${API}/onboarding-templates`),
        axios.get(`${API}/equipment-assignments`),
        axios.get(`${API}/training-assignments`),
        axios.get(`${API}/probation-reviews`),
        axios.get(`${API}/employees?status=active`)
      ]);
      setTemplates(tmpRes.data);
      setEquipment(eqRes.data);
      setTrainings(trnRes.data);
      setProbationReviews(probRes.data);
      setEmployees(empRes.data);
    } catch (error) {
      toast.error("Failed to load onboarding data");
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (empId) => {
    const emp = employees.find(e => e.id === empId);
    return emp ? `${emp.first_name} ${emp.last_name}` : "Unknown";
  };

  const exportEquipment = () => {
    const csv = [
      ["Employee", "Type", "Equipment ID", "Brand/Model", "Serial Number", "Assigned Date", "Status"],
      ...equipment.map(e => [
        getEmployeeName(e.employee_id),
        e.equipment_type,
        e.equipment_id,
        e.brand_model || "",
        e.serial_number || "",
        e.assigned_date,
        e.status
      ])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "equipment_assignments.csv";
    a.click();
    toast.success("Equipment data exported");
  };

  const exportTrainings = () => {
    const csv = [
      ["Employee", "Module", "Assigned Date", "Due Date", "Status", "Score"],
      ...trainings.map(t => [
        getEmployeeName(t.employee_id),
        t.training_module_id,
        t.assigned_date,
        t.due_date,
        t.status,
        t.score || ""
      ])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "training_assignments.csv";
    a.click();
    toast.success("Training data exported");
  };

  const filteredTemplates = templates.filter(t =>
    (deptFilter === "all" || t.department === deptFilter) &&
    (templateSearch === "" || t.template_name.toLowerCase().includes(templateSearch.toLowerCase()) || 
     t.role.toLowerCase().includes(templateSearch.toLowerCase()))
  );

  const filteredEquipment = equipment.filter(e =>
    (equipmentTypeFilter === "all" || e.equipment_type === equipmentTypeFilter) &&
    (equipmentSearch === "" || 
     getEmployeeName(e.employee_id).toLowerCase().includes(equipmentSearch.toLowerCase()) ||
     e.equipment_type.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
     (e.equipment_id && e.equipment_id.toLowerCase().includes(equipmentSearch.toLowerCase())) ||
     (e.brand_model && e.brand_model.toLowerCase().includes(equipmentSearch.toLowerCase())))
  );

  const filteredTrainings = trainings.filter(t =>
    (trainingStatusFilter === "all" || t.status === trainingStatusFilter) &&
    (trainingSearch === "" || 
     getEmployeeName(t.employee_id).toLowerCase().includes(trainingSearch.toLowerCase()) ||
     t.training_module_id.toLowerCase().includes(trainingSearch.toLowerCase()))
  );

  const filteredProbationReviews = probationReviews.filter(p =>
    probationSearch === "" || 
    getEmployeeName(p.employee_id).toLowerCase().includes(probationSearch.toLowerCase())
  );

  const uniqueDepartments = [...new Set(templates.map(t => t.department))];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div data-testid="onboarding-enhanced-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Enhanced Onboarding Management</h1>
        <p className="text-gray-600">Templates, equipment, training & probation tracking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="hover-card">
          <CardHeader><CardTitle className="text-sm font-medium text-gray-600">Active Templates</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{templates.length}</div></CardContent>
        </Card>
        <Card className="hover-card">
          <CardHeader><CardTitle className="text-sm font-medium text-gray-600">Equipment Assigned</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{equipment.length}</div></CardContent>
        </Card>
        <Card className="hover-card">
          <CardHeader><CardTitle className="text-sm font-medium text-gray-600">Training Assignments</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{trainings.length}</div></CardContent>
        </Card>
        <Card className="hover-card">
          <CardHeader><CardTitle className="text-sm font-medium text-gray-600">Probation Reviews</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{probationReviews.length}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates" data-testid="templates-tab"><ClipboardList className="w-4 h-4 mr-2" />Templates</TabsTrigger>
          <TabsTrigger value="equipment" data-testid="equipment-tab"><Laptop className="w-4 h-4 mr-2" />Equipment</TabsTrigger>
          <TabsTrigger value="training" data-testid="training-tab"><Award className="w-4 h-4 mr-2" />Training</TabsTrigger>
          <TabsTrigger value="probation" data-testid="probation-tab"><Calendar className="w-4 h-4 mr-2" />Probation</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <div className="mb-4 flex items-center gap-4">
            <Filter className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by template name or role..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className="max-w-sm"
              data-testid="template-search-input"
            />
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-48" data-testid="dept-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {uniqueDepartments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTemplates.map((tmpl) => (
              <Card key={tmpl.id} className="hover-card" data-testid={`template-card-${tmpl.id}`}>
                <CardHeader>
                  <CardTitle>{tmpl.template_name}</CardTitle>
                  <p className="text-sm text-gray-600">{tmpl.department} • {tmpl.role}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Tasks ({tmpl.tasks.length}):</p>
                    {tmpl.tasks.map((task, idx) => (
                      <div key={idx} className="text-sm bg-gray-50 p-2 rounded">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-gray-600 text-xs">Due: Day {task.due_days} • {task.assigned_to}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="equipment">
          <div className="mb-4 flex items-center gap-4">
            <Filter className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by employee, device type, or equipment ID..."
              value={equipmentSearch}
              onChange={(e) => setEquipmentSearch(e.target.value)}
              className="max-w-md"
              data-testid="equipment-search-input"
            />
          </div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle>Equipment Assignments ({filteredEquipment.length})</CardTitle>
                  <Select value={equipmentTypeFilter} onValueChange={setEquipmentTypeFilter}>
                    <SelectTrigger className="w-36" data-testid="equipment-type-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="laptop">Laptop</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="access_card">Access Card</SelectItem>
                      <SelectItem value="id_card">ID Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" onClick={exportEquipment} data-testid="export-equipment-btn">
                  <Download className="w-4 h-4 mr-2" />Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Equipment ID</TableHead><TableHead>Brand/Model</TableHead><TableHead>Serial Number</TableHead><TableHead>Assigned Date</TableHead><TableHead>Status</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipment.map((eq) => (
                    <TableRow key={eq.id} data-testid={`equipment-row-${eq.id}`}>
                      <TableCell className="font-medium">{getEmployeeName(eq.employee_id)}</TableCell>
                      <TableCell className="capitalize">{eq.equipment_type}</TableCell>
                      <TableCell>{eq.equipment_id}</TableCell>
                      <TableCell>{eq.brand_model || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{eq.serial_number || "-"}</TableCell>
                      <TableCell>{eq.assigned_date}</TableCell>
                      <TableCell><span className={`status-badge ${eq.status === 'assigned' ? 'status-active' : 'status-inactive'}`}>{eq.status}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training">
          <div className="mb-4 flex items-center gap-4">
            <Filter className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by employee or training module..."
              value={trainingSearch}
              onChange={(e) => setTrainingSearch(e.target.value)}
              className="max-w-md"
              data-testid="training-search-input"
            />
          </div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle>Training Assignments ({filteredTrainings.length})</CardTitle>
                  <Select value={trainingStatusFilter} onValueChange={setTrainingStatusFilter}>
                    <SelectTrigger className="w-36" data-testid="training-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" onClick={exportTrainings} data-testid="export-training-btn">
                  <Download className="w-4 h-4 mr-2" />Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Employee</TableHead><TableHead>Module</TableHead><TableHead>Assigned</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead><TableHead>Score</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrainings.map((trn) => (
                    <TableRow key={trn.id} data-testid={`training-row-${trn.id}`}>
                      <TableCell className="font-medium">{getEmployeeName(trn.employee_id)}</TableCell>
                      <TableCell>{trn.training_module_id}</TableCell>
                      <TableCell>{trn.assigned_date}</TableCell>
                      <TableCell>{trn.due_date}</TableCell>
                      <TableCell><span className={`status-badge ${trn.status === 'completed' ? 'status-active' : trn.status === 'in_progress' ? 'status-pending' : 'status-inactive'}`}>{trn.status}</span></TableCell>
                      <TableCell>{trn.score ? `${trn.score.toFixed(1)}%` : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="probation">
          <div className="mb-4 flex items-center gap-4">
            <Filter className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by employee name..."
              value={probationSearch}
              onChange={(e) => setProbationSearch(e.target.value)}
              className="max-w-sm"
              data-testid="probation-search-input"
            />
          </div>
          <div className="grid grid-cols-1 gap-6">
            {filteredProbationReviews.map((review) => (
              <Card key={review.id} className="hover-card" data-testid={`probation-card-${review.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{getEmployeeName(review.employee_id)}</span>
                    <span className="text-sm font-normal text-gray-600">{review.review_date}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <p className="text-xs text-gray-600">Performance</p>
                      <p className="text-2xl font-bold text-blue-700">{review.performance_rating.toFixed(1)}</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded">
                      <p className="text-xs text-gray-600">Attendance</p>
                      <p className="text-2xl font-bold text-green-700">{review.attendance_rating.toFixed(1)}</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded">
                      <p className="text-xs text-gray-600">Behavior</p>
                      <p className="text-2xl font-bold text-purple-700">{review.behavior_rating.toFixed(1)}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div><p className="font-medium">Strengths:</p><p className="text-gray-600">{review.strengths}</p></div>
                    <div><p className="font-medium">Areas of Improvement:</p><p className="text-gray-600">{review.areas_of_improvement}</p></div>
                    <div><p className="font-medium">Recommendation:</p><span className={`status-badge ${review.recommendation === 'confirm' ? 'status-active' : 'status-pending'}`}>{review.recommendation}</span></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OnboardingEnhanced;
