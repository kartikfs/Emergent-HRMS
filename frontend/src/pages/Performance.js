import { useState, useEffect } from "react";
import axios from "axios";
import { API, toast } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Star, TrendingUp } from "lucide-react";

const Performance = () => {
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    reviewer_id: "HR Manager",
    review_period: "",
    goals: "",
    achievements: "",
    areas_of_improvement: "",
    rating: "3",
    feedback: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [reviewsRes, employeesRes] = await Promise.all([
        axios.get(`${API}/performance-reviews`),
        axios.get(`${API}/employees?status=active`)
      ]);
      setReviews(reviewsRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load performance data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/performance-reviews`, {
        ...formData,
        rating: parseFloat(formData.rating)
      });
      toast.success("Performance review created successfully");
      setIsDialogOpen(false);
      setFormData({
        employee_id: "",
        reviewer_id: "HR Manager",
        review_period: "",
        goals: "",
        achievements: "",
        areas_of_improvement: "",
        rating: "3",
        feedback: ""
      });
      fetchData();
    } catch (error) {
      console.error("Error creating review:", error);
      toast.error("Failed to create performance review");
    }
  };

  const getEmployeeName = (empId) => {
    const emp = employees.find(e => e.id === empId);
    return emp ? `${emp.first_name} ${emp.last_name}` : "Unknown";
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div data-testid="performance-page">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Performance Management</h1>
          <p className="text-gray-600">Track goals, reviews, and employee performance</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="create-review-btn">
              <Plus className="w-4 h-4 mr-2" />
              Create Review
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Performance Review</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employee</Label>
                  <Select value={formData.employee_id} onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))} required>
                    <SelectTrigger data-testid="review-employee-select">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Review Period</Label>
                  <Input 
                    value={formData.review_period} 
                    onChange={(e) => setFormData(prev => ({ ...prev, review_period: e.target.value }))}
                    placeholder="e.g., Q1 2025"
                    required
                    data-testid="review-period-input"
                  />
                </div>
              </div>

              <div>
                <Label>Goals</Label>
                <Textarea 
                  value={formData.goals} 
                  onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                  placeholder="List the goals set for this period"
                  rows={3}
                  required
                  data-testid="goals-input"
                />
              </div>

              <div>
                <Label>Achievements</Label>
                <Textarea 
                  value={formData.achievements} 
                  onChange={(e) => setFormData(prev => ({ ...prev, achievements: e.target.value }))}
                  placeholder="Describe key achievements"
                  rows={3}
                  required
                  data-testid="achievements-input"
                />
              </div>

              <div>
                <Label>Areas of Improvement</Label>
                <Textarea 
                  value={formData.areas_of_improvement} 
                  onChange={(e) => setFormData(prev => ({ ...prev, areas_of_improvement: e.target.value }))}
                  placeholder="Identify areas for growth"
                  rows={3}
                  required
                  data-testid="improvement-input"
                />
              </div>

              <div>
                <Label>Rating (1-5)</Label>
                <Select value={formData.rating} onValueChange={(value) => setFormData(prev => ({ ...prev, rating: value }))}>
                  <SelectTrigger data-testid="rating-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Needs Improvement</SelectItem>
                    <SelectItem value="2">2 - Below Expectations</SelectItem>
                    <SelectItem value="3">3 - Meets Expectations</SelectItem>
                    <SelectItem value="4">4 - Exceeds Expectations</SelectItem>
                    <SelectItem value="5">5 - Outstanding</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Overall Feedback</Label>
                <Textarea 
                  value={formData.feedback} 
                  onChange={(e) => setFormData(prev => ({ ...prev, feedback: e.target.value }))}
                  placeholder="Provide overall feedback"
                  rows={4}
                  required
                  data-testid="feedback-input"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" data-testid="submit-review-btn">
                  Create Review
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Reviews</CardTitle>
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900" data-testid="total-reviews-value">
              {reviews.length}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Average Rating</CardTitle>
            <Star className="w-8 h-8 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold text-gray-900" data-testid="average-rating-value">
                {avgRating}
              </div>
              <div className="flex gap-1">
                {renderStars(Math.round(parseFloat(avgRating)))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No performance reviews found
            </CardContent>
          </Card>
        ) : (
          reviews.map(review => (
            <Card key={review.id} className="hover-card" data-testid={`review-card-${review.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      {getEmployeeName(review.employee_id)}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {review.review_period} • Reviewed by {review.reviewer_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {renderStars(review.rating)}
                    </div>
                    <span className="text-lg font-bold text-gray-900">{review.rating.toFixed(1)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Goals</h4>
                    <p className="text-sm text-gray-600">{review.goals}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Achievements</h4>
                    <p className="text-sm text-gray-600">{review.achievements}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Areas of Improvement</h4>
                    <p className="text-sm text-gray-600">{review.areas_of_improvement}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Overall Feedback</h4>
                    <p className="text-sm text-gray-600">{review.feedback}</p>
                  </div>
                  <div className="pt-2">
                    <span className={`status-badge ${
                      review.status === 'completed' ? 'status-approved' : 'status-pending'
                    }`}>
                      {review.status}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Performance;
