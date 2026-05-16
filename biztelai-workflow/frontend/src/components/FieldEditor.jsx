import ConfidenceBadge from './ConfidenceBadge';

export default function FieldEditor({ 
  label, name, value, type = 'text', options = [], 
  onChange, confidence, error, warning 
}) {
  const isLowConfidence = confidence !== undefined && confidence !== null && confidence < 0.5;
  const hasError = !!error;
  
  let borderClass = 'border-slate-300';
  if (hasError) borderClass = 'border-rose-500 ring-rose-500 focus:border-rose-500 focus:ring-rose-500';
  else if (isLowConfidence) borderClass = 'border-amber-400 ring-amber-400 focus:border-amber-500 focus:ring-amber-500';
  else borderClass = 'focus:ring-indigo-500 focus:border-indigo-500';

  const inputClass = `mt-1 block w-full rounded-md shadow-sm sm:text-sm px-3 py-2 border ${borderClass} bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 transition-colors`;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-end mb-1">
        <label htmlFor={name} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
        {confidence !== undefined && <ConfidenceBadge score={confidence} />}
      </div>
      
      {type === 'select' ? (
        <select
          id={name}
          name={name}
          value={value || ''}
          onChange={onChange}
          className={inputClass}
        >
          <option value="">-- Select --</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={value || ''}
          onChange={onChange}
          rows={3}
          className={inputClass}
        />
      ) : (
        <input
          type={type}
          id={name}
          name={name}
          value={value || ''}
          onChange={onChange}
          className={inputClass}
        />
      )}

      {error && (
        <p className="mt-1 text-sm text-rose-600">{error}</p>
      )}
      {!error && warning && (
        <p className="mt-1 text-sm text-amber-600">{warning}</p>
      )}
    </div>
  );
}
