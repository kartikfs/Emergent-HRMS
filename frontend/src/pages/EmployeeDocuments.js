import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, toast } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, Download } from "lucide-react";

const EmployeeDocuments = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState("id_proof");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    const token = localStorage.getItem("employee_token");
    try {
      const response = await axios.get(`${API}/employee/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(response.data);
    } catch (error) {
      if (error.response?.status === 401) navigate("/employee/login");
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    const token = localStorage.getItem("employee_token");
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      await axios.post(`${API}/employee/documents/upload?document_type=${documentType}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      toast.success("Document uploaded successfully");
      setIsDialogOpen(false);
      setSelectedFile(null);
      fetchDocuments();
    } catch (error) {
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (docId, fileName) => {
    const token = localStorage.getItem("employee_token");
    try {
      const response = await axios.get(`${API}/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("Failed to download document");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div data-testid="employee-documents">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Documents</h1>
          <p className="text-gray-600">Upload and manage your documents</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="upload-doc-btn">
              <Upload className="w-4 h-4 mr-2" />Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <Label>Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger data-testid="doc-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id_proof">ID Proof</SelectItem>
                    <SelectItem value="address_proof">Address Proof</SelectItem>
                    <SelectItem value="educational_certificate">Educational Certificate</SelectItem>
                    <SelectItem value="experience_letter">Experience Letter</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Choose File</Label>
                <Input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} required data-testid="file-input" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={uploading} data-testid="submit-upload-btn">
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>My Documents ({documents.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>File Name</TableHead><TableHead>Document Type</TableHead><TableHead>Uploaded Date</TableHead><TableHead>Action</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500">No documents uploaded</TableCell></TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" />{doc.file_name}</TableCell>
                    <TableCell className="capitalize">{doc.document_type.replace(/_/g, ' ')}</TableCell>
                    <TableCell>{new Date(doc.uploaded_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleDownload(doc.id, doc.file_name)} data-testid={`download-${doc.id}`}>
                        <Download className="w-4 h-4 mr-1" />Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeDocuments;
