import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, toast } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, MapPin, Calendar, Briefcase, Edit2, Save, X } from "lucide-react";

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    phone: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: ""
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const token = localStorage.getItem("employee_token");
    try {
      const response = await axios.get(`${API}/employee/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployee(response.data);
      setFormData({
        phone: response.data.phone || "",
        address: response.data.address || "",
        emergency_contact_name: response.data.emergency_contact_name || "",
        emergency_contact_phone: response.data.emergency_contact_phone || ""
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      if (error.response?.status === 401) {
        navigate("/employee/login");
      }
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    const token = localStorage.getItem("employee_token");
    try {
      const response = await axios.put(`${API}/employee/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployee(response.data);
      localStorage.setItem("employee_data", JSON.stringify(response.data));
      toast.success("Profile updated successfully");
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div data-testid="employee-profile">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">View and update your personal information</p>
        </div>
        {!editing && (
          <Button
            onClick={() => setEditing(true)}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="edit-profile-btn"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      {employee && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">First Name</Label>
                  <p className="font-medium">{employee.first_name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Last Name</Label>
                  <p className="font-medium">{employee.last_name}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Date of Birth</Label>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    {employee.date_of_birth}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Gender</Label>
                  <p className="font-medium">{employee.gender}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm text-gray-600">Email</Label>
                <p className="font-medium flex items-center gap-2">
                  <Mail className="w-3 h-3 text-gray-400" />
                  {employee.email}
                </p>
              </div>

              <div>
                <Label className="text-sm text-gray-600">Phone</Label>
                {editing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    data-testid="phone-input"
                  />
                ) : (
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="w-3 h-3 text-gray-400" />
                    {employee.phone}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm text-gray-600">Address</Label>
                {editing ? (
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    data-testid="address-input"
                  />
                ) : (
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    {employee.address}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Job Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Job Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Employee ID</Label>
                  <p className="font-medium">{employee.id.substring(0, 12)}...</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Status</Label>
                  <span className="status-badge status-active">{employee.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Department</Label>
                  <p className="font-medium">{employee.department}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Position</Label>
                  <p className="font-medium">{employee.position}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Employment Type</Label>
                  <p className="font-medium">{employee.employment_type}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Join Date</Label>
                  <p className="font-medium">{employee.join_date}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Name</Label>
                  {editing ? (
                    <Input
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                      data-testid="emergency-name-input"
                    />
                  ) : (
                    <p className="font-medium">{employee.emergency_contact_name || "-"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Phone</Label>
                  {editing ? (
                    <Input
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                      data-testid="emergency-phone-input"
                    />
                  ) : (
                    <p className="font-medium">{employee.emergency_contact_phone || "-"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {editing && (
        <div className="fixed bottom-8 right-8 flex gap-2">
          <Button
            onClick={handleUpdate}
            className="bg-green-600 hover:bg-green-700"
            data-testid="save-profile-btn"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEditing(false);
              fetchProfile();
            }}
            data-testid="cancel-edit-btn"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfile;
