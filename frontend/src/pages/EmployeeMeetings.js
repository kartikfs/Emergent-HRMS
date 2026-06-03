import React, { useState, useEffect } from "react";
import { Calendar, Video, Clock, Users, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import axios from "axios";
import MeetingCard from "@/components/meetings/MeetingCard";
import MeetingDetailDrawer from "@/components/meetings/MeetingDetailDrawer";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function EmployeeMeetings() {
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  useEffect(() => {
    fetchEmployeeMeetings();
  }, []);

  const fetchEmployeeMeetings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("employee_token") || localStorage.getItem("token");
      const userData = localStorage.getItem("employee_data") || localStorage.getItem("user");
      const user = JSON.parse(userData || "{}");
      
      if (!user.id) {
        toast.error("User information not found");
        return;
      }

      // Fetch employee meetings with stats
      const response = await axios.get(`${API}/employees/${user.id}/meetings`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMeetings(response.data.meetings || []);
      setStats(response.data.stats || {});
    } catch (error) {
      console.error("Error fetching meetings:", error);
      toast.error("Failed to fetch meetings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Meetings</h1>
        <p className="text-sm text-gray-500 mt-1">
          View all your meetings and recordings
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Meetings</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_meetings || 0}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Duration</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.floor((stats.total_duration_minutes || 0) / 60)}h {(stats.total_duration_minutes || 0) % 60}m
                  </p>
                </div>
                <Clock className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Duration</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.avg_duration_minutes || 0} min
                  </p>
                </div>
                <Video className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Top Partners</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.top_meeting_partners?.length || 0}
                  </p>
                </div>
                <Users className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Meeting Partners */}
      {stats && stats.top_meeting_partners && stats.top_meeting_partners.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Meeting Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.top_meeting_partners.map((partner, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">
                      {partner.email?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{partner.email}</p>
                      <p className="text-xs text-gray-500">{partner.count} meetings</p>
                    </div>
                  </div>
                  <Badge variant="outline">{partner.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meetings List */}
      <Card>
        <CardHeader>
          <CardTitle>All Meetings ({meetings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading meetings...</p>
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-2">No meetings found</p>
              <p className="text-sm text-gray-400">Your meetings will appear here once synced</p>
            </div>
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onClick={() => setSelectedMeeting(meeting)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
