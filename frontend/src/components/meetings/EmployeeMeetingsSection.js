import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  FileText,
  Clock,
  Users,
  Calendar,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function EmployeeMeetingsSection({ employeeId }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [aliasInput, setAliasInput] = useState("");
  const [savingAlias, setSavingAlias] = useState(false);

  useEffect(() => {
    if (!employeeId) return;
    fetchMeetings();
    fetchEmployee();
    // eslint-disable-next-line
  }, [employeeId]);

  const authHeaders = () => {
    const token =
      localStorage.getItem("admin_token") || localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  const fetchEmployee = async () => {
    try {
      const res = await axios.get(`${API}/employees/${employeeId}`, { headers: authHeaders() });
      setEmployee(res.data);
    } catch (error) {
      // 403/404 in non-admin context is expected — surface anything else
      if (error?.response?.status !== 404 && error?.response?.status !== 403) {
        console.error("Failed to fetch employee:", error);
      }
    }
  };

  const addAlias = async () => {
    const value = aliasInput.trim().toLowerCase();
    if (!value || !value.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    const next = Array.from(new Set([...(employee?.email_aliases || []), value]));
    setSavingAlias(true);
    try {
      await axios.put(
        `${API}/employees/${employeeId}/email-aliases`,
        next,
        { headers: { ...authHeaders(), "Content-Type": "application/json" } }
      );
      toast.success(`Added alias ${value}. Meetings will appear shortly.`);
      setAliasInput("");
      setEmployee({ ...employee, email_aliases: next });
      fetchMeetings();
    } catch (e) {
      toast.error("Failed to add alias");
    } finally {
      setSavingAlias(false);
    }
  };

  const removeAlias = async (alias) => {
    const next = (employee?.email_aliases || []).filter((a) => a !== alias);
    try {
      await axios.put(
        `${API}/employees/${employeeId}/email-aliases`,
        next,
        { headers: { ...authHeaders(), "Content-Type": "application/json" } }
      );
      toast.success(`Removed alias ${alias}`);
      setEmployee({ ...employee, email_aliases: next });
      fetchMeetings();
    } catch (e) {
      toast.error("Failed to remove alias");
    }
  };

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const token =
        localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await axios.get(`${API}/employees/${employeeId}/meetings?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (e) {
      console.error("Error loading employee meetings:", e);
      toast.error("Failed to load meetings for this employee");
    } finally {
      setLoading(false);
    }
  };  const formatHours = (mins) => {
    if (!mins) return "0h";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const stats = data?.stats || {
    total_meetings: 0,
    total_duration_minutes: 0,
    avg_duration_minutes: 0,
    top_meeting_partners: [],
  };
  const meetings = data?.meetings || [];

  return (
    <Card className="lg:col-span-3" data-testid="employee-meetings-section">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Video className="w-5 h-5 text-purple-600" />
          Recent Meetings
          {stats.total_meetings > 0 && (
            <Badge variant="outline" className="ml-1 text-xs">
              {data?.total ?? stats.total_meetings}
            </Badge>
          )}
        </CardTitle>
        <Button
          size="sm"
          variant="ghost"
          onClick={fetchMeetings}
          disabled={loading}
          data-testid="employee-meetings-refresh-btn"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {/* Email Aliases editor */}
        <div className="mb-4 p-3 rounded-lg border bg-amber-50/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Email Aliases ({(employee?.email_aliases || []).length})
            </p>
            <p className="text-[10px] text-gray-500">
              Add other emails this person uses in Attio / Fireflies to see their meetings here
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(employee?.email_aliases || []).map((a) => (
              <Badge
                key={a}
                variant="outline"
                className="bg-white text-amber-700 border-amber-300 pl-2 pr-1 py-0 gap-1"
                data-testid={`alias-${a}`}
              >
                {a}
                <button
                  className="ml-1 hover:text-red-500"
                  onClick={() => removeAlias(a)}
                  data-testid={`remove-alias-${a}`}
                >
                  ✕
                </button>
              </Badge>
            ))}
            {(employee?.email_aliases || []).length === 0 && (
              <span className="text-xs text-gray-400">No aliases yet.</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAlias()}
              placeholder="name@company.com"
              className="flex-1 px-2 py-1 text-sm border rounded"
              data-testid="alias-input"
            />
            <Button
              size="sm"
              onClick={addAlias}
              disabled={savingAlias || !aliasInput.trim()}
              data-testid="add-alias-btn"
            >
              Add alias
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatTile
            icon={<Calendar className="w-4 h-4 text-blue-600" />}
            label="Meetings"
            value={data?.total ?? stats.total_meetings}
          />
          <StatTile
            icon={<Clock className="w-4 h-4 text-purple-600" />}
            label="Total time"
            value={formatHours(stats.total_duration_minutes)}
          />
          <StatTile
            icon={<TrendingUp className="w-4 h-4 text-green-600" />}
            label="Avg duration"
            value={`${stats.avg_duration_minutes || 0}m`}
          />
          <StatTile
            icon={<Users className="w-4 h-4 text-orange-600" />}
            label="Top partners"
            value={stats.top_meeting_partners?.length || 0}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Meeting list */}
          <div className="lg:col-span-2 space-y-2">
            {loading ? (
              <div className="text-center py-6 text-sm text-gray-500">
                Loading meetings…
              </div>
            ) : meetings.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-lg">
                <Calendar className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-600 font-medium">
                  No meetings on record
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  This employee hasn't participated in any synced meetings yet.
                </p>
              </div>
            ) : (
              meetings.slice(0, 8).map((m) => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/meetings/${m.id}`)}
                  className="group w-full text-left flex items-center gap-3 p-3 rounded-lg border hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                  data-testid={`employee-meeting-item-${m.id}`}
                >
                  <div
                    className="w-1 h-10 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor:
                        m.source === "fireflies" ? "#10b981" : "#3b82f6",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                        {m.title}
                      </p>
                      {(m.source === "attio" || m.source === "both") && (
                        <Badge className="bg-blue-500 hover:bg-blue-500 text-white text-[9px] px-1.5 py-0">
                          Attio
                        </Badge>
                      )}
                      {(m.source === "fireflies" || m.source === "both") && (
                        <Badge className="bg-green-500 hover:bg-green-500 text-white text-[9px] px-1.5 py-0">
                          Fireflies
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                      <span>{formatDate(m.start_time)}</span>
                      {m.duration_minutes ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {m.duration_minutes}m
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {m.participants?.length || 0}
                      </span>
                      {m.has_recording && (
                        <span className="text-purple-600 inline-flex items-center gap-1">
                          <Video className="w-3 h-3" /> Recording
                        </span>
                      )}
                      {m.has_transcript && (
                        <span className="text-blue-600 inline-flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Transcript
                        </span>
                      )}
                      {m.action_items_count > 0 && (
                        <span className="text-orange-600 inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {m.action_items_count}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                </button>
              ))
            )}

            {meetings.length > 8 && (
              <div className="text-center pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    navigate(
                      `/meetings?participant_email=${encodeURIComponent(
                        meetings[0]?.participants?.find?.(
                          (p) => p.email?.includes("@")
                        )?.email || ""
                      )}`
                    )
                  }
                  data-testid="view-all-meetings-btn"
                >
                  View all {data?.total || meetings.length} meetings →
                </Button>
              </div>
            )}
          </div>

          {/* Top partners */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Top collaborators
            </h4>
            {stats.top_meeting_partners?.length > 0 ? (
              <div className="space-y-1.5">
                {stats.top_meeting_partners.map((p, i) => (
                  <div
                    key={p.email}
                    className="flex items-center gap-2 p-2 rounded-md bg-gray-50"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[10px] font-semibold flex items-center justify-center">
                      {(p.email || "?")[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {p.email?.split("@")[0]}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {p.email}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {p.count}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No collaborator data yet.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatTile({ icon, label, value }) {
  return (
    <div className="border rounded-lg p-3 bg-gradient-to-br from-white to-gray-50">
      <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}
