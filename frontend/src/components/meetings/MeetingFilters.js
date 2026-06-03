import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MeetingFilters({ filters, setFilters, onApply }) {
  const handleChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters({
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
    onApply();
  };

  const presets = [
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 }
  ];

  const applyPreset = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setFilters(prev => ({
      ...prev,
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0]
    }));
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Date Range */}
        <div className="space-y-2">
          <Label>Date Range</Label>
          <div className="flex gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.days}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset.days)}
                className="text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Input
                type="date"
                value={filters.start_date || ""}
                onChange={(e) => handleChange("start_date", e.target.value)}
                placeholder="Start date"
              />
            </div>
            <div>
              <Input
                type="date"
                value={filters.end_date || ""}
                onChange={(e) => handleChange("end_date", e.target.value)}
                placeholder="End date"
              />
            </div>
          </div>
        </div>

        {/* Source */}
        <div className="space-y-2">
          <Label>Source</Label>
          <Select value={filters.source} onValueChange={(value) => handleChange("source", value)}>
            <SelectTrigger>
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="attio">Attio Only</SelectItem>
              <SelectItem value="fireflies">Fireflies Only</SelectItem>
              <SelectItem value="both">Both (Deduplicated)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Participant */}
        <div className="space-y-2">
          <Label>Participant Email</Label>
          <Input
            type="email"
            value={filters.participant_email}
            onChange={(e) => handleChange("participant_email", e.target.value)}
            placeholder="email@example.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sort */}
        <div className="space-y-2">
          <Label>Sort By</Label>
          <Select value={filters.sort_by} onValueChange={(value) => handleChange("sort_by", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="start_time">Date</SelectItem>
              <SelectItem value="duration_minutes">Duration</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Order */}
        <div className="space-y-2">
          <Label>Order</Label>
          <Select value={filters.sort_order} onValueChange={(value) => handleChange("sort_order", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest First</SelectItem>
              <SelectItem value="asc">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggles */}
        <div className="space-y-2">
          <Label>Filters</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filters.has_recording ? "default" : "outline"}
              size="sm"
              onClick={() => handleChange("has_recording", filters.has_recording ? null : true)}
            >
              Has Recording
            </Button>
            <Button
              variant={filters.has_action_items ? "default" : "outline"}
              size="sm"
              onClick={() => handleChange("has_action_items", filters.has_action_items ? null : true)}
            >
              Has Actions
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleReset}>
          Reset
        </Button>
        <Button onClick={onApply} className="bg-blue-600 hover:bg-blue-700">
          Apply Filters
        </Button>
      </div>
    </div>
  );
}
