import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Calendar,
  Clock,
  Users,
  Video,
  FileText,
  ExternalLink,
  Download,
  CheckCircle,
  Sparkles,
  Send,
  Trash2,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function MeetingDetailDrawer({ meeting, open, onClose }) {
  const [transcript, setTranscript] = useState(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [actionItems, setActionItems] = useState([]);

  // AI chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const sessionId = meeting ? `meeting_${meeting.id}` : null;

  useEffect(() => {
    if (open && meeting) {
      fetchTranscript();
      fetchActionItems();
      fetchChatHistory();
    } else {
      // reset on close
      setChatMessages([]);
      setChatInput("");
      setTranscript(null);
    }
  }, [open, meeting?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const authHeaders = () => {
    const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  const fetchTranscript = async () => {
    if (!meeting?.has_transcript) return;
    try {
      setLoadingTranscript(true);
      const response = await axios.get(`${API}/meetings/${meeting.id}/transcript`, {
        headers: authHeaders(),
      });
      setTranscript(response.data);
    } catch (error) {
      // 404 simply means provider tier (e.g. Fireflies free) doesn't expose
      // the transcript body — render the empty-state silently.
      if (error?.response?.status !== 404) {
        console.error("Error fetching transcript:", error);
      }
      setTranscript(null);
    } finally {
      setLoadingTranscript(false);
    }
  };

  const fetchActionItems = async () => {
    if (!meeting?.fireflies_id) return;
    try {
      const response = await axios.get(`${API}/meetings/action-items`, {
        headers: authHeaders(),
      });
      const meetingActions = response.data.action_items.filter(
        (item) => item.meeting_id === meeting.id
      );
      setActionItems(meetingActions);
    } catch (error) {
      console.error("Error fetching action items:", error);
    }
  };

  const fetchChatHistory = async () => {
    if (!meeting) return;
    try {
      const response = await axios.get(
        `${API}/meetings/${meeting.id}/chat/history?session_id=${encodeURIComponent(sessionId)}`,
        { headers: authHeaders() }
      );
      setChatMessages(response.data.messages || []);
    } catch (error) {
      console.error("Error fetching chat history:", error);
    }
  };

  const sendChatMessage = async (e) => {
    e?.preventDefault();
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const optimisticUser = {
      id: `tmp_${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, optimisticUser]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await axios.post(
        `${API}/meetings/${meeting.id}/chat`,
        { message: text, session_id: sessionId },
        { headers: authHeaders() }
      );
      setChatMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUser.id),
        response.data.user_message,
        response.data.assistant_message,
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      const detail = error.response?.data?.detail || "AI chat failed";
      toast.error(detail);
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticUser.id ? { ...m, _error: detail } : m
        )
      );
    } finally {
      setChatLoading(false);
    }
  };

  const clearChat = async () => {
    if (!meeting) return;
    try {
      await axios.delete(
        `${API}/meetings/${meeting.id}/chat?session_id=${encodeURIComponent(sessionId)}`,
        { headers: authHeaders() }
      );
      setChatMessages([]);
      toast.success("Chat cleared");
    } catch (error) {
      toast.error("Failed to clear chat");
    }
  };

  const toggleActionItem = async (itemId, currentStatus) => {
    try {
      const newStatus = currentStatus === "done" ? "open" : "done";
      await axios.patch(
        `${API}/meetings/action-items/${itemId}?status=${newStatus}`,
        {},
        { headers: authHeaders() }
      );
      setActionItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status: newStatus } : item
        )
      );
      toast.success(`Action item marked as ${newStatus}`);
    } catch (error) {
      console.error("Error updating action item:", error);
      toast.error("Failed to update action item");
    }
  };

  const copyShareLink = async () => {
    const url = `${window.location.origin}/meetings/${meeting.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied to clipboard");
    } catch {
      // Fallback: select-and-prompt
      window.prompt("Copy this link:", url);
    }
  };

  if (!open || !meeting) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const recordings = (meeting.recordings && meeting.recordings.length > 0)
    ? meeting.recordings
    : [
        meeting.video_url && { url: meeting.video_url, mime: "video/mp4", source: meeting.source, id: "v" },
        meeting.audio_url && { url: meeting.audio_url, mime: "audio/mpeg", source: meeting.source, id: "a" },
      ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-end" data-testid="meeting-drawer">
      <div className="bg-white h-full w-full md:w-2/3 lg:w-1/2 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex items-start justify-between z-10">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{meeting.title}</h2>
            <div className="flex flex-wrap gap-2">
              {(meeting.source === "attio" || meeting.source === "both") && (
                <Badge className="bg-blue-500">Attio</Badge>
              )}
              {(meeting.source === "fireflies" || meeting.source === "both") && (
                <Badge className="bg-green-500">Fireflies</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyShareLink}
              data-testid="copy-link-btn"
              title="Copy shareable link"
            >
              <LinkIcon className="w-4 h-4 mr-1.5" />
              <span className="text-xs">Copy link</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="drawer-close-btn">
              <X className="w-5 h-5" />
            </Button>
          </div>
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
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {meeting.participants.map((participant, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
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
                      <Badge variant="outline" className="ml-auto">
                        Host
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recordings */}
          {recordings.length > 0 && (
            <div data-testid="recordings-section">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Video className="w-5 h-5" />
                Recordings ({recordings.length})
              </h3>
              <div className="space-y-2">
                {recordings.map((rec, idx) => {
                  const isVideo = (rec.mime || "").startsWith("video") || /mp4|webm|mov/i.test(rec.url || "");
                  return (
                    <div
                      key={rec.id || idx}
                      className="flex items-center justify-between p-3 border rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isVideo ? (
                          <Video className="w-5 h-5 text-purple-600" />
                        ) : (
                          <Download className="w-5 h-5 text-blue-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {rec.title || (isVideo ? "Video recording" : "Audio recording")}
                          </p>
                          <p className="text-xs text-gray-500">
                            {rec.source || meeting.source} {rec.mime ? `· ${rec.mime}` : ""}
                          </p>
                        </div>
                      </div>
                      {rec.url ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(rec.url, "_blank")}
                          data-testid={`recording-open-${idx}`}
                        >
                          Open
                          <ExternalLink className="w-3 h-3 ml-2" />
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          URL unavailable
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabs for detailed content */}
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary" data-testid="drawer-tab-summary">Summary</TabsTrigger>
              <TabsTrigger value="transcript" data-testid="drawer-tab-transcript">Transcript</TabsTrigger>
              <TabsTrigger value="actions" data-testid="drawer-tab-actions">
                Actions ({actionItems.length})
              </TabsTrigger>
              <TabsTrigger value="ai-chat" data-testid="drawer-tab-ai-chat">
                <Sparkles className="w-4 h-4 mr-1" /> AI Chat
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              {meeting.summary ? (
                <div>
                  <h4 className="font-semibold mb-2">Overview</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{meeting.summary}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No summary available.</p>
              )}

              {meeting.topics && meeting.topics.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Topics Discussed</h4>
                  <div className="flex flex-wrap gap-2">
                    {meeting.topics.map((topic, i) => (
                      <Badge key={i} variant="outline">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {meeting.keywords && meeting.keywords.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {meeting.keywords.map((keyword, i) => (
                      <Badge key={i} variant="secondary" className="bg-gray-100">
                        {keyword}
                      </Badge>
                    ))}
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
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                  {transcript.lines.map((line, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-lg hover:bg-gray-50">
                      <div className="w-24 flex-shrink-0">
                        <p className="text-xs text-gray-500">
                          {Math.floor(line.start_time / 60)}:
                          {String(Math.floor(line.start_time % 60)).padStart(2, "0")}
                        </p>
                        <p className="font-medium text-sm text-gray-700">{line.speaker}</p>
                      </div>
                      <p className="text-sm text-gray-800 flex-1">{line.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-700 font-medium">Transcript unavailable</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    {meeting.source === "fireflies"
                      ? "Fireflies free tier doesn't expose transcript text via API. Open the recording in Fireflies to view the full transcript."
                      : "No transcript has been generated for this meeting yet."}
                  </p>
                  {meeting.source === "fireflies" && meeting.fireflies_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() =>
                        window.open(
                          `https://app.fireflies.ai/view/${meeting.fireflies_id}`,
                          "_blank"
                        )
                      }
                    >
                      Open in Fireflies
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  )}
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
                        {item.status === "done" && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </button>
                      <div className="flex-1">
                        <p
                          className={`text-sm ${
                            item.status === "done"
                              ? "line-through text-gray-500"
                              : "text-gray-800"
                          }`}
                        >
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

            <TabsContent value="ai-chat">
              <div className="flex flex-col" style={{ minHeight: 380 }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">
                    Ask anything about this meeting. Answers come from the transcript & summary (GPT-5.2).
                  </p>
                  {chatMessages.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearChat}
                      data-testid="ai-chat-clear-btn"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Clear
                    </Button>
                  )}
                </div>

                <div
                  className="flex-1 border rounded-lg p-3 bg-gray-50 overflow-y-auto space-y-3"
                  style={{ maxHeight: 360 }}
                  data-testid="ai-chat-messages"
                >
                  {chatMessages.length === 0 && !chatLoading && (
                    <div className="text-center text-sm text-gray-400 py-8">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      Try: <em>"Summarize the key decisions"</em> or{" "}
                      <em>"What did Kartik say about pricing?"</em>
                    </div>
                  )}
                  {chatMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                          m.role === "user"
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : "bg-white border text-gray-800 rounded-bl-sm"
                        } ${m._error ? "ring-1 ring-red-300" : ""}`}
                      >
                        {m.content}
                        {m._error && (
                          <div className="text-[10px] mt-1 text-red-200">⚠ {m._error}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-gray-500 inline-flex items-center gap-2">
                        <Sparkles className="w-3 h-3 animate-pulse" /> Thinking…
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form
                  onSubmit={sendChatMessage}
                  className="mt-3 flex items-end gap-2"
                  data-testid="ai-chat-form"
                >
                  <Textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendChatMessage();
                      }
                    }}
                    placeholder="Ask a question about this meeting…"
                    rows={2}
                    className="flex-1 resize-none"
                    data-testid="ai-chat-input"
                  />
                  <Button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    data-testid="ai-chat-send-btn"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
