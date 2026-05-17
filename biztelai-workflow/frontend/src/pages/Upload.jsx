import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import client from '../api/client';

export default function Upload() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [recentUploads, setRecentUploads] = useState([]);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentUploads();
    const interval = setInterval(fetchRecentUploads, 5000); // Poll for status updates
    return () => clearInterval(interval);
  }, []);

  const fetchRecentUploads = async () => {
    try {
      const res = await client.get('/uploads?limit=5');
      if (res.data.success) {
        setRecentUploads(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch recent uploads', err);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    setError('');
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a JPG, PNG, or PDF file.');
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.');
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('document', file);

    try {
      await client.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFile(null);
      fetchRecentUploads();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Upload Document</h1>
        <p className="mt-2 text-slate-600">Upload a manufacturing operational document for AI extraction.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div 
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white hover:bg-slate-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input 
              ref={inputRef}
              type="file" 
              className="hidden" 
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleChange}
            />
            
            <UploadCloud className="mx-auto h-16 w-16 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">
              Drag & drop your document here
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              or click to browse files (JPG, PNG, PDF up to 5MB)
            </p>
            
            <button className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors">
              Select File
            </button>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {file && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-indigo-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-900 truncate max-w-xs">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setFile(null)}
                  className="text-sm text-slate-500 hover:text-rose-600 transition-colors disabled:opacity-50"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpload}
                  disabled={uploading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-75 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : 'Upload & Extract'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-800">Recent Uploads</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {recentUploads.length === 0 ? (
                <div className="p-5 text-center text-slate-500 text-sm">
                  No recent uploads.
                </div>
              ) : (
                recentUploads.map((up) => (
                  <div key={up.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start overflow-hidden">
                        {up.status === 'processing' && <Clock className="h-5 w-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />}
                        {up.status === 'done' && <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 mr-2 flex-shrink-0" />}
                        {up.status === 'failed' && <XCircle className="h-5 w-5 text-rose-500 mt-0.5 mr-2 flex-shrink-0" />}
                        <div className="truncate">
                          <p className="text-sm font-medium text-slate-900 truncate" title={up.original_name}>
                            {up.original_name}
                          </p>
                          <p className="text-xs text-slate-500 capitalize">{up.status}</p>
                        </div>
                      </div>
                    </div>
                    {up.status === 'done' && up.record_count > 0 && (
                      <div className="mt-3">
                        <Link 
                          to={`/history?upload_id=${up.id}`}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center"
                        >
                          Review {up.record_count} extracted row{up.record_count !== 1 ? 's' : ''} &rarr;
                        </Link>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
