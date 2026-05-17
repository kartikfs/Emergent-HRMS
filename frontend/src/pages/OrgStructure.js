import { useState, useEffect } from "react";
import axios from "axios";
import { API, toast } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Building2, MapPin, Briefcase, Download, Upload, Filter } from "lucide-react";

const OrgStructure = () => {
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [isLocDialogOpen, setIsLocDialogOpen] = useState(false);
  const [deptFilter, setDeptFilter] = useState("");
  const [locFilter, setLocFilter] = useState("");
  
  const [deptForm, setDeptForm] = useState({
    name: "", code: "", description: "", cost_center: ""
  });
  
  const [locForm, setLocForm] = useState({
    name: "", code: "", address: "", city: "", state: "", country: "USA", is_head_office: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [deptRes, locRes] = await Promise.all([
        axios.get(`${API}/departments`),
        axios.get(`${API}/locations`)
      ]);
      setDepartments(deptRes.data);
      setLocations(locRes.data);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/departments`, deptForm);
      toast.success("Department created");
      setIsDeptDialogOpen(false);
      setDeptForm({ name: "", code: "", description: "", cost_center: "" });
      fetchData();
    } catch (error) {
      toast.error("Failed to create department");
    }
  };

  const handleCreateLoc = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/locations`, locForm);
      toast.success("Location created");
      setIsLocDialogOpen(false);
      setLocForm({ name: "", code: "", address: "", city: "", state: "", country: "USA", is_head_office: false });
      fetchData();
    } catch (error) {
      toast.error("Failed to create location");
    }
  };

  const exportDepartments = () => {
    const csv = [
      ["Name", "Code", "Cost Center", "Description"],
      ...departments.map(d => [d.name, d.code, d.cost_center || "", d.description || ""])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "departments.csv";
    a.click();
    toast.success("Departments exported");
  };

  const exportLocations = () => {
    const csv = [
      ["Name", "Code", "Address", "City", "State", "Country", "HQ"],
      ...locations.map(l => [l.name, l.code, l.address, l.city, l.state, l.country, l.is_head_office ? "Yes" : "No"])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "locations.csv";
    a.click();
    toast.success("Locations exported");
  };

  const filteredDepartments = departments.filter(d => 
    d.name.toLowerCase().includes(deptFilter.toLowerCase()) ||
    d.code.toLowerCase().includes(deptFilter.toLowerCase())
  );

  const filteredLocations = locations.filter(l =>
    l.name.toLowerCase().includes(locFilter.toLowerCase()) ||
    l.city.toLowerCase().includes(locFilter.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div data-testid="org-structure-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Organizational Structure</h1>
        <p className="text-gray-600">Manage departments, locations, and designations</p>
      </div>

      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments" data-testid="departments-tab">
            <Building2 className="w-4 h-4 mr-2" />Departments
          </TabsTrigger>
          <TabsTrigger value="locations" data-testid="locations-tab">
            <MapPin className="w-4 h-4 mr-2" />Locations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="space-y-4">
          <div className="flex items-center gap-4 justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Filter className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Filter departments..."
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="max-w-xs"
                data-testid="dept-filter-input"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportDepartments} data-testid="export-dept-btn">
                <Download className="w-4 h-4 mr-2" />Export CSV
              </Button>
              <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700" data-testid="add-dept-btn">
                  <Plus className="w-4 h-4 mr-2" />Add Department
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Department</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateDept} className="space-y-4">
                  <div><Label>Name</Label><Input value={deptForm.name} onChange={(e) => setDeptForm({...deptForm, name: e.target.value})} required data-testid="dept-name-input" /></div>
                  <div><Label>Code</Label><Input value={deptForm.code} onChange={(e) => setDeptForm({...deptForm, code: e.target.value})} required data-testid="dept-code-input" /></div>
                  <div><Label>Cost Center</Label><Input value={deptForm.cost_center} onChange={(e) => setDeptForm({...deptForm, cost_center: e.target.value})} data-testid="cost-center-input" /></div>
                  <div><Label>Description</Label><Input value={deptForm.description} onChange={(e) => setDeptForm({...deptForm, description: e.target.value})} data-testid="dept-desc-input" /></div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" data-testid="submit-dept-btn">Create</Button>
                    <Button type="button" variant="outline" onClick={() => setIsDeptDialogOpen(false)} className="flex-1">Cancel</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle>Departments ({filteredDepartments.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Cost Center</TableHead><TableHead>Description</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDepartments.map((dept) => (
                    <TableRow key={dept.id} data-testid={`dept-row-${dept.id}`}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>{dept.code}</TableCell>
                      <TableCell>{dept.cost_center || "-"}</TableCell>
                      <TableCell>{dept.description || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <div className="flex items-center gap-4 justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Filter className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Filter locations..."
                value={locFilter}
                onChange={(e) => setLocFilter(e.target.value)}
                className="max-w-xs"
                data-testid="loc-filter-input"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportLocations} data-testid="export-loc-btn">
                <Download className="w-4 h-4 mr-2" />Export CSV
              </Button>
              <Dialog open={isLocDialogOpen} onOpenChange={setIsLocDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700" data-testid="add-location-btn">
                  <Plus className="w-4 h-4 mr-2" />Add Location
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Location</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateLoc} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Name</Label><Input value={locForm.name} onChange={(e) => setLocForm({...locForm, name: e.target.value})} required data-testid="loc-name-input" /></div>
                    <div><Label>Code</Label><Input value={locForm.code} onChange={(e) => setLocForm({...locForm, code: e.target.value})} required data-testid="loc-code-input" /></div>
                  </div>
                  <div><Label>Address</Label><Input value={locForm.address} onChange={(e) => setLocForm({...locForm, address: e.target.value})} required data-testid="loc-address-input" /></div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label>City</Label><Input value={locForm.city} onChange={(e) => setLocForm({...locForm, city: e.target.value})} required data-testid="loc-city-input" /></div>
                    <div><Label>State</Label><Input value={locForm.state} onChange={(e) => setLocForm({...locForm, state: e.target.value})} required data-testid="loc-state-input" /></div>
                    <div><Label>Country</Label><Input value={locForm.country} onChange={(e) => setLocForm({...locForm, country: e.target.value})} required data-testid="loc-country-input" /></div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" data-testid="submit-location-btn">Create</Button>
                    <Button type="button" variant="outline" onClick={() => setIsLocDialogOpen(false)} className="flex-1">Cancel</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLocations.map((loc) => (
              <Card key={loc.id} className="hover-card" data-testid={`location-card-${loc.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{loc.name}</span>
                    {loc.is_head_office && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">HQ</span>}
                  </CardTitle>
                  <p className="text-sm text-gray-600">{loc.code}</p>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <p><MapPin className="w-3 h-3 inline mr-1 text-gray-400" />{loc.address}</p>
                    <p className="text-gray-600">{loc.city}, {loc.state}, {loc.country}</p>
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

export default OrgStructure;
