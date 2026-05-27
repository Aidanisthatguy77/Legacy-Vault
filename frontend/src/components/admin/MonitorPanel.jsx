import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Activity, AlertTriangle, AlertCircle, CheckCircle, Info, RefreshCw,
  Wrench, X, Link as LinkIcon, Send, ChevronDown, ChevronRight, Trash2,
  Zap, Eye, Clock, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const ADMIN_PASSWORD = "A@070610";
const POLL_INTERVAL = 10000;

const SEVERITY_META = {
  critical: { color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/40",    Icon: AlertCircle },
  warning:  { color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/40",  Icon: AlertTriangle },
  info:     { color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/40",   Icon: Info },
};

const ObservationCard = ({ obs, onFix, onDismiss, busy }) => {
  const meta = SEVERITY_META[obs.severity] || SEVERITY_META.info;
  const Icon = meta.Icon;
  const [open, setOpen] = useState(false);
  const [override, setOverride] = useState("");

  return (
    <div
      className={`rounded-lg border ${meta.border} ${meta.bg} overflow-hidden`}
      data-testid="monitor-observation"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Icon size={20} className={`${meta.color} mt-0.5 flex-shrink-0`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-white font-bold text-sm">{obs.title}</h4>
              <span className={`text-[10px] uppercase font-bold tracking-wider ${meta.color}`}>
                {obs.severity}
              </span>
              <span className="text-white/40 text-[10px] uppercase tracking-wider">
                · {obs.source}
              </span>
              {obs.touched > 1 && (
                <span className="text-white/40 text-[10px]">×{obs.touched}</span>
              )}
              {obs.status !== "open" && (
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                  obs.status === "fixed" ? "bg-green-500/20 text-green-400" :
                  obs.status === "in_progress" ? "bg-blue-500/20 text-blue-400" :
                  "bg-white/10 text-white/50"
                }`}>{obs.status}</span>
              )}
            </div>
            <p className="text-white/40 text-xs mt-1">
              {obs.last_seen ? new Date(obs.last_seen).toLocaleString() : ""}
            </p>
            <button
              onClick={() => setOpen(o => !o)}
              className="text-white/60 text-xs mt-2 flex items-center gap-1 hover:text-white"
              data-testid="obs-expand"
            >
              {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {open ? "Hide details" : "Show details"}
            </button>
            {open && (
              <div className="mt-3 space-y-3">
                <pre className="text-xs text-white/70 bg-black/50 border border-white/10 rounded p-2 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                  {obs.detail}
                </pre>
                {obs.suggested_action && (
                  <div className="text-xs text-white/60">
                    <span className="text-white/40 uppercase tracking-wider text-[10px]">Suggested:</span>{" "}
                    {obs.suggested_action}
                  </div>
                )}
                <Textarea
                  value={override}
                  onChange={(e) => setOverride(e.target.value)}
                  placeholder="Optional: extra instructions for the Acceleration Agent (e.g. 'restart backend then retest')"
                  className="bg-black border-white/20 text-white text-xs min-h-[50px] resize-none"
                  data-testid="obs-override"
                />
                {obs.fix_response && (
                  <div className="text-xs text-green-400 bg-green-500/5 border border-green-500/20 rounded p-2">
                    <span className="text-green-400/70 uppercase tracking-wider text-[10px]">Agent reply:</span>{" "}
                    {obs.fix_response.slice(0, 600)}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {obs.status === "open" && (
              <>
                <Button
                  size="sm"
                  onClick={() => onFix(obs.id, override)}
                  disabled={busy === obs.id}
                  className="bg-[#C8102E] hover:bg-[#9e0c24] text-white"
                  data-testid="obs-fix-btn"
                >
                  {busy === obs.id ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <><Wrench size={14} className="mr-1" /> Run Fix</>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDismiss(obs.id)}
                  className="text-white/40 hover:text-white"
                  data-testid="obs-dismiss-btn"
                >
                  <X size={14} />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ApplyFromLink = ({ onComplete }) => {
  const [url, setUrl] = useState("");
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const submit = async () => {
    if (!url.trim() || busy) return;
    setBusy(true);
    setLastResult(null);
    toast.info("Fetching URL and dispatching to the agent…");
    try {
      const res = await axios.post(
        `${API}/admin/acceleration/monitor/apply-link`,
        { password: ADMIN_PASSWORD, url, instruction: instruction || null },
        { timeout: 300000 }
      );
      setLastResult(res.data);
      toast.success(`Plan distilled by ${res.data.engine_used} + dispatched`);
      onComplete && onComplete();
    } catch (e) {
      const detail = e?.response?.data?.detail || e.message;
      toast.error(`Apply from URL failed: ${detail}`);
    }
    setBusy(false);
  };

  return (
    <div className="bg-gradient-to-r from-[#C8102E]/15 to-transparent border border-[#C8102E]/40 rounded-lg p-5" data-testid="apply-from-link-panel">
      <div className="flex items-center gap-2 mb-3">
        <LinkIcon size={18} className="text-[#C8102E]" />
        <h3 className="text-white font-bold uppercase tracking-wider">Apply from URL</h3>
      </div>
      <p className="text-white/60 text-xs mb-4">
        Paste a YouTube video, tutorial article, GitHub repo, or any link. The Dual Engine
        (Claude for media, Gemini for text) distills a plan, then the Acceleration Agent
        executes it on this codebase.
      </p>
      <div className="space-y-3">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtu.be/... or https://github.com/... or any tutorial link"
          className="bg-black border-white/20 text-white"
          data-testid="apply-link-url"
        />
        <Textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Optional extra direction — e.g. 'apply only to the landing page, keep current colors'"
          className="bg-black border-white/20 text-white text-sm min-h-[60px] resize-none"
          data-testid="apply-link-instruction"
        />
        <Button
          onClick={submit}
          disabled={busy || !url.trim()}
          className="bg-[#C8102E] hover:bg-[#9e0c24] text-white w-full"
          data-testid="apply-link-submit"
        >
          {busy ? (
            <><RefreshCw size={16} className="animate-spin mr-2" /> Distilling + Executing…</>
          ) : (
            <><Zap size={16} className="mr-2" /> Distill & Execute</>
          )}
        </Button>
      </div>
      {lastResult && (
        <div className="mt-4 space-y-2 text-xs">
          <div className="text-white/40 uppercase tracking-wider">Engine: {lastResult.engine_used}</div>
          <div className="bg-black/50 border border-white/10 rounded p-3 whitespace-pre-wrap text-white/80 max-h-48 overflow-y-auto">
            {lastResult.plan}
          </div>
          <div className="text-white/60">
            Agent: {lastResult.agent?.completed ? "completed" : "in progress"} · {lastResult.agent?.steps?.length || 0} steps
          </div>
        </div>
      )}
    </div>
  );
};

const MonitorPanel = () => {
  const [observations, setObservations] = useState([]);
  const [status, setStatus] = useState(null);
  const [filter, setFilter] = useState("open"); // open | all
  const [loading, setLoading] = useState(false);
  const [fixingId, setFixingId] = useState(null);
  const knownIds = useRef(new Set());

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [st, obs] = await Promise.all([
        axios.get(`${API}/admin/acceleration/monitor/status?password=${encodeURIComponent(ADMIN_PASSWORD)}`),
        axios.get(`${API}/admin/acceleration/monitor/observations?password=${encodeURIComponent(ADMIN_PASSWORD)}&status=${filter}&limit=80`),
      ]);
      setStatus(st.data);
      const list = obs.data || [];
      // Detect new observations since last poll → toast
      if (silent && knownIds.current.size > 0) {
        const fresh = list.filter(o => !knownIds.current.has(o.id) && o.status === "open");
        fresh.forEach(o => {
          const meta = SEVERITY_META[o.severity] || SEVERITY_META.info;
          (o.severity === "critical" ? toast.error : o.severity === "warning" ? toast.warning : toast.info)(
            `Monitor: ${o.title}`, { description: o.detail?.slice(0, 120) }
          );
        });
      }
      knownIds.current = new Set(list.map(o => o.id));
      setObservations(list);
    } catch (e) {
      if (!silent) toast.error("Failed to load monitor");
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchAll();
    const id = setInterval(() => fetchAll(true), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchAll]);

  const runNow = async () => {
    try {
      await axios.post(`${API}/admin/acceleration/monitor/run-now`, { password: ADMIN_PASSWORD });
      toast.success("Monitor scan triggered");
      fetchAll();
    } catch {
      toast.error("Run-now failed");
    }
  };

  const handleFix = async (obsId, override) => {
    setFixingId(obsId);
    toast.info("Dispatching to Acceleration Agent…");
    try {
      const res = await axios.post(
        `${API}/admin/acceleration/monitor/observations/${obsId}/fix`,
        { password: ADMIN_PASSWORD, observation_id: obsId, override_instruction: override || null },
        { timeout: 300000 }
      );
      const completed = res.data?.agent?.completed;
      toast.success(completed ? "Agent completed the fix" : "Agent ran but did not flag complete");
      fetchAll();
    } catch (e) {
      const detail = e?.response?.data?.detail || e.message;
      toast.error(`Fix failed: ${detail}`);
    }
    setFixingId(null);
  };

  const handleDismiss = async (obsId) => {
    try {
      await axios.post(
        `${API}/admin/acceleration/monitor/observations/${obsId}/dismiss`,
        { password: ADMIN_PASSWORD }
      );
      fetchAll();
    } catch {
      toast.error("Dismiss failed");
    }
  };

  const clearDismissed = async () => {
    if (!window.confirm("Permanently delete all dismissed + fixed observations?")) return;
    try {
      await axios.delete(`${API}/admin/acceleration/monitor/observations/clear?password=${encodeURIComponent(ADMIN_PASSWORD)}&status=dismissed`);
      await axios.delete(`${API}/admin/acceleration/monitor/observations/clear?password=${encodeURIComponent(ADMIN_PASSWORD)}&status=fixed`);
      toast.success("Cleared");
      fetchAll();
    } catch {
      toast.error("Clear failed");
    }
  };

  const counts = status?.open_counts || { critical: 0, warning: 0, info: 0, total_open: 0 };

  return (
    <div className="space-y-6" data-testid="monitor-panel">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Activity className="text-[#C8102E]" size={32} />
          <div>
            <h2 className="font-heading text-3xl font-bold text-white uppercase">Website Monitor</h2>
            <p className="text-white/60 text-sm">
              Constantly watching health, MongoDB, endpoints &amp; logs · auto-refresh every 10s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
            counts.critical > 0 ? "bg-red-500/20 border border-red-500/40" :
            counts.warning > 0 ? "bg-amber-500/20 border border-amber-500/40" :
            "bg-green-500/20 border border-green-500/40"
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              counts.critical > 0 ? "bg-red-500" :
              counts.warning > 0 ? "bg-amber-500" : "bg-green-500"
            }`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${
              counts.critical > 0 ? "text-red-400" :
              counts.warning > 0 ? "text-amber-400" : "text-green-400"
            }`}>
              {counts.critical > 0 ? "CRITICAL" : counts.warning > 0 ? "WARNINGS" : "ALL GREEN"}
            </span>
          </div>
          <Button
            onClick={runNow}
            variant="outline"
            size="sm"
            className="bg-transparent border-white/20 text-white/70 hover:text-white"
            data-testid="monitor-run-now"
          >
            <RefreshCw size={14} className="mr-1" /> Scan now
          </Button>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#09090B] border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400 text-xs uppercase font-bold tracking-wider">
            <AlertCircle size={14} /> Critical
          </div>
          <p className="text-white text-3xl font-heading font-bold mt-2">{counts.critical}</p>
        </div>
        <div className="bg-[#09090B] border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-400 text-xs uppercase font-bold tracking-wider">
            <AlertTriangle size={14} /> Warnings
          </div>
          <p className="text-white text-3xl font-heading font-bold mt-2">{counts.warning}</p>
        </div>
        <div className="bg-[#09090B] border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-400 text-xs uppercase font-bold tracking-wider">
            <Info size={14} /> Info
          </div>
          <p className="text-white text-3xl font-heading font-bold mt-2">{counts.info}</p>
        </div>
        <div className="bg-[#09090B] border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-2 text-white/60 text-xs uppercase font-bold tracking-wider">
            <Clock size={14} /> Last scan
          </div>
          <p className="text-white text-xs font-mono mt-2">
            {status?.last_run ? new Date(status.last_run).toLocaleTimeString() : "—"}
          </p>
          <p className="text-white/40 text-xs">every {status?.interval_s || 60}s</p>
        </div>
      </div>

      {/* Apply from Link */}
      <ApplyFromLink onComplete={() => fetchAll()} />

      {/* Filter + clear */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {["open", "all"].map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className={filter === f ? "bg-[#C8102E] hover:bg-[#9e0c24] text-white" : "bg-transparent border-white/20 text-white/70"}
              data-testid={`monitor-filter-${f}`}
            >
              {f === "open" ? "Open" : "All history"}
            </Button>
          ))}
        </div>
        <Button
          onClick={clearDismissed}
          variant="ghost"
          size="sm"
          className="text-white/40 hover:text-red-400"
          data-testid="monitor-clear-btn"
        >
          <Trash2 size={14} className="mr-1" /> Clear fixed/dismissed
        </Button>
      </div>

      {/* Observations */}
      <div className="space-y-3" data-testid="monitor-observations-list">
        {loading && observations.length === 0 ? (
          <div className="text-white/40 text-sm text-center py-8 flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin" /> Loading observations…
          </div>
        ) : observations.length === 0 ? (
          <div className="text-center py-12 border border-white/10 rounded-lg bg-[#09090B]">
            <CheckCircle className="text-green-400 mx-auto mb-3" size={40} />
            <p className="text-white/80 font-bold">All systems nominal</p>
            <p className="text-white/40 text-sm mt-1">Nothing to report. Monitor keeps watching every {status?.interval_s || 60}s.</p>
          </div>
        ) : (
          observations.map(obs => (
            <ObservationCard
              key={obs.id}
              obs={obs}
              onFix={handleFix}
              onDismiss={handleDismiss}
              busy={fixingId}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default MonitorPanel;
