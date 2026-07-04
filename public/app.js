// ════════════════════════════════════════════════════════════
//  TrustIQ — Super Cool Engine
// ════════════════════════════════════════════════════════════

const DATA = {
  "langchain-ai/langchain": {
    name:"langchain-ai/langchain", stars:"89.2k", forks:"14.1k", contrib:"2.4k contributors",
    grade:"A-", trust:88,
    scores:{security:96,maintenance:82,community:91,supply:88},
    dna:{Security:95,Innovation:98,Reliability:82,Community:94,Longevity:80,Enterprise:85},
    market:"BUY",
    regret:{prob:12,now:88,m3:86,m6:83,m12:78,text:"Rapid API deprecation cycles are the primary regret vector. Large ecosystem lock-in makes migration costly if architectural direction shifts."},
    decision:{verdict:"APPROVE",reason:"Recommended for enterprise deployment. Low dependency risk, clean CVE audit, and high community maintenance index."},
    deps:{root:"langchain",rv:0,ch:[
      {n:"pydantic",v:0,i:"Core data validation"},
      {n:"langsmith",v:0,i:"Tracing & telemetry"},
      {n:"pyyaml",v:1,i:"Arbitrary code exec risk on old versions"},
      {n:"aiohttp",v:0,i:"Async HTTP stack"},
      {n:"sqlalchemy",v:0,i:"Optional DB connector"}
    ]}
  },
  "run-llama/llama_index": {
    name:"run-llama/llama_index", stars:"34.5k", forks:"4.8k", contrib:"900+ contributors",
    grade:"B+", trust:84,
    scores:{security:94,maintenance:78,community:85,supply:80},
    dna:{Security:92,Innovation:95,Reliability:78,Community:86,Longevity:75,Enterprise:82},
    market:"HOLD",
    regret:{prob:22,now:84,m3:81,m6:76,m12:70,text:"API restructuring and documentation drift may cause developer friction. Overlapping scope with LangChain limits unique positioning."},
    decision:{verdict:"RESTRICT",reason:"Adoption requires sandbox isolation and security review. Good for RAG but monitor for breaking changes in minor versions."},
    deps:{root:"llama_index",rv:0,ch:[
      {n:"openai",v:0,i:"API client"},
      {n:"fsspec",v:1,i:"Remote filesystem access"},
      {n:"nltk",v:0,i:"NLP toolkit"},
      {n:"tiktoken",v:0,i:"Token counter"}
    ]}
  },
  "significant-gravitas/auto-gpt": {
    name:"significant-gravitas/auto-gpt", stars:"164k", forks:"42.8k", contrib:"350 contributors",
    grade:"D+", trust:42,
    scores:{security:60,maintenance:38,community:45,supply:35},
    dna:{Security:55,Innovation:90,Reliability:30,Community:50,Longevity:25,Enterprise:20},
    market:"AVOID",
    regret:{prob:88,now:42,m3:35,m6:22,m12:10,text:"Extreme abandonment risk. Core maintainer departed, commit activity collapsed, and 3 unresolved critical CVEs remain open with no triage."},
    decision:{verdict:"BLOCK",reason:"Not approved for any deployment tier. Critical unresolved vulnerabilities, stagnant development, and unsustainable maintainer concentration."},
    deps:{root:"autogpt",rv:3,ch:[
      {n:"gitpython",v:2,i:"Remote code execution CVE"},
      {n:"pillow",v:1,i:"Memory corruption vector"},
      {n:"click",v:0,i:"CLI parser"},
      {n:"colorama",v:0,i:"Terminal coloring"}
    ]}
  }
};

let state = null, base = null;

// ── Boot ──
document.addEventListener("DOMContentLoaded", () => {
  initDotGrid();

  // Landing search
  const inp = document.getElementById("repoInput");
  inp.addEventListener("keydown", e => { if (e.key === "Enter") go(inp.value); });
  document.querySelectorAll(".examples a").forEach(a =>
    a.addEventListener("click", e => { e.preventDefault(); go(a.dataset.q); })
  );

  // Topbar search
  const inp2 = document.getElementById("repoInput2");
  inp2.addEventListener("keydown", e => { if (e.key === "Enter") go(inp2.value); });

  // Sim
  ["simMaintainer","simCVE","simCompromise"].forEach(id =>
    document.getElementById(id).addEventListener("change", simulate));
  document.getElementById("simInactivity").addEventListener("input", simulate);

  // Chat
  document.getElementById("chatSend").addEventListener("click", sendChat);
  document.getElementById("chatInput").addEventListener("keydown", e => { if (e.key === "Enter") sendChat(); });

  // Intersection observer for section animations
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
  }, { threshold: 0.15 });
  document.querySelectorAll(".anim-section").forEach(s => obs.observe(s));
});

// ── Dot grid background ──
function initDotGrid() {
  const c = document.getElementById("dotGrid");
  const ctx = c.getContext("2d");
  let w, h;
  function resize() { w = c.width = window.innerWidth; h = c.height = window.innerHeight; draw(); }
  function draw() {
    ctx.clearRect(0, 0, w, h);
    const gap = 40;
    for (let x = gap; x < w; x += gap) {
      for (let y = gap; y < h; y += gap) {
        ctx.beginPath();
        ctx.arc(x, y, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fill();
      }
    }
  }
  window.addEventListener("resize", resize);
  resize();
}

// ── Dynamic SVG gradient (for the main ring) ──
function injectRingGradient() {
  const svg = document.querySelector(".ring-svg");
  if (svg.querySelector("#ringGrad")) return;
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `<linearGradient id="ringGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
    <stop offset="0%" stop-color="#818cf8"/>
    <stop offset="50%" stop-color="#a78bfa"/>
    <stop offset="100%" stop-color="#34d399"/>
  </linearGradient>`;
  svg.prepend(defs);
}

// ════════ GO ════════
function go(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return;

  document.getElementById("loader").style.display = "flex";

  setTimeout(() => {
    let match = null;
    for (const k in DATA) {
      if (k.includes(q) || q.includes(k.split("/")[1])) { match = k; break; }
    }
    state = match ? structuredClone(DATA[match]) : genProfile(q);
    base = structuredClone(state);

    // Reset sim
    document.getElementById("simMaintainer").checked = false;
    document.getElementById("simCVE").checked = false;
    document.getElementById("simCompromise").checked = false;
    document.getElementById("simInactivity").value = 0;
    document.getElementById("valInact").textContent = "0 mo";

    document.getElementById("loader").style.display = "none";
    document.getElementById("landing").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    injectRingGradient();
    render();

    // Re-trigger animations
    document.querySelectorAll(".anim-section").forEach(s => {
      s.classList.remove("visible");
      requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add("visible")));
    });

    window.scrollTo({ top: 0 });
  }, 600);
}

function genProfile(name) {
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const t = 50 + (h % 45);
  const g = t >= 90 ? "A" : t >= 80 ? "A-" : t >= 70 ? "B+" : t >= 60 ? "C" : "D";
  return {
    name: name.includes("/") ? name : `github/${name}`,
    stars: `${(h % 80 + 5).toFixed(1)}k`, forks: `${(h % 20 + 1).toFixed(1)}k`, contrib: `${h % 300 + 20} contributors`,
    grade: g, trust: t,
    scores: { security: 60 + h % 38, maintenance: 55 + h % 43, community: 65 + h % 33, supply: 60 + h % 35 },
    dna: { Security: 60+h%35, Innovation: 70+h%28, Reliability: 50+h%45, Community: 65+h%32, Longevity: 55+h%40, Enterprise: 50+h%45 },
    market: t > 80 ? "BUY" : t > 60 ? "HOLD" : "AVOID",
    regret: { prob: 100 - t, now: t, m3: Math.max(20, t - 2), m6: Math.max(15, t - 6), m12: Math.max(10, t - 12), text: "Automated risk model projects standard dependency migration liabilities." },
    decision: { verdict: t >= 80 ? "APPROVE" : t >= 55 ? "RESTRICT" : "BLOCK", reason: t >= 80 ? "Suitable for production deployment." : t >= 55 ? "Requires security review and sandbox evaluation." : "Not recommended for any deployment tier." },
    deps: { root: name.split("/").pop(), rv: h % 2, ch: [
      { n: "urllib3", v: 0, i: "HTTP client" },
      { n: "requests", v: 0, i: "Networking" },
      { n: "certifi", v: h % 2, i: "TLS certificates" }
    ]}
  };
}

// ════════ RENDER ════════
function render() {
  if (!state) return;
  const s = state;

  // Topbar
  document.getElementById("topRepo").textContent = s.name;
  document.getElementById("repoInput2").value = "";

  // Hero
  document.getElementById("heroName").textContent = s.name;
  document.getElementById("heroPills").innerHTML = [
    `⭐ ${s.stars}`, `🍴 ${s.forks}`, `👥 ${s.contrib}`
  ].map(t => `<span class="pill">${t}</span>`).join("");

  // Animated score count
  animateCount("mainScore", s.trust);
  document.getElementById("mainGrade").textContent = s.grade;

  // Main ring
  const circ = 2 * Math.PI * 85; // ~534
  const ring = document.getElementById("mainRing");
  requestAnimationFrame(() => {
    ring.style.strokeDashoffset = circ - (s.trust / 100) * circ;
  });

  // Glow color
  const glow = document.getElementById("ringGlow");
  if (s.trust >= 80) glow.style.background = "radial-gradient(circle,rgba(52,211,153,.12),transparent 70%)";
  else if (s.trust >= 55) glow.style.background = "radial-gradient(circle,rgba(251,191,36,.12),transparent 70%)";
  else glow.style.background = "radial-gradient(circle,rgba(248,113,113,.15),transparent 70%)";

  // Verdicts
  const mkv = (cls, text) => `<span class="verdict ${cls}">${text || cls.toUpperCase()}</span>`;
  document.getElementById("heroVerdicts").innerHTML =
    mkv(s.market.toLowerCase()) + mkv(s.decision.verdict.toLowerCase(), s.decision.verdict);
  document.getElementById("heroReason").textContent = s.decision.reason;

  // Sub scores
  const scCirc = 2 * Math.PI * 32; // ~201
  renderSub("scSecurity", "svSecurity", s.scores.security, scCirc);
  renderSub("scMaintenance", "svMaintenance", s.scores.maintenance, scCirc);
  renderSub("scCommunity", "svCommunity", s.scores.community, scCirc);
  renderSub("scSupply", "svSupply", s.scores.supply, scCirc);

  // Regret
  animateCount("regretVal", s.regret.prob, "%");
  document.getElementById("fNow").textContent = s.regret.now;
  document.getElementById("f3m").textContent = s.regret.m3;
  document.getElementById("f6m").textContent = s.regret.m6;
  document.getElementById("f12m").textContent = s.regret.m12;
  document.getElementById("regretText").textContent = s.regret.text;
  const rc = document.getElementById("regretCircle");
  rc.className = "regret-circle" + (s.regret.prob >= 60 ? " danger" : s.regret.prob >= 30 ? " warn" : "");

  drawRadar();
  drawBlast();
}

function renderSub(ringId, valId, val, circ) {
  const el = document.getElementById(ringId);
  requestAnimationFrame(() => {
    el.style.strokeDashoffset = circ - (val / 100) * circ;
    el.style.stroke = val >= 80 ? "var(--mint)" : val >= 55 ? "var(--amber)" : "var(--rose)";
  });
  animateCount(valId, val);
}

// Animated number counter
function animateCount(id, target, suffix = "") {
  const el = document.getElementById(id);
  const dur = 800;
  const start = performance.now();
  const from = 0;
  function tick(now) {
    const t = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - t, 3); // ease out cubic
    el.textContent = Math.round(from + (target - from) * ease) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ════════ RADAR ════════
function drawRadar() {
  const c = document.getElementById("radarCanvas");
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 240, 240);
  const cx = 120, cy = 120, R = 90;
  const keys = Object.keys(state.dna), n = keys.length;

  // Grid
  for (let s = 1; s <= 4; s++) {
    const r = (R / 4) * s;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 / n) * i - Math.PI / 2;
      i === 0 ? ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(255,255,255,.04)";
    ctx.stroke();
  }

  // Axes
  keys.forEach((k, i) => {
    const a = (Math.PI * 2 / n) * i - Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.strokeStyle = "rgba(255,255,255,.04)"; ctx.stroke();
    const lx = cx + Math.cos(a) * (R + 16), ly = cy + Math.sin(a) * (R + 16) + 3;
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.font = "500 9px Inter"; ctx.textAlign = "center";
    ctx.fillText(k, lx, ly);
  });

  // Gradient fill
  const grad = ctx.createLinearGradient(0, 0, 240, 240);
  grad.addColorStop(0, "rgba(129,140,248,.12)");
  grad.addColorStop(1, "rgba(52,211,153,.12)");

  ctx.beginPath();
  keys.forEach((k, i) => {
    const a = (Math.PI * 2 / n) * i - Math.PI / 2;
    const r = (state.dna[k] / 100) * R;
    i === 0 ? ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  });
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = "rgba(129,140,248,.5)"; ctx.lineWidth = 1.5; ctx.stroke();

  // Dots
  keys.forEach((k, i) => {
    const a = (Math.PI * 2 / n) * i - Math.PI / 2;
    const r = (state.dna[k] / 100) * R;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#818cf8"; ctx.fill();
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(129,140,248,.15)"; ctx.fill();
  });
}

// ════════ BLAST RADIUS ════════
let blastNodes = [];
function drawBlast() {
  const area = document.querySelector(".blast-area");
  const c = document.getElementById("blastCanvas");
  c.width = area.clientWidth; c.height = area.clientHeight || 200;
  const ctx = c.getContext("2d");
  const cx = c.width / 2, cy = c.height / 2;
  const d = state.deps;
  blastNodes = [];

  blastNodes.push({ n: d.root, v: d.rv, i: "Root package", x: cx, y: cy, r: 20, root: true });
  const ch = d.ch || [];
  const ring = Math.min(c.width, c.height) / 2.8;
  ch.forEach((child, idx) => {
    const a = (Math.PI * 2 / ch.length) * idx - Math.PI / 2;
    blastNodes.push({ n: child.n, v: child.v, i: child.i, x: cx + Math.cos(a) * ring, y: cy + Math.sin(a) * ring, r: 14, root: false });
  });

  // Lines
  for (let i = 1; i < blastNodes.length; i++) {
    const g = ctx.createLinearGradient(cx, cy, blastNodes[i].x, blastNodes[i].y);
    g.addColorStop(0, "rgba(129,140,248,.15)");
    g.addColorStop(1, blastNodes[i].v > 0 ? "rgba(248,113,113,.15)" : "rgba(52,211,153,.15)");
    ctx.strokeStyle = g; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(blastNodes[i].x, blastNodes[i].y); ctx.stroke();
  }

  // Nodes
  blastNodes.forEach(node => {
    // Outer glow
    const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.r * 2);
    if (node.root) { grd.addColorStop(0, "rgba(129,140,248,.08)"); }
    else if (node.v > 0) { grd.addColorStop(0, "rgba(248,113,113,.08)"); }
    else { grd.addColorStop(0, "rgba(52,211,153,.08)"); }
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(node.x, node.y, node.r * 2, 0, Math.PI * 2); ctx.fill();

    // Circle
    ctx.beginPath(); ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    if (node.root) { ctx.fillStyle = "rgba(129,140,248,.1)"; ctx.strokeStyle = "#818cf8"; }
    else if (node.v > 0) { ctx.fillStyle = "rgba(248,113,113,.1)"; ctx.strokeStyle = "#f87171"; }
    else { ctx.fillStyle = "rgba(52,211,153,.1)"; ctx.strokeStyle = "#34d399"; }
    ctx.lineWidth = 1.5; ctx.fill(); ctx.stroke();

    ctx.fillStyle = "#fff"; ctx.font = "500 9px Inter"; ctx.textAlign = "center";
    ctx.fillText(node.n, node.x, node.y - node.r - 6);
  });

  c.onmousemove = e => {
    const r = c.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    let hit = null;
    blastNodes.forEach(nd => { if (Math.hypot(nd.x - mx, nd.y - my) < nd.r + 5) hit = nd; });
    document.getElementById("blastTip").textContent =
      hit ? `${hit.n} — ${hit.v > 0 ? hit.v + ' CVE(s) ⚠️' : '✓ Clean'} — ${hit.i}` : "Hover a node";
  };
}

// ════════ SIMULATOR ════════
function simulate() {
  if (!base) return;
  const m = document.getElementById("simMaintainer").checked;
  const c = document.getElementById("simCVE").checked;
  const comp = document.getElementById("simCompromise").checked;
  const inact = +document.getElementById("simInactivity").value;
  document.getElementById("valInact").textContent = inact + " mo";

  let s = structuredClone(base);
  if (m) { s.trust -= 20; s.scores.maintenance -= 25; s.scores.community -= 15; s.dna.Longevity -= 30; s.dna.Reliability -= 15; }
  if (c) { s.trust -= 25; s.scores.security -= 30; s.dna.Security -= 35; s.dna.Reliability -= 20; }
  if (inact > 0) { const p = inact * 2.5; s.trust -= p; s.scores.maintenance -= p * 2; s.dna.Longevity -= p * 1.5; }
  if (comp) { s.trust -= 30; s.scores.security -= 20; s.scores.supply -= 35; s.dna.Security -= 40; s.dna.Enterprise -= 30; }

  s.trust = clamp(s.trust);
  for (const k in s.scores) s.scores[k] = clamp(s.scores[k]);
  for (const k in s.dna) s.dna[k] = clamp(s.dna[k]);

  s.regret.prob = Math.min(100, Math.round(100 - s.trust + (m ? 15 : 0) + (c ? 20 : 0)));
  s.regret.now = s.trust; s.regret.m3 = Math.max(10, s.trust - 3); s.regret.m6 = Math.max(10, s.trust - 7); s.regret.m12 = Math.max(10, s.trust - 15);
  s.grade = s.trust >= 90 ? "A" : s.trust >= 80 ? "A-" : s.trust >= 70 ? "B+" : s.trust >= 55 ? "C" : "D-";
  s.market = s.trust >= 80 ? "BUY" : s.trust >= 55 ? "HOLD" : "AVOID";
  s.decision.verdict = s.trust >= 80 ? "APPROVE" : s.trust >= 55 ? "RESTRICT" : "BLOCK";
  s.decision.reason = s.trust >= 80 ? "Suitable for production." : s.trust >= 55 ? "Requires security review." : "Not recommended for deployment.";

  state = s;
  render();
}
function clamp(v) { return Math.max(5, Math.min(100, Math.round(v))); }

// ════════ CHAT ════════
function sendChat() {
  const inp = document.getElementById("chatInput");
  const box = document.getElementById("chatWindow");
  const t = inp.value.trim();
  if (!t || !state) return;
  box.innerHTML += `<div class="bubble user">${t}</div>`;
  inp.value = "";
  box.scrollTop = box.scrollHeight;

  // Typing indicator
  const typing = document.createElement("div");
  typing.className = "bubble ai";
  typing.textContent = "Thinking…";
  typing.style.opacity = ".5";
  box.appendChild(typing);
  box.scrollTop = box.scrollHeight;

  setTimeout(() => {
    const lc = t.toLowerCase();
    let r;
    if (lc.includes("deploy") || lc.includes("production") || lc.includes("adopt")) {
      r = state.trust >= 80
        ? `With a trust score of ${state.trust}%, ${state.name} is cleared for production. Pin dependency versions and enable automated CVE scanning in your CI pipeline.`
        : state.trust >= 55
        ? `${state.name} scores ${state.trust}%. I recommend a 30-day sandbox evaluation with monitoring before production approval. Assign a security champion.`
        : `I would block deployment of ${state.name}. Trust is at ${state.trust}% with ${state.regret.prob}% regret probability. Consider alternatives like LangChain or CrewAI.`;
    } else if (lc.includes("risk") || lc.includes("concern") || lc.includes("worry")) {
      r = `Key risk factors for ${state.name}: ${state.regret.prob}% regret probability over 12 months, security score at ${state.scores.security}%, and ${state.deps.ch.filter(c => c.v > 0).length} dependencies with known CVEs.`;
    } else if (lc.includes("500") || lc.includes("scale") || lc.includes("team") || lc.includes("developer")) {
      r = `At enterprise scale, ${state.name}'s supply chain risk multiplier increases ~3.2x. Deploy an artifact proxy cache, implement automated breaking-change detection in CI/CD, and mandate version pinning.`;
    } else if (lc.includes("altern") || lc.includes("instead") || lc.includes("compare")) {
      r = `For comparison, LangChain scores 88% trust, LlamaIndex 84%, and AutoGPT only 42%. I'd recommend evaluating LangChain for production-grade applications or LlamaIndex for RAG-specific use cases.`;
    } else {
      r = `${state.name}: Trust ${state.trust}% (${state.grade}), Security ${state.scores.security}%, Regret Probability ${state.regret.prob}%. Market recommendation: ${state.market}. What specific aspect would you like me to analyze?`;
    }
    typing.remove();
    box.innerHTML += `<div class="bubble ai">${r}</div>`;
    box.scrollTop = box.scrollHeight;
  }, 700);
}
