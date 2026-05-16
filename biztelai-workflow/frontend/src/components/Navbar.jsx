import { Link, useLocation } from 'react-router-dom';
import { Upload, LayoutDashboard, History, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import client from '../api/client';

export default function Navbar() {
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await client.get('/records?status=pending_review&limit=1');
        if (res.data.success) {
          setPendingCount(res.data.data.total);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchPending();
    // Poll every 10 seconds to keep badge updated
    const interval = setInterval(fetchPending, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Upload', path: '/upload', icon: Upload },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'History', path: '/history', icon: History, badge: pendingCount },
  ];

  return (
    <div className="w-64 bg-slate-900 h-full text-slate-300 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-slate-800 text-white font-bold text-xl tracking-tight">
        <Activity className="mr-2 text-indigo-500" /> OptiFlow
      </div>
      <nav className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center">
                <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.name}
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        &copy; 2026 OptiFlow Industrial
      </div>
    </div>
  );
}
