import { useState, useEffect, useRef } from 'react';
import { 
  Shield, Activity, Users, TrendingUp, Layers, GitFork, 
  Terminal, Sliders, Search, AlertTriangle, Cpu, 
  HelpCircle, Send, RefreshCw, Play, Lock, Database, 
  FileText
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';

// Initial state for mocked/demo data if server is offline or not scanned yet
const INITIAL_REPO = {
  name: "langchain-ai/langchain",
  description: "Building applications with LLMs through composability",
  stars: 92450,
  forks: 14890,
  contributors: 480,
  releases_count: 52,
  has_security_policy: true,
  has_lockfile: true,
  has_license: true,
  repo_archived: false,
  days_since_push: 2,
  license: "MIT",
  open_issues: 1845,
  trust: 88,
  verdict: "APPROVED",
  status: "STRONG",
  scores: {
    security: 90,
    maintenance: 85,
    community: 92,
    supply: 80,
    documentation: 95,
    trust: 88
  },
  signals: [
    { n: "Lockfile", v: 0, i: "Dependency lockfile found at repository root" },
    { n: "Security policy", v: 0, i: "GitHub reports a security policy" },
    { n: "License", v: 0, i: "MIT License detected" },
    { n: "Activity", v: 0, i: "Last push 2 days ago" }
  ],
  dependencies_list: ["pydantic", "numpy", "pandas", "requests", "aiohttp", "pyyaml", "tenacity"],
  aiReport: {
    boardroom: {
      decision: "APPROVED",
      confidence: 92,
      summary: "LangChain exhibits a highly robust open-source posture. High community velocity and a diversified contributor ecosystem offset elevated issue growth trends. Approved for general production workloads."
    },
    dueDiligence: {
      technicalRisk: { level: "Low", description: "Standard abstractions, high developer adoption. Open issues are managed through active triage pipelines." },
      securityRisk: { level: "Low", description: "Security disclosures are published. Integrates Dependabot alert tracking and secret scanning structures." },
      maintenanceRisk: { level: "Low", description: "Push activities are frequent (daily cycles), indicating active upstream maintenance." },
      communityRisk: { level: "Low", description: "Extremely low developer concentration. The project bus factor is safe, supported by hundreds of contributors." },
      adoptionRisk: { level: "Low", description: "Permissive MIT licensing mitigates legal compliance concerns." },
      vendorLockInRisk: { level: "Low", description: "Highly modular architecture designed for multi-cloud LLM deployments." },
      futureViabilityRisk: { level: "Low", description: "Excellent adoption momentum. Trajectory forecasts indicate strong 24-month longevity." }
    },
    investmentAnalyst: {
      growthRating: "A+",
      healthRating: "Strong",
      riskRating: "Low",
      momentumRating: "Accelerating",
      viabilityRating: "Viable",
      recommendation: "BUY",
      justification: "LangChain functions as core infrastructure within the generative AI development stack. Telemetry confirms solid developer retention. Technical equity demonstrates reliable enterprise viability."
    },
    timeMachine: {
      pastTrust: { score: 85, date: "12 months ago", reason: "Rapid prototype stage with elevated code volatility." },
      presentTrust: { score: 88, date: "Today", reason: "Standardized API layers, established licensing, and active Dependabot configuration." },
      futureTrust: { score: 92, date: "12 months from now", reason: "Expected stability through enterprise partnership cycles." },
      trendReasoning: "Overall curve projects a stable, upward velocity supported by massive ecosystem momentum."
    }
  },
  adoptionReadiness: {
    personal: { verdict: "APPROVED", reasoning: "Low stakes and rapid prototype advantages make adoption seamless." },
    startup: { verdict: "APPROVED", reasoning: "Velocity advantages align with MVP shipping requirements." },
    enterprise: { verdict: "APPROVED", reasoning: "Meets core dependency rules, licensing, and security profile standards." },
    saas: { verdict: "APPROVED", reasoning: "Pinned dependencies and active lockfiles prevent supply chain failures in production." },
    banking: { verdict: "APPROVED WITH REVIEW", reasoning: "Requires routing through private proxy registries and locking minor versions." },
    healthcare: { verdict: "APPROVED WITH REVIEW", reasoning: "Requires static validation scan (SAST) to ensure data compliance limits." },
    government: { verdict: "APPROVED WITH REVIEW", reasoning: "Standard FedRAMP security gate checking and licensing verification required." }
  },
  enterpriseReadinessScore: 85
};

export default function App() {
  const [repoInput, setRepoInput] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [repoData, setRepoData] = useState<any>(INITIAL_REPO);
  const [compareInputs, setCompareInputs] = useState("");
  const [compareResults, setCompareResults] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([
    { sender: "ai", text: "I am TrustGraph's Boardroom AI Advisor. Grounded in this repository's telemetry, ask me any technology adoption, licensing, or security risk questions." }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Digital Twin state
  const [twinFlags, setTwinFlags] = useState({
    maintainer_leaves: false,
    releases_stop: false,
    critical_cve: false,
    activity_drops: false,
    dependency_compromised: false
  });
  const [simulatedData, setSimulatedData] = useState<any>(INITIAL_REPO);
  const [twinLoading, setTwinLoading] = useState(false);

  // Blast Radius State
  const [compromisedNode, setCompromisedNode] = useState<string | null>(null);

  // Benchmark State
  const [benchmarkSize, setBenchmarkSize] = useState(200000);
  const [benchmarkResults, setBenchmarkResults] = useState<any>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);

  // Command Center Stats
  const [ccStats, setCcStats] = useState<any>({
    repositories: [],
    decisions: [],
    totalScanned: 0,
    avgScores: { trust: 0, security: 0, maintenance: 0, community: 0 }
  });

  // Ticker bar simulation
  const [tickerItems, setTickerItems] = useState([
    { name: "langchain-ai/langchain", score: 88, status: "APPROVED" },
    { name: "run-llama/llama_index", score: 82, status: "APPROVED" },
    { name: "crewAI/crewAI", score: 68, status: "REVIEW" },
    { name: "meta-llama/llama3", score: 94, status: "APPROVED" },
    { name: "expressjs/express", score: 91, status: "APPROVED" },
    { name: "facebook/react", score: 96, status: "APPROVED" },
    { name: "lodash/lodash", score: 55, status: "RESTRICT" }
  ]);

  // Load stats on mount
  useEffect(() => {
    fetchCCStats();
  }, []);

  const fetchCCStats = async () => {
    try {
      const res = await fetch('/api/command-center');
      if (res.ok) {
        const data = await res.json();
        setCcStats(data);
        if (data.repositories && data.repositories.length > 0) {
          // Add recent scans to ticker
          const newTicker = data.repositories.slice(0, 5).map((r: any) => ({
            name: r.repo_name,
            score: r.trust_score,
            status: r.verdict
          }));
          setTickerItems(prev => [...newTicker, ...prev].slice(0, 10));
        }
      }
    } catch (e) {
      console.error("Failed to load command center statistics", e);
    }
  };

  const handleAnalyze = async (url: string) => {
    if (!url) return;
    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (res.ok) {
        const data = await res.json();
        setRepoData(data);
        setSimulatedData(data);
        // Reset simulation toggles on new scan
        setTwinFlags({
          maintainer_leaves: false,
          releases_stop: false,
          critical_cve: false,
          activity_drops: false,
          dependency_compromised: false
        });
        setCompromisedNode(null);
        // Add user greeting
        setChatHistory([
          { sender: "ai", text: `I have compiled the Technology Adoption Intelligence report for ${data.name}. What would you like to review?` }
        ]);
        fetchCCStats();
      } else {
        const err = await res.json();
        alert(`Analysis failed: ${err.detail || "Server error"}`);
      }
    } catch (e) {
      alert("Error contacting the backend. Verify the FastAPI server is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!compareInputs) return;
    setCompareLoading(true);
    const urls = compareInputs.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls })
      });
      if (res.ok) {
        const data = await res.json();
        setCompareResults(data);
      } else {
        const err = await res.json();
        alert(`Comparison failed: ${err.detail || "Server error"}`);
      }
    } catch (e) {
      alert("Comparison error.");
    } finally {
      setCompareLoading(false);
    }
  };

  const handleChat = async (questionText: string) => {
    const q = questionText || chatInput;
    if (!q) return;
    
    const userMsg = { sender: "user", text: q };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoData, question: q })
      });
      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [...prev, { sender: "ai", text: data.response }]);
      } else {
        setChatHistory(prev => [...prev, { sender: "ai", text: "[API Error] Failed to compute response." }]);
      }
    } catch (e) {
      setChatHistory(prev => [...prev, { sender: "ai", text: "[Network Error] Unable to call chat advisor." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleTwinSimulation = async (updatedFlags: typeof twinFlags) => {
    setTwinFlags(updatedFlags);
    setTwinLoading(true);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoData, flags: updatedFlags })
      });
      if (res.ok) {
        const data = await res.json();
        setSimulatedData(data);
      }
    } catch (e) {
      console.error("Twin simulation calculation failed", e);
    } finally {
      setTwinLoading(false);
    }
  };

  const handleRunBenchmark = async () => {
    setBenchmarkLoading(true);
    try {
      const res = await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataSize: benchmarkSize })
      });
      if (res.ok) {
        const data = await res.json();
        setBenchmarkResults(data);
      }
    } catch (e) {
      alert("Benchmarking failed. Verify CPU environment.");
    } finally {
      setBenchmarkLoading(false);
    }
  };

  // Helper colors for scores
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return "text-rose-500";
  };

  const getVerdictBg = (verdict: string) => {
    if (verdict === "APPROVED" || verdict === "APPROVE") return "bg-emerald-950/50 text-emerald-400 border-emerald-500/30";
    if (verdict === "APPROVED WITH REVIEW" || verdict === "REVIEW") return "bg-amber-950/50 text-amber-400 border-amber-500/30";
    if (verdict === "RESTRICT") return "bg-violet-950/50 text-violet-400 border-violet-500/30";
    return "bg-rose-950/50 text-rose-500 border-rose-500/30";
  };

  // ─── ECOSYSTEM MAP CANVAS FORCE LAYOUT ───
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedEcoNode, setSelectedEcoNode] = useState<any>(null);

  useEffect(() => {
    if (activeTab !== "ecosystem" || !canvasRef.current || !repoData) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Define nodes
    const nodes: any[] = [
      { id: "root", label: repoData.name, type: "repo", x: 400, y: 250, r: 25, color: "#00f0ff" },
      { id: "license", label: `License: ${repoData.license}`, type: "license", x: 200, y: 150, r: 15, color: "#10b981" },
      { id: "cve", label: repoData.has_security_policy ? "Security: Configured" : "Vulnerability: Missing Policy", type: "vulnerability", x: 250, y: 350, r: 15, color: repoData.has_security_policy ? "#10b981" : "#f43f5e" },
      { id: "contrib1", label: "Core Maintainers", type: "maintainer", x: 550, y: 150, r: 16, color: "#bd00ff" },
      { id: "contrib2", label: "Active Contributors", type: "contributor", x: 600, y: 320, r: 14, color: "#8b5cf6" },
      { id: "alt1", label: "Alternative Candidate", type: "alternative", x: 400, y: 80, r: 15, color: "#f59e0b" }
    ];

    // Add dependencies nodes
    repoData.dependencies_list.slice(0, 4).forEach((dep: string, i: number) => {
      const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
      const angle = angles[i] || (i * 0.8);
      nodes.push({
        id: `dep_${dep}`,
        label: dep,
        type: "dependency",
        x: 400 + Math.cos(angle) * 160,
        y: 250 + Math.sin(angle) * 160,
        r: 14,
        color: "#38bdf8"
      });
    });

    const links: any[] = [];
    nodes.forEach(n => {
      if (n.id !== "root") {
        links.push({ source: "root", target: n.id });
      }
    });

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid details
      ctx.strokeStyle = "rgba(56, 189, 248, 0.03)";
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let j = 0; j < canvas.height; j += 30) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(canvas.width, j);
        ctx.stroke();
      }

      // Draw links
      links.forEach(l => {
        const sNode = nodes.find(n => n.id === l.source);
        const tNode = nodes.find(n => n.id === l.target);
        if (sNode && tNode) {
          ctx.beginPath();
          ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
          ctx.lineWidth = 1.5;
          ctx.moveTo(sNode.x, sNode.y);
          ctx.lineTo(tNode.x, tNode.y);
          ctx.stroke();
        }
      });

      // Draw nodes
      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, 2 * Math.PI);
        ctx.fillStyle = "#0a0f18";
        ctx.fill();
        ctx.strokeStyle = n.color;
        ctx.lineWidth = selectedEcoNode?.id === n.id ? 4 : 2;
        ctx.stroke();

        // Glow inner circles
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r - 4, 0, 2 * Math.PI);
        ctx.fillStyle = `${n.color}22`;
        ctx.fill();

        // Node labels
        ctx.fillStyle = "#cbd5e1";
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(n.label, n.x, n.y + n.r + 16);
      });
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      let found = null;
      for (const node of nodes) {
        const dist = Math.hypot(node.x - clickX, node.y - clickY);
        if (dist <= node.r + 10) {
          found = node;
          break;
        }
      }
      setSelectedEcoNode(found);
    };

    canvas.addEventListener('click', handleCanvasClick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [activeTab, repoData, selectedEcoNode]);

  // ─── BLAST RADIUS REACT FLOW MAPS ───
  // Helper to construct react flow nodes based on dependencies list and compromise target
  const getBlastFlowElements = () => {
    if (!repoData) return { nodes: [], edges: [] };
    const deps = repoData.dependencies_list || [];
    
    // Root Node
    const isRootCompromised = compromisedNode !== null;
    const flowNodes = [
      {
        id: 'root',
        type: 'input',
        data: { 
          label: (
            <div className={`p-3 rounded-lg border text-center transition-all ${isRootCompromised ? 'bg-rose-950/80 border-rose-500 text-rose-200 glow-rose font-semibold' : 'bg-slate-900 border-sky-500/50 text-sky-200'}`}>
              <Shield className="w-4 height-4 mx-auto mb-1 inline" />
              <div className="text-xs font-mono">{repoData.name}</div>
              <div className="text-[10px] opacity-70">Application Root</div>
            </div>
          )
        },
        position: { x: 300, y: 20 },
        style: { width: 180 }
      }
    ];

    const flowEdges: any[] = [];
    
    // First Level Dependencies (Direct)
    deps.forEach((dep: string, idx: number) => {
      const isDirectCompromised = compromisedNode === dep || compromisedNode !== null;
      const xPos = 50 + idx * 160;
      flowNodes.push({
        id: dep,
        type: 'default',
        data: {
          label: (
            <div className={`p-2 rounded border text-center transition-all ${compromisedNode === dep ? 'bg-rose-950 border-rose-500 text-rose-300 font-bold glow-rose' : isDirectCompromised ? 'bg-amber-950 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>
              <div className="text-xs font-mono">{dep}</div>
              <div className="text-[9px] opacity-75">Direct Dependency</div>
            </div>
          )
        },
        position: { x: xPos, y: 150 },
        style: { width: 130 }
      });

      flowEdges.push({
        id: `edge-root-${dep}`,
        source: 'root',
        target: dep,
        animated: isDirectCompromised,
        style: { stroke: isDirectCompromised ? '#f43f5e' : '#38bdf8', strokeWidth: isDirectCompromised ? 3 : 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: isDirectCompromised ? '#f43f5e' : '#38bdf8' }
      });

      // Add one nested transitive dependency per direct dependency to show blast depth
      const transDep = `t_${dep}`;
      const isTransCompromised = compromisedNode === dep; // Cascades up from transitive to direct
      flowNodes.push({
        id: transDep,
        type: 'output',
        data: {
          label: (
            <div className="p-1 rounded bg-slate-950 border border-slate-850 text-slate-400 text-center">
              <div className="text-[10px] font-mono">{dep}-core</div>
              <div className="text-[8px] opacity-60">Transitive</div>
            </div>
          )
        },
        position: { x: xPos, y: 260 },
        style: { width: 120 }
      });

      flowEdges.push({
        id: `edge-${dep}-${transDep}`,
        source: dep,
        target: transDep,
        animated: isTransCompromised,
        style: { stroke: isTransCompromised ? '#f43f5e' : '#475569', strokeWidth: isTransCompromised ? 2 : 1 },
        markerEnd: { type: MarkerType.ArrowClosed, color: isTransCompromised ? '#f43f5e' : '#475569' }
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  };

  const { nodes: flowNodes, edges: flowEdges } = getBlastFlowElements();

  // Radar charts data constructor
  const getRadarData = (data: any) => {
    const scores = data.scores || {};
    return [
      { subject: 'Security', A: scores.security || 50, fullMark: 100 },
      { subject: 'Maintenance', A: scores.maintenance || 50, fullMark: 100 },
      { subject: 'Community', A: scores.community || 50, fullMark: 100 },
      { subject: 'Supply Chain', A: scores.supply || 50, fullMark: 100 },
      { subject: 'Documentation', A: scores.documentation || 50, fullMark: 100 }
    ];
  };

  // Forecast charts data constructor
  const getForecastData = (data: any) => {
    const trust = data.trust || 50;
    const timeMachine = data.timeMachine || {};
    return [
      { name: '-12M', Trust: timeMachine.pastTrust?.score || Math.round(trust * 1.05) },
      { name: 'Today', Trust: trust },
      { name: '+6M', Trust: Math.max(10, Math.round(trust + ((timeMachine.futureTrust?.score || trust) - trust) / 2)) },
      { name: '+12M', Trust: timeMachine.futureTrust?.score || Math.round(trust * 0.95) },
      { name: '+24M', Trust: Math.max(5, Math.round((timeMachine.futureTrust?.score || trust) - 8)) }
    ];
  };

  return (
    <div className="min-h-screen bg-[#04060a] text-slate-100 flex flex-col scanlines relative">
      {/* Background neon elements */}
      <div className="absolute inset-0 pointer-events-none cyber-grid z-0"></div>
      
      {/* Top Telemetry Ticker */}
      <div className="bg-[#020406] border-b border-sky-950/50 py-1.5 px-4 overflow-hidden whitespace-nowrap z-10 flex gap-8 select-none">
        <div className="flex items-center gap-1.5 text-xs text-sky-400 font-mono font-bold tracking-wider uppercase shrink-0 border-r border-sky-950 pr-4">
          <Terminal className="w-3.5 height-3.5 animate-pulse text-neon-cyan" />
          Live Adoption Feeds:
        </div>
        <div className="flex gap-10 items-center animate-[marquee_25s_linear_infinite] whitespace-nowrap text-xs font-mono">
          {tickerItems.map((item, idx) => (
            <div key={idx} className="inline-flex items-center gap-2">
              <span className="text-slate-400 font-medium">{item.name}</span>
              <span className={`font-bold ${item.score >= 80 ? 'text-emerald-400' : item.score >= 60 ? 'text-amber-400' : 'text-rose-500'}`}>
                {item.score}%
              </span>
              <span className="text-[10px] px-1 bg-slate-900 border border-slate-800 rounded text-slate-500 font-semibold">{item.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Terminal Header */}
      <header className="border-b border-sky-950/40 bg-slate-950/85 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 height-9 rounded bg-sky-950/30 border border-sky-500/40 flex items-center justify-center glow-cyan">
            <Shield className="w-5 height-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
              TRUSTGRAPH
              <span className="text-xs px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono tracking-wide font-normal">
                v1.0.0
              </span>
            </h1>
            <p className="text-[11px] text-sky-400/80 font-mono tracking-widest uppercase">"Know Before You Build"</p>
          </div>
        </div>

        {/* Global Repository Search */}
        <div className="flex items-center gap-2 max-w-md w-full relative">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-4 height-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Analyze owner/repo (e.g. facebook/react)" 
              className="bg-slate-900/90 border border-sky-950/70 focus:border-sky-500/80 text-sm text-slate-200 pl-10 pr-4 py-2 rounded w-full outline-none transition-all font-mono"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze(repoInput)}
            />
          </div>
          <button 
            onClick={() => handleAnalyze(repoInput)}
            disabled={loading}
            className="bg-sky-950/40 border border-sky-500/40 text-sky-400 px-4 py-2 text-sm rounded hover:bg-sky-500/20 active:bg-sky-500/30 transition-all font-mono font-bold flex items-center gap-1.5 shrink-0"
          >
            {loading ? <RefreshCw className="w-4 height-4 animate-spin" /> : "ANALYZE"}
          </button>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="flex flex-1 flex-col lg:flex-row z-10">
        
        {/* Sidebar Tabs */}
        <aside className="lg:w-60 border-r border-sky-950/30 bg-[#06080d]/80 backdrop-blur-sm p-3 shrink-0 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
          {[
            { id: "dashboard", label: "Executive Advisory", icon: Shield },
            { id: "forecast", label: "Viability Forecast", icon: TrendingUp },
            { id: "twin", label: "Digital Twin", icon: Sliders },
            { id: "ecosystem", label: "Ecosystem Map", icon: Users },
            { id: "blast", label: "Blast Radius", icon: Layers },
            { id: "compare", label: "Compare Center", icon: GitFork },
            { id: "command", label: "Command Center", icon: Database },
            { id: "benchmark", label: "NVIDIA Acceleration", icon: Cpu }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded text-xs font-mono font-medium transition-all text-left shrink-0 ${activeTab === tab.id ? 'bg-sky-500/10 border-l-2 border-sky-400 text-sky-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'}`}
            >
              <tab.icon className="w-4 height-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-6 overflow-y-auto max-w-full">
          
          {/* Active Repo Heading Panel */}
          {repoData && (
            <div className="mb-6 p-4 rounded bg-slate-900/45 border border-sky-950/30 backdrop-blur-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative shimmer-bg">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold">Currently Inspecting</span>
                <h2 className="text-xl font-bold font-mono text-white flex items-center gap-2">
                  {repoData.name}
                  {repoData.repo_archived && (
                    <span className="text-xs px-2 py-0.5 bg-rose-950 border border-rose-500/40 text-rose-400 rounded">Archived</span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">{repoData.description}</p>
              </div>

              {/* Top Quick Badges */}
              <div className="flex gap-4 shrink-0 font-mono text-xs flex-wrap justify-end">
                <div className="text-center">
                  <div className="text-[10px] text-slate-500 uppercase">Trust Score</div>
                  <div className={`text-base font-bold ${getScoreColor(repoData.trust)}`}>{repoData.trust}%</div>
                </div>
                <div className="w-px bg-slate-800 self-stretch"></div>
                <div className="text-center">
                  <div className="text-[10px] text-slate-500 uppercase">Forks</div>
                  <div className="text-base font-bold text-slate-300">{repoData.forks.toLocaleString()}</div>
                </div>
                <div className="w-px bg-slate-800 self-stretch"></div>
                <div className="text-center">
                  <div className="text-[10px] text-slate-500 uppercase">Stars</div>
                  <div className="text-base font-bold text-slate-300">{repoData.stars.toLocaleString()}</div>
                </div>
                <div className="w-px bg-slate-800 self-stretch"></div>
                <div className="text-center">
                  <div className="text-[10px] text-slate-500 uppercase">Status</div>
                  <div className={`font-bold px-2 py-0.5 rounded text-[10px] mt-1 inline-block ${repoData.status === 'STRONG' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' : repoData.status === 'MODERATE' ? 'bg-amber-950 text-amber-400 border border-amber-500/20' : 'bg-rose-950 text-rose-500 border border-rose-500/20'}`}>
                    {repoData.status}
                  </div>
                </div>
                {repoData.docker_base_image && repoData.docker_base_image !== "None" && (
                  <>
                    <div className="w-px bg-slate-800 self-stretch"></div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 uppercase">Container Base</div>
                      <div className="text-base font-bold text-sky-400">{repoData.docker_base_image}</div>
                    </div>
                  </>
                )}
                {repoData.github_workflows_count > 0 && (
                  <>
                    <div className="w-px bg-slate-800 self-stretch"></div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 uppercase">CI Workflows</div>
                      <div className="text-base font-bold text-sky-400">{repoData.github_workflows_count} GHA</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* VIEW: EXECUTIVE DASHBOARD */}
          {activeTab === "dashboard" && repoData && (
            <div className="space-y-6">
              
              {/* Row 1: Decision Card + 7-Factor Card */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Advisor Verdict */}
                <div className="lg:col-span-5 glass-panel p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold">Boardroom Verdict</span>
                      <span className="text-[10px] font-mono text-slate-500">Live Telemetry Analysis</span>
                    </div>
                    <h3 className="text-lg font-bold font-mono text-slate-200 mt-2">Executive Advisory Recommendation</h3>
                    
                    <div className="my-6 p-4 rounded border text-center font-mono transition-all duration-300 hover:scale-102 cursor-default bg-slate-900/60 border-sky-500/20">
                      <div className="text-xs opacity-65 uppercase tracking-widest text-slate-400">Adoption Verdict</div>
                      <div className={`text-2xl font-black tracking-wide my-1 py-1 rounded inline-block px-4 ${getVerdictBg(repoData.aiReport?.boardroom?.decision || repoData.verdict)}`}>
                        {repoData.aiReport?.boardroom?.decision || repoData.verdict}
                      </div>
                      <div className="text-[10px] text-slate-400/80 mt-1">
                        Confidence Index: <span className="font-bold text-sky-400">{repoData.aiReport?.boardroom?.confidence || 80}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-sky-950/30 pt-4">
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wide">Boardroom Executive Summary</h4>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed font-mono">
                      {repoData.aiReport?.boardroom?.summary}
                    </p>
                  </div>
                </div>

                {/* 7-Factor Risk Cards */}
                <div className="lg:col-span-7 glass-panel p-5">
                  <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold">Due-Diligence Audit</span>
                  <h3 className="text-lg font-bold font-mono text-slate-200 mt-2 mb-4">7-Factor Security & Risk Card</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {[
                      { name: "Technical Risk", risk: repoData.aiReport?.dueDiligence?.technicalRisk || { level: "Low", description: "Minimal architectural concerns." } },
                      { name: "Security Risk", risk: repoData.aiReport?.dueDiligence?.securityRisk || { level: "Low", description: "No active vulnerabilities." } },
                      { name: "Maintenance Risk", risk: repoData.aiReport?.dueDiligence?.maintenanceRisk || { level: "Low", description: "Continuous updates." } },
                      { name: "Community Risk", risk: repoData.aiReport?.dueDiligence?.communityRisk || { level: "Low", description: "Healthy dev velocity." } },
                      { name: "Adoption Risk", risk: repoData.aiReport?.dueDiligence?.adoptionRisk || { level: "Low", description: "Permissive licensing." } },
                      { name: "Vendor Lock-In Risk", risk: repoData.aiReport?.dueDiligence?.vendorLockInRisk || { level: "Low", description: "Standard connectors." } },
                      { name: "Future Viability", risk: repoData.aiReport?.dueDiligence?.futureViabilityRisk || { level: "Low", description: "High stability trajectory." } }
                    ].map((f, i) => (
                      <div key={i} className="p-3 rounded bg-slate-950/65 border border-sky-950/20">
                        <div className="flex justify-between font-mono font-bold">
                          <span className="text-slate-300">{f.name}</span>
                          <span className={`${f.risk.level === 'Low' ? 'text-emerald-400' : f.risk.level === 'Medium' ? 'text-amber-400' : 'text-rose-500'}`}>
                            {f.risk.level}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal">{f.risk.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Row: Real-Time Dependency & Environment Audit */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-panel p-4 flex gap-4 items-center">
                  <div className="w-10 h-10 rounded bg-sky-950/20 border border-sky-500/20 flex items-center justify-center glow-cyan shrink-0">
                    <Shield className="w-5 h-5 text-sky-400" />
                  </div>
                  <div className="font-mono text-xs">
                    <span className="text-[10px] text-slate-500 uppercase block">Vulnerable Packages</span>
                    <div className={`text-base font-bold mt-0.5 ${repoData.vulnerabilities?.length > 0 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>
                      {repoData.vulnerabilities?.length || 0} CVEs Detected
                    </div>
                    <span className="text-[9px] text-slate-500">Security scans active</span>
                  </div>
                </div>

                <div className="glass-panel p-4 flex gap-4 items-center">
                  <div className="w-10 h-10 rounded bg-sky-950/20 border border-sky-500/20 flex items-center justify-center glow-cyan shrink-0">
                    <Activity className="w-5 h-5 text-sky-400" />
                  </div>
                  <div className="font-mono text-xs">
                    <span className="text-[10px] text-slate-500 uppercase block">Average Package Age</span>
                    <div className="text-base font-bold text-slate-300 mt-0.5">{repoData.dependency_age_days || 0} Days</div>
                    <span className="text-[9px] text-slate-500">From stable releases</span>
                  </div>
                </div>

                <div className="glass-panel p-4 flex gap-4 items-center">
                  <div className="w-10 h-10 rounded bg-sky-950/20 border border-sky-500/20 flex items-center justify-center glow-cyan shrink-0">
                    <Layers className="w-5 h-5 text-sky-400" />
                  </div>
                  <div className="font-mono text-xs">
                    <span className="text-[10px] text-slate-500 uppercase block">Outdated Dependencies</span>
                    <div className="text-base font-bold text-slate-300 mt-0.5">{repoData.outdated_packages_count || 0} Packages</div>
                    <span className="text-[9px] text-slate-500">Upgrades available</span>
                  </div>
                </div>

                <div className="glass-panel p-4 flex gap-4 items-center">
                  <div className="w-10 h-10 rounded bg-sky-950/20 border border-sky-500/20 flex items-center justify-center glow-cyan shrink-0">
                    <Sliders className="w-5 h-5 text-sky-400" />
                  </div>
                  <div className="font-mono text-xs">
                    <span className="text-[10px] text-slate-500 uppercase block">License Compliance</span>
                    <div className={`text-base font-bold mt-0.5 ${repoData.license_conflicts_count > 0 ? 'text-rose-500 font-bold' : 'text-emerald-400'}`}>
                      {repoData.license_conflicts_count || 0} Conflicts
                    </div>
                    <span className="text-[9px] text-slate-500">Copyleft constraints</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Financial Asset Telemetry + Adoption Readiness Table */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Financial Telemetry */}
                <div className="lg:col-span-5 glass-panel p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold">Bloomberg Asset Mode</span>
                    <h3 className="text-lg font-bold font-mono text-slate-200 mt-2 mb-4">Codebase Financial Rationale</h3>
                    
                    <div className="p-4 rounded bg-slate-950/80 border border-sky-950/20">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono text-slate-400 uppercase">Asset Rating Recommendation</span>
                        <span className={`text-sm font-bold font-mono px-2.5 py-0.5 rounded ${repoData.aiReport?.investmentAnalyst?.recommendation === 'BUY' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' : 'bg-amber-950 text-amber-400 border border-amber-500/20'}`}>
                          {repoData.aiReport?.investmentAnalyst?.recommendation || "HOLD"}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mt-4 text-center font-mono">
                        <div className="bg-slate-900/60 p-2 rounded">
                          <div className="text-[9px] text-slate-500 uppercase">Growth</div>
                          <div className="text-sm font-bold text-sky-400">{repoData.aiReport?.investmentAnalyst?.growthRating || "B"}</div>
                        </div>
                        <div className="bg-slate-900/60 p-2 rounded">
                          <div className="text-[9px] text-slate-500 uppercase">Health</div>
                          <div className="text-sm font-bold text-sky-400">{repoData.aiReport?.investmentAnalyst?.healthRating || "Strong"}</div>
                        </div>
                        <div className="bg-slate-900/60 p-2 rounded">
                          <div className="text-[9px] text-slate-500 uppercase">Momentum</div>
                          <div className="text-xs font-bold text-sky-400 truncate">{repoData.aiReport?.investmentAnalyst?.momentumRating || "Accelerating"}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-sky-950/30 pt-4 mt-4">
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase">Equity Justification</h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed font-mono">
                      {repoData.aiReport?.investmentAnalyst?.justification}
                    </p>
                  </div>
                </div>

                {/* Adoption Readiness Table */}
                <div className="lg:col-span-7 glass-panel p-5">
                  <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold">Compliance Environments</span>
                  <h3 className="text-lg font-bold font-mono text-slate-200 mt-2 mb-4">Rule-Based Adoption Readiness Matrix</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono text-left">
                      <thead>
                        <tr className="border-b border-sky-950/50 text-slate-400">
                          <th className="py-2 font-bold uppercase">Compliance Segment</th>
                          <th className="py-2 font-bold uppercase">Verdict Gate</th>
                          <th className="py-2 font-bold uppercase">Telemetry Logic</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sky-950/20">
                        {[
                          { key: "personal", name: "Personal Projects" },
                          { key: "startup", name: "Startup MVP" },
                          { key: "enterprise", name: "Internal Enterprise Tool" },
                          { key: "saas", name: "Production SaaS" },
                          { key: "banking", name: "Banking (Zero-Trust)" },
                          { key: "healthcare", name: "Healthcare (HIPAA)" },
                          { key: "government", name: "Government Systems" }
                        ].map((env, i) => {
                          const ready = repoData.adoptionReadiness?.[env.key] || { verdict: "REVIEW", reasoning: "No details." };
                          return (
                            <tr key={i} className="hover:bg-slate-900/30">
                              <td className="py-2.5 font-medium text-slate-200">{env.name}</td>
                              <td className="py-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ready.verdict === 'APPROVED' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20' : ready.verdict === 'APPROVED WITH REVIEW' || ready.verdict === 'REVIEW' ? 'bg-amber-950/60 text-amber-400 border border-amber-500/20' : ready.verdict === 'RESTRICT' ? 'bg-violet-950/60 text-violet-400 border border-violet-500/20' : 'bg-rose-950/60 text-rose-500 border border-rose-500/20'}`}>
                                  {ready.verdict}
                                </span>
                              </td>
                              <td className="py-2.5 text-slate-400 max-w-[280px] truncate" title={ready.reasoning}>{ready.reasoning}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Row 3: Radar Chart & AI CTO Chat Advisor */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Radar Dimensions */}
                <div className="lg:col-span-5 glass-panel p-5">
                  <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold">Telemetry Radar</span>
                  <h3 className="text-lg font-bold font-mono text-slate-200 mt-2 mb-4">Core Dimensions Audit</h3>
                  
                  <div className="height-72 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getRadarData(repoData)}>
                        <PolarGrid stroke="rgba(56, 189, 248, 0.1)" />
                        <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={11} fontFamily="'JetBrains Mono', monospace" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(56, 189, 248, 0.2)" fontSize={9} />
                        <Radar name="Trust Index" dataKey="A" stroke="#00f0ff" fill="#38bdf8" fillOpacity={0.2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* AI CTO Advisor Chat */}
                <div className="lg:col-span-7 glass-panel p-5 flex flex-col justify-between height-96">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold">AI Boardroom CTO</span>
                    <h3 className="text-lg font-bold font-mono text-slate-200 mt-1 mb-3">Consult the AI CTO Advisor</h3>
                    
                    {/* Suggested Buttons */}
                    <div className="flex flex-wrap gap-2 mb-4 text-[10px] font-mono">
                      {[
                        "Would you use this in healthcare?",
                        "Should we deploy this for banking?",
                        "What is our primary security concern?",
                        "Are there license compliance risks?"
                      ].map((sug, i) => (
                        <button
                          key={i}
                          onClick={() => handleChat(sug)}
                          className="px-2.5 py-1 rounded bg-slate-900 border border-sky-950/50 text-sky-400 hover:bg-sky-500/10 hover:border-sky-500/40 transition-all cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat Bubbles */}
                  <div className="flex-1 overflow-y-auto bg-slate-950/60 border border-sky-950/20 rounded p-3 mb-3 space-y-2.5 text-xs font-mono">
                    {chatHistory.map((bubble, idx) => (
                      <div key={idx} className={`flex ${bubble.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-2.5 rounded ${bubble.sender === 'user' ? 'bg-sky-950/45 text-sky-200 border border-sky-500/20' : 'bg-slate-900 text-slate-300 border border-slate-800'}`}>
                          <div className="text-[9px] text-slate-500 font-bold mb-1 uppercase">
                            {bubble.sender === 'user' ? 'Security Architect' : 'AI CTO Advisor'}
                          </div>
                          <div className="leading-relaxed whitespace-pre-line">{bubble.text}</div>
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-slate-900 text-sky-400 border border-slate-800 p-2 rounded animate-pulse">
                          AI Advisor compiling evidence...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input bar */}
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Ask the AI CTO: e.g. What are the key long-term risks?" 
                      className="flex-1 bg-slate-900 border border-sky-950/80 rounded px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-sky-500"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChat("")}
                    />
                    <button 
                      onClick={() => handleChat("")}
                      disabled={chatLoading}
                      className="bg-sky-950 border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 px-3.5 rounded flex items-center justify-center cursor-pointer"
                    >
                      <Send className="w-3.5 height-3.5" />
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* VIEW: FUTURE VIABILITY FORECAST */}
          {activeTab === "forecast" && repoData && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Forecast Line Chart */}
              <div className="lg:col-span-8 glass-panel p-5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold">Viability Trajectory</span>
                  <h3 className="text-lg font-bold font-mono text-slate-200 mt-2 mb-4">24-Month Repository Health Forecast</h3>
                  
                  <div className="height-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getForecastData(repoData)} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(56, 189, 248, 0.05)" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontFamily="'JetBrains Mono', monospace" />
                        <YAxis stroke="#94a3b8" fontSize={11} fontFamily="'JetBrains Mono', monospace" domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#0a0f18', borderColor: '#0c4a6e', color: '#e2e8f0' }} />
                        <Line type="monotone" dataKey="Trust" stroke="#00f0ff" strokeWidth={3} dot={{ r: 5, stroke: '#00f0ff', strokeWidth: 2, fill: '#0a0f18' }} activeDot={{ r: 7 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="border-t border-sky-950/30 pt-4 mt-4">
                  <div className="flex gap-2 items-start text-xs font-mono text-slate-400">
                    <AlertTriangle className="w-4 height-4 text-sky-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Viability Rationale:</strong> {repoData.aiReport?.timeMachine?.trendReasoning} 24-Month forecasts model commit frequencies, contributor concentrations (HHI), and release dates to project code maintenance curves.
                    </p>
                  </div>
                </div>
              </div>

              {/* Time Machine Milestones */}
              <div className="lg:col-span-4 glass-panel p-5">
                <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold">Time Machine</span>
                <h3 className="text-lg font-bold font-mono text-slate-200 mt-2 mb-4">Trust History Timeline</h3>

                <div className="space-y-6 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-sky-950/50 pl-8 font-mono">
                  
                  {/* Past */}
                  <div className="relative">
                    <div className="absolute -left-[30px] w-4.5 height-4.5 rounded-full bg-slate-900 border border-slate-750 flex items-center justify-center">
                      <div className="w-2 height-2 rounded-full bg-slate-500"></div>
                    </div>
                    <span className="text-[10px] text-slate-500">12 Months Ago (Historical)</span>
                    <div className="text-sm font-bold text-slate-300 flex items-center gap-2">
                      Trust score: <span className="text-sky-400">{repoData.aiReport?.timeMachine?.pastTrust?.score || 80}%</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      {repoData.aiReport?.timeMachine?.pastTrust?.reason}
                    </p>
                  </div>

                  {/* Present */}
                  <div className="relative">
                    <div className="absolute -left-[30px] w-4.5 height-4.5 rounded-full bg-slate-900 border border-sky-500/40 flex items-center justify-center glow-cyan">
                      <div className="w-2 height-2 rounded-full bg-sky-400"></div>
                    </div>
                    <span className="text-[10px] text-sky-400 font-bold">Today (Baseline)</span>
                    <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      Trust score: <span className="text-sky-400">{repoData.aiReport?.timeMachine?.presentTrust?.score || 88}%</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      {repoData.aiReport?.timeMachine?.presentTrust?.reason}
                    </p>
                  </div>

                  {/* Future */}
                  <div className="relative">
                    <div className="absolute -left-[30px] w-4.5 height-4.5 rounded-full bg-slate-900 border border-sky-500/20 flex items-center justify-center">
                      <div className="w-2 height-2 rounded-full bg-sky-600"></div>
                    </div>
                    <span className="text-[10px] text-slate-500">12 Months Forecast (Predicted)</span>
                    <div className="text-sm font-bold text-slate-300 flex items-center gap-2">
                      Trust score: <span className="text-sky-400">{repoData.aiReport?.timeMachine?.futureTrust?.score || 92}%</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      {repoData.aiReport?.timeMachine?.futureTrust?.reason}
                    </p>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* VIEW: DIGITAL TWIN SIMULATOR */}
          {activeTab === "twin" && repoData && (
            <div className="space-y-6">
              
              {/* Top Banner explaining Twin concept */}
              <div className="p-4 rounded bg-slate-900/50 border border-sky-950/20">
                <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold">Simulation Console</span>
                <h3 className="text-base font-bold font-mono text-white mt-1">Interactive Digital Twin Stress Tester</h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-1 font-mono">
                  Toggle hypothetical risks on the left. The Digital Twin instantly recalculates the telemetry model on the right, demonstrating how trust parameters and enterprise compliance shift under compromise.
                </p>
              </div>

              {/* Stress panel */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Simulator Controls */}
                <div className="lg:col-span-5 glass-panel p-5 font-mono">
                  <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-4">Simulation Console Controls</h4>
                  
                  <div className="space-y-4">
                    {[
                      { key: "maintainer_leaves", label: "Core Maintainer Departs", desc: "Bus factor collapses. Activity levels stagnate." },
                      { key: "releases_stop", label: "Releases Stop", desc: "No upstream patches published. Project enters legacy status." },
                      { key: "critical_cve", label: "Critical CVE Published", desc: "Security score collapses. Exposed vulnerability active." },
                      { key: "activity_drops", label: "Developer Commits Drop 50%", desc: "Maintainer bandwidth decays. Issue resolutions slow down." },
                      { key: "dependency_compromised", label: "Dependency Compromised", desc: "Transitive lockfile exploit. Supply chain gate fails." }
                    ].map(control => (
                      <div key={control.key} className="flex justify-between items-center p-3 rounded bg-slate-950/60 border border-sky-950/15">
                        <div className="max-w-[75%]">
                          <span className="text-xs font-bold text-slate-200">{control.label}</span>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">{control.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={(twinFlags as any)[control.key]}
                            onChange={(e) => {
                              const newFlags = { ...twinFlags, [control.key]: e.target.checked };
                              handleTwinSimulation(newFlags);
                            }}
                          />
                          <div className="w-8 height-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 peer-checked:after:bg-sky-400 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-sky-950 border border-slate-700 peer-checked:border-sky-500/50"></div>
                        </label>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleTwinSimulation({
                      maintainer_leaves: false,
                      releases_stop: false,
                      critical_cve: false,
                      activity_drops: false,
                      dependency_compromised: false
                    })}
                    className="w-full mt-6 bg-slate-950 border border-sky-500/20 text-sky-400 py-2 text-xs rounded hover:bg-sky-500/10 active:bg-sky-500/25 transition-all font-mono font-bold uppercase cursor-pointer"
                  >
                    Reset Simulation State
                  </button>
                </div>

                {/* Simulated Recalculation Output */}
                <div className="lg:col-span-7 glass-panel p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xs font-bold font-mono text-sky-400 uppercase tracking-wider">Recalculated Posture Output</h4>
                      {twinLoading && <span className="text-[10px] font-mono text-sky-400 animate-pulse">Recalculating...</span>}
                    </div>

                    <div className="flex items-center justify-around bg-slate-950/70 p-4 border border-sky-950/20 rounded font-mono mb-4">
                      <div className="text-center">
                        <div className="text-xs font-bold text-slate-300">{repoData.trust}%</div>
                        <div className="text-[9px] text-slate-500 uppercase mt-0.5">Base Trust</div>
                      </div>
                      
                      <div className="text-slate-600 text-lg">→</div>
                      
                      <div className="text-center">
                        <div className={`text-xl font-black ${getScoreColor(simulatedData.trust)}`}>
                          {simulatedData.trust}%
                        </div>
                        <div className="text-[9px] text-slate-500 uppercase mt-0.5">Simulated Trust</div>
                      </div>

                      <div className="w-px bg-slate-800 self-stretch"></div>

                      <div className="text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block mt-1 ${getVerdictBg(simulatedData.verdict)}`}>
                          {simulatedData.verdict}
                        </span>
                        <div className="text-[9px] text-slate-500 uppercase mt-1">Simulated Verdict</div>
                      </div>
                    </div>

                    {/* Chart comparative radar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-950/30 p-2 rounded border border-sky-950/15">
                        <h5 className="text-[10px] font-mono text-slate-400 font-bold uppercase mb-2 text-center">Simulated Trust Dimensions</h5>
                        <div className="height-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="60%" data={getRadarData(simulatedData)}>
                              <PolarGrid stroke="rgba(56, 189, 248, 0.08)" />
                              <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={9} fontFamily="'JetBrains Mono', monospace" />
                              <Radar name="Simulated" dataKey="A" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.15} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-slate-950/30 p-2 rounded border border-sky-950/15">
                        <h5 className="text-[10px] font-mono text-slate-400 font-bold uppercase mb-2 text-center">Simulated Future Forecast</h5>
                        <div className="height-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={getForecastData(simulatedData)}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(56, 189, 248, 0.05)" />
                              <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontFamily="'JetBrains Mono', monospace" />
                              <YAxis stroke="#94a3b8" fontSize={9} domain={[0, 100]} />
                              <Line type="monotone" dataKey="Trust" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3, fill: '#0a0f18' }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded border border-rose-500/20 bg-rose-950/20 font-mono mt-4">
                    <h5 className="text-xs font-bold text-rose-400 uppercase flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 height-3.5" />
                      Simulated Threat Impact Summary
                    </h5>
                    <p className="text-[11px] text-slate-300 leading-relaxed mt-1.5">
                      {simulatedData.sim_summary || "Digital twin running in standard operational limits. Simulation metrics indicate nominal environment gates are APPROVED."}
                    </p>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* VIEW: ECOSYSTEM SOCIAL MAP */}
          {activeTab === "ecosystem" && repoData && (
            <div className="space-y-6">
              
              <div className="p-4 rounded bg-slate-900/50 border border-sky-950/20">
                <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold">Social Network</span>
                <h3 className="text-base font-bold font-mono text-white mt-1">Ecosystem Trust Social Map</h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-1 font-mono">
                  Interact with the social network of trust surrounding {repoData.name}. Nodes map licenses, key maintainers, and security alerts. Click on any node to audit its properties.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Canvas Render Panel */}
                <div className="lg:col-span-8 glass-panel p-3 bg-slate-950 flex justify-center items-center overflow-hidden">
                  <canvas 
                    ref={canvasRef} 
                    width={800} 
                    height={500} 
                    className="w-full max-w-[800px] height-[500px] bg-slate-950 border border-sky-950/20 rounded cursor-pointer"
                  />
                </div>

                {/* Ecosystem inspector */}
                <div className="lg:col-span-4 glass-panel p-5 font-mono flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold">Inspector Telemetry</span>
                    <h4 className="text-sm font-bold text-slate-200 mt-2 mb-4">Ecosystem Node Inspector</h4>
                    
                    {!selectedEcoNode ? (
                      <div className="text-center p-8 text-slate-500 text-xs">
                        <HelpCircle className="w-8 height-8 mx-auto mb-2 text-slate-600 animate-bounce" />
                        Select a node in the map grid to inspect licensing, security, or maintainer variables.
                      </div>
                    ) : (
                      <div className="space-y-4 text-xs">
                        <div className="p-2 rounded bg-slate-900 border border-sky-950/20">
                          <div className="text-[9px] text-slate-500 uppercase">Selected Node</div>
                          <div className="font-bold text-sky-400 text-sm mt-0.5">{selectedEcoNode.label}</div>
                        </div>

                        <div className="p-2 rounded bg-slate-900 border border-sky-950/20">
                          <div className="text-[9px] text-slate-500 uppercase">Node Classification</div>
                          <div className="font-bold text-slate-300 mt-0.5 capitalize">{selectedEcoNode.type}</div>
                        </div>

                        <div className="border-t border-sky-950/30 pt-3">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Relationship Context</span>
                          <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                            {selectedEcoNode.type === "repo" && `Root project node for ${repoData.name}. Exposes ${repoData.stars} stars, ${repoData.forks} forks, and ${repoData.contributors} developers.`}
                            {selectedEcoNode.type === "license" && `Licensing gate for compliance auditing. Evaluated license: ${repoData.license}. Meets open-source usage policies.`}
                            {selectedEcoNode.type === "vulnerability" && `Security diagnostic node. Audit confirms ${repoData.has_security_policy ? "active security policy disclosures. Gaps checked." : "no formal security policy. Zero-day vulnerability alerts might be handled insecurely."}`}
                            {selectedEcoNode.type === "maintainer" && `Core project maintainers. Evaluates bus factor concentration levels across git repository commits.`}
                            {selectedEcoNode.type === "contributor" && `Secondary developer network. Evaluates external collaboration velocity over the past 12 months.`}
                            {selectedEcoNode.type === "alternative" && `Recommended alternate candidate. Evaluated for risk mitigation if direct integration fails compliance.`}
                            {selectedEcoNode.type === "dependency" && `Direct dependency node. Locked in package logs. Subject to transitive dependency vulnerability audits.`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-sky-950/30 pt-4 mt-6 text-[10px] text-slate-500 flex items-center gap-1.5">
                    <div className="w-2 height-2 rounded-full bg-sky-400 glow-cyan"></div>
                    Interactions are backed by local SQLite metadata queries.
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* VIEW: DEPENDENCY BLAST RADIUS */}
          {activeTab === "blast" && repoData && (
            <div className="space-y-6">
              
              <div className="p-4 rounded bg-slate-900/50 border border-sky-950/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold">Compromise Simulator</span>
                  <h3 className="text-base font-bold font-mono text-white mt-1">Supply Chain Dependency Blast Radius</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1 font-mono">
                    Audit dependency hierarchies. Click on any dependency node to simulate a package compromise and calculate the organizational blast radius.
                  </p>
                </div>
                {compromisedNode && (
                  <button 
                    onClick={() => setCompromisedNode(null)}
                    className="px-3 py-1.5 bg-rose-950/60 border border-rose-500 text-rose-300 rounded text-xs font-mono font-bold hover:bg-rose-500/20 cursor-pointer"
                  >
                    Clear Compromise Simulation
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* React Flow Render Window */}
                <div className="lg:col-span-8 glass-panel bg-slate-950 border border-sky-950/20 rounded height-[450px]">
                  <ReactFlow
                    nodes={flowNodes}
                    edges={flowEdges}
                    onNodeClick={(_, node) => {
                      if (node.id !== 'root' && !node.id.startsWith('t_')) {
                        setCompromisedNode(node.id);
                      }
                    }}
                    fitView
                  >
                    <Background color="rgba(56, 189, 248, 0.05)" gap={16} />
                    <Controls />
                  </ReactFlow>
                </div>

                {/* Blast Radius calculations */}
                <div className="lg:col-span-4 glass-panel p-5 font-mono flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-4">Compromise Statistics</h4>
                    
                    <div className="space-y-4 text-xs">
                      <div className="p-3 rounded bg-slate-900 border border-sky-950/20">
                        <span className="text-[10px] text-slate-500 uppercase block">Selected Target Package</span>
                        <span className={`text-sm font-bold block mt-1 ${compromisedNode ? 'text-rose-400' : 'text-slate-400'}`}>
                          {compromisedNode ? compromisedNode : "Hover/Select dependency node"}
                        </span>
                      </div>

                      <div className="p-3 rounded bg-slate-900 border border-sky-950/20">
                        <span className="text-[10px] text-slate-500 uppercase block">Simulation Status</span>
                        <span className={`text-xs font-bold block mt-1 ${compromisedNode ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`}>
                          {compromisedNode ? 'COMPROMISED (ACTIVE)' : 'INACTIVE'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-2 text-center">
                        <div className="bg-slate-900/60 p-3 rounded">
                          <span className={`text-xl font-bold block ${compromisedNode ? 'text-rose-500' : 'text-slate-400'}`}>
                            {compromisedNode ? 2 : 0}
                          </span>
                          <span className="text-[9px] text-slate-500 uppercase block mt-1">Affected Packages</span>
                        </div>
                        <div className="bg-slate-900/60 p-3 rounded">
                          <span className={`text-xl font-bold block ${compromisedNode ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>
                            {compromisedNode ? '45%' : '0%'}
                          </span>
                          <span className="text-[9px] text-slate-500 uppercase block mt-1">Affected SaaS Systems</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded border font-mono text-xs mt-6 transition-all ${compromisedNode ? 'bg-rose-950/25 border-rose-500/40 text-rose-300' : 'bg-slate-900/50 border-sky-950/20 text-slate-400'}`}>
                    <h5 className="font-bold uppercase flex items-center gap-1.5">
                      <AlertTriangle className="w-4.5 height-4.5" />
                      Blast Risk Verdict
                    </h5>
                    <p className="leading-relaxed mt-1 text-[11px]">
                      {compromisedNode 
                        ? `Compromising ${compromisedNode} propagates upstream, infecting root build scripts. A vulnerability exploit in this path compromises approximately 45% of production SaaS services and general registry pipelines.` 
                        : "Select any dependency node in the map graph to start the cascading attack vector path simulator."
                      }
                    </p>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* VIEW: REPOSITORY COMPARISON CENTER */}
          {activeTab === "compare" && (
            <div className="space-y-6">
              
              <div className="p-5 glass-panel">
                <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold">Comparison Command Center</span>
                <h3 className="text-lg font-bold font-mono text-slate-200 mt-1 mb-2">Compare Repositories</h3>
                
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <input 
                    type="text" 
                    placeholder="Enter repositories separated by commas (e.g. facebook/react, vuejs/core, angular/angular)" 
                    className="flex-1 bg-slate-900 border border-sky-950/80 rounded px-3 py-2.5 text-xs font-mono text-slate-200 outline-none focus:border-sky-500"
                    value={compareInputs}
                    onChange={(e) => setCompareInputs(e.target.value)}
                  />
                  <button
                    onClick={handleCompare}
                    disabled={compareLoading}
                    className="bg-sky-500/10 border border-sky-500/40 text-sky-400 hover:bg-sky-500/20 px-5 py-2 rounded text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {compareLoading ? <RefreshCw className="w-4 height-4 animate-spin" /> : "COMPARE ASSETS"}
                  </button>
                </div>
              </div>

              {/* Comparison Results */}
              {compareResults && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Glowing winner card */}
                  <div className="glass-panel p-5 border-l-4 border-sky-400 relative overflow-hidden bg-gradient-to-r from-sky-950/15 to-transparent">
                    <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold">Decision Verdict Winner</span>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mt-1">
                      <h4 className="text-base font-bold font-mono text-white">Architect Recommendation Choice</h4>
                      <div className="px-3 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold uppercase tracking-wider">
                        ★ {compareResults.winner}
                      </div>
                    </div>
                    <p className="text-xs font-mono text-slate-300 mt-2.5 leading-relaxed">
                      {compareResults.recommendation}
                    </p>
                  </div>

                  {/* Matrix comparison table */}
                  <div className="glass-panel p-5">
                    <h4 className="text-xs font-bold font-mono text-sky-400 uppercase tracking-wider mb-4">Multi-Factor Telemetry Matrix</h4>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-mono text-left">
                        <thead>
                          <tr className="border-b border-sky-950/50 text-slate-400">
                            <th className="py-2.5 font-bold uppercase">Repository Asset</th>
                            <th className="py-2.5 font-bold uppercase text-center">Security</th>
                            <th className="py-2.5 font-bold uppercase text-center">Maintenance</th>
                            <th className="py-2.5 font-bold uppercase text-center">Community</th>
                            <th className="py-2.5 font-bold uppercase text-center">Future Viability</th>
                            <th className="py-2.5 font-bold uppercase text-center">Enterprise Readiness</th>
                            <th className="py-2.5 font-bold uppercase text-center">Documentation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sky-950/20">
                          {Object.keys(compareResults.comparison).map((repoName, idx) => {
                            const details = compareResults.comparison[repoName];
                            return (
                              <tr key={idx} className="hover:bg-slate-900/30">
                                <td className="py-3 font-bold text-slate-200">{repoName}</td>
                                <td className="py-3 text-center font-bold text-sky-400">{details.security}%</td>
                                <td className="py-3 text-center font-bold text-sky-400">{details.maintenance}%</td>
                                <td className="py-3 text-center font-bold text-sky-400">{details.community}%</td>
                                <td className="py-3 text-center font-bold text-sky-400">{details.futureViability}%</td>
                                <td className="py-3 text-center font-bold text-sky-400">{details.enterpriseReadiness}%</td>
                                <td className="py-3 text-center font-bold text-sky-400">{details.documentation}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* VIEW: COMMAND CENTER */}
          {activeTab === "command" && (
            <div className="space-y-6">
              
              {/* Row 1: Key stats counters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { name: "Repositories Scanned", val: ccStats.totalScanned || 0, icon: FileText, label: "Unique scans logged" },
                  { name: "Global Avg Trust", val: `${ccStats.avgScores?.trust || 0}%`, icon: Shield, label: "Aggregate safety rating" },
                  { name: "Global Avg Security", val: `${ccStats.avgScores?.security || 0}%`, icon: Lock, label: "Aggregate vulnerability rating" },
                  { name: "Global Avg Maintenance", val: `${ccStats.avgScores?.maintenance || 0}%`, icon: Activity, label: "Aggregate velocity index" }
                ].map((stat, i) => (
                  <div key={i} className="glass-panel p-4 flex gap-4 items-center">
                    <div className="w-10 height-10 rounded bg-sky-950/20 border border-sky-500/20 flex items-center justify-center glow-cyan shrink-0">
                      <stat.icon className="w-5 height-5 text-sky-400" />
                    </div>
                    <div className="font-mono">
                      <span className="text-[10px] text-slate-500 uppercase block">{stat.name}</span>
                      <div className="text-lg font-bold text-slate-200 mt-0.5">{stat.val}</div>
                      <span className="text-[9px] text-slate-500">{stat.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Row 2: Scan Logs List */}
              <div className="glass-panel p-5">
                <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold">BigQuery Logs</span>
                <h3 className="text-lg font-bold font-mono text-slate-200 mt-2 mb-4">Historical Repositories Inspected</h3>
                
                {ccStats.repositories && ccStats.repositories.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 text-xs font-mono">
                    No repositories analyzed yet. Log your first scan via the search bar above.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono text-left">
                      <thead>
                        <tr className="border-b border-sky-950/50 text-slate-400">
                          <th className="py-2.5 font-bold uppercase">Asset Name</th>
                          <th className="py-2.5 font-bold uppercase text-center">Trust Index</th>
                          <th className="py-2.5 font-bold uppercase text-center">Security</th>
                          <th className="py-2.5 font-bold uppercase text-center">Maintenance</th>
                          <th className="py-2.5 font-bold uppercase text-center">Readiness</th>
                          <th className="py-2.5 font-bold uppercase text-center">Verdict</th>
                          <th className="py-2.5 font-bold uppercase">Scanned At (UTC)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sky-950/20">
                        {ccStats.repositories.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-900/30">
                            <td className="py-3 font-bold text-sky-400 cursor-pointer hover:underline" onClick={() => handleAnalyze(item.repo_name)}>
                              {item.repo_name}
                            </td>
                            <td className="py-3 text-center font-bold text-slate-200">{item.trust_score}%</td>
                            <td className="py-3 text-center text-slate-300">{item.security_score}%</td>
                            <td className="py-3 text-center text-slate-300">{item.maintenance_score}%</td>
                            <td className="py-3 text-center text-slate-300">{item.readiness_score}%</td>
                            <td className="py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getVerdictBg(item.verdict)}`}>
                                {item.verdict}
                              </span>
                            </td>
                            <td className="py-3 text-slate-500">{new Date(item.analyzed_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* VIEW: NVIDIA ACCELERATION */}
          {activeTab === "benchmark" && (
            <div className="space-y-6">
              
              {/* Benchmark Settings Console */}
              <div className="glass-panel p-5">
                <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold">GPU Coprocessor</span>
                <h3 className="text-lg font-bold font-mono text-slate-200 mt-1 mb-2">NVIDIA RAPIDS cuDF Benchmark Console</h3>
                <p className="text-xs text-slate-400 mt-1 mb-4 leading-normal font-mono">
                  Measure data execution speeds of unoptimized iterative loops (CPU Path) vs compiled vectorized hardware acceleration (GPU/cuDF Emulated Path) executing repository metrics audits.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 items-center font-mono">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Dataset Records:</span>
                    <select 
                      value={benchmarkSize} 
                      onChange={(e) => setBenchmarkSize(parseInt(e.target.value))}
                      className="bg-slate-900 border border-sky-950 rounded px-2 py-1 text-slate-200 outline-none cursor-pointer"
                    >
                      <option value={50000}>50,000 commits</option>
                      <option value={100000}>100,000 commits</option>
                      <option value={200000}>200,000 commits</option>
                      <option value={500000}>500,000 commits</option>
                    </select>
                  </div>
                  
                  <button 
                    onClick={handleRunBenchmark}
                    disabled={benchmarkLoading}
                    className="w-full sm:w-auto bg-sky-500/10 border border-sky-500/40 text-sky-400 hover:bg-sky-500/20 active:bg-sky-500/30 px-5 py-2 rounded text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {benchmarkLoading ? <RefreshCw className="w-4 height-4 animate-spin" /> : <Play className="w-3.5 height-3.5 fill-sky-400" />}
                    EXECUTE PERFORMANCE CYCLE
                  </button>
                </div>
              </div>

              {/* Benchmark Results Display */}
              {benchmarkResults && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in font-mono">
                  
                  {/* Speedup Gauge */}
                  <div className="lg:col-span-5 glass-panel p-5 flex flex-col justify-between items-center text-center">
                    <div>
                      <span className="text-[10px] tracking-widest text-sky-400 uppercase font-bold">Speedup Coefficient</span>
                      <h4 className="text-xs text-slate-400 uppercase mt-1">Accelerated Performance Multiplier</h4>
                    </div>

                    <div className="my-8 relative">
                      <div className="w-36 height-36 rounded-full border-4 border-sky-500/10 border-t-sky-400 flex flex-col items-center justify-center glow-cyan bg-[#0a0f18]/60">
                        <span className="text-3xl font-black tracking-tight text-white">{benchmarkResults.speedup}x</span>
                        <span className="text-[9px] text-slate-500 uppercase mt-0.5">Faster Code Run</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 leading-normal border-t border-sky-950/30 pt-4 w-full">
                      Coprocessor status: <span className="font-bold text-emerald-400">{benchmarkResults.gpu_type}</span>
                    </div>
                  </div>

                  {/* Timers & Calculations Logs */}
                  <div className="lg:col-span-7 glass-panel p-5 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] tracking-widest text-sky-400 uppercase font-bold">Telemetry Audits Logs</span>
                      <h4 className="text-xs text-slate-200 mt-2 mb-4">Calculation Timing Measurements</h4>

                      <div className="space-y-3.5 text-xs">
                        <div className="flex justify-between items-center p-3 rounded bg-slate-950/70 border border-sky-950/15">
                          <div>
                            <span className="font-bold text-slate-300 block">CPU Execution Path (Pandas apply)</span>
                            <span className="text-[9px] text-slate-500 leading-normal block mt-0.5">Iterates row-by-row calculating HHI and sorting commits</span>
                          </div>
                          <span className="text-sm font-bold text-rose-500">{benchmarkResults.cpu_time_ms.toLocaleString()} ms</span>
                        </div>

                        <div className="flex justify-between items-center p-3 rounded bg-slate-950/70 border border-sky-950/15">
                          <div>
                            <span className="font-bold text-sky-300 block">GPU/Vectorized Path (cuDF Vectorized)</span>
                            <span className="text-[9px] text-slate-500 leading-normal block mt-0.5">Uses compiled C-vector instructions/GPU kernels</span>
                          </div>
                          <span className="text-sm font-bold text-emerald-400">{benchmarkResults.gpu_time_ms.toLocaleString()} ms</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-sky-950/30 pt-4 mt-6 text-xs text-slate-400">
                      <h5 className="font-bold text-slate-300 uppercase block mb-1">Benchmark Verification Checklist</h5>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>• Audited Records: <span className="text-sky-400">{benchmarkResults.processed_records.toLocaleString()}</span></div>
                        <div>• Verified Anomalies: <span className="text-sky-400">{benchmarkResults.anomalies_detected}</span></div>
                        <div>• Audited Repositories: <span className="text-sky-400">{benchmarkResults.hhi_repositories_audited}</span></div>
                        <div>• CUDA Acceleration: <span className="text-sky-400">{benchmarkResults.cuda_active ? "Enabled" : "Emulated (NumPy Vectorized)"}</span></div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-sky-950/30 bg-slate-950/80 px-6 py-3 text-center text-[10px] text-slate-500 font-mono z-10">
        TrustGraph Adoption Intelligence Server • Grounded in GitHub API and Google Gemini Decision Analytics • local host SQLite storage
      </footer>
    </div>
  );
}
