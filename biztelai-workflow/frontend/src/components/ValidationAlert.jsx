import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ValidationAlert({ errors = [], warnings = [] }) {
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-md flex items-start">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-medium text-emerald-800">All checks passed</h3>
          <p className="mt-1 text-sm text-emerald-600">This record is fully valid and ready for approval.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-rose-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-rose-800">Blocking Errors ({errors.length})</h3>
            <ul className="mt-1 text-sm text-rose-600 list-disc list-inside">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-md flex items-start">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">Advisory Warnings ({warnings.length})</h3>
            <ul className="mt-1 text-sm text-amber-600 list-disc list-inside">
              {warnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
