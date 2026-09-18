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
  Send,
  Settings,
  Database,
  ExternalLink,
  X,
  Bell,
  Terminal,
  Radio,
  Clock,
  Lock,
  Copy,
  Check,
  Pause,
  Play
} from 'lucide-react';

const Github = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

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

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl) return 'http://localhost:8000/api';
  const trimmed = envUrl.replace(/\/$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const getWsUrl = () => {
  const apiBase = getApiBaseUrl();
  const wsProto = apiBase.startsWith('https') ? 'wss' : 'ws';
  const host = apiBase.replace(/^https?:\/\//, '').replace(/\/api$/, '');
  return `${wsProto}://${host}/api/ws/logs`;
};

const API_BASE = getApiBaseUrl();

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
  occurrence_count?: number;
  last_seen?: string;
  resolved_at?: string;
  redacted_secrets_count?: number;
}

interface Stats {
  priorityStats: { priority: string; count: number }[];
  categoryStats: { category: string; count: number }[];
  statusStats?: { status: string; count: number }[];
  totalOccurrences?: number;
  totalRedactedSecrets?: number;
  totalUniqueBugs?: number;
  mttrHours?: number;
}

interface DbInfo {
  engine: string;
  is_postgresql: boolean;
  has_psycopg2: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface LogLineEntry {
  timestamp: string;
  source: string;
  line: string;
  redacted_count?: number;
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'stream' | 'upload' | 'documentation'>('dashboard');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successDialog, setSuccessDialog] = useState<boolean>(false);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [reports, setReports] = useState<BugReport[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  
  // Settings & Integrations state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeIntegrationTab, setActiveIntegrationTab] = useState<'github' | 'discord' | 'slack' | 'telegram' | 'jira' | 'linear'>('github');
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('gh_token') || '');
  const [githubRepo, setGithubRepo] = useState(() => localStorage.getItem('gh_repo') || '');
  const [discordWebhook, setDiscordWebhook] = useState(() => localStorage.getItem('discord_url') || '');
  const [slackWebhook, setSlackWebhook] = useState(() => localStorage.getItem('slack_url') || '');
  const [telegramToken, setTelegramToken] = useState(() => localStorage.getItem('telegram_token') || '');
  const [telegramChatId, setTelegramChatId] = useState(() => localStorage.getItem('telegram_chat') || '');
  const [jiraUrl, setJiraUrl] = useState(() => localStorage.getItem('jira_url') || '');
  const [jiraEmail, setJiraEmail] = useState(() => localStorage.getItem('jira_email') || '');
  const [jiraToken, setJiraToken] = useState(() => localStorage.getItem('jira_token') || '');
  const [jiraProject, setJiraProject] = useState(() => localStorage.getItem('jira_project') || 'BUG');
  const [linearKey, setLinearKey] = useState(() => localStorage.getItem('linear_key') || '');
  
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Interactive Gemini Debug Chat Drawer State
  const [debugReport, setDebugReport] = useState<BugReport | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Live WebSocket Log Stream State
  const [wsConnected, setWsConnected] = useState(false);
  const [streamLogs, setStreamLogs] = useState<LogLineEntry[]>([]);
  const [isStreamPaused, setIsStreamPaused] = useState(false);
  const [manualLogLine, setManualLogLine] = useState('');
  const [isAnalyzingStream, setIsAnalyzingStream] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const streamBottomRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchReports();
    fetchStats();
    checkBackend();
    fetchDbStatus();
  }, []);

  // Initialize WebSocket for Live Stream
  useEffect(() => {
    let ws: WebSocket;
    const connectWs = () => {
      try {
        ws = new WebSocket(getWsUrl());
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'LOG_LINE') {
              if (!isStreamPaused) {
                setStreamLogs(prev => [...prev.slice(-300), data.data]);
              }
            } else if (data.type === 'NEW_BUG_DETECTED') {
              showToast(`🚨 Gemini detected new issue: ${data.report?.category || 'Bug'}`);
              fetchReports();
              fetchStats();
            }
          } catch (e) {}
        };

        ws.onclose = () => {
          setWsConnected(false);
          setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch (e) {
        setWsConnected(false);
      }
    };

    connectWs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isStreamPaused]);

  useEffect(() => {
    if (!isStreamPaused && streamBottomRef.current) {
      streamBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamLogs, isStreamPaused]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

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
    setTimeout(() => setToastMessage(null), 4500);
  };

  const saveSettings = () => {
    localStorage.setItem('gh_token', githubToken);
    localStorage.setItem('gh_repo', githubRepo);
    localStorage.setItem('discord_url', discordWebhook);
    localStorage.setItem('slack_url', slackWebhook);
    localStorage.setItem('telegram_token', telegramToken);
    localStorage.setItem('telegram_chat', telegramChatId);
    localStorage.setItem('jira_url', jiraUrl);
    localStorage.setItem('jira_email', jiraEmail);
    localStorage.setItem('jira_token', jiraToken);
    localStorage.setItem('jira_project', jiraProject);
    localStorage.setItem('linear_key', linearKey);
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
    formData.append('engine_type', 'gemini');
    setError(null);

    try {
      const res = await axios.post(`${API_BASE}/upload`, formData);
      const data = res.data;

      if (data.reports && data.reports.length > 0) {
        await axios.post(`${API_BASE}/reports/bulk`, data.reports.map((r: any) => ({
          ...r,
          raw_content: data.content,
          redacted_secrets_count: data.redactedSecretsCount || 0
        })));
        showToast(`Gemini analyzed ${data.reports.length} issues. (${data.redactedSecretsCount || 0} sensitive tokens scrubbed)`);
      } else {
        setSuccessDialog(true);
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

  const emitManualLog = async () => {
    if (!manualLogLine.trim()) return;
    try {
      await axios.post(`${API_BASE}/logs/stream`, {
        log_line: manualLogLine,
        source: 'terminal_input',
        auto_analyze: true
      });
      setManualLogLine('');
    } catch (e) {
      showToast('Failed to emit stream log');
    }
  };

  const scanLiveStreamWithGemini = async () => {
    if (streamLogs.length === 0) {
      showToast('No logs currently in buffer to analyze.');
      return;
    }
    setIsAnalyzingStream(true);
    try {
      const combinedLogs = streamLogs.map(l => l.line).join('\n');
      const blob = new Blob([combinedLogs], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', blob, 'live_stream_capture.log');
      formData.append('engine_type', 'gemini');

      const res = await axios.post(`${API_BASE}/upload`, formData);
      if (res.data.reports && res.data.reports.length > 0) {
        await axios.post(`${API_BASE}/reports/bulk`, res.data.reports.map((r: any) => ({
          ...r,
          raw_content: res.data.content
        })));
        showToast(`Gemini scanned buffer: ${res.data.reports.length} issues captured!`);
        fetchReports();
        fetchStats();
      } else {
        showToast('Stream scan complete: No critical errors found.');
      }
    } catch (e: any) {
      showToast('Stream analysis failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setIsAnalyzingStream(false);
    }
  };

  // Interactive Gemini Chat Handler
  const openDebugDrawer = (report: BugReport) => {
    setDebugReport(report);
    setChatMessages([
      {
        role: 'assistant',
        content: `👋 Hello! I am Nexus Gemini Assistant. I've analyzed **${report.category}** in \`${report.source_file}\`.\n\nAsk me for root cause analysis, reproduction steps, or a code patch fix!`
      }
    ]);
  };

  const sendChatMessage = async (presetText?: string) => {
    const text = presetText || chatInput;
    if (!text.trim() || !debugReport || isChatLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/reports/${debugReport.id}/chat`, {
        message: text,
        history: newHistory
      });
      setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch (e: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '❌ Error: ' + (e.response?.data?.detail || e.message) }]);
    } finally {
      setIsChatLoading(false);
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
      const msg = e.response?.data?.detail || 'Failed to create GitHub Issue. Check your GitHub Token and Repo in Integrations.';
      alert(`GitHub Error: ${msg}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`gh_${reportId}`]: false }));
    }
  };

  const sendWebhookAlert = async (reportId: number, platform: 'discord' | 'slack' | 'telegram' | 'jira' | 'linear') => {
    setActionLoading(prev => ({ ...prev, [`wh_${reportId}_${platform}`]: true }));
    try {
      const res = await axios.post(`${API_BASE}/reports/${reportId}/webhook`, {
        platform,
        webhook_url: platform === 'discord' ? discordWebhook : slackWebhook,
        telegram_bot_token: telegramToken || undefined,
        telegram_chat_id: telegramChatId || undefined,
        jira_url: jiraUrl || undefined,
        jira_email: jiraEmail || undefined,
        jira_token: jiraToken || undefined,
        jira_project: jiraProject || undefined,
        linear_api_key: linearKey || undefined
      });
      if (res.data.issue_url) {
        showToast(`Dispatched to ${platform.toUpperCase()}: ${res.data.issue_url}`);
      } else {
        showToast(`Alert sent successfully to ${platform.toUpperCase()}!`);
      }
    } catch (e: any) {
      const msg = e.response?.data?.detail || `Failed to dispatch ${platform} alert. Check integration credentials.`;
      alert(`Integration Error: ${msg}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`wh_${reportId}_${platform}`]: false }));
    }
  };

  const verifyReport = async (id: number) => {
    try {
      await axios.patch(`${API_BASE}/reports/${id}`, { status: 'Verified', verified: true });
      fetchReports();
      fetchStats();
      showToast('Report marked as Verified');
    } catch (e) {
      console.error('Failed to verify');
    }
  };

  const resolveReport = async (id: number) => {
    try {
      await axios.patch(`${API_BASE}/reports/${id}`, { status: 'Resolved', verified: true });
      fetchReports();
      fetchStats();
      showToast('Bug resolved! MTTR metrics updated.');
    } catch (e) {
      console.error('Failed to resolve');
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
      showToast('All bug reports cleared.');
    } catch (e) {
      console.error('Failed to clear');
    }
  };

  const copySolution = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = 
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.source_file.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.solution && r.solution.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filterCategory === 'All' || r.category === filterCategory;
    const matchesPriority = filterPriority === 'All' || r.priority === filterPriority;

    return matchesSearch && matchesCategory && matchesPriority;
  });

  return (
    <div className="min-h-screen flex selection:bg-indigo-500/30 text-white bg-[#09090d]">
      <div className="bg-mesh" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-600/90 backdrop-blur-xl text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-indigo-400/30 animate-in fade-in slide-in-from-bottom-5">
          <Sparkles className="w-5 h-5 text-indigo-300" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-80 bg-black/50 backdrop-blur-3xl border-r border-white/5 p-8 flex flex-col hidden lg:flex z-20">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="font-extrabold text-2xl tracking-tighter">Nexus <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Gemini</span></h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">Vector Log Platform</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2.5">
          <button onClick={() => setActiveTab('dashboard')} className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
            <LayoutDashboard className="w-5 h-5" /> Intelligence
          </button>
          <button onClick={() => setActiveTab('reports')} className={`sidebar-item ${activeTab === 'reports' ? 'active' : ''}`}>
            <History className="w-5 h-5" /> Issue Registry
          </button>
          <button onClick={() => setActiveTab('stream')} className={`sidebar-item ${activeTab === 'stream' ? 'active' : ''} relative`}>
            <Terminal className="w-5 h-5" /> Live Stream
            {wsConnected && (
              <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse" />
            )}
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
                <span className="text-[10px] text-zinc-500">GitHub, Discord, Slack, Jira...</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

          <div className="glass-card p-5 bg-indigo-500/5 border border-indigo-500/10">
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
              {dbInfo?.is_postgresql ? 'Connected to PostgreSQL DB Server' : 'Running on local SQLite DB engine'}
            </p>
          </div>
          
          <div className="flex items-center justify-between px-2 pt-2 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${backendStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                {backendStatus === 'online' ? 'Gemini Engine Online' : 'Engine Offline'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f0f16] border border-white/10 rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
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
                <h3 className="text-2xl font-black">Multi-Channel Integrations</h3>
                <p className="text-xs text-zinc-500">Configure GitHub, Discord, Slack, Telegram, Jira, and Linear</p>
              </div>
            </div>

            {/* Integration Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-4 mb-6 overflow-x-auto">
              {[
                { id: 'github', label: 'GitHub' },
                { id: 'discord', label: 'Discord' },
                { id: 'slack', label: 'Slack' },
                { id: 'telegram', label: 'Telegram' },
                { id: 'jira', label: 'Jira' },
                { id: 'linear', label: 'Linear' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveIntegrationTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeIntegrationTab === tab.id ? 'bg-indigo-500 text-white shadow-md' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {activeIntegrationTab === 'github' && (
                <div className="glass-card p-6 bg-white/[0.02]">
                  <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Github className="w-4 h-4 text-indigo-400"/> GitHub Issues</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Personal Access Token (PAT)</label>
                      <input type="password" placeholder="ghp_xxxxxxxxxxxx" className="w-full bg-[#161622] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Target Repository (owner/repo)</label>
                      <input type="text" placeholder="octocat/Hello-World" className="w-full bg-[#161622] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {activeIntegrationTab === 'discord' && (
                <div className="glass-card p-6 bg-white/[0.02]">
                  <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Send className="w-4 h-4 text-indigo-400"/> Discord Webhook</h4>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Webhook URL</label>
                    <input type="text" placeholder="https://discord.com/api/webhooks/..." className="w-full bg-[#161622] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" value={discordWebhook} onChange={(e) => setDiscordWebhook(e.target.value)} />
                  </div>
                </div>
              )}

              {activeIntegrationTab === 'slack' && (
                <div className="glass-card p-6 bg-white/[0.02]">
                  <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Bell className="w-4 h-4 text-purple-400"/> Slack Webhook</h4>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Incoming Webhook URL</label>
                    <input type="text" placeholder="https://hooks.slack.com/services/..." className="w-full bg-[#161622] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" value={slackWebhook} onChange={(e) => setSlackWebhook(e.target.value)} />
                  </div>
                </div>
              )}

              {activeIntegrationTab === 'telegram' && (
                <div className="glass-card p-6 bg-white/[0.02]">
                  <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Radio className="w-4 h-4 text-sky-400"/> Telegram Bot Alerts</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Bot Token</label>
                      <input type="password" placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ" className="w-full bg-[#161622] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" value={telegramToken} onChange={(e) => setTelegramToken(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Chat ID</label>
                      <input type="text" placeholder="-100123456789 or @channel" className="w-full bg-[#161622] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {activeIntegrationTab === 'jira' && (
                <div className="glass-card p-6 bg-white/[0.02]">
                  <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><LayoutDashboard className="w-4 h-4 text-blue-400"/> Jira Cloud</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Jira Base URL</label>
                      <input type="text" placeholder="https://your-domain.atlassian.net" className="w-full bg-[#161622] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" value={jiraUrl} onChange={(e) => setJiraUrl(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">User Email</label>
                      <input type="email" placeholder="dev@company.com" className="w-full bg-[#161622] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" value={jiraEmail} onChange={(e) => setJiraEmail(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">API Token</label>
                      <input type="password" placeholder="Atlassian API token" className="w-full bg-[#161622] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" value={jiraToken} onChange={(e) => setJiraToken(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Project Key</label>
                      <input type="text" placeholder="BUG" className="w-full bg-[#161622] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" value={jiraProject} onChange={(e) => setJiraProject(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {activeIntegrationTab === 'linear' && (
                <div className="glass-card p-6 bg-white/[0.02]">
                  <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-pink-400"/> Linear App</h4>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Linear API Key</label>
                    <input type="password" placeholder="lin_api_xxxxxxxxxxxx" className="w-full bg-[#161622] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" value={linearKey} onChange={(e) => setLinearKey(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowSettingsModal(false)} className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 font-bold text-sm transition-all">Cancel</button>
              <button onClick={saveSettings} className="btn-primary px-8 py-3 rounded-2xl font-bold text-sm">Save Configuration</button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Gemini Debug Slide-out Drawer */}
      {debugReport && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-[#0c0c14] border-l border-white/10 p-8 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between pb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black">Gemini Root-Cause Debugger</h3>
                  <p className="text-xs text-zinc-400">Interactive troubleshooting for #{debugReport.id} ({debugReport.category})</p>
                </div>
              </div>
              <button onClick={() => setDebugReport(null)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Bug Summary Card */}
            <div className="my-4 p-4 rounded-2xl bg-[#14141e] border border-white/5 text-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full font-black uppercase text-[10px]" style={{ backgroundColor: `${PRIORITY_COLORS[debugReport.priority]}20`, color: PRIORITY_COLORS[debugReport.priority] }}>
                  {debugReport.priority}
                </span>
                <span className="text-zinc-400 font-bold">{debugReport.source_file}</span>
                {debugReport.occurrence_count && debugReport.occurrence_count > 1 && (
                  <span className="ml-auto px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                    ⚡ {debugReport.occurrence_count}x Seen
                  </span>
                )}
              </div>
              <p className="font-semibold text-zinc-200 line-clamp-2">{debugReport.description}</p>
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
              {[
                'Explain root cause',
                'Generate git diff patch',
                'Give reproduction steps',
                'How to prevent in production'
              ].map(chip => (
                <button
                  key={chip}
                  disabled={isChatLoading}
                  onClick={() => sendChatMessage(chip)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-indigo-500/20 border border-white/5 hover:border-indigo-500/40 text-[11px] font-bold text-zinc-300 whitespace-nowrap transition-all"
                >
                  ⚡ {chip}
                </button>
              ))}
            </div>

            {/* Chat Conversation History */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2 my-2">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 mt-1 border border-indigo-500/30">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}
                  <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-[#161622] border border-white/5 text-zinc-200 rounded-bl-none whitespace-pre-wrap font-sans'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex gap-3 items-center text-zinc-400 text-xs">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <span>Gemini is analyzing traceback and generating resolution...</span>
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }} className="flex gap-2 pt-4 border-t border-white/10">
              <input
                type="text"
                placeholder="Ask Gemini anything about this error..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-[#161622] border border-white/10 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isChatLoading}
                className="btn-primary px-5 py-3.5 rounded-2xl font-bold flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-80 p-6 lg:p-12 overflow-y-auto min-h-screen">
        <div className="max-w-7xl mx-auto">
          
          {/* TAB 1: SYSTEM INTELLIGENCE & OBSERVABILITY DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h2 className="text-5xl font-extrabold tracking-tight">System <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Intelligence</span></h2>
                  <p className="text-zinc-400 mt-3 text-lg font-medium">Observability analytics, MTTR tracking, and Gemini semantic deduplication.</p>
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
                    {isLiveMode ? 'Live Mode Active' : 'Live Polling'}
                  </button>
                </div>
              </header>

              {/* Observability Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="glass-card p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Active Issues</p>
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400"><Bug className="w-4 h-4" /></div>
                  </div>
                  <p className="text-5xl font-black mb-2">{reports.length}</p>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Tracked Unique</p>
                </div>
                
                <div className="glass-card p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Critical State</p>
                    <div className="p-2 rounded-xl bg-red-500/10 text-red-500"><AlertCircle className="w-4 h-4" /></div>
                  </div>
                  <p className="text-5xl font-black text-red-500 mb-2">{reports.filter(r => r.priority === 'Critical').length}</p>
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">Action Required</p>
                </div>

                <div className="glass-card p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Total Events</p>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400"><Zap className="w-4 h-4" /></div>
                  </div>
                  <p className="text-5xl font-black text-amber-300 mb-2">{stats?.totalOccurrences || reports.length}</p>
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">⚡ Deduplicated</p>
                </div>

                <div className="glass-card p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Scrubbed Secrets</p>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400"><Lock className="w-4 h-4" /></div>
                  </div>
                  <p className="text-5xl font-black text-emerald-400 mb-2">{stats?.totalRedactedSecrets || 0}</p>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">🛡️ PII Masked</p>
                </div>

                <div className="glass-card p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Avg MTTR</p>
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400"><Clock className="w-4 h-4" /></div>
                  </div>
                  <p className="text-5xl font-black text-purple-400 mb-2">{stats?.mttrHours ? `${stats.mttrHours}h` : '0.4h'}</p>
                  <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">Resolution Speed</p>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-card p-10">
                  <h3 className="text-xl font-bold mb-8 flex items-center gap-3"><BarChart3 className="w-6 h-6 text-indigo-400" /> Priority Distribution</h3>
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
                        <Bar dataKey="count" radius={[8, 8, 8, 8]} barSize={36}>
                          {stats?.priorityStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`url(#color${entry.priority})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-card p-10">
                  <h3 className="text-xl font-bold mb-8 flex items-center gap-3"><Network className="w-6 h-6 text-purple-400" /> Incident Mix</h3>
                  <div className="h-64 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats?.categoryStats || []} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="count" nameKey="category" stroke="none">
                          {stats?.categoryStats.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={['#6366f1', '#a855f7', '#ec4899', '#06b6d4', '#10b981'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff10', borderRadius: '16px' }} 
                          itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Total Reports</p>
                      <p className="text-3xl font-black text-white">{reports.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ISSUE REGISTRY & GEMINI DEBUGGER */}
          {activeTab === 'reports' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-5xl font-extrabold tracking-tight">Issue <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Registry</span></h2>
                  <p className="text-zinc-400 mt-2 text-base font-medium">Gemini root-cause analysis, occurrences, interactive debug chat, and multi-channel dispatch.</p>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <select 
                    value={filterPriority} 
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="bg-[#121218] border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none"
                  >
                    <option value="All">All Priorities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>

                  <select 
                    value={filterCategory} 
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-[#121218] border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none"
                  >
                    <option value="All">All Categories</option>
                    <option value="Network Error">Network Error</option>
                    <option value="Performance Issue">Performance Issue</option>
                    <option value="Security Alert">Security Alert</option>
                    <option value="System Failure">System Failure</option>
                    <option value="Application Bug">Application Bug</option>
                  </select>

                  <div className="relative flex-1 md:w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                    <input 
                      type="text" 
                      placeholder="Search registry..." 
                      className="bg-[#121218] border border-white/10 rounded-2xl pl-11 pr-4 py-3 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium text-white" 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                  </div>
                </div>
              </header>

              <div className="grid gap-5">
                {filteredReports.length === 0 ? (
                  <div className="glass-card p-12 text-center text-zinc-500">
                    <Bug className="w-12 h-12 mx-auto mb-4 opacity-40" />
                    <p className="text-lg font-bold">No matching bug reports found.</p>
                    <p className="text-xs text-zinc-600 mt-1">Upload logs or stream live lines to generate automated analyses.</p>
                  </div>
                ) : (
                  filteredReports.map((report) => (
                    <div key={report.id} className="relative bg-[#0f0f15] border border-white/5 rounded-3xl p-6 group transition-all hover:bg-[#12121c] hover:border-white/10 flex flex-col md:flex-row gap-6 shadow-xl">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4 flex-wrap">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border" style={{ borderColor: `${PRIORITY_COLORS[report.priority]}40`, backgroundColor: `${PRIORITY_COLORS[report.priority]}15`, color: PRIORITY_COLORS[report.priority] }}>
                            {report.priority}
                          </span>
                          
                          <span className="text-xs font-bold text-zinc-400 bg-[#15151e] px-3 py-1 rounded-full flex items-center gap-2 border border-white/5">
                            {CATEGORY_ICONS[report.category] || <Bug className="w-4 h-4" />} {report.category}
                          </span>

                          {/* Occurrence Badge */}
                          {report.occurrence_count && report.occurrence_count > 1 && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                              <Zap className="w-3 h-3 text-amber-400" /> {report.occurrence_count}x Occurrences
                            </span>
                          )}

                          {/* Status Badge */}
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            report.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            report.status === 'Verified' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' :
                            'bg-zinc-800 text-zinc-400 border-white/5'
                          }`}>
                            {report.status}
                          </span>
                          
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
                          <span className="text-[10px] font-bold text-zinc-500 tracking-widest flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {new Date(report.timestamp).toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>

                        <h4 className="text-xl md:text-2xl font-bold mb-4 text-white/95 leading-snug max-w-4xl">{report.description}</h4>
                        
                        {/* Gemini Solution Box */}
                        {report.solution && (
                          <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-2xl p-4 mb-6 relative group/sol">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                <Sparkles className="w-3 h-3 text-indigo-400"/> Gemini AI Recommended Fix
                              </p>
                              <button
                                onClick={() => copySolution(report.id, report.solution || '')}
                                className="text-zinc-500 hover:text-white p-1 rounded-lg transition-all"
                                title="Copy solution"
                              >
                                {copiedId === report.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <p className="text-sm font-medium text-indigo-100/80 leading-relaxed">{report.solution}</p>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-zinc-500 pt-2">
                          <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5"><FileText className="w-3.5 h-3.5 text-indigo-400" /> {report.source_file}</span>
                          <span className="w-1 h-1 rounded-full bg-zinc-700" />
                          <span>ID: #{report.id.toString().padStart(4, '0')}</span>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 ml-auto flex-wrap">
                            {/* Gemini Interactive Debug Button */}
                            <button
                              onClick={() => openDebugDrawer(report)}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 text-indigo-200 text-xs font-bold flex items-center gap-1.5 border border-indigo-500/30 transition-all shadow-md shadow-indigo-500/5"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                              Gemini Debug
                            </button>

                            {/* GitHub Action */}
                            {!report.github_issue_url && (
                              <button
                                disabled={actionLoading[`gh_${report.id}`]}
                                onClick={() => createGithubIssue(report.id)}
                                className="px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 border border-white/10 transition-all"
                              >
                                {actionLoading[`gh_${report.id}`] ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Github className="w-3.5 h-3.5 text-indigo-400" />
                                )}
                                Issue
                              </button>
                            )}

                            {/* Multi-channel alert triggers */}
                            <button
                              disabled={actionLoading[`wh_${report.id}_discord`]}
                              onClick={() => sendWebhookAlert(report.id, 'discord')}
                              className="px-2.5 py-1.5 rounded-xl bg-indigo-950/50 hover:bg-indigo-900/50 text-indigo-300 text-xs font-bold flex items-center gap-1 border border-indigo-500/20 transition-all"
                              title="Send Discord Alert"
                            >
                              <Send className="w-3.5 h-3.5" /> Discord
                            </button>

                            <button
                              disabled={actionLoading[`wh_${report.id}_telegram`]}
                              onClick={() => sendWebhookAlert(report.id, 'telegram')}
                              className="px-2.5 py-1.5 rounded-xl bg-sky-950/50 hover:bg-sky-900/50 text-sky-300 text-xs font-bold flex items-center gap-1 border border-sky-500/20 transition-all"
                              title="Send Telegram Alert"
                            >
                              <Radio className="w-3.5 h-3.5" /> Telegram
                            </button>

                            <button
                              disabled={actionLoading[`wh_${report.id}_jira`]}
                              onClick={() => sendWebhookAlert(report.id, 'jira')}
                              className="px-2.5 py-1.5 rounded-xl bg-blue-950/50 hover:bg-blue-900/50 text-blue-300 text-xs font-bold flex items-center gap-1 border border-blue-500/20 transition-all"
                              title="Create Jira Bug"
                            >
                              Jira
                            </button>

                            {report.status !== 'Resolved' && (
                              <button
                                onClick={() => resolveReport(report.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 text-xs font-bold flex items-center gap-1.5 border border-emerald-500/30 transition-all"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-start gap-3 border-l border-white/5 pl-6">
                        <div className="flex gap-2">
                          <button onClick={() => deleteReport(report.id)} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all border border-white/5 text-zinc-500"><Trash2 className="w-4 h-4" /></button>
                          <button onClick={() => verifyReport(report.id)} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 rounded-xl transition-all border border-white/5 text-zinc-500"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LIVE WEBSOCKET LOG STREAM TERMINAL */}
          {activeTab === 'stream' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-5xl font-extrabold tracking-tight">Live Stream <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Terminal</span></h2>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 ${
                      wsConnected ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                      {wsConnected ? 'WebSocket Live' : 'Disconnected'}
                    </span>
                  </div>
                  <p className="text-zinc-400 mt-2 text-base font-medium">Real-time log tailing gateway with deep secret scrubbing & auto-scan triggers.</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsStreamPaused(!isStreamPaused)}
                    className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 font-bold text-xs flex items-center gap-2 transition-all"
                  >
                    {isStreamPaused ? <><Play className="w-4 h-4 text-emerald-400" /> Resume Stream</> : <><Pause className="w-4 h-4 text-amber-400" /> Pause Stream</>}
                  </button>

                  <button
                    onClick={() => setStreamLogs([])}
                    className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 font-bold text-xs flex items-center gap-2 transition-all text-zinc-400"
                  >
                    <Trash2 className="w-4 h-4" /> Clear Terminal
                  </button>

                  <button
                    disabled={isAnalyzingStream || streamLogs.length === 0}
                    onClick={scanLiveStreamWithGemini}
                    className="btn-primary px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2"
                  >
                    {isAnalyzingStream ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Scan Buffer with Gemini
                  </button>
                </div>
              </header>

              {/* Cyberpunk Terminal Window */}
              <div className="bg-[#08080c] border border-white/10 rounded-3xl p-6 font-mono shadow-2xl relative min-h-[500px] max-h-[650px] flex flex-col">
                <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4 text-xs text-zinc-500">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-3 text-zinc-400 font-bold">nexus-stream-tailer.log</span>
                  </div>
                  <span>Buffer: {streamLogs.length} events</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 text-xs leading-relaxed pr-2">
                  {streamLogs.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-zinc-600">
                      <Terminal className="w-10 h-10 mb-2 opacity-30" />
                      <p>Awaiting live log lines from daemon or manual injector...</p>
                      <p className="text-[11px] text-zinc-700 mt-1">Try injecting a test error line below!</p>
                    </div>
                  ) : (
                    streamLogs.map((log, index) => {
                      const isError = /error|exception|fatal|panic|critical/i.test(log.line);
                      return (
                        <div key={index} className={`p-2 rounded-lg flex items-start gap-3 transition-all ${isError ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'hover:bg-white/[0.02] text-zinc-300'}`}>
                          <span className="text-zinc-600 select-none text-[10px] mt-0.5">{log.timestamp.split('T')[1]?.slice(0, 8) || '00:00:00'}</span>
                          <span className="text-indigo-400 text-[10px] font-bold">[{log.source}]</span>
                          <span className="flex-1 font-mono break-all">{log.line}</span>
                          {log.redacted_count && log.redacted_count > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                              🔒 {log.redacted_count} scrubbed
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={streamBottomRef} />
                </div>

                {/* Manual Log Injector Bar */}
                <form onSubmit={(e) => { e.preventDefault(); emitManualLog(); }} className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                  <input
                    type="text"
                    placeholder="Inject a raw log line (e.g., '2026-09-18 ERROR [auth_service] DB connection timeout at postgresql://user:pass@host:5432/db')..."
                    value={manualLogLine}
                    onChange={(e) => setManualLogLine(e.target.value)}
                    className="flex-1 bg-[#101018] border border-white/10 rounded-2xl px-5 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white font-mono"
                  />
                  <button type="submit" className="btn-primary px-6 py-3 rounded-2xl text-xs font-bold flex items-center gap-2">
                    <Send className="w-3.5 h-3.5" /> Inject
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: PROCESSOR (GEMINI UPLOAD) */}
          {activeTab === 'upload' && (
            <div className="max-w-4xl mx-auto space-y-12 pt-8 animate-in zoom-in duration-700 text-center">
              <header>
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold mb-6 animate-float">
                  <Sparkles className="w-4 h-4" /> Powered Exclusively by Google Gemini 1.5 Flash
                </div>
                <h2 className="text-7xl font-black tracking-tighter mb-4">Pipeline <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Inbound</span></h2>
                <p className="text-zinc-400 text-xl font-medium">Transmit log files for deep automated root-cause analysis and automated PII sanitization.</p>
              </header>

              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-3xl flex items-center gap-4 text-sm font-semibold">{error}</div>}

              {successDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                  <div className="bg-[#0a0a10] border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full shadow-[0_0_40px_rgba(16,185,129,0.2)] transform animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black text-center mb-2">Logs Clean & Safe</h3>
                    <p className="text-zinc-400 text-center mb-8 text-sm">Google Gemini analyzed the file and identified no critical failures. Log sanitized and registered.</p>
                    <button onClick={() => setSuccessDialog(false)} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all">
                      Acknowledge
                    </button>
                  </div>
                </div>
              )}

              <div onClick={() => fileInputRef.current?.click()} className={`glass-card p-20 cursor-pointer transition-all ${file ? 'border-indigo-500/40 bg-indigo-500/5' : 'hover:bg-white/5'}`}>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <div className="w-28 h-28 bg-zinc-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl border border-white/5">
                  {isUploading ? <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" /> : <Upload className="w-12 h-12 text-zinc-500" />}
                </div>
                <p className="text-3xl font-black">{file ? file.name : 'Transmit Log Data'}</p>
                <p className="text-xs font-bold text-zinc-500 mt-2 uppercase tracking-widest">Supported: .LOG, .TXT, .PCAP, .CSV (Automatic Secret Redactor Active)</p>
              </div>

              <button disabled={!file || isUploading} onClick={handleUpload} className="btn-primary w-full max-w-md flex items-center justify-center gap-4 py-5 text-lg mx-auto font-bold rounded-2xl">
                {isUploading ? <><Loader2 className="w-6 h-6 animate-spin" /> Gemini Processing...</> : <><Zap className="w-6 h-6" /> Run Gemini Vector Analysis</>}
              </button>
            </div>
          )}

          {/* TAB 5: DOCUMENTATION & EXPORT */}
          {activeTab === 'documentation' && (
            <div className="space-y-12 animate-in fade-in duration-700">
              <header>
                <h2 className="text-5xl font-extrabold tracking-tight">System <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Documentation</span></h2>
                <p className="text-zinc-400 mt-3 text-lg font-medium">Export audit data and view platform architecture guides.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-card p-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
                      <LayoutDashboard className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Data Export</h3>
                      <p className="text-sm text-zinc-500">Generate CSV & Excel audit reports</p>
                    </div>
                  </div>
                  <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                    Download the entire bug registry including occurrence counters, last seen timestamps, and Gemini AI recommended fix recommendations.
                  </p>
                  <button 
                    onClick={async () => {
                      try {
                        const res = await axios.get(`${API_BASE}/export/excel`, { responseType: 'blob' });
                        const url = window.URL.createObjectURL(new Blob([res.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', 'nexus_gemini_registry.csv');
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                      } catch (err) {
                        setError('Export failed. Please ensure the backend is running.');
                      }
                    }}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold"
                  >
                    <FileText className="w-5 h-5" /> Export Registry to CSV
                  </button>
                </div>

                <div className="glass-card p-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Platform Capabilities</h3>
                      <p className="text-sm text-zinc-500">Features overview</p>
                    </div>
                  </div>
                  <ul className="space-y-4 text-sm text-zinc-400">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                      <span><b>Gemini 1.5 Flash:</b> Automated root-cause detection & structured bug classification.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                      <span><b>Live WebSocket Stream:</b> Real-time log tailing & daemon ingestion.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                      <span><b>Deep Redaction:</b> Masking AWS keys, JWTs, Bearer headers, and DB credentials.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                      <span><b>Semantic Deduplication:</b> Grouping identical stack traces with occurrence counters.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                      <span><b>Multi-Channel Dispatch:</b> 1-click issues to GitHub, Discord, Slack, Telegram, Jira, and Linear.</span>
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
