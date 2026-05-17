import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API, toast } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Briefcase, ClipboardCheck, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, ReferenceLine, XAxis } from "recharts";

// Custom tooltip component with metric-specific labels and change details
const CustomTooltip = ({ active, payload, label, metricName, dataKey }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    // Define change labels based on metric type
    const changeLabels = {
      total_employees: { positive: 'Joined', negative: 'Left', positiveKey: 'joined', negativeKey: 'left' },
      pending_leaves: { positive: 'Submitted', negative: 'Resolved', positiveKey: 'submitted', negativeKey: 'resolved' },
      open_positions: { positive: 'Opened', negative: 'Filled', positiveKey: 'opened', negativeKey: 'filled' },
      pending_onboarding_tasks: { positive: 'Added', negative: 'Completed', positiveKey: 'added', negativeKey: 'completed' }
    };
    
    const labels = changeLabels[dataKey];
    
    return (
      <div className="bg-white px-3 py-2 border border-gray-200 rounded-lg shadow-lg min-w-[200px]">
        <p className="text-xs font-medium text-gray-600 mb-2">Date: {label}</p>
        <p className="text-sm font-semibold text-gray-900 mb-2">
          {metricName}: {data.value}
        </p>
        {labels && (
          <div className="text-xs space-y-1 pt-2 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {labels.positive}:
              </span>
              <span className="font-medium text-green-700">{data[labels.positiveKey] || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-red-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                {labels.negative}:
              </span>
              <span className="font-medium text-red-700">{data[labels.negativeKey] || 0}</span>
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_employees: 0,
    pending_leaves: 0,
    open_positions: 0,
    pending_onboarding_tasks: 0
  });
  const [trends, setTrends] = useState({
    total_employees: [],
    pending_leaves: [],
    open_positions: [],
    pending_onboarding_tasks: []
  });
  const [changes, setChanges] = useState({
    total_employees: 0,
    pending_leaves: 0,
    open_positions: 0,
    pending_onboarding_tasks: 0
  });
  const [averages, setAverages] = useState({
    total_employees: 0,
    pending_leaves: 0,
    open_positions: 0,
    pending_onboarding_tasks: 0
  });
  const [period, setPeriod] = useState("week");
  const [loading, setLoading] = useState(true);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    fetchStats();
    fetchTrends();
  }, []);

  useEffect(() => {
    fetchTrends();
  }, [period]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  };

  const fetchTrends = async () => {
    try {
      let url = `${API}/dashboard/trends?period=${period}`;
      
      // If custom period and dates are selected, add them to the URL
      if (period === "custom" && customStartDate && customEndDate) {
        url += `&start_date=${customStartDate}&end_date=${customEndDate}`;
      }
      
      const response = await axios.get(url);
      setTrends(response.data.trends);
      setChanges(response.data.changes);
      
      // Calculate averages for each metric
      const calculatedAverages = {};
      Object.keys(response.data.trends).forEach(key => {
        const values = response.data.trends[key].map(item => item.value);
        const sum = values.reduce((acc, val) => acc + val, 0);
        calculatedAverages[key] = Math.round(sum / values.length);
      });
      setAverages(calculatedAverages);
    } catch (error) {
      console.error("Error fetching trends:", error);
      toast.error("Failed to load trend data");
    }
  };
  
  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      if (new Date(customStartDate) > new Date(customEndDate)) {
        toast.error("Start date must be before end date");
        return;
      }
      fetchTrends();
      setShowCustomDate(false);
    } else {
      toast.error("Please select both start and end dates");
    }
  };

  const statCards = [
    {
      title: "Total Employees",
      value: stats.total_employees,
      icon: Users,
      color: "from-blue-500 to-blue-600",
      lineColor: "#3b82f6",
      testid: "total-employees-card",
      dataKey: "total_employees",
      metricName: "Employees"
    },
    {
      title: "Pending Leave Requests",
      value: stats.pending_leaves,
      icon: Calendar,
      color: "from-amber-500 to-orange-600",
      lineColor: "#f59e0b",
      testid: "pending-leaves-card",
      dataKey: "pending_leaves",
      metricName: "Leave Requests"
    },
    {
      title: "Open Positions",
      value: stats.open_positions,
      icon: Briefcase,
      color: "from-emerald-500 to-teal-600",
      lineColor: "#10b981",
      testid: "open-positions-card",
      dataKey: "open_positions",
      metricName: "Positions"
    },
    {
      title: "Pending Onboarding Tasks",
      value: stats.pending_onboarding_tasks,
      icon: ClipboardCheck,
      color: "from-purple-500 to-indigo-600",
      lineColor: "#8b5cf6",
      testid: "pending-onboarding-card",
      dataKey: "pending_onboarding_tasks",
      metricName: "Tasks"
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to PeopleHub HRMS</h1>
          <p className="text-gray-600">Overview of your HR operations at a glance</p>
        </div>
        
        {/* Time Period Toggle */}
        <div className="flex gap-2 items-center">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setPeriod("day")}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                period === "day"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setPeriod("week")}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                period === "week"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setPeriod("month")}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                period === "month"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => {
                setPeriod("custom");
                setShowCustomDate(true);
              }}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                period === "custom"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Custom
            </button>
          </div>
          
          {/* Custom Date Range Picker */}
          {showCustomDate && (
            <div className="flex gap-2 items-center bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                placeholder="Start Date"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                placeholder="End Date"
              />
              <button
                onClick={handleCustomDateApply}
                className="px-4 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Apply
              </button>
              <button
                onClick={() => {
                  setShowCustomDate(false);
                  setPeriod("week");
                }}
                className="px-4 py-1 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const trendData = trends[stat.dataKey] || [];
          const change = changes[stat.dataKey] || 0;
          const isPositive = change >= 0;
          const TrendIcon = isPositive ? TrendingUp : TrendingDown;
          
          // Define click handlers for each card
          const handleCardClick = () => {
            if (stat.dataKey === "total_employees") {
              navigate('/employees');
            }
            // Can add more navigation for other cards in the future
          };
          
          return (
            <Card 
              key={index} 
              className={`hover-card transition-all duration-200 group ${
                stat.dataKey === "total_employees" 
                  ? "cursor-pointer hover:scale-105 hover:shadow-xl hover:border-blue-500" 
                  : ""
              }`}
              data-testid={stat.testid}
              onClick={handleCardClick}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>{stat.title}</span>
                    {stat.dataKey === "total_employees" && (
                      <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to view →
                      </span>
                    )}
                  </div>
                </CardTitle>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between mb-3">
                  <div className="text-3xl font-bold text-gray-900" data-testid={`${stat.testid}-value`}>
                    {stat.value}
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-medium ${
                    isPositive ? "text-green-600" : "text-red-600"
                  }`}>
                    <TrendIcon className="w-4 h-4" />
                    <span>{Math.abs(change)}%</span>
                  </div>
                </div>
                
                {/* Trend Chart */}
                <div className="h-16 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <XAxis dataKey="time" hide={true} />
                      <Tooltip 
                        content={<CustomTooltip metricName={stat.metricName} dataKey={stat.dataKey} />}
                      />
                      <ReferenceLine 
                        y={averages[stat.dataKey]} 
                        stroke="#9ca3af" 
                        strokeDasharray="3 3"
                        strokeWidth={1}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={stat.lineColor}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/employees')}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors" 
                data-testid="add-employee-quick-btn"
              >
                Add New Employee
              </button>
              <button 
                onClick={() => navigate('/recruitment')}
                className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors" 
                data-testid="post-job-quick-btn"
              >
                Post New Job
              </button>
              <button 
                onClick={() => navigate('/payroll')}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors" 
                data-testid="process-payroll-quick-btn"
              >
                Process Payroll
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                <div>
                  <p className="text-gray-900 font-medium">System initialized successfully</p>
                  <p className="text-gray-500 text-xs">Ready to manage your workforce</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
