// ════════════════════════════════════════════════════════════
//  TrustIQ — Super Cool Engine
// ════════════════════════════════════════════════════════════

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
async function go(query) {
  const q = (query || "").trim();
  if (!q) return;

  document.getElementById("loader").style.display = "flex";
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: q })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Analysis failed');

    state = result;
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
  } catch (error) {
    alert(error.message);
  } finally {
    document.getElementById("loader").style.display = "none";
  }
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
      hit ? `${hit.n} — ${hit.v > 0 ? 'Needs attention ⚠️' : 'Observed ✓'} — ${hit.i}` : "Hover a node";
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
        ? `${state.name} has a ${state.trust}% metadata score. That is encouraging, but it is not production clearance; review its code, releases, dependencies, and security advisories before deployment.`
        : state.trust >= 55
        ? `${state.name} scores ${state.trust}%. I recommend a 30-day sandbox evaluation with monitoring before production approval. Assign a security champion.`
        : `${state.name} has a ${state.trust}% metadata score. Treat the weak public signals as a reason for deeper technical and security review before deployment.`;
    } else if (lc.includes("risk") || lc.includes("concern") || lc.includes("worry")) {
      r = `Current metadata risk for ${state.name} is ${state.regret.prob}%. The security heuristic is ${state.scores.security}%, and ${state.deps.ch.filter(c => c.v > 0).length} observed repository signals need attention. This is not a vulnerability scan.`;
    } else if (lc.includes("500") || lc.includes("scale") || lc.includes("team") || lc.includes("developer")) {
      r = `For a large team, validate ${state.name} in a sandbox, pin versions, use an artifact proxy, scan the resolved dependency tree, and define an upgrade owner. GitHub metadata alone cannot quantify enterprise-scale risk.`;
    } else if (lc.includes("altern") || lc.includes("instead") || lc.includes("compare")) {
      r = `Analyze each candidate repository separately so the comparison uses live data from the same methodology. I won't invent comparison scores for repositories that have not been queried.`;
    } else {
      r = `${state.name}: metadata score ${state.trust}% (${state.grade}), security heuristic ${state.scores.security}%, current metadata risk ${state.regret.prob}%. Classification: ${state.market}. These values are derived from live public GitHub metadata, not a code or CVE scan.`;
    }
    typing.remove();
    box.innerHTML += `<div class="bubble ai">${r}</div>`;
    box.scrollTop = box.scrollHeight;
  }, 700);
}
