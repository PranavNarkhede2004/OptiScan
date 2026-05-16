import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import FieldEditor from '../components/FieldEditor';
import ValidationAlert from '../components/ValidationAlert';
import DocumentPreview from '../components/DocumentPreview';
import { ArrowLeft, Save, Flag, Trash2 } from 'lucide-react';

export default function Review() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchRecord();
  }, [id]);

  const fetchRecord = async () => {
    try {
      const res = await client.get(`/records/${id}`);
      if (res.data.success) {
        const data = res.data.data;
        setRecord(data);
        setFormData({
          date: data.date || '',
          shift: data.shift || '',
          employee_number: data.employee_number || '',
          operation_code: data.operation_code || '',
          machine_number: data.machine_number || '',
          work_order_number: data.work_order_number || '',
          quantity_produced: data.quantity_produced !== null ? data.quantity_produced : '',
          time_taken: data.time_taken !== null ? data.time_taken : '',
          supervisor: data.supervisor || '',
          product_code: data.product_code || '',
          remarks: data.remarks || '',
        });
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading record', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (status) => {
    setSaving(true);
    try {
      // prepare data
      const payload = { ...formData, status };
      // convert numbers
      if (payload.quantity_produced) payload.quantity_produced = Number(payload.quantity_produced);
      if (payload.time_taken) payload.time_taken = Number(payload.time_taken);

      const res = await client.patch(`/records/${id}`, payload);
      if (res.data.success) {
        showToast('Record updated successfully');
        setRecord((prev) => ({
          ...prev,
          ...res.data.data,
          validation_errors: res.data.data.errors || [], // from patch response validationResult
          validation_warnings: res.data.data.warnings || []
        }));
        if (status === 'reviewed') {
          setTimeout(() => navigate('/history'), 1500);
        }
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to discard this record?')) return;
    try {
      await client.delete(`/records/${id}`);
      navigate('/history');
    } catch (err) {
      showToast('Delete failed', 'error');
    }
  };

  const getFieldError = (fieldName) => {
    if (!record?.validation_errors) return null;
    // Map backend error messages to fields by string matching (simplified for UI)
    const errors = record.validation_errors;
    const nameMap = {
      date: 'Date', shift: 'shift', employee_number: 'Employee number',
      work_order_number: 'Work order', machine_number: 'machine number',
      operation_code: 'operation code', quantity_produced: 'Quantity produced'
    };
    const key = nameMap[fieldName];
    if (!key) return null;
    return errors.find(e => e.toLowerCase().includes(key.toLowerCase()));
  };

  const getFieldWarning = (fieldName) => {
    if (!record?.validation_warnings) return null;
    const warnings = record.validation_warnings;
    const nameMap = {
      quantity_produced: 'quantity', time_taken: 'Time taken',
      supervisor: 'Supervisor', product_code: 'Product code'
    };
    const key = nameMap[fieldName];
    if (key) {
      const match = warnings.find(w => w.toLowerCase().includes(key.toLowerCase()));
      if (match) return match;
    }
    // Check for low confidence warning
    return warnings.find(w => w.includes(`Low confidence on field: ${fieldName}`));
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading record...</div>;
  }

  if (!record) {
    return <div className="p-8 text-center text-rose-500">Record not found.</div>;
  }

  const errors = record.validation_errors || [];
  const warnings = record.validation_warnings || [];
  const scores = record.confidence_scores || {};
  const docUrl = `/api/data/uploads/${record.filename}`;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded shadow-lg z-50 transition-opacity ${toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0 z-10 shadow-sm">
        <div className="flex items-center">
          <button onClick={() => navigate('/history')} className="mr-4 text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center">
              Review Record 
              <span className={`ml-3 px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider
                ${record.status === 'reviewed' ? 'bg-emerald-100 text-emerald-800' : 
                  record.status === 'flagged' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                {record.status.replace('_', ' ')}
              </span>
            </h1>
            <p className="text-sm text-slate-500">Extracted from: {record.filename}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleDelete}
            className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Discard
          </button>
          <button 
            onClick={() => handleSave('flagged')}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-white border border-amber-300 rounded-md text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
          >
            <Flag className="h-4 w-4 mr-2" /> Flag Issue
          </button>
          <button 
            onClick={() => handleSave('reviewed')}
            disabled={saving || errors.length > 0}
            className="flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Save className="h-4 w-4 mr-2" /> Save & Approve
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        
        {/* Left pane: Document Preview */}
        <div className="lg:w-1/2 p-6 bg-slate-200 border-r border-slate-300 overflow-hidden flex flex-col">
          <DocumentPreview url={docUrl} fileType={record.file_type} filename={record.filename} />
        </div>

        {/* Right pane: Form */}
        <div className="lg:w-1/2 bg-slate-50 overflow-y-auto">
          <div className="p-6 max-w-2xl mx-auto space-y-6">
            
            <ValidationAlert errors={errors} warnings={warnings} />

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-6 border-b pb-2">Operational Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <FieldEditor 
                  label="Date" name="date" type="date"
                  value={formData.date} onChange={handleChange}
                  confidence={scores.date} error={getFieldError('date')} warning={getFieldWarning('date')}
                />
                <FieldEditor 
                  label="Shift" name="shift" type="select" options={['A', 'B', 'C', 'Night']}
                  value={formData.shift} onChange={handleChange}
                  confidence={scores.shift} error={getFieldError('shift')} warning={getFieldWarning('shift')}
                />
                <FieldEditor 
                  label="Employee Number" name="employee_number"
                  value={formData.employee_number} onChange={handleChange}
                  confidence={scores.employee_number} error={getFieldError('employee_number')} warning={getFieldWarning('employee_number')}
                />
                <FieldEditor 
                  label="Supervisor" name="supervisor"
                  value={formData.supervisor} onChange={handleChange}
                  confidence={scores.supervisor} error={getFieldError('supervisor')} warning={getFieldWarning('supervisor')}
                />
              </div>

              <h2 className="text-lg font-semibold text-slate-800 mb-6 mt-8 border-b pb-2">Production Data</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <FieldEditor 
                  label="Work Order Number" name="work_order_number"
                  value={formData.work_order_number} onChange={handleChange}
                  confidence={scores.work_order_number} error={getFieldError('work_order_number')} warning={getFieldWarning('work_order_number')}
                />
                <FieldEditor 
                  label="Product Code" name="product_code"
                  value={formData.product_code} onChange={handleChange}
                  confidence={scores.product_code} error={getFieldError('product_code')} warning={getFieldWarning('product_code')}
                />
                <FieldEditor 
                  label="Machine Number" name="machine_number" placeholder="MCH-XXXX"
                  value={formData.machine_number} onChange={handleChange}
                  confidence={scores.machine_number} error={getFieldError('machine_number')} warning={getFieldWarning('machine_number')}
                />
                <FieldEditor 
                  label="Operation Code" name="operation_code" placeholder="OPC-XXXX"
                  value={formData.operation_code} onChange={handleChange}
                  confidence={scores.operation_code} error={getFieldError('operation_code')} warning={getFieldWarning('operation_code')}
                />
                <FieldEditor 
                  label="Quantity Produced" name="quantity_produced" type="number"
                  value={formData.quantity_produced} onChange={handleChange}
                  confidence={scores.quantity_produced} error={getFieldError('quantity_produced')} warning={getFieldWarning('quantity_produced')}
                />
                <FieldEditor 
                  label="Time Taken (hours)" name="time_taken" type="number" step="0.1"
                  value={formData.time_taken} onChange={handleChange}
                  confidence={scores.time_taken} error={getFieldError('time_taken')} warning={getFieldWarning('time_taken')}
                />
              </div>

              <h2 className="text-lg font-semibold text-slate-800 mb-6 mt-8 border-b pb-2">Additional Information</h2>
              <FieldEditor 
                label="Remarks" name="remarks" type="textarea"
                value={formData.remarks} onChange={handleChange}
                confidence={scores.remarks} error={getFieldError('remarks')} warning={getFieldWarning('remarks')}
              />
            </div>
            <div className="pb-10"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
