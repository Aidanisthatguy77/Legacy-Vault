import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  CheckCircle, XCircle, RefreshCw, Send, Sparkles, BookOpen,
  Terminal, FileEdit, FileText, FolderOpen, Package, Power, ChevronDown, ChevronRight,
  Trash2, Plus, History, X, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const ADMIN_PASSWORD = "A@070610";

// ============ HISTORY DRAWER ============
const HistoryDrawer = ({ open, onClose, onLoadAccSession }) => {
  const [accSessions, setAccSessions] = useState([]);
  const [vaultSessions, setVaultSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openVault, setOpenVault] = useState(null); // session_id of expanded vault session
  const [vaultMessages, setVaultMessages] = useState([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [a, v] = await Promise.all([
        axios.get(`${API}/admin/acceleration/sessions`),
        axios.get(`${API}/admin/acceleration/vault-sessions?password=${encodeURIComponent(ADMIN_PASSWORD)}`),
      ]);
      setAccSessions(a.data || []);
      setVaultSessions(v.data || []);
    } catch (e) {
      toast.error("Could not load history");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const loadVaultSession = async (sid) => {
    if (openVault === sid) {
      setOpenVault(null);
      setVaultMessages([]);
      return;
    }
    try {
      const res = await axios.get(
        `${API}/admin/acceleration/vault-sessions/${encodeURIComponent(sid)}?password=${encodeURIComponent(ADMIN_PASSWORD)}`
      );
      setVaultMessages(res.data?.messages || []);
      setOpenVault(sid);
    } catch {
      toast.error("Could not load that Vault AI session");
    }
  };

  const deleteAcc = async (sid, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this Acceleration session?")) return;
    try {
      await axios.delete(`${API}/admin/acceleration/sessions/${sid}`);
      setAccSessions(prev => prev.filter(s => s.id !== sid));
      toast.success("Session deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-30 flex"
      data-testid="history-drawer"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-[420px] h-full bg-[#09090B] border-r border-white/15 flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={18} className="text-[#C8102E]" />
            <h3 className="text-white font-bold">Conversation History</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={refresh}
              disabled={loading}
              className="text-white/60 hover:text-white"
              data-testid="history-refresh-btn"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="text-white/60 hover:text-white"
              data-testid="history-close-btn"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Acceleration sessions */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-[#C8102E]" />
              <h4 className="text-white/80 text-sm font-semibold uppercase tracking-wider">
                Acceleration Agent · {accSessions.length}
              </h4>
            </div>
            {accSessions.length === 0 ? (
              <p className="text-white/40 text-xs">No saved sessions yet.</p>
            ) : (
              <div className="space-y-2">
                {accSessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => onLoadAccSession(s.id)}
                    className="group p-3 bg-black/40 border border-white/10 rounded hover:border-[#C8102E]/40 hover:bg-[#C8102E]/5 cursor-pointer transition"
                    data-testid="history-acc-session"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{s.title || "(untitled)"}</p>
                        <p className="text-white/40 text-xs mt-1">
                          {s.updated_at ? new Date(s.updated_at).toLocaleString() : ""}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteAcc(s.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition"
                        data-testid="history-acc-delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vault AI sessions */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={14} className="text-white/70" />
              <h4 className="text-white/80 text-sm font-semibold uppercase tracking-wider">
                Vault AI · {vaultSessions.length}
              </h4>
            </div>
            {vaultSessions.length === 0 ? (
              <p className="text-white/40 text-xs">No Vault AI chats logged yet.</p>
            ) : (
              <div className="space-y-2">
                {vaultSessions.map((s) => (
                  <div
                    key={s._id}
                    className="bg-black/40 border border-white/10 rounded"
                    data-testid="history-vault-session"
                  >
                    <button
                      onClick={() => loadVaultSession(s._id)}
                      className="w-full p-3 text-left hover:bg-white/5 transition"
                    >
                      <div className="flex items-center gap-2">
                        {openVault === s._id ? <ChevronDown size={14} className="text-white/50" /> : <ChevronRight size={14} className="text-white/50" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{s.last_message || s._id}</p>
                          <p className="text-white/40 text-xs mt-1">
                            {s.message_count} msgs · {(s.models_used || []).filter(Boolean).join(", ") || "n/a"}
                          </p>
                        </div>
                      </div>
                    </button>
                    {openVault === s._id && (
                      <div className="px-3 pb-3 space-y-2 max-h-72 overflow-y-auto">
                        {vaultMessages.map((m, i) => (
                          <div key={i} className={`text-xs p-2 rounded ${m.role === "user" ? "bg-[#C8102E]/15 text-white" : "bg-white/5 text-white/80 border border-white/10"}`}>
                            <span className="text-white/40 uppercase text-[10px] mr-1">{m.role}</span>
                            {(m.content || "").slice(0, 600)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ VAULT GUIDE CHATBOT (Black & White) ============
const VaultGuide = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "I'm the Vault Guide. I know everything about this site - all 16 database collections, 30+ API endpoints, architecture, features, deployment. Ask me anything!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(`${API}/vault-guide`, { message: input });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I had trouble processing that. Try asking again!" }]);
    }
    setLoading(false);
  };

  return (
    <div className="w-80 bg-black border-l border-white/20 flex flex-col h-full" data-testid="vault-guide-panel">
      <div className="p-4 border-b border-white/20 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
            <BookOpen size={20} className="text-black" />
          </div>
          <div>
            <h3 className="text-white font-bold">Vault Guide</h3>
            <p className="text-white/50 text-xs">Site Knowledge Expert</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-white text-black' : 'bg-white/10 text-white/90 border border-white/20'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/10 border border-white/20 p-3 rounded-lg">
              <RefreshCw size={16} className="animate-spin text-white" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-3 border-t border-white/20">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about the site..."
            className="bg-white/10 border-white/30 text-white text-sm placeholder:text-white/40"
            data-testid="vault-guide-input"
          />
          <Button onClick={sendMessage} disabled={loading} size="sm" className="bg-white hover:bg-white/90 text-black" data-testid="vault-guide-send">
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============ TOOL ICON + LABEL HELPERS ============
const TOOL_META = {
  read_file:       { icon: FileText,    label: "Read file" },
  write_file:      { icon: FileEdit,    label: "Write file" },
  edit_file:       { icon: FileEdit,    label: "Edit file" },
  list_dir:        { icon: FolderOpen,  label: "List dir" },
  bash:            { icon: Terminal,    label: "Run command" },
  pip_install:     { icon: Package,     label: "pip install" },
  yarn_add:        { icon: Package,     label: "yarn add" },
  restart_service: { icon: Power,       label: "Restart service" },
};

const StepCard = ({ step }) => {
  const [open, setOpen] = useState(false);
  const meta = TOOL_META[step.tool] || { icon: Terminal, label: step.tool };
  const Icon = meta.icon;
  const summary =
    step.tool === "bash"            ? step.args.command :
    step.tool === "read_file"       ? step.args.path :
    step.tool === "write_file"      ? step.args.path :
    step.tool === "edit_file"       ? step.args.path :
    step.tool === "list_dir"        ? step.args.path :
    step.tool === "pip_install"     ? step.args.package :
    step.tool === "yarn_add"        ? step.args.package :
    step.tool === "restart_service" ? step.args.service :
    JSON.stringify(step.args);

  return (
    <div className={`mt-2 rounded-md border ${step.success ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`} data-testid="agent-step">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 p-2 text-left hover:bg-white/5 rounded-md"
      >
        {open ? <ChevronDown size={14} className="text-white/50" /> : <ChevronRight size={14} className="text-white/50" />}
        <Icon size={14} className={step.success ? 'text-green-400' : 'text-red-400'} />
        <span className="text-white/80 text-xs font-mono flex-1 truncate">
          <span className="text-white/50">{meta.label}:</span> {summary}
        </span>
        {step.success
          ? <CheckCircle size={12} className="text-green-400" />
          : <XCircle size={12} className="text-red-400" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 text-xs">
          {step.thought && (
            <div className="text-white/50 italic">{step.thought}</div>
          )}
          <div>
            <div className="text-white/40 mb-1">Args</div>
            <pre className="bg-black/60 border border-white/10 rounded p-2 text-white/70 overflow-x-auto whitespace-pre-wrap break-all max-h-40">{JSON.stringify(step.args, null, 2)}</pre>
          </div>
          <div>
            <div className="text-white/40 mb-1">Result</div>
            <pre className="bg-black/60 border border-white/10 rounded p-2 text-white/70 overflow-x-auto whitespace-pre-wrap break-all max-h-60">{step.result}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

// ============ EMERGENT AI AGENT (Main) ============
const DEFAULT_WELCOME = {
  role: 'assistant',
  content:
`Welcome to the embedded Acceleration Agent.

I have full access to this project's codebase at /app and can:
• Read, write, and edit any file
• Run shell commands and inspect outputs
• Install Python (pip) and Node (yarn) dependencies
• Restart backend and frontend services
• Chain multi-step tasks autonomously

Tell me what you want to build, fix, or change and I'll just do it.`,
  steps: [],
};

const EmergentChat = () => {
  const [messages, setMessages] = useState([DEFAULT_WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => sessionStorage.getItem('accSessionId') || '');
  const [historyOpen, setHistoryOpen] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    const prompt = input;
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(`${API}/admin/acceleration/agent`, {
        message: prompt,
        password: ADMIN_PASSWORD,
        session_id: sessionId || null,
      }, { timeout: 240000 });

      if (res.data.session_id && res.data.session_id !== sessionId) {
        setSessionId(res.data.session_id);
        sessionStorage.setItem('accSessionId', res.data.session_id);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.response,
        steps: res.data.steps || [],
        completed: res.data.completed,
      }]);
    } catch (error) {
      const detail = error?.response?.data?.detail || error.message || "Unknown error";
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Agent error: ${detail}. Try a smaller request or check backend logs.`,
        steps: [],
      }]);
    }
    setLoading(false);
  };

  const newSession = () => {
    setSessionId('');
    sessionStorage.removeItem('accSessionId');
    setMessages([DEFAULT_WELCOME]);
    toast.success('Started a fresh agent session');
  };

  const loadSession = async (sid) => {
    try {
      const res = await axios.get(`${API}/admin/acceleration/sessions/${sid}`);
      const stored = res.data?.messages || [];
      // Convert persisted format -> UI format. Stored messages already have role/content/steps.
      const ui = stored.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content || '',
        steps: m.steps || [],
        completed: m.completed,
      }));
      setMessages([DEFAULT_WELCOME, ...ui]);
      setSessionId(sid);
      sessionStorage.setItem('accSessionId', sid);
      setHistoryOpen(false);
      toast.success("Session loaded");
    } catch {
      toast.error("Failed to load session");
    }
  };

  return (
    <div className="flex-1 bg-[#09090B] rounded-lg border border-white/10 flex flex-col h-[750px] relative overflow-hidden" data-testid="acceleration-agent-panel">
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onLoadAccSession={loadSession}
      />
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-gradient-to-r from-[#C8102E]/20 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#C8102E] to-[#8B0000] flex items-center justify-center">
              <Sparkles size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Emergent AI · Acceleration Agent</h3>
              <p className="text-white/50 text-sm">Full codebase access — files, terminal, deps, services</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setHistoryOpen(true)}
              size="sm"
              variant="outline"
              className="bg-transparent border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
              data-testid="agent-history-btn"
            >
              <History size={14} className="mr-1" /> History
            </Button>
            <Button
              onClick={newSession}
              size="sm"
              variant="outline"
              className="bg-transparent border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
              data-testid="agent-new-session-btn"
            >
              <Plus size={14} className="mr-1" /> New
            </Button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 text-xs font-medium">CONNECTED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="agent-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`${msg.role === 'user' ? 'max-w-[80%]' : 'max-w-[92%] w-full'}`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={14} className="text-[#C8102E]" />
                  <span className="text-white/50 text-xs">Acceleration Agent</span>
                  {msg.completed && (
                    <span className="text-green-400/80 text-[10px] uppercase tracking-wider">· done</span>
                  )}
                </div>
              )}
              <div className={`p-4 rounded-lg ${msg.role === 'user'
                ? 'bg-[#C8102E]/20 text-white border border-[#C8102E]/30'
                : 'bg-black/50 text-white/90 border border-white/10'}`}>
                {msg.role === 'assistant' && msg.steps && msg.steps.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Terminal size={12} className="text-white/40" />
                      <span className="text-white/40 text-xs uppercase tracking-wider">
                        Executed {msg.steps.length} step{msg.steps.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    {msg.steps.map((s, i) => <StepCard key={i} step={s} />)}
                  </div>
                )}
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-black/50 border border-white/10 p-4 rounded-lg flex items-center gap-2">
              <RefreshCw size={16} className="animate-spin text-[#C8102E]" />
              <span className="text-white/60 text-sm">Working… running tools, this may take a moment.</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="e.g. Add a /api/version endpoint that returns the git short SHA, then verify with curl."
            className="bg-black border-white/20 text-white min-h-[60px] max-h-[160px] resize-none"
            data-testid="agent-input"
            disabled={loading}
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-[#C8102E] hover:bg-[#9e0c24] px-6"
            data-testid="agent-send-btn"
          >
            <Send size={18} />
          </Button>
        </div>
        <p className="text-white/30 text-xs mt-2">
          Press Enter to send · Shift+Enter for newline · Session persists until you start a new one
        </p>
      </div>
    </div>
  );
};

// ============ MAIN ACCELERATION COMPONENT ============
const Acceleration = () => {
  return (
    <div className="flex gap-0 h-[800px]">
      <EmergentChat />
      <VaultGuide />
    </div>
  );
};

export default Acceleration;
