export default function ConfidenceBadge({ score }) {
  if (score === undefined || score === null) return null;
  
  let colorClass = 'bg-slate-100 text-slate-800';
  let dotClass = 'bg-slate-400';
  let label = 'Unknown';

  if (score >= 0.9) {
    colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotClass = 'bg-emerald-500';
    label = 'High';
  } else if (score >= 0.7) {
    colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
    dotClass = 'bg-blue-500';
    label = 'Good';
  } else if (score >= 0.5) {
    colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
    dotClass = 'bg-amber-500';
    label = 'Medium';
  } else {
    colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
    dotClass = 'bg-rose-500';
    label = 'Low';
  }

  return (
    <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`} title={`Score: ${score}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotClass}`}></span>
      {label}
    </div>
  );
}
