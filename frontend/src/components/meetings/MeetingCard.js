import React from "react";
import { Calendar, Clock, Users, Video, FileText, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MeetingCard({ meeting, onClick }) {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSourceBadge = (source) => {
    if (source === "attio" || source === "both") {
      return <Badge className="bg-blue-500 text-white">Attio</Badge>;
    }
    if (source === "fireflies") {
      return <Badge className="bg-green-500 text-white">Fireflies</Badge>;
    }
    return null;
  };

  const getSentimentColor = (sentiment) => {
    if (!sentiment) return "text-gray-400";
    if (sentiment.positive > 50) return "text-green-600";
    if (sentiment.negative > 30) return "text-red-600";
    return "text-yellow-600";
  };

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer border-l-4"
      style={{
        borderLeftColor: meeting.source === "attio" || meeting.source === "both" ? "#3b82f6" : "#10b981"
      }}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{meeting.title}</h3>
              {getSourceBadge(meeting.source)}
              {meeting.source === "both" && (
                <Badge className="bg-green-500 text-white">Fireflies</Badge>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(meeting.start_time)}</span>
              </div>
              
              {meeting.duration_minutes && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{meeting.duration_minutes} min</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{meeting.participants?.length || 0} participants</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {meeting.has_recording && (
              <div className="flex items-center gap-1 text-sm text-purple-600">
                <Video className="w-4 h-4" />
                <span>Recording</span>
              </div>
            )}
            {meeting.has_transcript && (
              <div className="flex items-center gap-1 text-sm text-blue-600">
                <FileText className="w-4 h-4" />
                <span>Transcript</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {meeting.summary && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {meeting.summary}
          </p>
        )}

        {/* Tags and Indicators */}
        <div className="flex flex-wrap items-center gap-2">
          {meeting.action_items_count > 0 && (
            <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
              <AlertCircle className="w-3 h-3 mr-1" />
              {meeting.action_items_count} Action Items
            </Badge>
          )}

          {meeting.sentiment && (
            <Badge variant="outline" className={`border-gray-300 ${getSentimentColor(meeting.sentiment)}`}>
              <TrendingUp className="w-3 h-3 mr-1" />
              Sentiment: {meeting.sentiment.positive > 50 ? "Positive" : meeting.sentiment.negative > 30 ? "Negative" : "Neutral"}
            </Badge>
          )}

          {meeting.topics && meeting.topics.slice(0, 3).map((topic, i) => (
            <Badge key={i} variant="outline" className="bg-gray-50">
              {topic}
            </Badge>
          ))}

          {meeting.host_email && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Host: {meeting.host_email.split('@')[0]}
            </Badge>
          )}
        </div>

        {/* Participants Preview */}
        {meeting.participants && meeting.participants.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <Users className="w-3 h-3" />
            <span>
              {meeting.participants.slice(0, 3).map(p => p.name).join(", ")}
              {meeting.participants.length > 3 && ` +${meeting.participants.length - 3} more`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
