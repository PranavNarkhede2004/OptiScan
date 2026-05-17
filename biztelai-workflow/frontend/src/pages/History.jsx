import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client';
import { Search, Filter, ChevronLeft, ChevronRight, Edit } from 'lucide-react';

// Simple debounce
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function History() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uploadIdParam = searchParams.get('upload_id');
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [shift, setShift] = useState('All');
  const [status, setStatus] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchRecords();
  }, [debouncedSearch, shift, status, dateFrom, dateTo, page, uploadIdParam]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit,
        offset: page * limit,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(shift !== 'All' && { shift }),
        ...(status !== 'All' && { status }),
        ...(dateFrom && { from: dateFrom }),
        ...(dateTo && { to: dateTo }),
        ...(uploadIdParam && { upload_id: uploadIdParam }),
      });
      const res = await client.get(`/records?${params.toString()}`);
      if (res.data.success) {
        setRecords(res.data.data.records);
        setTotal(res.data.data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getAvgConfidence = (scoresStr) => {
    try {
      const scores = JSON.parse(scoresStr);
      const weights = {
        work_order_number: 3,
        quantity_produced: 3,
        employee_number: 2,
        date: 1,
        shift: 1,
        machine_number: 0.5,
        operation_code: 0.5,
        time_taken: 0.5
      };
      
      const requiredFields = ['date', 'shift', 'employee_number', 'work_order_number', 'quantity_produced'];
      let totalWeightedScore = 0;
      let totalWeight = 0;
      
      requiredFields.forEach(key => {
        const val = typeof scores[key] === 'number' ? scores[key] : 0;
        totalWeightedScore += val * weights[key];
        totalWeight += weights[key];
      });

      Object.entries(scores).forEach(([key, val]) => {
        if (!requiredFields.includes(key) && typeof val === 'number' && weights[key]) {
          totalWeightedScore += val * weights[key];
          totalWeight += weights[key];
        }
      });
      
      if (totalWeight === 0) return '-';
      const avg = totalWeightedScore / totalWeight;
      return (avg * 100).toFixed(0) + '%';
    } catch {
      return '-';
    }
  };

  const statusColors = {
    pending_review: 'bg-blue-100 text-blue-800',
    reviewed: 'bg-emerald-100 text-emerald-800',
    flagged: 'bg-amber-100 text-amber-800',
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {uploadIdParam ? 'Batch Review' : 'Record History'}
          </h1>
          <p className="mt-2 text-slate-600">Total {total} records found {uploadIdParam && 'for this document'}</p>
        </div>
        {uploadIdParam && (
          <button onClick={() => navigate('/history')} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
            Clear filter &rarr;
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 p-4 flex-shrink-0">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search WO, Machine, Employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-4">
            <select value={shift} onChange={(e) => setShift(e.target.value)} className="rounded-md border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="All">All Shifts</option>
              <option value="A">Shift A</option>
              <option value="B">Shift B</option>
              <option value="C">Shift C</option>
              <option value="Night">Night Shift</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="All">All Statuses</option>
              <option value="pending_review">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="flagged">Flagged</option>
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-md border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500" title="From Date" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-md border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500" title="To Date" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Shift</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee #</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Work Order</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Machine</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Qty</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Conf</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-slate-500">Loading records...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-slate-500">No records found matching your criteria.</td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => navigate(`/review/${r.id}`)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{r.date || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{r.shift || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">{r.employee_number || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{r.work_order_number || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{r.machine_number || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">{r.quantity_produced !== null ? r.quantity_produced : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{getAvgConfidence(r.confidence_scores)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[r.status] || 'bg-slate-100 text-slate-800'}`}>
                        {r.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900 flex items-center">
                        <Edit className="h-4 w-4 mr-1" /> Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-white px-4 py-3 border-t border-slate-200 flex items-center justify-between sm:px-6 flex-shrink-0">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-700">
                Showing <span className="font-medium">{Math.min(page * limit + 1, total)}</span> to <span className="font-medium">{Math.min((page + 1) * limit, total)}</span> of <span className="font-medium">{total}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * limit >= total}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
