import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, Users, Video, FileText, ExternalLink, Download, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function MeetingDetailDrawer({ meeting, open, onClose }) {
  const [transcript, setTranscript] = useState(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [actionItems, setActionItems] = useState([]);

  useEffect(() => {
    if (open && meeting) {
      fetchTranscript();
      fetchActionItems();
    }
  }, [open, meeting]);

  const fetchTranscript = async () => {
    if (!meeting.has_transcript) return;
    
    try {
      setLoadingTranscript(true);
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const response = await axios.get(`${API}/meetings/${meeting.id}/transcript`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTranscript(response.data);
    } catch (error) {
      console.error("Error fetching transcript:", error);
      toast.error("Failed to load transcript");
    } finally {
      setLoadingTranscript(false);
    }
  };

  const fetchActionItems = async () => {
    if (!meeting.fireflies_id) return;
    
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const response = await axios.get(`${API}/meetings/action-items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter action items for this meeting
      const meetingActions = response.data.action_items.filter(
        item => item.meeting_id === meeting.id
      );
      setActionItems(meetingActions);
    } catch (error) {
      console.error("Error fetching action items:", error);
    }
  };

  const toggleActionItem = async (itemId, currentStatus) => {
    try {
      const newStatus = currentStatus === "done" ? "open" : "done";
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      
      await axios.patch(
        `${API}/meetings/action-items/${itemId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setActionItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, status: newStatus } : item
        )
      );
      toast.success(`Action item marked as ${newStatus}`);
    } catch (error) {
      console.error("Error updating action item:", error);
      toast.error("Failed to update action item");
    }
  };

  if (!open || !meeting) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-end">
      <div className="bg-white h-full w-full md:w-2/3 lg:w-1/2 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex items-start justify-between z-10">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{meeting.title}</h2>
            <div className="flex flex-wrap gap-2">
              {meeting.source === "attio" || meeting.source === "both" ? (
                <Badge className="bg-blue-500">Attio</Badge>
              ) : null}
              {meeting.source === "fireflies" || meeting.source === "both" ? (
                <Badge className="bg-green-500">Fireflies</Badge>
              ) : null}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Meeting Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-gray-500">Date & Time</p>
                <p className="font-medium">{formatDate(meeting.start_time)}</p>
              </div>
            </div>

            {meeting.duration_minutes && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-gray-500">Duration</p>
                  <p className="font-medium">{meeting.duration_minutes} minutes</p>
                </div>
              </div>
            )}
          </div>

          {/* Participants */}
          {meeting.participants && meeting.participants.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participants ({meeting.participants.length})
              </h3>
              <div className="space-y-2">
                {meeting.participants.map((participant, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm">
                      {participant.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{participant.name}</p>
                      {participant.email && (
                        <p className="text-xs text-gray-500">{participant.email}</p>
                      )}
                    </div>
                    {meeting.host_email === participant.email && (
                      <Badge variant="outline" className="ml-auto">Host</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media Links */}
          {(meeting.audio_url || meeting.video_url) && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Video className="w-5 h-5" />
                Recordings
              </h3>
              <div className="flex gap-3">
                {meeting.video_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(meeting.video_url, '_blank')}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Watch Video
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </Button>
                )}
                {meeting.audio_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(meeting.audio_url, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Audio
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Tabs for detailed content */}
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="actions">Action Items ({actionItems.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              {meeting.summary && (
                <div>
                  <h4 className="font-semibold mb-2">Overview</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{meeting.summary}</p>
                </div>
              )}

              {meeting.topics && meeting.topics.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Topics Discussed</h4>
                  <div className="flex flex-wrap gap-2">
                    {meeting.topics.map((topic, i) => (
                      <Badge key={i} variant="outline">{topic}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {meeting.keywords && meeting.keywords.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {meeting.keywords.map((keyword, i) => (
                      <Badge key={i} variant="secondary" className="bg-gray-100">{keyword}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {meeting.sentiment && (
                <div>
                  <h4 className="font-semibold mb-2">Sentiment Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm w-20">Positive</span>
                      <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500"
                          style={{ width: `${meeting.sentiment.positive}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{meeting.sentiment.positive.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm w-20">Neutral</span>
                      <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-500"
                          style={{ width: `${meeting.sentiment.neutral}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{meeting.sentiment.neutral.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm w-20">Negative</span>
                      <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500"
                          style={{ width: `${meeting.sentiment.negative}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{meeting.sentiment.negative.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="transcript">
              {loadingTranscript ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading transcript...</p>
                </div>
              ) : transcript && transcript.lines ? (
                <div className="space-y-3">
                  {transcript.lines.map((line, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-lg hover:bg-gray-50">
                      <div className="w-24 flex-shrink-0">
                        <p className="text-xs text-gray-500">
                          {Math.floor(line.start_time / 60)}:{String(Math.floor(line.start_time % 60)).padStart(2, '0')}
                        </p>
                        <p className="font-medium text-sm text-gray-700">{line.speaker}</p>
                      </div>
                      <p className="text-sm text-gray-800 flex-1">{line.text}</p>
                      {line.ai_filters && Object.values(line.ai_filters).some(v => v) && (
                        <div className="flex flex-wrap gap-1">
                          {line.ai_filters.task && <Badge className="text-xs bg-orange-100 text-orange-700">Task</Badge>}
                          {line.ai_filters.question && <Badge className="text-xs bg-blue-100 text-blue-700">Q</Badge>}
                          {line.ai_filters.pricing && <Badge className="text-xs bg-green-100 text-green-700">$</Badge>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No transcript available</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="actions">
              {actionItems.length > 0 ? (
                <div className="space-y-3">
                  {actionItems.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-start gap-3 p-4 border rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <button
                        onClick={() => toggleActionItem(item.id, item.status)}
                        className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          item.status === "done" 
                            ? "bg-green-500 border-green-500" 
                            : "border-gray-300 hover:border-blue-500"
                        }`}
                      >
                        {item.status === "done" && <CheckCircle className="w-4 h-4 text-white" />}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm ${item.status === "done" ? "line-through text-gray-500" : "text-gray-800"}`}>
                          {item.text}
                        </p>
                        {item.assigned_to && (
                          <p className="text-xs text-gray-500 mt-1">
                            Assigned to: {item.assigned_to_name || item.assigned_to}
                          </p>
                        )}
                      </div>
                      <Badge variant={item.status === "done" ? "secondary" : "default"}>
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No action items found</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
