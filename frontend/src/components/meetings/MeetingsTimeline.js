import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Video, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const VIEW_MODES = ["month", "week", "day"];

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfWeek(d) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 sun
  x.setDate(x.getDate() - day);
  return x;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(d) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getSourceColor(src) {
  if (src === "attio" || src === "both") return "bg-blue-500";
  if (src === "fireflies") return "bg-green-500";
  return "bg-gray-400";
}

export default function MeetingsTimeline({ meetings, onSelectMeeting }) {
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));

  // Bucket meetings by date string YYYY-MM-DD
  const buckets = useMemo(() => {
    const map = new Map();
    (meetings || []).forEach((m) => {
      if (!m.start_time) return;
      const d = new Date(m.start_time);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ ...m, _date: d });
    });
    // sort each bucket by time desc
    for (const arr of map.values()) arr.sort((a, b) => b._date - a._date);
    return map;
  }, [meetings]);

  const meetingsOn = (d) => {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return buckets.get(key) || [];
  };

  const goPrev = () => {
    if (view === "month") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
    else if (view === "week") setCursor(addDays(cursor, -7));
    else setCursor(addDays(cursor, -1));
  };
  const goNext = () => {
    if (view === "month") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
    else if (view === "week") setCursor(addDays(cursor, 7));
    else setCursor(addDays(cursor, 1));
  };
  const goToday = () => setCursor(startOfDay(new Date()));

  const headerTitle = useMemo(() => {
    if (view === "month")
      return cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (view === "week") {
      const s = startOfWeek(cursor);
      const e = addDays(s, 6);
      return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return cursor.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [cursor, view]);

  return (
    <Card data-testid="meetings-timeline">
      <CardContent className="pt-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goPrev}
              data-testid="timeline-prev-btn"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToday}
              data-testid="timeline-today-btn"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goNext}
              data-testid="timeline-next-btn"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="ml-3 font-semibold text-gray-900">{headerTitle}</div>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-md p-1">
            {VIEW_MODES.map((m) => (
              <button
                key={m}
                onClick={() => setView(m)}
                data-testid={`timeline-view-${m}`}
                className={`px-3 py-1 text-sm rounded capitalize ${
                  view === m ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {view === "month" && (
          <MonthGrid cursor={cursor} meetingsOn={meetingsOn} onSelectMeeting={onSelectMeeting} />
        )}
        {view === "week" && (
          <WeekColumns cursor={cursor} meetingsOn={meetingsOn} onSelectMeeting={onSelectMeeting} />
        )}
        {view === "day" && (
          <DayList day={cursor} items={meetingsOn(cursor)} onSelectMeeting={onSelectMeeting} />
        )}
      </CardContent>
    </Card>
  );
}

function MonthGrid({ cursor, meetingsOn, onSelectMeeting }) {
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart);
  const days = [];
  let d = gridStart;
  // 6 weeks max
  for (let i = 0; i < 42; i++) {
    days.push(d);
    d = addDays(d, 1);
    if (i >= 27 && d > monthEnd && d.getDay() === 0) break;
  }
  const today = new Date();

  return (
    <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dow) => (
        <div
          key={dow}
          className="bg-gray-50 px-2 py-2 text-xs font-semibold text-gray-600 text-center"
        >
          {dow}
        </div>
      ))}
      {days.map((day, idx) => {
        const inMonth = day.getMonth() === cursor.getMonth();
        const items = meetingsOn(day);
        const isToday = sameDay(day, today);
        return (
          <div
            key={day.toISOString().slice(0, 10)}
            className={`bg-white min-h-[110px] p-1.5 flex flex-col gap-1 ${
              !inMonth ? "opacity-40" : ""
            }`}
            data-testid={`timeline-day-${day.toISOString().slice(0, 10)}`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs ${
                  isToday
                    ? "bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-semibold"
                    : "text-gray-700 font-medium"
                }`}
              >
                {day.getDate()}
              </span>
              {items.length > 0 && (
                <span className="text-[10px] text-gray-400">{items.length}</span>
              )}
            </div>
            <div className="flex flex-col gap-1 overflow-hidden">
              {items.slice(0, 3).map((m) => (
                <button
                  key={m.id}
                  onClick={() => onSelectMeeting(m)}
                  className={`text-[11px] px-1.5 py-0.5 rounded text-white truncate text-left hover:opacity-90 ${getSourceColor(
                    m.source
                  )}`}
                  title={m.title}
                >
                  {formatTime(m._date)} · {m.title}
                </button>
              ))}
              {items.length > 3 && (
                <span className="text-[10px] text-gray-500 pl-1">+{items.length - 3} more</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekColumns({ cursor, meetingsOn, onSelectMeeting }) {
  const start = startOfWeek(cursor);
  const today = new Date();
  return (
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 7 }).map((_, i) => {
        const day = addDays(start, i);
        const items = meetingsOn(day);
        const isToday = sameDay(day, today);
        return (
          <div
            key={day.toISOString().slice(0, 10)}
            className="border rounded-lg flex flex-col min-h-[260px]"
            data-testid={`timeline-week-col-${i}`}
          >
            <div
              className={`text-center text-xs px-2 py-2 border-b ${
                isToday ? "bg-blue-50 text-blue-700 font-semibold" : "bg-gray-50 text-gray-600"
              }`}
            >
              <div className="uppercase">
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div className="text-base">{day.getDate()}</div>
            </div>
            <div className="p-1.5 flex flex-col gap-1.5 flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <span className="text-[11px] text-gray-300 text-center mt-4">—</span>
              ) : (
                items.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onSelectMeeting(m)}
                    className={`text-[11px] px-2 py-1.5 rounded text-white text-left hover:opacity-90 ${getSourceColor(
                      m.source
                    )}`}
                    title={m.title}
                  >
                    <div className="font-medium opacity-90">{formatTime(m._date)}</div>
                    <div className="truncate">{m.title}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayList({ day, items, onSelectMeeting }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No meetings on this day</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelectMeeting(m)}
          className="w-full text-left flex gap-3 p-3 border rounded-lg hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
          data-testid={`timeline-day-item-${m.id}`}
        >
          <div className="w-20 flex-shrink-0">
            <div className="text-sm font-semibold text-gray-900">{formatTime(m._date)}</div>
            {m.duration_minutes && (
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {m.duration_minutes}m
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${getSourceColor(m.source)}`} />
              <h4 className="font-medium text-gray-900">{m.title}</h4>
              {(m.source === "attio" || m.source === "both") && (
                <Badge className="bg-blue-500 text-white text-[10px]">Attio</Badge>
              )}
              {(m.source === "fireflies" || m.source === "both") && (
                <Badge className="bg-green-500 text-white text-[10px]">Fireflies</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span>{m.participants?.length || 0} participants</span>
              {m.has_recording && (
                <span className="flex items-center gap-1 text-purple-600">
                  <Video className="w-3 h-3" /> Recording
                </span>
              )}
              {m.has_transcript && (
                <span className="flex items-center gap-1 text-blue-600">
                  <FileText className="w-3 h-3" /> Transcript
                </span>
              )}
              {m.action_items_count > 0 && (
                <span className="text-orange-600">{m.action_items_count} action items</span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
