import React from "react";
import {
  Calendar,
  Clock,
  Users,
  Video,
  FileText,
  AlertCircle,
  Mic,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MeetingCard({ meeting, onClick }) {
  const formatDateTime = (dateString) => {
    if (!dateString) return { date: "—", time: "—" };
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return { date: dateString, time: "" };
    return {
      date: d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
  };

  const { date, time } = formatDateTime(meeting.start_time);

  const sourceColor =
    meeting.source === "attio" || meeting.source === "both"
      ? "#3b82f6"
      : meeting.source === "fireflies"
      ? "#10b981"
      : "#9ca3af";

  const initials = (name = "") =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("") || "?";

  return (
    <Card
      className="group hover:shadow-md hover:-translate-y-px transition-all cursor-pointer border-l-4"
      style={{ borderLeftColor: sourceColor }}
      onClick={onClick}
      data-testid={`meeting-card-${meeting.id}`}
    >
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-4">
          {/* Date column */}
          <div className="flex flex-col items-center justify-center w-16 flex-shrink-0 text-center border-r pr-4">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">
              {date.split(",")[1]?.trim().split(" ")[0]}
            </div>
            <div className="text-2xl font-bold text-gray-900 leading-none">
              {date.split(",")[1]?.trim().split(" ")[1] || "—"}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">{time}</div>
          </div>

          {/* Main */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {meeting.title}
              </h3>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {(meeting.source === "attio" || meeting.source === "both") && (
                  <Badge className="bg-blue-500 hover:bg-blue-500 text-white text-[10px] px-1.5 py-0">
                    Attio
                  </Badge>
                )}
                {(meeting.source === "fireflies" || meeting.source === "both") && (
                  <Badge className="bg-green-500 hover:bg-green-500 text-white text-[10px] px-1.5 py-0">
                    Fireflies
                  </Badge>
                )}
              </div>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {date}
              </span>
              {meeting.duration_minutes ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {meeting.duration_minutes} min
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3" />
                {meeting.participants?.length || 0}
              </span>
              {meeting.host_email && (
                <span className="truncate max-w-[180px]">
                  Host: <span className="text-gray-700">{meeting.host_email.split("@")[0]}</span>
                </span>
              )}
            </div>

            {/* Summary preview */}
            {meeting.summary && (
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                {meeting.summary
                  .replace(/<br\s*\/?>/gi, " ")
                  .replace(/<[^>]+>/g, "")
                  .trim()}
              </p>
            )}

            {/* Participants avatars */}
            {meeting.participants && meeting.participants.length > 0 && (
              <div className="flex items-center -space-x-1.5 mb-2">
                {meeting.participants.slice(0, 5).map((p, i) => (
                  <div
                    key={p.email || `${p.name || "p"}-${i}`}
                    title={`${p.name}${p.email ? ` · ${p.email}` : ""}`}
                    className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white"
                  >
                    {initials(p.name)}
                  </div>
                ))}
                {meeting.participants.length > 5 && (
                  <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 text-[10px] font-semibold flex items-center justify-center ring-2 ring-white">
                    +{meeting.participants.length - 5}
                  </div>
                )}
              </div>
            )}

            {/* Indicators */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(meeting.linked_company_names || []).slice(0, 3).map((c, i) => (
                <Badge
                  key={`co-${i}`}
                  className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-[10px] py-0"
                >
                  🏢 {c}
                </Badge>
              ))}
              {meeting.has_recording && (
                <Badge
                  variant="outline"
                  className="text-purple-700 border-purple-200 bg-purple-50 text-[10px] py-0"
                >
                  <Video className="w-3 h-3 mr-1" />
                  {meeting.recordings?.length || 1} recording
                  {(meeting.recordings?.length || 1) > 1 ? "s" : ""}
                </Badge>
              )}
              {meeting.has_transcript && (
                <Badge
                  variant="outline"
                  className="text-blue-700 border-blue-200 bg-blue-50 text-[10px] py-0"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Transcript
                </Badge>
              )}
              {meeting.action_items_count > 0 && (
                <Badge
                  variant="outline"
                  className="text-orange-700 border-orange-200 bg-orange-50 text-[10px] py-0"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {meeting.action_items_count} action item
                  {meeting.action_items_count > 1 ? "s" : ""}
                </Badge>
              )}
              {meeting.keywords?.slice(0, 3).map((kw, i) => (
                <Badge
                  key={`kw-${kw}-${i}`}
                  variant="outline"
                  className="bg-gray-50 text-gray-700 text-[10px] py-0"
                >
                  {kw}
                </Badge>
              ))}
              {meeting.has_audio && !meeting.has_video && (
                <Badge variant="outline" className="text-[10px] py-0">
                  <Mic className="w-3 h-3 mr-1" />
                  Audio
                </Badge>
              )}
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
