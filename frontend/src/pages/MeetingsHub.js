import React, { useState, useEffect } from "react";
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function MeetingsHub() {
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
    limit: 50,
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
      }

      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== "" && filters[key] !== "all") {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(`${endpoint}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMeetings(response.data.meetings || []);
      
      // Calculate stats
      const allMeetings = response.data.meetings || [];
      setStats({
        total: response.data.total || 0,
        attio: allMeetings.filter(m => m.source === "attio" || m.source === "both").length,
        fireflies: allMeetings.filter(m => m.source === "fireflies" || m.source === "both").length,
        with_recordings: allMeetings.filter(m => m.has_recording).length
      });
    } catch (error) {
      console.error("Error fetching meetings:", error);
      toast.error("Failed to fetch meetings");
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Meetings & Recordings Hub</h1>
          <p className="text-sm text-gray-500 mt-1">
            View meetings from Attio CRM and Fireflies AI
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMeetings}
            disabled={loading}
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
            >
              <Download className="w-4 h-4 mr-2" />
              {syncStatus?.is_syncing ? "Syncing..." : "Sync Now"}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Meetings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Meetings ({stats.total})</TabsTrigger>
          <TabsTrigger value="attio">
            <Badge variant="outline" className="mr-2 bg-blue-50 text-blue-700 border-blue-300">Attio</Badge>
            {stats.attio}
          </TabsTrigger>
          <TabsTrigger value="fireflies">
            <Badge variant="outline" className="mr-2 bg-green-50 text-green-700 border-green-300">Fireflies</Badge>
            {stats.fireflies}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <MeetingsList 
            meetings={meetings} 
            loading={loading} 
            onSelectMeeting={setSelectedMeeting}
          />
        </TabsContent>

        <TabsContent value="attio" className="mt-6">
          <MeetingsList 
            meetings={meetings} 
            loading={loading} 
            onSelectMeeting={setSelectedMeeting}
          />
        </TabsContent>

        <TabsContent value="fireflies" className="mt-6">
          <MeetingsList 
            meetings={meetings} 
            loading={loading} 
            onSelectMeeting={setSelectedMeeting}
          />
        </TabsContent>
      </Tabs>

      {/* Meeting Detail Drawer */}
      {selectedMeeting && (
        <MeetingDetailDrawer
          meeting={selectedMeeting}
          open={!!selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
        />
      )}
    </div>
  );
}

function MeetingsList({ meetings, loading, onSelectMeeting }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-4" />
        <p className="text-gray-500">Loading meetings...</p>
      </div>
    );
  }

  if (meetings.length === 0) {
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

  return (
    <div className="grid grid-cols-1 gap-4">
      {meetings.map((meeting) => (
        <MeetingCard
          key={meeting.id}
          meeting={meeting}
          onClick={() => onSelectMeeting(meeting)}
        />
      ))}
    </div>
  );
}
