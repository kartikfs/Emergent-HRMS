import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, Video, Users, Clock, TrendingUp, Filter, Search, RefreshCw, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import axios from "axios";
import MeetingCard from "@/components/meetings/MeetingCard";
import MeetingDetailDrawer from "@/components/meetings/MeetingDetailDrawer";
import MeetingFilters from "@/components/meetings/MeetingFilters";
import MeetingsTimeline from "@/components/meetings/MeetingsTimeline";
import PeopleMappingPanel from "@/components/meetings/PeopleMappingPanel";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function MeetingsHub() {
  const navigate = useNavigate();
  const { meetingId: routeMeetingId } = useParams();
  const [activeTab, setActiveTab] = useState("all");
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [filters, setFilters] = useState({
    start_date: null,
    end_date: null,
    participant_email: "",
    keyword: "",
    source: "all",
    has_recording: null,
    has_action_items: null,
    sort_by: "start_time",
    sort_order: "desc",
    time_range: "past",  // past | upcoming | all
    limit: 500,
    offset: 0
  });

  const [stats, setStats] = useState({
    total: 0,
    attio: 0,
    fireflies: 0,
    with_recordings: 0
  });

  useEffect(() => {
    fetchSyncStatus();
    fetchMeetings();
  }, [activeTab, filters]);

  useEffect(() => {
    // Global stats are independent of the active tab
    fetchGlobalStats();
  }, []);

  // Deep-link: if /meetings/:meetingId is in the URL, fetch that meeting and
  // open the drawer for it.
  useEffect(() => {
    if (!routeMeetingId) return;
    if (selectedMeeting && selectedMeeting.id === routeMeetingId) return;
    const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
    axios
      .get(`${API}/meetings/${routeMeetingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setSelectedMeeting(res.data))
      .catch((err) => {
        if (err?.response?.status === 404) {
          toast.error("Meeting not found");
        } else if (err?.response?.status === 403) {
          toast.error("You don't have access to this meeting");
        } else {
          toast.error("Failed to load meeting");
        }
        navigate("/meetings", { replace: true });
      });
  }, [routeMeetingId]); // eslint-disable-line

  const openMeeting = (m) => {
    setSelectedMeeting(m);
    navigate(`/meetings/${m.id}`, { replace: false });
  };

  const closeMeeting = () => {
    setSelectedMeeting(null);
    if (routeMeetingId) navigate("/meetings", { replace: false });
  };

  const fetchSyncStatus = async () => {
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const response = await axios.get(`${API}/meetings/sync-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSyncStatus(response.data);
    } catch (error) {
      console.error("Error fetching sync status:", error);
    }
  };

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      
      let endpoint = `${API}/meetings`;
      if (activeTab === "attio") {
        endpoint = `${API}/meetings/attio`;
      } else if (activeTab === "fireflies") {
        endpoint = `${API}/meetings/fireflies`;
      } else if (activeTab === "timeline") {
        // Timeline always shows all meetings (large window)
        endpoint = `${API}/meetings`;
      }

      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== "" && filters[key] !== "all") {
          params.append(key, filters[key]);
        }
      });
      if (activeTab === "timeline") {
        // Override pagination for calendar
        params.set("limit", "500");
        params.set("offset", "0");
      }

      const response = await axios.get(`${endpoint}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMeetings(response.data.meetings || []);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      toast.error("Failed to fetch meetings");
    } finally {
      setLoading(false);
    }
  };

  // Stats are GLOBAL (across all sources, all time ranges) — fetched from a
  // separate API so they don't change when the user switches tabs/time-range.
  // The TOTAL here matches the sync banner; per-time-range breakdown is
  // displayed separately.
  const fetchGlobalStats = async () => {
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const tr = "time_range=all";
      const [allRes, attioRes, ffRes, pastRes, upRes, recRes] = await Promise.all([
        axios.get(`${API}/meetings?limit=1&${tr}`, { headers }),
        axios.get(`${API}/meetings/attio?limit=1&${tr}`, { headers }),
        axios.get(`${API}/meetings/fireflies?limit=1&${tr}`, { headers }),
        axios.get(`${API}/meetings?limit=1&time_range=past`, { headers }),
        axios.get(`${API}/meetings?limit=1&time_range=upcoming`, { headers }),
        axios.get(`${API}/meetings?limit=1&${tr}&has_recording=true`, { headers }),
      ]);
      setStats({
        total: allRes.data.total || 0,
        attio: attioRes.data.total || 0,
        fireflies: ffRes.data.total || 0,
        past: pastRes.data.total || 0,
        upcoming: upRes.data.total || 0,
        with_recordings: recRes.data.total || 0,
      });
    } catch (error) {
      console.error("Error fetching global stats:", error);
    }
  };

  const handleSync = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        toast.error("Admin access required for sync");
        return;
      }

      await axios.post(`${API}/meetings/sync?lookback_days=90`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Sync started in background. This may take a few minutes.");
      
      // Poll sync status
      const interval = setInterval(async () => {
        const status = await axios.get(`${API}/meetings/sync-status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setSyncStatus(status.data);
        
        if (!status.data.is_syncing) {
          clearInterval(interval);
          fetchMeetings();
          fetchGlobalStats();
          toast.success(`Sync complete! Found ${status.data.total_meetings} meetings.`);
        }
      }, 3000);
    } catch (error) {
      console.error("Error syncing meetings:", error);
      toast.error(error.response?.data?.detail || "Failed to start sync");
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchMeetings();
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const response = await axios.get(`${API}/meetings/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMeetings(response.data.results || []);
    } catch (error) {
      console.error("Error searching meetings:", error);
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Meetings & Recordings Hub
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Unified view across Attio CRM and Fireflies AI — sorted latest first
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMeetings}
            disabled={loading}
            data-testid="refresh-meetings-btn"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {localStorage.getItem("admin_token") && (
            <Button
              size="sm"
              onClick={handleSync}
              disabled={syncStatus?.is_syncing}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="sync-now-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              {syncStatus?.is_syncing ? "Syncing..." : "Sync Now"}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card data-testid="stat-total">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Meetings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  <span className="text-gray-700 font-medium">{stats.past || 0}</span> past ·{" "}
                  <span className="text-gray-700 font-medium">{stats.upcoming || 0}</span> upcoming
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Attio CRM</p>
                <p className="text-2xl font-bold text-gray-900">{stats.attio}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">all-time sync</p>
              </div>
              <Badge className="bg-blue-500">Attio</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Fireflies AI</p>
                <p className="text-2xl font-bold text-gray-900">{stats.fireflies}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">with transcripts</p>
              </div>
              <Badge className="bg-green-500">Fireflies</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">With Recordings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.with_recordings}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">audio / video / deep-link</p>
              </div>
              <Video className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Status Banner */}
      {syncStatus && syncStatus.last_sync_attio && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700">
                Last synced: {new Date(syncStatus.last_sync_attio).toLocaleString()}
              </span>
              <span className="text-blue-600">
                {syncStatus.total_meetings} meetings • {syncStatus.deduplicated_count} deduplicated
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* People Mapping — link unmapped Attio/Fireflies emails to employees */}
      <PeopleMappingPanel />

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search meetings, participants, or topics... (Press Enter)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>

            <div className="flex gap-1 bg-gray-100 rounded-md p-1" data-testid="time-range-toggle">
              {[
                { key: "past", label: "Past" },
                { key: "upcoming", label: "Upcoming" },
                { key: "all", label: "All" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setFilters({ ...filters, time_range: opt.key })}
                  data-testid={`time-range-${opt.key}`}
                  className={`px-3 py-1 text-sm rounded ${
                    filters.time_range === opt.key
                      ? "bg-white shadow text-gray-900 font-medium"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4">
              <MeetingFilters filters={filters} setFilters={setFilters} onApply={fetchMeetings} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" data-testid="tab-all">
            All Meetings
            <span className="ml-2 text-xs text-gray-400">
              ({filters.time_range === "all" ? stats.total : filters.time_range === "upcoming" ? stats.upcoming : stats.past})
            </span>
          </TabsTrigger>
          <TabsTrigger value="attio" data-testid="tab-attio">
            <Badge variant="outline" className="mr-2 bg-blue-50 text-blue-700 border-blue-300">Attio</Badge>
            <span className="text-xs text-gray-400">{stats.attio}</span>
          </TabsTrigger>
          <TabsTrigger value="fireflies" data-testid="tab-fireflies">
            <Badge variant="outline" className="mr-2 bg-green-50 text-green-700 border-green-300">Fireflies</Badge>
            <span className="text-xs text-gray-400">{stats.fireflies}</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" data-testid="tab-timeline">
            <Calendar className="w-4 h-4 mr-2" />
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <MeetingsList 
            meetings={meetings} 
            loading={loading} 
            onSelectMeeting={openMeeting}
          />
        </TabsContent>

        <TabsContent value="attio" className="mt-6">
          <MeetingsList 
            meetings={meetings} 
            loading={loading} 
            onSelectMeeting={openMeeting}
          />
        </TabsContent>

        <TabsContent value="fireflies" className="mt-6">
          <MeetingsList 
            meetings={meetings} 
            loading={loading} 
            onSelectMeeting={openMeeting}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-4" />
              <p className="text-gray-500">Loading timeline...</p>
            </div>
          ) : (
            <MeetingsTimeline meetings={meetings} onSelectMeeting={openMeeting} />
          )}
        </TabsContent>
      </Tabs>

      {/* Meeting Detail Drawer */}
      {selectedMeeting && (
        <MeetingDetailDrawer
          meeting={selectedMeeting}
          open={!!selectedMeeting}
          onClose={closeMeeting}
        />
      )}
    </div>
  );
}

function MeetingsList({ meetings, loading, onSelectMeeting }) {
  if (loading) {
    return (
      <div className="text-center py-12" data-testid="meetings-loading">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-4" />
        <p className="text-gray-500">Loading meetings...</p>
      </div>
    );
  }

  if (!meetings || meetings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 mb-2">No meetings found</p>
          <p className="text-sm text-gray-400">Try adjusting your filters or sync new meetings</p>
        </CardContent>
      </Card>
    );
  }

  // Group meetings by date bucket (Today, Yesterday, This Week, This Month, Older)
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const bucketFor = (m) => {
    if (!m.start_time) return { key: "no-date", label: "No date" };
    const d = new Date(m.start_time);
    if (Number.isNaN(d.getTime())) return { key: "no-date", label: "No date" };
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today) return { key: "today", label: "Today" };
    if (day.getTime() === yesterday.getTime()) return { key: "yesterday", label: "Yesterday" };
    if (day >= startOfWeek) return { key: "this-week", label: "Earlier this week" };
    if (day >= startOfMonth) return { key: "this-month", label: "Earlier this month" };
    return {
      key: `m-${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
  };

  const groupsOrder = [];
  const groups = new Map();
  for (const m of meetings) {
    const b = bucketFor(m);
    if (!groups.has(b.key)) {
      groups.set(b.key, { label: b.label, items: [] });
      groupsOrder.push(b.key);
    }
    groups.get(b.key).items.push(m);
  }

  return (
    <div className="space-y-8" data-testid="meetings-list">
      {groupsOrder.map((key) => {
        const g = groups.get(key);
        return (
          <div key={key}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                {g.label}
              </h3>
              <span className="text-xs text-gray-400">({g.items.length})</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="grid grid-cols-1 gap-3">
              {g.items.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onClick={() => onSelectMeeting(meeting)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
