import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  BarChart3, 
  LayoutDashboard, 
  History,
  ShieldAlert,
  Zap,
  Network,
  Bug,
  Loader2,
  ChevronRight,
  Search,
  Trash2,
  Sparkles,
  HelpCircle,
  LogOut,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

interface BugReport {
  id: number;
  description: string;
  category: string;
  priority: string;
  source_file: string;
  timestamp: string;
  status: string;
  verified: boolean;
}

interface Stats {
  priorityStats: { priority: string; count: number }[];
  categoryStats: { category: string; count: number }[];
}

const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#10b981',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Network Error': <Network className="w-5 h-5" />,
  'Performance Issue': <Zap className="w-5 h-5" />,
  'Security Alert': <ShieldAlert className="w-5 h-5" />,
  'System Failure': <AlertCircle className="w-5 h-5" />,
  'Application Bug': <Bug className="w-5 h-5" />,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'upload' | 'training'>('dashboard');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<BugReport[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchReports();
    fetchStats();
    checkBackend();
  }, []);

  const checkBackend = async () => {
    try {
      const res = await axios.get(`${API_BASE}/health`);
      if (res.status === 200) setBackendStatus('online');
      else setBackendStatus('offline');
    } catch (e) {
      setBackendStatus('offline');
    }
  };

  const fetchReports = async () => {
    try {
      const res = await axios.get(`${API_BASE}/reports`);
      setReports(res.data);
    } catch (e) {
      console.error('Failed to fetch reports');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/stats`);
      setStats(res.data);
    } catch (e) {
      console.error('Failed to fetch stats');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    setError(null);

    try {
      const res = await axios.post(`${API_BASE}/upload`, formData);
      const data = res.data;

      if (data.reports && data.reports.length > 0) {
        await axios.post(`${API_BASE}/reports/bulk`, data.reports.map((r: any) => ({
          ...r,
          raw_content: data.content
        })));
      }

      await fetchReports();
      await fetchStats();
      setActiveTab('reports');
      setFile(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const verifyReport = async (id: number) => {
    try {
      await axios.patch(`${API_BASE}/reports/${id}`, { status: 'Verified', verified: true });
      fetchReports();
    } catch (e) {
      console.error('Failed to verify');
    }
  };

  const deleteReport = async (id: number) => {
    if (!confirm('Delete this report?')) return;
    try {
      await axios.delete(`${API_BASE}/reports/${id}`);
      fetchReports();
      fetchStats();
    } catch (e) {
      console.error('Failed to delete');
    }
  };

  const clearAll = async () => {
    if (!confirm('Clear all reports?')) return;
    try {
      await axios.delete(`${API_BASE}/reports`);
      fetchReports();
      fetchStats();
    } catch (e) {
      console.error('Failed to clear');
    }
  };

  const filteredReports = reports.filter(r => 
    r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.source_file.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex selection:bg-indigo-500/30">
      <div className="bg-mesh" />

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-80 bg-black/40 backdrop-blur-3xl border-r border-white/5 p-8 flex flex-col hidden lg:flex">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BarChart3 className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="font-extrabold text-2xl tracking-tighter">Bug <span className="text-indigo-400">Identifier</span></h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">Nexus Pipeline</p>
          </div>
        </div>

        <nav className="flex flex-col gap-3">
          <button onClick={() => setActiveTab('dashboard')} className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
            <LayoutDashboard className="w-5 h-5" /> Analytics
          </button>
          <button onClick={() => setActiveTab('reports')} className={`sidebar-item ${activeTab === 'reports' ? 'active' : ''}`}>
            <History className="w-5 h-5" /> Registry
          </button>
          <button onClick={() => setActiveTab('upload')} className={`sidebar-item ${activeTab === 'upload' ? 'active' : ''}`}>
            <Upload className="w-5 h-5" /> Processor
          </button>
          <button onClick={() => setActiveTab('training')} className={`sidebar-item ${activeTab === 'training' ? 'active' : ''}`}>
            <Activity className="w-5 h-5" /> Training
          </button>
        </nav>

        <div className="mt-auto">
          <div className="glass-card p-6 bg-indigo-500/5 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-indigo-300">FastAPI Powered</span>
            </div>
            <p className="text-[11px] text-indigo-300/60 leading-relaxed">
              Python 3.13 backend handling semantic vector analysis.
            </p>
          </div>
          
          <div className="flex items-center justify-between px-2 pt-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${backendStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                {backendStatus === 'online' ? 'System Online' : 'System Offline'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 lg:ml-80 p-6 lg:p-12 overflow-y-auto min-h-screen">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h2 className="text-5xl font-extrabold tracking-tight">System <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Intelligence</span></h2>
                  <p className="text-zinc-500 mt-3 text-lg font-medium">Monitoring and classification of complex vector logs.</p>
                </div>
                <button onClick={clearAll} className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-red-500/10 hover:text-red-500 text-zinc-400 font-bold transition-all flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Reset Data
                </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card p-8">
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Total Reports</p>
                  <p className="text-5xl font-black">{reports.length}</p>
                </div>
                <div className="glass-card p-8">
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Critical</p>
                  <p className="text-5xl font-black text-red-500">{reports.filter(r => r.priority === 'Critical').length}</p>
                </div>
                <div className="glass-card p-8">
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Verified</p>
                  <p className="text-5xl font-black text-emerald-500">{reports.filter(r => r.verified).length}</p>
                </div>
                <div className="glass-card p-8">
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Sources</p>
                  <p className="text-5xl font-black text-indigo-400">{new Set(reports.map(r => r.source_file)).size}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-card p-10">
                  <h3 className="text-xl font-bold mb-8 flex items-center gap-3"><BarChart3 className="w-6 h-6 text-indigo-400" /> Priority Map</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.priorityStats || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                        <XAxis dataKey="priority" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: '#ffffff05' }} contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff10', borderRadius: '16px' }} />
                        <Bar dataKey="count" radius={[8, 8, 8, 8]} barSize={40}>
                          {stats?.priorityStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.priority] || '#6366f1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="glass-card p-10">
                  <h3 className="text-xl font-bold mb-8 flex items-center gap-3"><Network className="w-6 h-6 text-purple-400" /> Category Mix</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats?.categoryStats || []} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="count" nameKey="category" stroke="none">
                          {stats?.categoryStats.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={['#6366f1', '#a855f7', '#ec4899', '#06b6d4'][index % 4]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff10', borderRadius: '16px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                  <h2 className="text-5xl font-extrabold tracking-tight">Issue <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Registry</span></h2>
                </div>
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                  <input type="text" placeholder="Scan registry..." className="bg-white/5 border border-white/5 rounded-3xl pl-14 pr-6 py-5 w-full focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </header>

              <div className="grid gap-4">
                {filteredReports.map((report) => (
                  <div key={report.id} className="glass-card p-8 group transition-all hover:bg-white/[0.05]">
                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border" style={{ borderColor: `${PRIORITY_COLORS[report.priority]}40`, backgroundColor: `${PRIORITY_COLORS[report.priority]}10`, color: PRIORITY_COLORS[report.priority] }}>{report.priority}</span>
                          <span className="text-xs font-bold text-zinc-400 bg-white/5 px-4 py-1 rounded-full flex items-center gap-2">
                            {CATEGORY_ICONS[report.category]} {report.category}
                          </span>
                          {report.verified && <span className="px-4 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">VERIFIED</span>}
                          <div className="flex-1 h-px bg-white/5" />
                          <span className="text-[10px] font-bold text-zinc-600">{new Date(report.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <h4 className="text-2xl font-bold mb-6">{report.description}</h4>
                        <p className="text-xs font-bold text-zinc-500">📁 {report.source_file} | ID: {report.id.toString().padStart(4, '0')}</p>
                      </div>
                      <div className="flex flex-col gap-2 border-l border-white/5 pl-8">
                        <button onClick={() => verifyReport(report.id)} className="p-4 bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-500 rounded-2xl transition-all"><Zap className="w-6 h-6" /></button>
                        <button onClick={() => deleteReport(report.id)} className="p-4 bg-white/5 hover:bg-red-500/20 hover:text-red-500 rounded-2xl transition-all"><Trash2 className="w-6 h-6" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="max-w-4xl mx-auto space-y-12 pt-12 animate-in zoom-in duration-700 text-center">
              <header>
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold mb-8 animate-float">
                  <Sparkles className="w-4 h-4" /> Available: Gemini 1.5 Flash
                </div>
                <h2 className="text-7xl font-black tracking-tighter mb-4">Pipeline <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Inbound</span></h2>
                <p className="text-zinc-500 text-xl font-medium">Transmit log data for deep architectural analysis.</p>
              </header>

              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-3xl flex items-center gap-4">{error}</div>}

              <div onClick={() => fileInputRef.current?.click()} className={`glass-card p-24 cursor-pointer transition-all ${file ? 'border-indigo-500/40 bg-indigo-500/5' : 'hover:bg-white/5'}`}>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <div className="w-32 h-32 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl">
                  {isUploading ? <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" /> : <Upload className="w-12 h-12 text-zinc-500" />}
                </div>
                <p className="text-3xl font-black">{file ? file.name : 'Transmit Log Data'}</p>
                <p className="text-sm font-bold text-zinc-500 mt-2 uppercase tracking-widest">Supported: .LOG, .TXT, .PCAP, .CSV</p>
              </div>

              <button disabled={!file || isUploading} onClick={handleUpload} className="btn-primary w-full max-w-md flex items-center justify-center gap-4 py-6 text-xl mx-auto">
                {isUploading ? <><Loader2 className="w-6 h-6 animate-spin" /> Engaging Nexus...</> : <><Zap className="w-6 h-6" /> Run Vector Analysis</>}
              </button>
            </div>
          )}

          {activeTab === 'training' && (
            <div className="space-y-12 animate-in fade-in duration-700">
               <header>
                <h2 className="text-5xl font-extrabold tracking-tight">Training <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Center</span></h2>
                <p className="text-zinc-500 mt-3 text-lg font-medium">Optimize local neural vectors using verified datasets.</p>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-card p-12 text-center">
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Verified Data</p>
                  <p className="text-7xl font-black">{reports.filter(r => r.verified).length}</p>
                  <p className="text-xs font-bold text-zinc-600 mt-4 uppercase tracking-widest">Ready for local training</p>
                </div>
                <div className="glass-card p-12 flex flex-col items-center justify-center">
                  <button 
                    onClick={async () => {
                      try { await axios.post(`${API_BASE}/train`); alert('Model Trained!'); } catch(e:any) { alert(e.response.data.detail); }
                    }} 
                    className="btn-primary w-full"
                  >
                    Initialize Neural Training
                  </button>
                  <p className="text-xs font-bold text-zinc-600 mt-6 uppercase tracking-widest text-center">Minimum 5 verified reports required</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
