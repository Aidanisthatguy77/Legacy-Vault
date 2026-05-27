import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { 
  Package, Download, RefreshCw, Shield, FileText, 
  CheckCircle, XCircle, AlertTriangle, Clock, 
  ChevronDown, ChevronUp, Wifi, WifiOff, Activity,
  Send, MessageSquare, Plus, Trash2, ExternalLink,
  Check, X, Sparkles, History, Search, Link2,
  Database, Server, Cpu, Key, Lock, Eye, EyeOff, Terminal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ============ SYSTEM PULSE INDICATOR ============
const SystemPulse = () => {
  const [health, setHealth] = useState({
    backend: false,
    database: false,
    pulse: 'checking'
  });
  const [expanded, setExpanded] = useState(false);
  const [fullHealth, setFullHealth] = useState(null);

  const checkPulse = async () => {
    try {
      const res = await axios.get(`${API}/health/pulse`, { timeout: 5000 });
      setHealth({
        backend: res.data.backend,
        database: res.data.database,
        pulse: res.data.pulse
      });
    } catch {
      setHealth({ backend: false, database: false, pulse: 'offline' });
    }
  };

  const fetchFullHealth = async () => {
    try {
      const res = await axios.get(`${API}/health`, { timeout: 10000 });
      setFullHealth(res.data);
    } catch (error) {
      setFullHealth({ status: 'error', error: error.message });
    }
  };

  useEffect(() => {
    checkPulse();
    const interval = setInterval(checkPulse, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (expanded) fetchFullHealth();
  }, [expanded]);

  const pulseColor = health.pulse === 'alive' ? 'bg-green-500' : 
                     health.pulse === 'degraded' ? 'bg-yellow-500' : 'bg-red-500';
  const pulseGlow = health.pulse === 'alive' ? 'shadow-green-500/50' :
                    health.pulse === 'degraded' ? 'shadow-yellow-500/50' : 'shadow-red-500/50';

  return (
    <div className="bg-[#09090B] p-4 rounded-lg border border-white/10">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${pulseColor} ${pulseGlow} shadow-lg animate-pulse`} />
          <span className="text-white font-medium">System Pulse</span>
          <span className="text-white/40 text-xs uppercase">{health.pulse}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Server size={14} className={health.backend ? 'text-green-400' : 'text-red-400'} />
            <span className="text-xs text-white/50">API</span>
          </div>
          <div className="flex items-center gap-2">
            <Database size={14} className={health.database ? 'text-green-400' : 'text-red-400'} />
            <span className="text-xs text-white/50">DB</span>
          </div>
          {expanded ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
        </div>
      </button>

      {expanded && fullHealth && (
        <div className="mt-4 p-4 bg-black/50 rounded border border-white/10 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/50 text-xs uppercase mb-1">Status</p>
              <p className={`font-medium ${fullHealth.status === 'healthy' ? 'text-green-400' : 'text-yellow-400'}`}>
                {fullHealth.status?.toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-white/50 text-xs uppercase mb-1">Last Check</p>
              <p className="text-white/80">{new Date(fullHealth.timestamp).toLocaleTimeString()}</p>
            </div>
            {fullHealth.database && (
              <>
                <div>
                  <p className="text-white/50 text-xs uppercase mb-1">Database</p>
                  <p className={`font-medium ${fullHealth.database.status === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                    {fullHealth.database.status}
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase mb-1">Latency</p>
                  <p className="text-white/80">{fullHealth.database.latency_ms || 0}ms</p>
                </div>
              </>
            )}
            {fullHealth.services && (
              <div>
                <p className="text-white/50 text-xs uppercase mb-1">AI Service</p>
                <p className={`font-medium ${fullHealth.services.ai === 'configured' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {fullHealth.services.ai}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============ SECRETS VAULT ============
const SecretsVault = () => {
  const [secrets, setSecrets] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showValue, setShowValue] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchSecrets = async () => {
    try {
      const res = await axios.get(`${API}/admin/secrets`);
      setSecrets(res.data);
    } catch (error) {
      console.error('Failed to fetch secrets');
    }
  };

  useEffect(() => {
    if (expanded) fetchSecrets();
  }, [expanded]);

  const saveSecret = async () => {
    if (!newKey.trim() || !newValue.trim()) {
      toast.error('Key and value are required');
      return;
    }
    
    setSaving(true);
    try {
      await axios.post(`${API}/admin/secrets`, {
        key: newKey,
        value: newValue,
        description: newDesc
      });
      toast.success(`Secret '${newKey}' saved`);
      setNewKey('');
      setNewValue('');
      setNewDesc('');
      fetchSecrets();
    } catch (error) {
      toast.error('Failed to save secret');
    }
    setSaving(false);
  };

  const deleteSecret = async (key) => {
    if (!window.confirm(`Delete secret '${key}'?`)) return;
    try {
      await axios.delete(`${API}/admin/secrets/${key}`);
      toast.success('Secret deleted');
      fetchSecrets();
    } catch (error) {
      toast.error('Failed to delete secret');
    }
  };

  const presetSecrets = [
    { key: 'VERCEL_TOKEN', desc: 'Vercel deployment token' },
    { key: 'MONGODB_URI', desc: 'Production MongoDB connection string' },
    { key: 'GEMINI_API_KEY', desc: 'Google Gemini API key for AI chat' },
    { key: 'SUPABASE_URL', desc: 'Supabase project URL' },
    { key: 'SUPABASE_KEY', desc: 'Supabase anon/service key' }
  ];

  return (
    <div className="bg-[#09090B] p-6 rounded-lg border border-white/10">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-3">
          <Key className="text-yellow-400" size={20} />
          <h3 className="font-heading text-lg font-bold text-white uppercase">Secrets Vault</h3>
          <Lock size={14} className="text-white/30" />
        </div>
        {expanded ? <ChevronUp className="text-white/50" /> : <ChevronDown className="text-white/50" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Existing secrets */}
          {secrets.length > 0 && (
            <div className="space-y-2">
              <p className="text-white/50 text-xs uppercase">Stored Secrets</p>
              {secrets.map((secret) => (
                <div key={secret.key} className="flex items-center justify-between p-3 bg-black/50 rounded border border-white/10">
                  <div className="flex-1">
                    <p className="text-white/80 font-mono text-sm">{secret.key}</p>
                    {secret.description && <p className="text-white/40 text-xs mt-1">{secret.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/50 font-mono text-xs">{secret.value}</span>
                    <button onClick={() => deleteSecret(secret.key)} className="text-red-400/50 hover:text-red-400 p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add new secret */}
          <div className="p-4 bg-black/30 rounded border border-white/10 space-y-3">
            <p className="text-white/70 text-sm font-medium">Add New Secret</p>
            
            {/* Preset buttons */}
            <div className="flex flex-wrap gap-1">
              {presetSecrets.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => { setNewKey(preset.key); setNewDesc(preset.desc); }}
                  className={`text-xs px-2 py-1 rounded border ${
                    newKey === preset.key 
                      ? 'bg-[#C8102E]/20 border-[#C8102E]/50 text-[#C8102E]' 
                      : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
                  }`}
                >
                  {preset.key}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                placeholder="SECRET_KEY"
                className="bg-black border-white/20 text-white font-mono text-sm"
              />
              <div className="relative">
                <Input
                  type={showValue.new ? 'text' : 'password'}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="secret_value"
                  className="bg-black border-white/20 text-white font-mono text-sm pr-10"
                />
                <button 
                  onClick={() => setShowValue(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                >
                  {showValue.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="bg-black border-white/20 text-white text-sm"
            />
            <Button 
              onClick={saveSecret}
              disabled={saving || !newKey.trim() || !newValue.trim()}
              className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30"
            >
              {saving ? <RefreshCw className="animate-spin mr-2" size={14} /> : <Key className="mr-2" size={14} />}
              Save Secret
            </Button>
          </div>
          
          <p className="text-white/30 text-xs">
            Secrets are encrypted and stored in the database. Use these for deployment configurations.
          </p>
        </div>
      )}
    </div>
  );
};

// Connectivity Status Indicator
const ConnectivityIndicator = ({ isOnline, isApiConnected }) => {
  const mode = isOnline && isApiConnected ? 'live' : 'vault';
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
      mode === 'live' 
        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
    }`}>
      {mode === 'live' ? (
        <>
          <Wifi size={14} className="animate-pulse" />
          <span>LIVE SYNC</span>
        </>
      ) : (
        <>
          <WifiOff size={14} />
          <span>VAULT MODE</span>
        </>
      )}
    </div>
  );
};

// Chat Message Component
const ChatMessage = ({ message, onConfirm, onReject }) => {
  const isNep = message.role === 'nep';
  
  return (
    <div className={`flex gap-3 ${isNep ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isNep ? 'bg-gradient-to-br from-[#C8102E] to-[#8B0000]' : 'bg-white/10'
      }`}>
        {isNep ? (
          <Sparkles size={16} className="text-white" />
        ) : (
          <span className="text-white/70 text-xs font-bold">YOU</span>
        )}
      </div>
      
      {/* Message Content */}
      <div className={`flex-1 max-w-[80%] ${isNep ? '' : 'text-right'}`}>
        <div className={`inline-block p-4 rounded-2xl ${
          isNep 
            ? 'bg-[#1a1a1a] border border-white/10 text-left' 
            : 'bg-[#C8102E]/20 border border-[#C8102E]/30'
        }`}>
          <p className="text-white/90 text-sm whitespace-pre-wrap">{message.content}</p>
          
          {/* URL tags if present */}
          {message.urls && message.urls.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.urls.map((url, idx) => (
                <a 
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-white/5 px-2 py-0.5 rounded text-[#C8102E] hover:bg-white/10 flex items-center gap-1"
                >
                  <Link2 size={10} /> {new URL(url).hostname}
                </a>
              ))}
            </div>
          )}
          
          {/* Proposal Card */}
          {message.has_proposal && message.proposal && (
            <div className="mt-3 p-3 bg-black/50 rounded-lg border border-yellow-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-yellow-400" />
                <span className="text-yellow-400 text-xs font-medium uppercase">Proposed Change</span>
              </div>
              
              {message.proposal.changes?.map((change, idx) => (
                <div key={idx} className="text-xs text-white/70 mb-1">
                  <span className="text-white/50">{change.key}:</span>{' '}
                  <span className="text-white/90">"{change.value}"</span>
                </div>
              ))}
              
              {message.proposal.reasoning && (
                <p className="text-white/50 text-xs mt-2 italic">{message.proposal.reasoning}</p>
              )}
              
              {/* Action Buttons */}
              {message.proposal_status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm" 
                    onClick={onConfirm}
                    className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 text-xs"
                  >
                    <Check size={14} className="mr-1" /> Let's do it
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={onReject}
                    variant="outline"
                    className="border-white/20 text-white/60 hover:bg-white/5 text-xs"
                  >
                    <X size={14} className="mr-1" /> Nah, try something else
                  </Button>
                </div>
              )}
              
              {message.proposal_status === 'approved' && (
                <div className="flex items-center gap-2 mt-3 text-green-400 text-xs">
                  <CheckCircle size={14} /> Applied
                </div>
              )}
              
              {message.proposal_status === 'rejected' && (
                <div className="flex items-center gap-2 mt-3 text-white/40 text-xs">
                  <XCircle size={14} /> Skipped
                </div>
              )}
            </div>
          )}
        </div>
        
        <p className="text-white/30 text-xs mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

// Session List Sidebar
const SessionSidebar = ({ sessions, activeSessionId, onSelectSession, onNewSession, onDeleteSession }) => {
  return (
    <div className="w-64 bg-[#0a0a0a] border-r border-white/10 flex flex-col h-full">
      <div className="p-4 border-b border-white/10">
        <Button 
          onClick={onNewSession}
          className="w-full bg-[#C8102E] hover:bg-[#9e0c24] text-white"
        >
          <Plus size={16} className="mr-2" /> New Chat
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex items-center gap-2 px-3 py-2 text-white/40 text-xs uppercase">
          <History size={12} /> History
        </div>
        
        {sessions.length === 0 ? (
          <p className="text-white/30 text-xs text-center py-4">No conversations yet</p>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  activeSessionId === session.id 
                    ? 'bg-[#C8102E]/20 border border-[#C8102E]/30' 
                    : 'hover:bg-white/5'
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm truncate">{session.title}</p>
                  <p className="text-white/30 text-xs">
                    {new Date(session.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                  className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Nep Chat Interface
const NepChat = ({ onAction }) => {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urls, setUrls] = useState([]);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef(null);

  // Fetch sessions
  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API}/nep/sessions`);
      setSessions(res.data);
    } catch (error) {
      console.error('Failed to fetch sessions');
    }
  };

  // Load session messages
  const loadSession = async (sessionId) => {
    if (!sessionId) {
      setMessages([]);
      setActiveSessionId(null);
      return;
    }
    
    try {
      const res = await axios.get(`${API}/nep/sessions/${sessionId}`);
      setMessages(res.data.messages || []);
      setActiveSessionId(sessionId);
    } catch (error) {
      toast.error('Failed to load conversation');
    }
  };

  // Delete session
  const deleteSession = async (sessionId) => {
    if (!window.confirm('Delete this conversation?')) return;
    
    try {
      await axios.delete(`${API}/nep/sessions/${sessionId}`);
      toast.success('Conversation deleted');
      fetchSessions();
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // Start new chat
  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setInput('');
    setUrls([]);
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim() && urls.length === 0) return;
    
    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
      urls: urls.length > 0 ? urls : undefined
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setUrls([]);
    setShowUrlInput(false);
    setLoading(true);
    
    try {
      const res = await axios.post(`${API}/nep/chat`, {
        session_id: activeSessionId,
        message: userMessage.content,
        urls: userMessage.urls
      });
      
      if (res.data.session_id && !activeSessionId) {
        setActiveSessionId(res.data.session_id);
        fetchSessions();
      }
      
      const nepMessage = {
        role: 'nep',
        content: res.data.response,
        timestamp: new Date().toISOString(),
        has_proposal: res.data.has_proposal,
        proposal: res.data.proposal,
        proposal_status: res.data.has_proposal ? 'pending' : null,
        message_index: res.data.message_index
      };
      
      setMessages(prev => [...prev, nepMessage]);
    } catch (error) {
      toast.error('Nep is having trouble thinking...');
      setMessages(prev => [...prev, {
        role: 'nep',
        content: "yo my bad, something's not working right. try again?",
        timestamp: new Date().toISOString()
      }]);
    }
    
    setLoading(false);
  };

  // Confirm proposal
  const confirmProposal = async (messageIndex) => {
    try {
      const res = await axios.post(`${API}/nep/confirm`, {
        session_id: activeSessionId,
        message_index: messageIndex,
        approved: true
      });
      
      if (res.data.success) {
        toast.success(res.data.message || 'Changes applied!');
        setMessages(prev => prev.map((msg, idx) => 
          idx === messageIndex ? { ...msg, proposal_status: 'approved' } : msg
        ));
        onAction?.();
      }
    } catch (error) {
      toast.error('Failed to apply changes');
    }
  };

  // Reject proposal
  const rejectProposal = async (messageIndex) => {
    try {
      await axios.post(`${API}/nep/confirm`, {
        session_id: activeSessionId,
        message_index: messageIndex,
        approved: false
      });
      
      setMessages(prev => prev.map((msg, idx) => 
        idx === messageIndex ? { ...msg, proposal_status: 'rejected' } : msg
      ));
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  // Add URL
  const addUrl = () => {
    if (urlInput.trim() && urlInput.startsWith('http')) {
      setUrls(prev => [...prev, urlInput.trim()]);
      setUrlInput('');
    }
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial load
  useEffect(() => {
    fetchSessions();
  }, []);

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[600px] bg-[#09090B] rounded-lg border border-white/10 overflow-hidden">
      {/* Sidebar */}
      {showSidebar && (
        <SessionSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={loadSession}
          onNewSession={startNewChat}
          onDeleteSession={deleteSession}
        />
      )}
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="text-white/50 hover:text-white p-1"
            >
              <MessageSquare size={18} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C8102E] to-[#8B0000] flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Nep</h3>
                <p className="text-white/40 text-xs">Your dev partner</p>
              </div>
            </div>
          </div>
          
          {loading && (
            <div className="flex items-center gap-2 text-[#C8102E] text-xs">
              <RefreshCw size={14} className="animate-spin" />
              thinking...
            </div>
          )}
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#C8102E] to-[#8B0000] flex items-center justify-center mb-4">
                <Sparkles size={28} className="text-white" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">yo, what's good?</h3>
              <p className="text-white/50 text-sm max-w-md">
                I'm Nep, your dev partner. Tell me what you wanna change on the site, 
                share some URLs for inspo, or just brainstorm with me. Let's cook.
              </p>
              
              <div className="flex flex-wrap gap-2 mt-6 max-w-md justify-center">
                {[
                  "make the hero section more impactful",
                  "I want the site to feel more premium",
                  "check out this design I like",
                  "what do you think about glassmorphism?"
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(suggestion)}
                    className="text-xs bg-white/5 border border-white/10 text-white/70 px-3 py-1.5 rounded-full hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <ChatMessage
                key={idx}
                message={msg}
                onConfirm={() => confirmProposal(idx)}
                onReject={() => rejectProposal(idx)}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* URL Chips */}
        {urls.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1">
            {urls.map((url, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-[#C8102E]/20 text-[#C8102E] text-xs px-2 py-1 rounded">
                <Link2 size={10} />
                <span className="truncate max-w-[150px]">{new URL(url).hostname}</span>
                <button onClick={() => setUrls(prev => prev.filter((_, i) => i !== idx))} className="hover:text-white">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* URL Input */}
        {showUrlInput && (
          <div className="px-4 pb-2 flex gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste a URL to analyze..."
              className="bg-black border-white/20 text-white text-sm"
              onKeyPress={(e) => e.key === 'Enter' && addUrl()}
            />
            <Button onClick={addUrl} size="sm" variant="outline" className="border-white/20 text-white">
              Add
            </Button>
            <Button onClick={() => setShowUrlInput(false)} size="sm" variant="ghost" className="text-white/50">
              <X size={16} />
            </Button>
          </div>
        )}
        
        {/* Input Area */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <Button
              onClick={() => setShowUrlInput(!showUrlInput)}
              variant="outline"
              size="icon"
              className={`border-white/20 ${showUrlInput || urls.length > 0 ? 'text-[#C8102E] border-[#C8102E]/50' : 'text-white/50'} hover:text-white`}
              title="Add URL to analyze"
            >
              <Link2 size={18} />
            </Button>
            
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="talk to Nep..."
              className="bg-black border-white/20 text-white min-h-[44px] max-h-[120px] resize-none"
              rows={1}
            />
            
            <Button
              onClick={sendMessage}
              disabled={loading || (!input.trim() && urls.length === 0)}
              className="bg-[#C8102E] hover:bg-[#9e0c24] text-white px-4"
            >
              {loading ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// The Doc Panel (keeping this from original)
const TheDocPanel = ({ onFix }) => {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  const runCheck = async () => {
    setChecking(true);
    try {
      const res = await axios.post(`${API}/neplit/doc/check`);
      setResult(res.data);
    } catch (error) {
      toast.error("Failed to run stability check");
    }
    setChecking(false);
  };

  const applyFix = async (fixType) => {
    try {
      const res = await axios.post(`${API}/neplit/doc/fix?fix_type=${fixType}`);
      if (res.data.fixed) {
        toast.success(res.data.message);
        runCheck();
        onFix?.();
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error("Failed to apply fix");
    }
  };

  return (
    <div className="bg-[#09090B] p-6 rounded-lg border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Shield className="text-purple-400" size={24} />
          <div>
            <h3 className="font-heading text-xl font-bold text-white uppercase">The Doc</h3>
            <p className="text-white/50 text-sm">Stability & health monitoring</p>
          </div>
        </div>
        <Button 
          onClick={runCheck} 
          disabled={checking}
          variant="outline"
          className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
        >
          {checking ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Activity className="mr-2" size={16} />}
          Run Check
        </Button>
      </div>

      {result && (
        <div className="space-y-4 mt-4">
          <div className={`flex items-center gap-2 p-3 rounded ${
            result.healthy ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'
          }`}>
            {result.healthy ? (
              <>
                <CheckCircle className="text-green-400" size={20} />
                <span className="text-green-400 font-medium">All systems healthy</span>
              </>
            ) : (
              <>
                <AlertTriangle className="text-yellow-400" size={20} />
                <span className="text-yellow-400 font-medium">
                  {result.issues?.length || 0} issues found
                </span>
              </>
            )}
          </div>

          {result.issues?.length > 0 && (
            <div className="space-y-2">
              {result.issues.map((issue, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-red-500/10 rounded border border-red-500/20">
                  <div>
                    <p className="text-white/80 text-sm">{issue.suggested_fix || issue.type}</p>
                    <p className="text-white/40 text-xs">Severity: {issue.severity}</p>
                  </div>
                  {issue.fix_available && (
                    <Button 
                      size="sm" 
                      onClick={() => applyFix(issue.type)}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                    >
                      Fix
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main Neplit Control Component
const NeplitControl = () => {
  const [downloading, setDownloading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isApiConnected, setIsApiConnected] = useState(true);

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${API}/neplit/logs`);
      setLogs(res.data);
    } catch (error) {
      console.error('Failed to fetch logs');
    }
  };

  // Check connectivity
  const checkConnectivity = async () => {
    try {
      await axios.get(`${API}/health`, { timeout: 5000 });
      setIsApiConnected(true);
    } catch {
      setIsApiConnected(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    checkConnectivity();
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => { setIsOnline(false); setIsApiConnected(false); };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const interval = setInterval(checkConnectivity, 30000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const downloadProject = async () => {
    setDownloading(true);
    toast.info("Generating your standalone project...");
    
    try {
      const response = await axios.get(`${API}/neplit/export`, {
        responseType: 'blob',
        timeout: 120000
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'nba2k-legacy-vault-standalone.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Download started! Your full standalone project is ready.");
      fetchLogs();
    } catch (error) {
      toast.error("Export failed. Please try again.");
    }
    setDownloading(false);
  };

  // ---- Full System Export (mongodump + source + docker-compose) ----
  const [fullExporting, setFullExporting] = useState(false);
  const [fullExportMeta, setFullExportMeta] = useState(null);

  const buildFullExport = async () => {
    setFullExporting(true);
    setFullExportMeta(null);
    toast.info("Building Full System Export — mongodump + zip…");
    try {
      const buildRes = await axios.post(
        `${API}/admin/acceleration/export/full`,
        { password: "A@070610" },
        { timeout: 300000 }
      );
      const meta = buildRes.data;
      setFullExportMeta(meta);

      // Download immediately
      const dl = await axios.get(
        `${API}/admin/acceleration/export/download/${meta.token}?password=${encodeURIComponent("A@070610")}`,
        { responseType: 'blob', timeout: 300000 }
      );
      const url = window.URL.createObjectURL(new Blob([dl.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', meta.filename || 'nba2k-vault-full.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Full export ready: ${meta.zip_size_human}, ${meta.file_count} files`);
      fetchLogs();
    } catch (error) {
      const detail = error?.response?.data?.detail || error.message;
      toast.error(`Full export failed: ${detail}`);
    }
    setFullExporting(false);
  };

  return (
    <div data-testid="neplit-control" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Package className="text-[#C8102E]" size={32} />
          <div>
            <h2 className="font-heading text-3xl font-bold text-white uppercase">Neplit</h2>
            <p className="text-white/60">Chat with Nep, export standalone builds</p>
          </div>
        </div>
        <ConnectivityIndicator isOnline={isOnline} isApiConnected={isApiConnected} />
      </div>

      {/* System Pulse */}
      <SystemPulse />

      {/* Nep Chat */}
      <NepChat onAction={fetchLogs} />

      {/* Export Section */}
      <div className="bg-gradient-to-r from-[#C8102E]/20 to-transparent p-6 rounded-lg border border-[#C8102E]/50">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <h3 className="font-heading text-xl font-bold text-white uppercase flex items-center gap-2">
              <Download size={20} className="text-[#C8102E]" />
              Generate Standalone Build
            </h3>
            <p className="text-white/70 text-sm mt-2">
              Export your complete project as an independent package with Gemini AI.
            </p>
          </div>
          <Button 
            onClick={downloadProject} 
            disabled={downloading}
            className="bg-[#C8102E] hover:bg-[#9e0c24] text-white px-6 py-5"
          >
            {downloading ? (
              <>
                <RefreshCw className="animate-spin mr-2" size={18} />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2" size={18} />
                Download ZIP
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Full System Export — source + mongodump + docker-compose */}
      <div
        className="bg-gradient-to-r from-white/5 via-[#C8102E]/10 to-transparent p-6 rounded-lg border border-white/20"
        data-testid="full-system-export-panel"
      >
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-[320px]">
            <h3 className="font-heading text-xl font-bold text-white uppercase flex items-center gap-2">
              <Package size={20} className="text-white" />
              Full System Export
            </h3>
            <p className="text-white/70 text-sm mt-2">
              Real production snapshot: frontend + backend source, a live <code className="text-[#C8102E]">mongodump</code> of every collection, plus <code className="text-[#C8102E]">docker-compose.yml</code> + Dockerfiles. Stand the site up anywhere with one command.
            </p>
            <ul className="text-white/50 text-xs mt-3 space-y-1 list-disc list-inside">
              <li>/frontend &amp; /backend source (no node_modules, no .env)</li>
              <li>/data/mongodb_dump (BSON) + /data/mongodb_json (readable)</li>
              <li>docker-compose.yml, Dockerfile.backend, Dockerfile.frontend</li>
              <li>.env.example for both services + restore_data.sh</li>
            </ul>
            {fullExportMeta && (
              <div className="mt-4 p-3 bg-black/50 border border-white/10 rounded text-xs text-white/70 space-y-1" data-testid="full-export-meta">
                <div><span className="text-white/40">File:</span> {fullExportMeta.filename}</div>
                <div><span className="text-white/40">Size:</span> {fullExportMeta.zip_size_human} ({fullExportMeta.file_count} files)</div>
                <div><span className="text-white/40">mongodump:</span> {fullExportMeta.mongodump?.success ? 'OK' : `FAILED — ${fullExportMeta.mongodump?.message}`}</div>
                <div><span className="text-white/40">Collections:</span> {fullExportMeta.json_snapshot?.collections?.length || 0} ({fullExportMeta.json_snapshot?.total_documents || 0} docs)</div>
              </div>
            )}
          </div>
          <Button
            onClick={buildFullExport}
            disabled={fullExporting}
            className="bg-white hover:bg-white/90 text-black px-6 py-5 font-bold"
            data-testid="build-full-export-btn"
          >
            {fullExporting ? (
              <>
                <RefreshCw className="animate-spin mr-2" size={18} />
                Building…
              </>
            ) : (
              <>
                <Package className="mr-2" size={18} />
                Build &amp; Download
              </>
            )}
          </Button>
        </div>
      </div>

      {/* The Doc */}
      <TheDocPanel onFix={fetchLogs} />

      {/* Secrets Vault */}
      <SecretsVault />

      {/* Action Logs */}
      <div className="bg-[#09090B] p-6 rounded-lg border border-white/10">
        <button 
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-3">
            <Clock className="text-white/50" size={20} />
            <h3 className="font-heading text-lg font-bold text-white uppercase">Action Log</h3>
            <span className="text-white/40 text-sm">({logs.length} actions)</span>
          </div>
          {showLogs ? <ChevronUp className="text-white/50" /> : <ChevronDown className="text-white/50" />}
        </button>

        {showLogs && (
          <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-4">No actions logged yet</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-black/50 rounded border border-white/5 text-sm">
                  <FileText size={14} className="text-blue-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 truncate">{log.description}</p>
                    <p className="text-white/40 text-xs mt-1">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-xs uppercase ${log.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {log.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NeplitControl;
