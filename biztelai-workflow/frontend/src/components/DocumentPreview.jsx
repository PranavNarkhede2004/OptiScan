export default function DocumentPreview({ url, fileType, filename }) {
  if (!url) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-100 rounded-lg border-2 border-dashed border-slate-300">
        <span className="text-slate-400">No document selected</span>
      </div>
    );
  }

  const isPdf = fileType === 'application/pdf' || filename?.toLowerCase().endsWith('.pdf');

  return (
    <div className="h-full w-full bg-slate-800 rounded-lg overflow-hidden flex flex-col">
      <div className="bg-slate-900 px-4 py-2 text-xs font-mono text-slate-300 truncate">
        {filename}
      </div>
      <div className="flex-1 overflow-auto bg-slate-100 relative flex items-center justify-center">
        {isPdf ? (
          <object data={url} type="application/pdf" className="w-full h-full">
            <p className="p-4 text-center">
              Your browser does not support PDFs. <a href={url} target="_blank" rel="noreferrer" className="text-indigo-600 underline">Download the PDF</a>.
            </p>
          </object>
        ) : (
          <img src={url} alt="Document Preview" className="max-w-full max-h-full object-contain" />
        )}
      </div>
    </div>
  );
}
