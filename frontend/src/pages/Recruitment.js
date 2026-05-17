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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Briefcase, Users, Edit, Trash2, Archive, CheckCircle, XCircle, Search, Filter, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const Recruitment = () => {
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [jobsTab, setJobsTab] = useState("active"); // active or archived
  
  // Candidate filters
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selectedJobTitles, setSelectedJobTitles] = useState([]);
  const [selectedExperience, setSelectedExperience] = useState([]);
  const [selectedSalary, setSelectedSalary] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState([]);
  
  const [jobFormData, setJobFormData] = useState({
    title: "",
    department: "",
    location: "",
    employment_type: "Full-time",
    salary_range: "",
    description: "",
    requirements: "",
    posted_by: "HR Team"
  });

  const [candidateFormData, setCandidateFormData] = useState({
    job_id: "",
    full_name: "",
    email: "",
    phone: "",
    experience_years: "",
    current_company: "",
    expected_salary: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [jobsRes, candidatesRes] = await Promise.all([
        axios.get(`${API}/job-postings`),
        axios.get(`${API}/candidates`)
      ]);
      setJobs(jobsRes.data);
      setCandidates(candidatesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load recruitment data");
    } finally {
      setLoading(false);
    }
  };

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingJob) {
        // Update existing job
        await axios.put(`${API}/job-postings/${editingJob.id}`, jobFormData);
        toast.success("Job posting updated successfully");
      } else {
        // Create new job
        await axios.post(`${API}/job-postings`, jobFormData);
        toast.success("Job posting created successfully");
      }
      
      setIsJobDialogOpen(false);
      setEditingJob(null);
      setJobFormData({
        title: "",
        department: "",
        location: "",
        employment_type: "Full-time",
        salary_range: "",
        description: "",
        requirements: "",
        posted_by: "HR Team"
      });
      fetchData();
    } catch (error) {
      console.error("Error saving job posting:", error);
      toast.error("Failed to save job posting");
    }
  };

  const handleEditJob = (job) => {
    setEditingJob(job);
    setJobFormData({
      title: job.title,
      department: job.department,
      location: job.location,
      employment_type: job.employment_type,
      salary_range: job.salary_range,
      description: job.description,
      requirements: job.requirements,
      posted_by: job.posted_by
    });
    setIsJobDialogOpen(true);
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Are you sure you want to delete this job posting?")) {
      return;
    }
    
    try {
      await axios.delete(`${API}/job-postings/${jobId}`);
      toast.success("Job posting deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting job posting:", error);
      toast.error("Failed to delete job posting");
    }
  };

  const handleStatusChange = async (jobId, newStatus) => {
    try {
      await axios.put(`${API}/job-postings/${jobId}/status`, {
        status: newStatus
      });
      toast.success(`Job posting ${newStatus === 'open' ? 'reopened' : newStatus} successfully`);
      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const getFilteredJobs = () => {
    if (jobsTab === "active") {
      return jobs.filter(job => job.status === 'open');
    } else {
      return jobs.filter(job => job.status !== 'open');
    }
  };

  const handleCandidateSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/candidates`, {
        ...candidateFormData,
        experience_years: parseFloat(candidateFormData.experience_years),
        expected_salary: parseFloat(candidateFormData.expected_salary)
      });
      toast.success("Candidate added successfully");
      setIsCandidateDialogOpen(false);
      setCandidateFormData({
        job_id: "",
        full_name: "",
        email: "",
        phone: "",
        experience_years: "",
        current_company: "",
        expected_salary: ""
      });
      fetchData();
    } catch (error) {
      console.error("Error adding candidate:", error);
      toast.error("Failed to add candidate");
    }
  };

  const handleStageUpdate = async (candidateId, newStage) => {
    try {
      await axios.put(`${API}/candidates/${candidateId}/stage`, {
        stage: newStage
      });
      toast.success("Candidate stage updated");
      fetchData();
    } catch (error) {
      console.error("Error updating stage:", error);
      toast.error("Failed to update stage");
    }
  };

  const getJobTitle = (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    return job ? job.title : "Unknown";
  };

  // Get unique values for filters
  const uniqueJobTitles = [...new Set(candidates.map(c => getJobTitle(c.job_id)))].filter(t => t !== "Unknown");
  const experienceRanges = ["0-2 years", "2-5 years", "5-10 years", "10+ years"];
  const salaryRanges = ["< $50k", "$50k - $80k", "$80k - $120k", "$120k+"];
  const statuses = ["screening", "interview", "technical", "offer", "rejected", "hired"];

  // Helper function to check if value is in range
  const isInExperienceRange = (experience, range) => {
    const exp = parseFloat(experience);
    if (range === "0-2 years") return exp >= 0 && exp < 2;
    if (range === "2-5 years") return exp >= 2 && exp < 5;
    if (range === "5-10 years") return exp >= 5 && exp < 10;
    if (range === "10+ years") return exp >= 10;
    return false;
  };

  const isInSalaryRange = (salary, range) => {
    const sal = parseFloat(salary);
    if (range === "< $50k") return sal < 50000;
    if (range === "$50k - $80k") return sal >= 50000 && sal < 80000;
    if (range === "$80k - $120k") return sal >= 80000 && sal < 120000;
    if (range === "$120k+") return sal >= 120000;
    return false;
  };

  // Multi-select toggle handlers
  const toggleJobTitle = (title) => {
    setSelectedJobTitles(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const toggleExperience = (range) => {
    setSelectedExperience(prev => 
      prev.includes(range) ? prev.filter(r => r !== range) : [...prev, range]
    );
  };

  const toggleSalary = (range) => {
    setSelectedSalary(prev => 
      prev.includes(range) ? prev.filter(r => r !== range) : [...prev, range]
    );
  };

  const toggleStatus = (status) => {
    setSelectedStatus(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  // Filter candidates
  const filteredCandidates = candidates.filter(candidate => {
    // Search filter - search across all fields
    if (candidateSearch) {
      const searchLower = candidateSearch.toLowerCase();
      const matchesSearch = 
        candidate.full_name.toLowerCase().includes(searchLower) ||
        candidate.email.toLowerCase().includes(searchLower) ||
        candidate.phone.includes(searchLower) ||
        (candidate.current_company && candidate.current_company.toLowerCase().includes(searchLower)) ||
        getJobTitle(candidate.job_id).toLowerCase().includes(searchLower) ||
        candidate.stage.toLowerCase().includes(searchLower) ||
        candidate.experience_years.toString().includes(searchLower) ||
        candidate.expected_salary.toString().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Job title filter
    if (selectedJobTitles.length > 0) {
      if (!selectedJobTitles.includes(getJobTitle(candidate.job_id))) return false;
    }

    // Experience filter
    if (selectedExperience.length > 0) {
      const matchesExperience = selectedExperience.some(range => 
        isInExperienceRange(candidate.experience_years, range)
      );
      if (!matchesExperience) return false;
    }

    // Salary filter
    if (selectedSalary.length > 0) {
      const matchesSalary = selectedSalary.some(range => 
        isInSalaryRange(candidate.expected_salary, range)
      );
      if (!matchesSalary) return false;
    }

    // Status filter
    if (selectedStatus.length > 0) {
      if (!selectedStatus.includes(candidate.stage)) return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div data-testid="recruitment-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Recruitment</h1>
        <p className="text-gray-600">Manage job postings and candidate pipeline</p>
      </div>

      <Tabs defaultValue="jobs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="jobs" data-testid="jobs-tab">
            <Briefcase className="w-4 h-4 mr-2" />
            Job Postings
          </TabsTrigger>
          <TabsTrigger value="candidates" data-testid="candidates-tab">
            <Users className="w-4 h-4 mr-2" />
            Candidates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          <div className="flex items-center justify-between">
            <Tabs value={jobsTab} onValueChange={setJobsTab}>
              <TabsList>
                <TabsTrigger value="active">
                  Active Jobs ({jobs.filter(j => j.status === 'open').length})
                </TabsTrigger>
                <TabsTrigger value="archived">
                  <Archive className="w-4 h-4 mr-2" />
                  Archived Jobs ({jobs.filter(j => j.status !== 'open').length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Dialog open={isJobDialogOpen} onOpenChange={(open) => {
              setIsJobDialogOpen(open);
              if (!open) {
                setEditingJob(null);
                setJobFormData({
                  title: "",
                  department: "",
                  location: "",
                  employment_type: "Full-time",
                  salary_range: "",
                  description: "",
                  requirements: "",
                  posted_by: "HR Team"
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700" data-testid="post-job-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Post Job
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingJob ? 'Edit Job Posting' : 'Create Job Posting'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleJobSubmit} className="space-y-4">
                  <div>
                    <Label>Job Title</Label>
                    <Input 
                      value={jobFormData.title} 
                      onChange={(e) => setJobFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                      data-testid="job-title-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Department</Label>
                      <Input 
                        value={jobFormData.department} 
                        onChange={(e) => setJobFormData(prev => ({ ...prev, department: e.target.value }))}
                        required
                        data-testid="job-department-input"
                      />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input 
                        value={jobFormData.location} 
                        onChange={(e) => setJobFormData(prev => ({ ...prev, location: e.target.value }))}
                        required
                        data-testid="job-location-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Employment Type</Label>
                      <Select value={jobFormData.employment_type} onValueChange={(value) => setJobFormData(prev => ({ ...prev, employment_type: value }))}>
                        <SelectTrigger data-testid="job-employment-type-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Full-time">Full-time</SelectItem>
                          <SelectItem value="Part-time">Part-time</SelectItem>
                          <SelectItem value="Contract">Contract</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Salary Range</Label>
                      <Input 
                        value={jobFormData.salary_range} 
                        onChange={(e) => setJobFormData(prev => ({ ...prev, salary_range: e.target.value }))}
                        placeholder="e.g., $60k - $80k"
                        required
                        data-testid="job-salary-input"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Job Description</Label>
                    <Textarea 
                      value={jobFormData.description} 
                      onChange={(e) => setJobFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      required
                      data-testid="job-description-input"
                    />
                  </div>

                  <div>
                    <Label>Requirements</Label>
                    <Textarea 
                      value={jobFormData.requirements} 
                      onChange={(e) => setJobFormData(prev => ({ ...prev, requirements: e.target.value }))}
                      rows={4}
                      required
                      data-testid="job-requirements-input"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" data-testid="submit-job-btn">
                      Post Job
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsJobDialogOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilteredJobs().length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center text-gray-500">
                  No {jobsTab === 'active' ? 'active' : 'archived'} job postings found
                </CardContent>
              </Card>
            ) : (
              getFilteredJobs().map(job => (
                <Card key={job.id} className="hover-card" data-testid={`job-card-${job.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <p className="text-sm text-gray-600">{job.department} • {job.location}</p>
                      </div>
                      <span className={`status-badge ${
                        job.status === 'open' ? 'status-active' : 
                        job.status === 'closed' ? 'status-inactive' :
                        'status-rejected'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <p><strong>Type:</strong> {job.employment_type}</p>
                      <p><strong>Salary:</strong> {job.salary_range}</p>
                      <p className="text-gray-600 line-clamp-2">{job.description}</p>
                      
                      {/* Status Management Buttons */}
                      <div className="pt-3 border-t border-gray-100 space-y-2">
                        <p className="text-xs font-medium text-gray-500 mb-2">Change Status:</p>
                        <div className="flex flex-wrap gap-2">
                          {job.status !== 'open' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(job.id, 'open')}
                              className="text-xs h-7"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Reopen
                            </Button>
                          )}
                          {job.status !== 'closed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(job.id, 'closed')}
                              className="text-xs h-7"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Close
                            </Button>
                          )}
                          {job.status !== 'filled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(job.id, 'filled')}
                              className="text-xs h-7"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Mark Filled
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditJob(job)}
                          className="flex-1"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteJob(job.id)}
                          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="candidates" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col gap-4 bg-gray-50 p-4 rounded-lg">
            {/* Search Bar */}
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search candidates by name, email, phone, company, job title, status..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                className="flex-1"
              />
              {candidateSearch && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCandidateSearch("")}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-3 flex-wrap">
              <Filter className="w-4 h-4 text-gray-400" />
              
              {/* Job Title Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    Job Title {selectedJobTitles.length > 0 && `(${selectedJobTitles.length})`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <p className="text-sm font-medium mb-2">Select Job Titles</p>
                    {uniqueJobTitles.map((title) => (
                      <div key={title} className="flex items-center space-x-2">
                        <Checkbox
                          id={`job-${title}`}
                          checked={selectedJobTitles.includes(title)}
                          onCheckedChange={() => toggleJobTitle(title)}
                        />
                        <label htmlFor={`job-${title}`} className="text-sm cursor-pointer">
                          {title}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Experience Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    Experience {selectedExperience.length > 0 && `(${selectedExperience.length})`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  <div className="space-y-2">
                    <p className="text-sm font-medium mb-2">Select Experience Range</p>
                    {experienceRanges.map((range) => (
                      <div key={range} className="flex items-center space-x-2">
                        <Checkbox
                          id={`exp-${range}`}
                          checked={selectedExperience.includes(range)}
                          onCheckedChange={() => toggleExperience(range)}
                        />
                        <label htmlFor={`exp-${range}`} className="text-sm cursor-pointer">
                          {range}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Salary Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    Salary {selectedSalary.length > 0 && `(${selectedSalary.length})`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  <div className="space-y-2">
                    <p className="text-sm font-medium mb-2">Select Salary Range</p>
                    {salaryRanges.map((range) => (
                      <div key={range} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sal-${range}`}
                          checked={selectedSalary.includes(range)}
                          onCheckedChange={() => toggleSalary(range)}
                        />
                        <label htmlFor={`sal-${range}`} className="text-sm cursor-pointer">
                          {range}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Status Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    Status {selectedStatus.length > 0 && `(${selectedStatus.length})`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  <div className="space-y-2">
                    <p className="text-sm font-medium mb-2">Select Status</p>
                    {statuses.map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={selectedStatus.includes(status)}
                          onCheckedChange={() => toggleStatus(status)}
                        />
                        <label htmlFor={`status-${status}`} className="text-sm cursor-pointer capitalize">
                          {status}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Clear All Filters */}
              {(selectedJobTitles.length > 0 || selectedExperience.length > 0 || 
                selectedSalary.length > 0 || selectedStatus.length > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedJobTitles([]);
                    setSelectedExperience([]);
                    setSelectedSalary([]);
                    setSelectedStatus([]);
                  }}
                  className="h-8 text-red-600 hover:text-red-700"
                >
                  Clear All
                </Button>
              )}
            </div>

            {/* Active Filters Display */}
            {(selectedJobTitles.length > 0 || selectedExperience.length > 0 || 
              selectedSalary.length > 0 || selectedStatus.length > 0) && (
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <span className="text-gray-600">Active filters:</span>
                {selectedJobTitles.map((title) => (
                  <span key={title} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                    {title}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => toggleJobTitle(title)} />
                  </span>
                ))}
                {selectedExperience.map((range) => (
                  <span key={range} className="px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                    {range}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => toggleExperience(range)} />
                  </span>
                ))}
                {selectedSalary.map((range) => (
                  <span key={range} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                    {range}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => toggleSalary(range)} />
                  </span>
                ))}
                {selectedStatus.map((status) => (
                  <span key={status} className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1 capitalize">
                    {status}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => toggleStatus(status)} />
                  </span>
                ))}
              </div>
            )}

            <div className="text-sm text-gray-600">
              Showing {filteredCandidates.length} of {candidates.length} candidates
            </div>
          </div>

          <div className="flex justify-end">
            <Dialog open={isCandidateDialogOpen} onOpenChange={setIsCandidateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700" data-testid="add-candidate-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Candidate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Candidate</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCandidateSubmit} className="space-y-4">
                  <div>
                    <Label>Job Position</Label>
                    <Select value={candidateFormData.job_id} onValueChange={(value) => setCandidateFormData(prev => ({ ...prev, job_id: value }))} required>
                      <SelectTrigger data-testid="candidate-job-select">
                        <SelectValue placeholder="Select job" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs.filter(j => j.status === 'open').map(job => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Full Name</Label>
                    <Input 
                      value={candidateFormData.full_name} 
                      onChange={(e) => setCandidateFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      required
                      data-testid="candidate-name-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Email</Label>
                      <Input 
                        type="email"
                        value={candidateFormData.email} 
                        onChange={(e) => setCandidateFormData(prev => ({ ...prev, email: e.target.value }))}
                        required
                        data-testid="candidate-email-input"
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input 
                        value={candidateFormData.phone} 
                        onChange={(e) => setCandidateFormData(prev => ({ ...prev, phone: e.target.value }))}
                        required
                        data-testid="candidate-phone-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Experience (Years)</Label>
                      <Input 
                        type="number"
                        step="0.5"
                        value={candidateFormData.experience_years} 
                        onChange={(e) => setCandidateFormData(prev => ({ ...prev, experience_years: e.target.value }))}
                        required
                        data-testid="candidate-experience-input"
                      />
                    </div>
                    <div>
                      <Label>Expected Salary</Label>
                      <Input 
                        type="number"
                        value={candidateFormData.expected_salary} 
                        onChange={(e) => setCandidateFormData(prev => ({ ...prev, expected_salary: e.target.value }))}
                        required
                        data-testid="candidate-salary-input"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Current Company</Label>
                    <Input 
                      value={candidateFormData.current_company} 
                      onChange={(e) => setCandidateFormData(prev => ({ ...prev, current_company: e.target.value }))}
                      data-testid="candidate-company-input"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" data-testid="submit-candidate-btn">
                      Add Candidate
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsCandidateDialogOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredCandidates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  {candidates.length === 0 ? "No candidates found" : "No candidates match the selected filters"}
                </CardContent>
              </Card>
            ) : (
              filteredCandidates.map(candidate => (
                <Card key={candidate.id} className="hover-card" data-testid={`candidate-card-${candidate.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{candidate.full_name}</h3>
                        <p className="text-sm text-gray-600 mb-3">{getJobTitle(candidate.job_id)}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Email: {candidate.email}</p>
                            <p className="text-gray-600">Phone: {candidate.phone}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Experience: {candidate.experience_years} years</p>
                            <p className="text-gray-600">Expected: ${candidate.expected_salary.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <Select value={candidate.stage} onValueChange={(value) => handleStageUpdate(candidate.id, value)}>
                          <SelectTrigger className="w-40" data-testid={`candidate-stage-select-${candidate.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="applied">Applied</SelectItem>
                            <SelectItem value="screening">Screening</SelectItem>
                            <SelectItem value="interview">Interview</SelectItem>
                            <SelectItem value="offered">Offered</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="hired">Hired</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Recruitment;
