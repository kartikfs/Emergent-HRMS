import React, { useState, useEffect } from "react";
import { Users, UserPlus, Shield, Trash2, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function UserManagement() {
  const [users, setUsers] = useState({ admins: [], employees: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, admin, employee
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: "",
    password: "",
    full_name: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");
      if (!token) {
        toast.error("Not authenticated");
        return;
      }
      const response = await axios.get(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    try {
      const response = await axios.post(`${API}/auth/admin/signup`, newAdmin);
      toast.success("Admin created successfully!");
      setShowAddAdminDialog(false);
      setNewAdmin({ email: "", password: "", full_name: "" });
      fetchUsers();
    } catch (error) {
      console.error("Error creating admin:", error);
      toast.error(error.response?.data?.detail || "Failed to create admin");
    }
  };

  const handleDeleteAdmin = async (adminId, adminName) => {
    if (!window.confirm(`Are you sure you want to delete admin: ${adminName}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("admin_token");
      await axios.delete(`${API}/admin/${adminId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Admin deleted successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error deleting admin:", error);
      toast.error(error.response?.data?.detail || "Failed to delete admin");
    }
  };

  // Filter and search users
  const filteredUsers = () => {
    let allUsers = [];
    
    if (filterType === "all" || filterType === "admin") {
      allUsers = [...allUsers, ...users.admins];
    }
    if (filterType === "all" || filterType === "employee") {
      allUsers = [...allUsers, ...users.employees];
    }

    if (searchTerm) {
      return allUsers.filter((user) => {
        const searchLower = searchTerm.toLowerCase();
        const email = user.email?.toLowerCase() || "";
        const fullName = user.full_name?.toLowerCase() || "";
        const firstName = user.first_name?.toLowerCase() || "";
        const lastName = user.last_name?.toLowerCase() || "";
        
        return (
          email.includes(searchLower) ||
          fullName.includes(searchLower) ||
          firstName.includes(searchLower) ||
          lastName.includes(searchLower)
        );
      });
    }

    return allUsers;
  };

  const displayUsers = filteredUsers();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage administrators and employee accounts</p>
        </div>
        
        <Dialog open={showAddAdminDialog} onOpenChange={setShowAddAdminDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <UserPlus className="w-4 h-4 mr-2" />
              Add New Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Administrator</DialogTitle>
              <DialogDescription>
                Add a new admin user who will have full access to the system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  placeholder="John Doe"
                  value={newAdmin.full_name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@peoplehub.com"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter secure password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddAdminDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddAdmin}
                disabled={!newAdmin.email || !newAdmin.password || !newAdmin.full_name}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Admin
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{users.total_users || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Administrators</p>
                <p className="text-2xl font-bold text-gray-900">{users.total_admins || 0}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Employees</p>
                <p className="text-2xl font-bold text-gray-900">{users.total_employees || 0}</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                onClick={() => setFilterType("all")}
                className={filterType === "all" ? "bg-blue-600" : ""}
              >
                All Users
              </Button>
              <Button
                variant={filterType === "admin" ? "default" : "outline"}
                onClick={() => setFilterType("admin")}
                className={filterType === "admin" ? "bg-blue-600" : ""}
              >
                Admins
              </Button>
              <Button
                variant={filterType === "employee" ? "default" : "outline"}
                onClick={() => setFilterType("employee")}
                className={filterType === "employee" ? "bg-blue-600" : ""}
              >
                Employees
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({displayUsers.length})</CardTitle>
          <CardDescription>All registered users in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : displayUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={user.user_type === "admin" ? "default" : "secondary"}>
                          {user.user_type === "admin" ? (
                            <><Shield className="w-3 h-3 mr-1 inline" />Admin</>
                          ) : (
                            <><Users className="w-3 h-3 mr-1 inline" />Employee</>
                          )}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={user.status === "active" || user.user_type === "admin" ? "success" : "destructive"}>
                          {user.status || "active"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {user.user_type === "admin" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAdmin(user.id, user.full_name)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
