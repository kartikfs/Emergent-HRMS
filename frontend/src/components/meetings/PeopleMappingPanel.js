import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Users, Link2, ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PeopleMappingPanel() {
  const [unmapped, setUnmapped] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [knownCount, setKnownCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selected, setSelected] = useState(null); // {email, name, count}
  const [pickedEmployeeId, setPickedEmployeeId] = useState("");

  useEffect(() => {
    refresh();
  }, []);

  const authHeaders = () => {
    const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const [unmap, emps] = await Promise.all([
        axios.get(`${API}/meetings/unmapped-participants?limit=20`, { headers: authHeaders() }),
        axios.get(`${API}/employees`, { headers: authHeaders() }),
      ]);
      setUnmapped(unmap.data.unmapped || []);
      setKnownCount(unmap.data.total_known_employees || 0);
      setEmployees(Array.isArray(emps.data) ? emps.data : emps.data.employees || []);
    } catch (e) {
      console.error("Failed to load unmapped participants", e);
    } finally {
      setLoading(false);
    }
  };

  const openLinkDialog = (row) => {
    setSelected(row);
    setPickedEmployeeId("");
    setLinkOpen(true);
  };

  const linkAsAlias = async () => {
    if (!selected || !pickedEmployeeId) return;
    const emp = employees.find((e) => e.id === pickedEmployeeId);
    if (!emp) return;
    const newAliases = [...new Set([...(emp.email_aliases || []), selected.email.toLowerCase()])];
    try {
      await axios.put(
        `${API}/employees/${pickedEmployeeId}/email-aliases`,
        newAliases,
        { headers: { ...authHeaders(), "Content-Type": "application/json" } }
      );
      toast.success(
        `Linked ${selected.email} → ${emp.first_name} ${emp.last_name}. ${selected.count} meetings now visible to them.`
      );
      setLinkOpen(false);
      refresh();
    } catch (e) {
      console.error(e);
      toast.error("Failed to link email alias");
    }
  };

  if (loading || unmapped.length === 0) {
    // Hide entirely when nothing to map
    return null;
  }

  const topCount = unmapped.reduce((s, u) => s + u.count, 0);

  return (
    <Card className="border-amber-200 bg-amber-50/40" data-testid="people-mapping-panel">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {unmapped.length} unmapped meeting participants
              </p>
              <p className="text-xs text-gray-500">
                Across {topCount.toLocaleString()} meeting appearances — link them to
                PeopleHub employees to make meetings visible on their dashboards.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCollapsed(!collapsed)}
            data-testid="toggle-mapping-panel-btn"
          >
            {collapsed ? (
              <>
                Show <ChevronDown className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                Hide <ChevronUp className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>

        {!collapsed && (
          <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
            {unmapped.map((u) => (
              <div
                key={u.email}
                className="flex items-center justify-between p-2 px-3 rounded-md bg-white border"
                data-testid={`unmapped-row-${u.email}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
                    {(u.email || "?")[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {u.name || u.email.split("@")[0]}
                      </p>
                      <Badge variant="outline" className="text-[10px]">
                        {u.count.toLocaleString()} meetings
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openLinkDialog(u)}
                  data-testid={`link-btn-${u.email}`}
                >
                  <Link2 className="w-3 h-3 mr-1" />
                  Link to employee
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link participant email to employee</DialogTitle>
            <DialogDescription>
              The email <code className="bg-gray-100 px-1 rounded">{selected?.email}</code>{" "}
              appears in {selected?.count.toLocaleString()} synced meetings. Pick the
              PeopleHub employee it belongs to — we'll save it as an email alias so
              all their meetings show up on their own dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Select value={pickedEmployeeId} onValueChange={setPickedEmployeeId}>
              <SelectTrigger data-testid="employee-select-trigger">
                <SelectValue placeholder="Select an employee…" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.first_name} {e.last_name} · {e.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setLinkOpen(false)}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button
              onClick={linkAsAlias}
              disabled={!pickedEmployeeId}
              data-testid="confirm-link-btn"
            >
              <UserPlus className="w-4 h-4 mr-1" /> Link as alias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
