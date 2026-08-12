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
  Activity,
  ShieldCheck,
  CheckCircle2,
  Github,
  Send,
  Settings,
  Database,
  ExternalLink,
  X,
  Bell
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
  raw_content?: string;
  solution?: string;
  timestamp: string;
  status: string;
  verified: boolean;
  github_issue_url?: string;
}

interface Stats {
  priorityStats: { priority: string; count: number }[];
  categoryStats: { category: string; count: number }[];
}

interface DbInfo {
  engine: string;
  is_postgresql: boolean;
  has_psycopg2: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#10b981',
  Safe: '#3b82f6',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Network Error': <Network className="w-5 h-5" />,
  'Performance Issue': <Zap className="w-5 h-5" />,
  'Security Alert': <ShieldAlert className="w-5 h-5" />,
  'System Failure': <AlertCircle className="w-5 h-5" />,
  'Application Bug': <Bug className="w-5 h-5" />,
  'Safe File': <ShieldCheck className="w-5 h-5" />,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'upload' | 'documentation'>('dashboard');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successDialog, setSuccessDialog] = useState<boolean>(false);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [reports, setReports] = useState<BugReport[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEngine, setSelectedEngine] = useState<'auto' | 'groq' | 'gemini' | 'ollama'>('auto');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  
  // Settings & Integrations state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('gh_token') || '');
  const [githubRepo, setGithubRepo] = useState(() => localStorage.getItem('gh_repo') || '');
  const [discordWebhook, setDiscordWebhook] = useState(() => localStorage.getItem('discord_url') || '');
  const [slackWebhook, setSlackWebhook] = useState(() => localStorage.getItem('slack_url') || '');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchReports();
    fetchStats();
    checkBackend();
    fetchDbStatus();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isLiveMode) {
      interval = setInterval(() => {
        fetchReports();
        fetchStats();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isLiveMode]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const saveSettings = () => {
    localStorage.setItem('gh_token', githubToken);
    localStorage.setItem('gh_repo', githubRepo);
    localStorage.setItem('discord_url', discordWebhook);
    localStorage.setItem('slack_url', slackWebhook);
    setShowSettingsModal(false);
    showToast('Integration settings saved successfully!');
  };

  const checkBackend = async () => {
    try {
      const res = await axios.get(`${API_BASE}/health`);
      if (res.status === 200) {
        setBackendStatus('online');
        if (res.data.database) {
          setDbInfo({
            engine: res.data.database,
            is_postgresql: res.data.is_postgresql,
            has_psycopg2: true
          });
        }
      } else {
        setBackendStatus('offline');
      }
    } catch (e) {
      setBackendStatus('offline');
    }
  };

  const fetchDbStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/db/status`);
      setDbInfo(res.data);
    } catch (e) {
      console.error('Failed to fetch DB status');
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
    formData.append('engine_type', selectedEngine);
    setError(null);

    try {
      const res = await axios.post(`${API_BASE}/upload`, formData);
      const data = res.data;

      if (data.reports && data.reports.length > 0) {
        await axios.post(`${API_BASE}/reports/bulk`, data.reports.map((r: any) => ({
          ...r,
          raw_content: data.content
        })));
      } else {
        setSuccessDialog(true);
      }

      await fetchReports();
      await fetchStats();
      setActiveTab('reports');
      setFile(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed');
    } fontally {
      setIsUploading(false);
    }
  };

  const createGithubIssue = async (reportId: number) => {
    setActionLoading(prev => ({ ...prev, [`gh_${reportId}`]: true }));
    try {
      const res = await axios.post(`${API_BASE}/reports/${reportId}/github-issue`, {
        github_token: githubToken || undefined,
        repo: githubRepo || undefined
      });
      showToast(`GitHub Issue created: ${res.data.issue_url}`);
      fetchReports();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Failed to create GitHub Issue. Check your GitHub Token and Repo.';
      alert(`GitHub Error: ${msg}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`gh_${reportId}`]: false }));
    }
  };

  const sendWebhookAlert = async (reportId: number, platform: 'discord' | 'slack') => {
    setActionLoading(prev => ({ ...prev, [`wh_${reportId}_${platform}`]: true }));
    const webhookUrl = platform === 'discord' ? discordWebhook : slackWebhook;
    try {
      await axios.post(`${API_BASE}/reports/${reportId}/webhook`, {
        webhook_url: webhookUrl || undefined,
        platform
      });
      showToast(`Alert sent successfully to ${platform === 'discord' ? 'Discord' : 'Slack'}!`);
    } catch (e: any) {
      const msg = e.response?.data?.detail || `Failed to send ${platform} alert. Check your webhook URL.`;
      alert(`Webhook Error: ${msg}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`wh_${reportId}_${platform}`]: false }));
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
    <div className="min-h-screen flex selection:bg-indigo-500/30 text-white">
      <div className="bg-mesh" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-indigo-400/30 animate-in fade-in slide-in-from-bottom-5">
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-80 bg-black/40 backdrop-blur-3xl border-r border-white/5 p-8 flex flex-col hidden lg:flex z-20">
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
          <button onClick={() => setActiveTab('documentation')} className={`sidebar-item ${activeTab === 'documentation' ? 'active' : ''}`}>
            <FileText className="w-5 h-5" /> Documentation
          </button>
        </nav>

        <div className="mt-auto space-y-4">
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="w-full glass-card p-4 flex items-center justify-between hover:bg-white/10 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-indigo-400 group-hover:rotate-45 transition-transform" />
              <div>
                <span className="text-xs font-bold text-white block">Integrations</span>
                <span className="text-[10px] text-zinc-500">GitHub & Webhooks</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

          <div className="glass-card p-6 bg-indigo-500/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-indigo-300">Database Engine</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${dbInfo?.is_postgresql ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                {dbInfo?.engine || 'SQLITE'}
              </span>
            </div>
            <p className="text-[11px] text-indigo-300/60 leading-relaxed">
              {dbInfo?.is_postgresql ? 'Connected to PostgreSQL DB Server' : 'Running on local SQLite database'}
            </p>
          </div>
          
          <div className="flex items-center justify-between px-2 pt-2 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${backendStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                {backendStatus === 'online' ? 'System Online' : 'System Offline'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f0f14] border border-white/10 rounded-3xl p-8 max-w-xl w-full shadow-2xl relative">
            <button 
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-black">Integrations & Settings</h3>
                <p className="text-xs text-zinc-500">Configure GitHub API and Notification Webhook credentials</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* GitHub Config */}
              <div className="glass-card p-6 bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-4">
                  <Github className="w-5 h-5 text-indigo-400" />
                  <h4 className="text-sm font-bold">GitHub REST Integration</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">GitHub Personal Access Token (PAT)</label>
                    <input 
                      type="password" 
                      placeholder="ghp_xxxxxxxxxxxx" 
                      className="w-full bg-[#16161e] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Target Repository (owner/repo)</label>
                    <input 
                      type="text" 
                      placeholder="octocat/Hello-World" 
                      className="w-full bg-[#16161e] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                      value={githubRepo}
                      onChange={(e) => setGithubRepo(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Webhooks Config */}
              <div className="glass-card p-6 bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="w-5 h-5 text-purple-400" />
                  <h4 className="text-sm font-bold">Notification Webhooks</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Discord Webhook URL</label>
                    <input 
                      type="text" 
                      placeholder="https://discord.com/api/webhooks/..." 
                      className="w-full bg-[#16161e] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                      value={discordWebhook}
                      onChange={(e) => setDiscordWebhook(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Slack Webhook URL</label>
                    <input 
                      type="text" 
                      placeholder="https://hooks.slack.com/services/..." 
                      className="w-full bg-[#16161e] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                      value={slackWebhook}
                      onChange={(e) => setSlackWebhook(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={saveSettings}
                className="btn-primary px-8 py-3 rounded-2xl font-bold text-sm"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-80 p-6 lg:p-12 overflow-y-auto min-h-screen">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h2 className="text-5xl font-extrabold tracking-tight">System <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Intelligence</span></h2>
                  <p className="text-zinc-500 mt-3 text-lg font-medium">Monitoring and classification of complex vector logs.</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={clearAll} className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 font-bold transition-all flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Reset Data
                  </button>
                  <button 
                    onClick={() => setIsLiveMode(!isLiveMode)}
                    className={`px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg ${
                      isLiveMode 
                        ? 'bg-emerald-500 text-white shadow-emerald-500/20 animate-pulse' 
                        : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-indigo-500/20 hover:scale-105'
                    }`}
                  >
                    <Activity className={`w-4 h-4 ${isLiveMode ? 'animate-spin-slow' : ''}`} /> 
                    {isLiveMode ? 'Live Mode Active' : 'Live Feed'}
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card p-8 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Active Issues</p>
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400"><Bug className="w-4 h-4" /></div>
                  </div>
                  <p className="text-6xl font-black mb-4">{reports.length}</p>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Synchronized</p>
                </div>
                
                <div className="glass-card p-8 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Critical State</p>
                    <div className="p-2 rounded-xl bg-red-500/10 text-red-500"><AlertCircle className="w-4 h-4" /></div>
                  </div>
                  <p className="text-6xl font-black text-red-500 mb-4">{reports.filter(r => r.priority === 'Critical').length}</p>
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">Action Required</p>
                </div>

                <div className="glass-card p-8 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Sources</p>
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400"><Network className="w-4 h-4" /></div>
                  </div>
                  <p className="text-6xl font-black mb-4">{new Set(reports.map(r => r.source_file)).size}</p>
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">Unique Vectors</p>
                </div>

                <div className="glass-card p-8 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Engine Mode</p>
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400"><Database className="w-4 h-4" /></div>
                  </div>
                  <p className="text-3xl font-black text-indigo-400 mb-4 uppercase">{dbInfo?.engine || 'SQLite'}</p>
                  <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">DB Engine Active</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-card p-10">
                  <h3 className="text-xl font-bold mb-8 flex items-center gap-3"><BarChart3 className="w-6 h-6 text-indigo-400" /> Priority Map</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.priorityStats || []} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={1}/>
                            <stop offset="95%" stopColor="#991b1b" stopOpacity={1}/>
                          </linearGradient>
                          <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={1}/>
                            <stop offset="95%" stopColor="#c2410c" stopOpacity={1}/>
                          </linearGradient>
                          <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#eab308" stopOpacity={1}/>
                            <stop offset="95%" stopColor="#a16207" stopOpacity={1}/>
                          </linearGradient>
                          <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={1}/>
                            <stop offset="95%" stopColor="#047857" stopOpacity={1}/>
                          </linearGradient>
                          <linearGradient id="colorSafe" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={1}/>
                            <stop offset="95%" stopColor="#1d4ed8" stopOpacity={1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                        <XAxis dataKey="priority" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          cursor={{ fill: '#ffffff05' }} 
                          contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff10', borderRadius: '16px' }}
                          itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                          labelStyle={{ color: '#71717a', marginBottom: '4px' }}
                        />
                        <Bar dataKey="count" radius={[8, 8, 8, 8]} barSize={32}>
                          {stats?.priorityStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`url(#color${entry.priority})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="glass-card p-10">
                  <h3 className="text-xl font-bold mb-8 flex items-center gap-3"><Network className="w-6 h-6 text-purple-400" /> Category Mix</h3>
                  <div className="h-64 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats?.categoryStats || []} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="count" nameKey="category" stroke="none">
                          {stats?.categoryStats.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={['#6366f1', '#a855f7', '#ec4899', '#06b6d4', '#3b82f6'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff10', borderRadius: '16px' }} 
                          itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Balance</p>
                      <p className="text-3xl font-black text-white">{reports.length}</p>
                    </div>
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
                  <p className="text-zinc-500 mt-3 text-lg font-medium">Verified audit logs with AI-enhanced classification & GitHub integration.</p>
                </div>
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                  <input type="text" placeholder="Scan registry..." className="bg-[#121216] border border-white/5 rounded-2xl pl-12 pr-6 py-4 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm font-medium text-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </header>

              <div className="grid gap-4">
                {filteredReports.map((report) => (
                  <div key={report.id} className="relative bg-[#0f0f13] border border-white/5 rounded-3xl p-6 group transition-all hover:bg-[#121216] hover:border-white/10 flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4 flex-wrap">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border" style={{ borderColor: `${PRIORITY_COLORS[report.priority]}40`, backgroundColor: `${PRIORITY_COLORS[report.priority]}10`, color: PRIORITY_COLORS[report.priority] }}>{report.priority}</span>
                        <span className="text-xs font-bold text-zinc-400 bg-[#15151a] px-3 py-1 rounded-full flex items-center gap-2 border border-white/5">
                          {CATEGORY_ICONS[report.category]} {report.category}
                        </span>
                        
                        {/* GitHub badge if created */}
                        {report.github_issue_url && (
                          <a 
                            href={report.github_issue_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full flex items-center gap-1.5 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                          >
                            <Github className="w-3.5 h-3.5" /> Issue Linked <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        <div className="flex-1" />
                        <span className="text-[10px] font-bold text-zinc-600 tracking-widest">{new Date(report.timestamp).toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                      </div>
                      <h4 className="text-xl md:text-2xl font-bold mb-4 text-white/90 leading-snug max-w-4xl">{report.description}</h4>
                      {report.solution && (
                        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 mb-6">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Sparkles className="w-3 h-3"/> Recommended Solution</p>
                          <p className="text-sm font-medium text-indigo-100/70 leading-relaxed">{report.solution}</p>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-zinc-500 pt-2">
                        <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-md border border-white/5"><FileText className="w-3 h-3 text-indigo-500" /> {report.source_file}</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-700" />
                        <span>ID: {report.id.toString().padStart(4, '0')}</span>

                        {/* Integration Action Buttons */}
                        <div className="flex items-center gap-2 ml-auto flex-wrap">
                          {!report.github_issue_url && (
                            <button
                              disabled={actionLoading[`gh_${report.id}`]}
                              onClick={() => createGithubIssue(report.id)}
                              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-2 border border-white/10 transition-all"
                            >
                              {actionLoading[`gh_${report.id}`] ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Github className="w-3.5 h-3.5 text-indigo-400" />
                              )}
                              Create Issue
                            </button>
                          )}

                          <button
                            disabled={actionLoading[`wh_${report.id}_discord`]}
                            onClick={() => sendWebhookAlert(report.id, 'discord')}
                            className="px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-200 text-xs font-bold flex items-center gap-1.5 border border-indigo-500/20 transition-all"
                          >
                            {actionLoading[`wh_${report.id}_discord`] ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5 text-indigo-400" />
                            )}
                            Discord Alert
                          </button>

                          <button
                            disabled={actionLoading[`wh_${report.id}_slack`]}
                            onClick={() => sendWebhookAlert(report.id, 'slack')}
                            className="px-3 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 text-xs font-bold flex items-center gap-1.5 border border-purple-500/20 transition-all"
                          >
                            {actionLoading[`wh_${report.id}_slack`] ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5 text-purple-400" />
                            )}
                            Slack Alert
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-start gap-3 border-l border-white/5 pl-6">
                      <div className="flex gap-2">
                        <button onClick={() => deleteReport(report.id)} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-red-500/20 hover:text-red-500 rounded-xl transition-all border border-white/5 text-zinc-500"><Trash2 className="w-4 h-4" /></button>
                        <button onClick={() => verifyReport(report.id)} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 rounded-xl transition-all border border-white/5 text-zinc-500"><ChevronRight className="w-4 h-4" /></button>
                      </div>
                      {report.verified && <span className="mt-auto text-[9px] font-black tracking-[0.2em] text-indigo-500">VERIFIED</span>}
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
                
                <div className="flex flex-wrap justify-center gap-4 mt-8">
                  {[
                    { id: 'auto', label: 'Auto Detect', icon: <Sparkles className="w-4 h-4" /> },
                    { id: 'groq', label: 'Groq (Llama-3)', icon: <Zap className="w-4 h-4" /> },
                    { id: 'gemini', label: 'Gemini 1.5', icon: <Activity className="w-4 h-4" /> },
                    { id: 'ollama', label: 'Local (Ollama)', icon: <LayoutDashboard className="w-4 h-4" /> },
                  ].map((engine) => (
                    <button
                      key={engine.id}
                      onClick={() => setSelectedEngine(engine.id as any)}
                      className={`px-6 py-3 rounded-2xl border transition-all flex items-center gap-2 font-bold text-sm ${
                        selectedEngine === engine.id 
                        ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' 
                        : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'
                      }`}
                    >
                      {engine.icon} {engine.label}
                    </button>
                  ))}
                </div>
              </header>

              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-3xl flex items-center gap-4">{error}</div>}

              {successDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                  <div className="bg-[#0a0a0e] border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full shadow-[0_0_40px_rgba(16,185,129,0.15)] transform animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black text-center mb-2">File is Safe</h3>
                    <p className="text-zinc-400 text-center mb-8">The AI analyzed the log file and found no critical errors or alerts. Your file has been logged in the registry.</p>
                    <button 
                      onClick={() => setSuccessDialog(false)}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              )}

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

          {activeTab === 'documentation' && (
            <div className="space-y-12 animate-in fade-in duration-700">
               <header>
                <h2 className="text-5xl font-extrabold tracking-tight">System <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Documentation</span></h2>
                <p className="text-zinc-500 mt-3 text-lg font-medium font-medium">Access system guides and export audit data for external reporting.</p>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-card p-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
                      <LayoutDashboard className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Data Export</h3>
                      <p className="text-sm text-zinc-500">Generate external audit reports</p>
                    </div>
                  </div>
                  <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                    Download the entire bug registry in Excel-compatible CSV format. This report includes issue descriptions, priorities, categories, and AI-generated solutions.
                  </p>
                  <button 
                    onClick={async () => {
                      try {
                        const res = await axios.get(`${API_BASE}/export/excel`, { responseType: 'blob' });
                        const url = window.URL.createObjectURL(new Blob([res.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', 'registry_export.csv');
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                      } catch (err) {
                        setError('Export failed. Please ensure the backend is running.');
                      }
                    }}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-4"
                  >
                    <FileText className="w-5 h-5" /> Export Registry to Excel
                  </button>
                </div>

                <div className="glass-card p-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">System Guide</h3>
                      <p className="text-sm text-zinc-500">How to use NexLog Pipeline</p>
                    </div>
                  </div>
                  <ul className="space-y-4 text-sm text-zinc-400">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                      <span>Upload logs in the <b>Processor</b> tab to begin analysis.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                      <span>Review identified bugs and solutions in the <b>Registry</b>.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                      <span>Publish issues to <b>GitHub</b> or dispatch alerts to <b>Discord/Slack</b>.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                      <span>Configure <b>PostgreSQL DB</b> credentials in <code>.env.local</code>.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
