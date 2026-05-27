import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Rocket, Cloud, Github, Server, Database, Globe, ExternalLink,
  CheckCircle, XCircle, RefreshCw, Settings, Eye, EyeOff, Save, Trash2, Clock, Play,
  Link as LinkIcon, Copy, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const ADMIN_PASSWORD = "A@070610";

const TOKEN_FIELDS = [
  {
    key: "github_repo",
    label: "GitHub repo (owner/name)",
    placeholder: "Aidanisthatguy77/nba2k-legacy-vault",
    icon: Github,
    secret: false,
    help: "Format: <owner>/<repo>. The repo must already exist on GitHub (create an empty one if needed).",
    url: "https://github.com/new",
    urlLabel: "Create an empty repo",
  },
  {
    key: "github_pat",
    label: "GitHub Personal Access Token",
    placeholder: "ghp_…",
    icon: Github,
    secret: true,
    help: "Classic PAT with the 'repo' scope.",
    url: "https://github.com/settings/tokens/new?scopes=repo&description=NBA2K%20Vault%20Deployer",
    urlLabel: "Generate a token (repo scope)",
  },
  {
    key: "vercel_token",
    label: "Vercel API Token",
    placeholder: "vrcl_…",
    icon: Globe,
    secret: true,
    help: "Personal access token with full scope.",
    url: "https://vercel.com/account/tokens",
    urlLabel: "Create a Vercel token",
  },
  {
    key: "render_api_key",
    label: "Render API Key",
    placeholder: "rnd_…",
    icon: Server,
    secret: true,
    help: "From Account Settings → API Keys.",
    url: "https://dashboard.render.com/account/api-keys",
    urlLabel: "Create a Render API key",
  },
  {
    key: "atlas_org_id",
    label: "MongoDB Atlas Organization ID",
    placeholder: "5e2…",
    icon: Database,
    secret: false,
    help: "Atlas → top-left org dropdown → Settings → copy the 24-char ID.",
    url: "https://cloud.mongodb.com/v2#/preferences/organizations",
    urlLabel: "Find your Org ID",
  },
  {
    key: "atlas_pub_key",
    label: "Atlas API Key — Public",
    placeholder: "abc12345",
    icon: Database,
    secret: false,
    help: "Org → Access Manager → API Keys → Create New, role: 'Organization Owner'. Copy the Public key.",
    url: "https://cloud.mongodb.com/v2#/preferences/organizations",
    urlLabel: "Create an Atlas API key pair",
  },
  {
    key: "atlas_priv_key",
    label: "Atlas API Key — Private",
    placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    icon: Database,
    secret: true,
    help: "Shown ONCE when you create the key pair. Paste it here immediately.",
    url: "https://cloud.mongodb.com/v2#/preferences/organizations",
    urlLabel: "Create an Atlas API key pair",
  },
];

const STEPS_ORDER = [
  { key: "github_push",   icon: Github,   label: "Push to GitHub" },
  { key: "atlas_setup",   icon: Database, label: "Atlas cluster" },
  { key: "atlas_restore", icon: Database, label: "Restore data" },
  { key: "render_deploy", icon: Server,   label: "Render backend" },
  { key: "vercel_deploy", icon: Globe,    label: "Vercel frontend" },
];

const SetupScreen = ({ status, onSaved }) => {
  const [values, setValues] = useState({});
  const [show, setShow] = useState({});
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    const tokens = Object.fromEntries(Object.entries(values).filter(([, v]) => v && v.trim()));
    if (Object.keys(tokens).length === 0) {
      toast.warning("Nothing to save");
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API}/admin/acceleration/deploy/tokens`, { password: ADMIN_PASSWORD, tokens });
      toast.success(`Saved ${Object.keys(tokens).length} token(s)`);
      setValues({});
      onSaved && onSaved();
    } catch (e) {
      toast.error("Save failed: " + (e?.response?.data?.detail || e.message));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4" data-testid="deploy-setup">
      <div className="bg-[#09090B] border border-amber-500/30 rounded-lg p-4 text-amber-300 text-sm">
        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs mb-1">
          <Settings size={14} /> One-time setup
        </div>
        Paste your 4 free tokens (5 minutes total). They're stored encrypted in your Secrets Vault and never displayed back in plaintext after saving. After this, deploys are one-click forever.
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {TOKEN_FIELDS.map(f => {
          const Icon = f.icon;
          const configured = status?.tokens?.[f.key]?.configured;
          const preview = status?.tokens?.[f.key]?.preview;
          const isSecret = f.secret;
          const shown = show[f.key];
          return (
            <div key={f.key} className="bg-[#09090B] border border-white/10 rounded-lg p-4" data-testid={`token-field-${f.key}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Icon size={16} className="text-white/60" />
                  <label className="text-white font-medium text-sm">{f.label}</label>
                </div>
                {configured && (
                  <span className="text-green-400 text-[10px] uppercase tracking-wider font-bold flex items-center gap-1">
                    <CheckCircle size={10} /> saved {preview && <span className="text-white/40 font-mono">{preview}</span>}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type={isSecret && !shown ? "password" : "text"}
                  placeholder={f.placeholder}
                  value={values[f.key] || ""}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  className="bg-black border-white/20 text-white text-sm pr-9"
                  data-testid={`token-input-${f.key}`}
                />
                {isSecret && (
                  <button
                    type="button"
                    onClick={() => setShow({ ...show, [f.key]: !shown })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    data-testid={`token-toggle-${f.key}`}
                  >
                    {shown ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
              <p className="text-white/40 text-xs mt-2">{f.help}</p>
              {f.url && (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#C8102E] text-xs mt-1 inline-flex items-center gap-1 hover:underline"
                >
                  {f.urlLabel} <ExternalLink size={10} />
                </a>
              )}
            </div>
          );
        })}
      </div>

      <Button
        onClick={onSave}
        disabled={saving}
        className="bg-[#C8102E] hover:bg-[#9e0c24] text-white w-full py-5"
        data-testid="deploy-save-tokens"
      >
        {saving ? (
          <><RefreshCw size={16} className="animate-spin mr-2" /> Saving…</>
        ) : (
          <><Save size={16} className="mr-2" /> Save tokens</>
        )}
      </Button>
    </div>
  );
};

const StepRow = ({ step, info }) => {
  const Icon = step.icon;
  const status = info?.status || "pending";
  const colors = {
    pending: "text-white/40 border-white/10",
    running: "text-blue-400 border-blue-500/40 bg-blue-500/5",
    success: "text-green-400 border-green-500/40 bg-green-500/5",
    failed:  "text-red-400 border-red-500/40 bg-red-500/5",
  }[status];
  const Status = {
    pending: <Clock size={14} className="text-white/30" />,
    running: <RefreshCw size={14} className="text-blue-400 animate-spin" />,
    success: <CheckCircle size={14} className="text-green-400" />,
    failed:  <XCircle size={14} className="text-red-400" />,
  }[status];
  return (
    <div className={`flex items-start gap-3 p-3 rounded border ${colors}`} data-testid={`deploy-step-${step.key}`}>
      <Icon size={20} className="mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">{step.label}</span>
          {Status}
        </div>
        {info?.message && (
          <p className="text-white/60 text-xs mt-1 break-all">{info.message}</p>
        )}
        {info?.url && (
          <a href={info.url} target="_blank" rel="noopener noreferrer" className="text-[#C8102E] text-xs mt-1 inline-flex items-center gap-1 hover:underline">
            {info.url} <ExternalLink size={10} />
          </a>
        )}
      </div>
    </div>
  );
};

const DomainModal = ({ run, onClose, onSaved }) => {
  const [domain, setDomain] = useState(run?.custom_domain || "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(run?.custom_domain_result || null);

  const submit = async () => {
    if (!domain.trim() || busy) return;
    setBusy(true);
    try {
      const r = await axios.post(
        `${API}/admin/acceleration/deploy/runs/${run.id}/domain`,
        { password: ADMIN_PASSWORD, domain: domain.trim() },
      );
      setResult(r.data);
      if (r.data.success) toast.success("Domain attached. Add the DNS records below.");
      else toast.error(r.data.error || "Failed to attach domain");
      onSaved && onSaved();
    } catch (e) {
      toast.error("Promote failed: " + (e?.response?.data?.detail || e.message));
    }
    setBusy(false);
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="domain-modal">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#09090B] border border-white/15 rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-[#C8102E]" />
            <h3 className="text-white font-bold">Promote to custom domain</h3>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white" data-testid="domain-modal-close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-white/60 text-sm">
            Enter the apex domain you own (no <code className="text-white">http://</code>, no path).
            We'll attach <code className="text-white">yoursite.com</code> + <code className="text-white">www.yoursite.com</code> to Vercel
            and <code className="text-white">api.yoursite.com</code> to Render, then give you the exact DNS records to paste at your registrar.
          </p>
          <div className="flex gap-2">
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="nba2klegacyvault.com"
              className="bg-black border-white/20 text-white"
              data-testid="domain-input"
            />
            <Button
              onClick={submit}
              disabled={busy || !domain.trim()}
              className="bg-[#C8102E] hover:bg-[#9e0c24] text-white"
              data-testid="domain-attach-btn"
            >
              {busy ? <RefreshCw size={14} className="animate-spin" /> : "Attach"}
            </Button>
          </div>

          {result && (
            <div className="space-y-3">
              {result.success === false && (
                <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-red-300 text-sm">
                  {result.error}
                </div>
              )}
              {result.success && (
                <>
                  <div className="bg-green-500/10 border border-green-500/30 rounded p-3 text-green-300 text-sm">
                    Domain registered with Vercel + Render. Final URLs once DNS propagates:<br />
                    <strong>{result.frontend_url}</strong> &nbsp; · &nbsp; <strong>{result.backend_url}</strong>
                  </div>
                  <div>
                    <div className="text-white/80 text-xs uppercase tracking-wider font-bold mb-2">
                      DNS records to add at your registrar
                    </div>
                    <div className="border border-white/10 rounded overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-white/5">
                          <tr className="text-white/50 uppercase tracking-wider">
                            <th className="text-left p-2">Host</th>
                            <th className="text-left p-2">Type</th>
                            <th className="text-left p-2">Value</th>
                            <th className="p-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(result.dns_records || []).map((rec, i) => (
                            <tr key={i} className="border-t border-white/5">
                              <td className="p-2 text-white font-mono">{rec.host}</td>
                              <td className="p-2 text-white/80 font-mono">{rec.type}</td>
                              <td className="p-2 text-white/80 font-mono break-all">{rec.value}</td>
                              <td className="p-2">
                                <button
                                  onClick={() => copy(rec.value)}
                                  className="text-white/40 hover:text-white"
                                  data-testid={`dns-copy-${i}`}
                                >
                                  <Copy size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-white/40 text-xs mt-2">
                      DNS typically propagates in 5–60 minutes. SSL certs auto-issue after propagation (Vercel + Render handle it).
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RunCard = ({ run, onRefresh, onDelete }) => {
  const steps = run?.steps || {};
  const [showDomain, setShowDomain] = useState(false);
  return (
    <div className="bg-[#09090B] border border-white/10 rounded-lg p-4 space-y-3" data-testid="deploy-run-card">
      {showDomain && (
        <DomainModal
          run={run}
          onClose={() => setShowDomain(false)}
          onSaved={() => onRefresh(run.id)}
        />
      )}      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
              run.status === "success" ? "bg-green-500/20 text-green-400" :
              run.status === "failed"  ? "bg-red-500/20 text-red-400" :
              run.status === "running" ? "bg-blue-500/20 text-blue-400" :
              "bg-white/10 text-white/60"
            }`}>{run.status}</span>
            <span className="text-white/40 text-xs font-mono">{run.id?.slice(0, 8)}</span>
          </div>
          <p className="text-white/40 text-xs mt-1">
            {run.started_at ? new Date(run.started_at).toLocaleString() : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => onRefresh(run.id)} className="text-white/50 hover:text-white" data-testid="deploy-run-refresh">
            <RefreshCw size={14} />
          </Button>
          {(run.status === "success" || run.status === "failed") && (
            <Button size="sm" variant="ghost" onClick={() => onDelete(run.id)} className="text-white/40 hover:text-red-400" data-testid="deploy-run-delete">
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      {run.status === "success" && run.final_url && (
        <div className="space-y-2">
          <a
            href={run.final_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-gradient-to-r from-green-500/20 to-transparent border border-green-500/40 rounded p-3 text-green-300 hover:bg-green-500/10 transition"
            data-testid="deploy-final-url"
          >
            <div className="text-xs uppercase tracking-wider text-green-400/70 mb-1">Live URL</div>
            <div className="font-bold text-sm flex items-center gap-2">
              {run.final_url} <ExternalLink size={12} />
            </div>
          </a>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => setShowDomain(true)}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
              data-testid="promote-domain-btn"
            >
              <LinkIcon size={14} className="mr-1" />
              {run.custom_domain ? "Manage custom domain" : "Promote to custom domain"}
            </Button>
            {run.custom_domain && (
              <span className="text-white/50 text-xs">
                attached: <span className="text-white font-mono">{run.custom_domain}</span>
              </span>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {STEPS_ORDER.map(s => (
          <StepRow key={s.key} step={s} info={steps[s.key]} />
        ))}
      </div>
    </div>
  );
};

const DeployPanel = () => {
  const [status, setStatus] = useState(null);
  const [runs, setRuns] = useState([]);
  const [view, setView] = useState("deploy"); // 'deploy' | 'setup'
  const [deploying, setDeploying] = useState(false);
  const pollRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/admin/acceleration/deploy/tokens?password=${encodeURIComponent(ADMIN_PASSWORD)}`);
      setStatus(r.data);
      if (!r.data.all_configured) setView("setup");
    } catch (e) {
      toast.error("Could not load deploy status");
    }
  }, []);

  const fetchRuns = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/admin/acceleration/deploy/runs?password=${encodeURIComponent(ADMIN_PASSWORD)}&limit=10`);
      setRuns(r.data || []);
    } catch {/* ignore */}
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchRuns();
  }, [fetchStatus, fetchRuns]);

  // Auto-poll runs while any is in flight
  useEffect(() => {
    const anyLive = runs.some(r => r.status === "queued" || r.status === "running");
    if (anyLive && !pollRef.current) {
      pollRef.current = setInterval(fetchRuns, 4000);
    } else if (!anyLive && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [runs, fetchRuns]);

  const refreshRun = async (id) => {
    try {
      const r = await axios.get(`${API}/admin/acceleration/deploy/runs/${id}?password=${encodeURIComponent(ADMIN_PASSWORD)}`);
      setRuns(prev => prev.map(x => x.id === id ? r.data : x));
    } catch { /* ignore */ }
  };

  const deleteRun = async (id) => {
    if (!window.confirm("Delete this deploy run from history?")) return;
    try {
      await axios.delete(`${API}/admin/acceleration/deploy/runs/${id}?password=${encodeURIComponent(ADMIN_PASSWORD)}`);
      setRuns(prev => prev.filter(x => x.id !== id));
    } catch { toast.error("Delete failed"); }
  };

  const startDeploy = async () => {
    if (!status?.all_configured) {
      setView("setup");
      toast.warning("Configure all tokens first");
      return;
    }
    setDeploying(true);
    try {
      const r = await axios.post(`${API}/admin/acceleration/deploy/run`, { password: ADMIN_PASSWORD });
      toast.success(`Deploy started (${r.data.run_id.slice(0, 8)})`);
      fetchRuns();
    } catch (e) {
      toast.error("Deploy failed to start: " + (e?.response?.data?.detail || e.message));
    }
    setDeploying(false);
  };

  return (
    <div className="space-y-6" data-testid="deploy-panel">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Cloud className="text-[#C8102E]" size={32} />
          <div>
            <h2 className="font-heading text-3xl font-bold text-white uppercase">Deploy Live</h2>
            <p className="text-white/60 text-sm">
              GitHub → MongoDB Atlas → Render → Vercel · one button, fully autonomous
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setView(view === "setup" ? "deploy" : "setup")}
            size="sm"
            variant="outline"
            className="bg-transparent border-white/20 text-white/70 hover:text-white"
            data-testid="deploy-view-toggle"
          >
            <Settings size={14} className="mr-1" />
            {view === "setup" ? "Back to deploys" : "Manage tokens"}
          </Button>
          {status?.all_configured && (
            <span className="text-green-400 text-xs uppercase font-bold tracking-wider flex items-center gap-1">
              <CheckCircle size={12} /> all tokens set
            </span>
          )}
        </div>
      </div>

      {view === "setup" ? (
        <SetupScreen status={status} onSaved={fetchStatus} />
      ) : (
        <>
          {/* Big launch button */}
          <div className="bg-gradient-to-r from-[#C8102E]/30 via-[#C8102E]/10 to-transparent border border-[#C8102E]/50 rounded-lg p-6">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex-1 min-w-[280px]">
                <h3 className="font-heading text-2xl font-bold text-white uppercase flex items-center gap-2">
                  <Rocket size={24} className="text-[#C8102E]" />
                  Deploy this site to the public internet
                </h3>
                <p className="text-white/70 text-sm mt-2">
                  Pushes your full codebase to <code className="text-white">{status?.tokens?.github_repo?.preview || "your GitHub repo"}</code>,
                  provisions a free MongoDB Atlas M0 cluster (with all your data), spins up the
                  FastAPI backend on Render, then deploys the React frontend on Vercel. You get
                  a real 24/7 public URL — no credits, no manual steps.
                </p>
                <p className="text-white/40 text-xs mt-3">
                  Typical time: 10–15 minutes (mostly waiting on Atlas to provision).
                </p>
              </div>
              <Button
                onClick={startDeploy}
                disabled={deploying || !status?.all_configured}
                className="bg-[#C8102E] hover:bg-[#9e0c24] text-white text-base font-bold px-8 py-6"
                data-testid="deploy-live-btn"
              >
                {deploying ? (
                  <><RefreshCw size={18} className="animate-spin mr-2" /> Starting…</>
                ) : (
                  <><Play size={18} className="mr-2" /> Deploy Live</>
                )}
              </Button>
            </div>
          </div>

          {/* Runs */}
          <div>
            <h3 className="text-white font-bold uppercase tracking-wider text-sm mb-3">
              Deploy history ({runs.length})
            </h3>
            {runs.length === 0 ? (
              <div className="text-center py-12 border border-white/10 rounded-lg bg-[#09090B] text-white/40 text-sm">
                No deploys yet. Click "Deploy Live" to launch.
              </div>
            ) : (
              <div className="space-y-3" data-testid="deploy-runs-list">
                {runs.map(r => (
                  <RunCard key={r.id} run={r} onRefresh={refreshRun} onDelete={deleteRun} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DeployPanel;
