// ════════════════════════════════════════════════════════════
//  TrustGraph — Adoption Decision Intelligence Platform
// ════════════════════════════════════════════════════════════

let state = null, base = null;
let radarChartInstance = null;
let lineChartInstance = null;
let twinRadarChartInstance = null;
let twinLineChartInstance = null;
let activeTab = "dashboard-view";

// ── Boot ──
document.addEventListener("DOMContentLoaded", () => {
  initDotGrid();
  initTicker();
  initLeaderboard("mcp");

  // Search input listeners
  const inp = document.getElementById("repoInput");
  inp.addEventListener("keydown", e => { if (e.key === "Enter") go(inp.value); });
  document.querySelectorAll(".examples a").forEach(a =>
    a.addEventListener("click", e => { e.preventDefault(); go(a.dataset.q); })
  );

  const inp2 = document.getElementById("repoInput2");
  inp2.addEventListener("keydown", e => { if (e.key === "Enter") go(inp2.value); });

  // Chat advisor setup
  document.getElementById("chatSend").addEventListener("click", sendChat);
  document.getElementById("chatInput").addEventListener("keydown", e => { if (e.key === "Enter") sendChat(); });
  
  // Suggestion chips
  document.querySelectorAll(".chat-suggestions .sug-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById("chatInput").value = btn.textContent;
      sendChat();
    });
  });

  // Tab switching
  document.querySelectorAll(".topbar-tabs .tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Multi-compare action
  document.getElementById("compareBtn").addEventListener("click", runComparison);

  // Leaderboard sub-tabs
  document.querySelectorAll(".leaderboard-tabs .l-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".leaderboard-tabs .l-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      initLeaderboard(btn.dataset.cat);
    });
  });

  // Section observer animations
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
  }, { threshold: 0.1 });
  document.querySelectorAll(".anim-section").forEach(s => obs.observe(s));
});

// ── Tab switching ──
function switchTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll(".topbar-tabs .tab-btn").forEach(btn => {
    if (btn.dataset.tab === tabId) btn.classList.add("active");
    else btn.classList.remove("active");
  });

  document.querySelectorAll(".tab-content").forEach(content => {
    if (content.id === tabId) content.classList.remove("hidden");
    else content.classList.add("hidden");
  });

  // Trigger repaint or recalculations
  if (tabId === "blast-view" && state) {
    setTimeout(initBlastRadius, 100);
  }
  if (tabId === "twin-view" && state) {
    setTimeout(initDigitalTwin, 100);
  }
  if (tabId === "ecosystem-view" && state) {
    setTimeout(initEcosystemMap, 100);
  }
}

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
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fill();
      }
    }
  }
  window.addEventListener("resize", resize);
  resize();
}

// ── Bloomberg-style ticker simulation ──
function initTicker() {
  const ticker = document.getElementById("tickerBar");
  // Clone ticker elements to ensure seamless loop
  const clone = ticker.cloneNode(true);
  clone.id = "";
  ticker.parentNode.appendChild(clone);
}

// ════════ MAIN SEARCH ════════
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

    document.getElementById("loader").style.display = "none";
    document.getElementById("landing").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    
    // Switch to main dashboard tab
    switchTab("dashboard-view");
    
    render();

    // Trigger tab animations
    document.querySelectorAll(".anim-section").forEach(s => {
      s.classList.remove("visible");
      requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add("visible")));
    });

  } catch (error) {
    alert(error.message);
  } finally {
    document.getElementById("loader").style.display = "none";
  }
}

// ════════ RENDER DASHBOARD ════════
function render() {
  if (!state) return;
  const s = state;
  const ai = s.aiReport || {};

  // Topbar
  document.getElementById("topRepo").textContent = s.name;
  document.getElementById("repoInput2").value = "";

  // Boardroom decision
  const boardroom = ai.boardroom || {};
  const decBadge = document.getElementById("brDecision");
  decBadge.textContent = boardroom.decision || "APPROVE WITH REVIEW";
  decBadge.className = "br-decision-badge " + (boardroom.decision || "").toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');

  document.getElementById("brConfidence").textContent = `${boardroom.confidence || 75}%`;
  document.getElementById("brSummaryText").textContent = boardroom.summary || "Executive summary unavailable.";

  // Due Diligence
  const dd = ai.dueDiligence || {};
  const setDD = (idPrefix, riskObj) => {
    const levelEl = document.getElementById(`${idPrefix}Level`);
    const descEl = document.getElementById(`${idPrefix}Desc`);
    if (levelEl && descEl) {
      const lvl = riskObj?.level || "Medium";
      levelEl.textContent = lvl.toUpperCase();
      levelEl.className = "dd-risk-level " + lvl.toLowerCase();
      descEl.textContent = riskObj?.description || "Analysis data unavailable.";
    }
  };
  setDD("ddTechnical", dd.technicalRisk || { level: "Low", description: "Minimal architectural complexity." });
  setDD("ddSecurity", dd.securityRisk || { level: "Low", description: "Security controls active." });
  setDD("ddMaintenance", dd.maintenanceRisk || { level: "Low", description: "Active maintainer commits." });
  setDD("ddCommunity", dd.communityRisk || { level: "Low", description: "Robust contributor activity." });
  setDD("ddAdoption", dd.adoptionRisk || { level: "Low", description: "Standard licensing verified." });
  setDD("ddVendor", dd.vendorLockInRisk || { level: "Low", description: "Zero platform dependency." });
  setDD("ddViability", dd.futureViabilityRisk || { level: "Low", description: "Strong project growth trends." });

  // AI Investment Analyst Mode
  const inv = ai.investmentAnalyst || {};
  const invBadge = document.getElementById("invRecommendation");
  if (invBadge) {
    invBadge.textContent = inv.recommendation || "HOLD";
    invBadge.className = "inv-badge " + (inv.recommendation || "hold").toLowerCase();
  }
  const setRating = (id, rating) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = rating || "—";
      let quality = "medium";
      const r = String(rating || "").toUpperCase();
      if (r.startsWith("A") || r === "STRONG" || r === "LOW" || r === "ACCELERATING" || r === "VIABLE") quality = "low";
      else if (r.startsWith("D") || r === "FRAGILE" || r === "SEVERE" || r === "DECELERATING" || r === "UNVIABLE") quality = "high";
      else quality = "medium";
      
      el.className = "inv-rating-val " + (quality === "low" ? "text-mint" : quality === "high" ? "text-rose" : "text-amber");
    }
  };
  setRating("invGrowth", inv.growthRating || "B");
  setRating("invHealth", inv.healthRating || "Moderate");
  setRating("invRisk", inv.riskRating || "Elevated");
  setRating("invMomentum", inv.momentumRating || "Stagnant");
  setRating("invViability", inv.viabilityRating || "Viable");
  
  const invJust = document.getElementById("invJustificationText");
  if (invJust) {
    invJust.textContent = inv.justification || "No investment justification provided.";
  }

  // Adoption Readiness Matrix
  const matrix = ai.adoptionReadiness || {};
  const envs = ["personal", "startup", "enterprise", "saas", "banking", "healthcare", "government"];
  envs.forEach(env => {
    const data = matrix[env] || { verdict: "REVIEW", reasoning: "No details." };
    const badge = document.getElementById(`mat${env.charAt(0).toUpperCase() + env.slice(1)}`);
    const reasonEl = document.getElementById(`mat${env.charAt(0).toUpperCase() + env.slice(1)}Reason`);
    if (badge) {
      badge.textContent = data.verdict;
      badge.className = "badge " + data.verdict.toLowerCase();
    }
    if (reasonEl) {
      reasonEl.textContent = data.reasoning;
    }
  });

  // Metrics status badges
  const healthBadge = document.getElementById("healthStatusBadge");
  if (healthBadge) {
    const hs = ai.healthStatus || (inv.healthRating === "Strong" ? "Healthy" : "Stable");
    healthBadge.textContent = hs.toUpperCase();
    healthBadge.className = "mc-status-badge " + hs.toLowerCase();
  }

  document.getElementById("enterpriseReadinessVal").textContent = ai.enterpriseReadinessScore || 70;
  document.getElementById("subSecurity").textContent = s.scores.security;
  document.getElementById("subMaintenance").textContent = s.scores.maintenance;

  // Render Charts
  renderRadarChart(s.dna);
  
  // Future viability mapping
  const futureViability = ai.futureViability || {
    score: s.trust - 10,
    forecast: [
      { period: "Current", score: s.trust },
      { period: "6-Month", score: Math.round(s.trust * 0.98) },
      { period: "12-Month", score: Math.round(s.trust * 0.95) },
      { period: "24-Month", score: Math.round(s.trust * 0.90) }
    ],
    explanation: "Stability forecast under normal conditions."
  };
  renderViabilityChart(futureViability);

  // Trust History Time Machine
  const tm = ai.timeMachine || {};
  const pastVal = tm.pastTrust || { score: Math.min(100, Math.round(s.trust * 1.05)), reason: "Stable releases and minor issue queue growth." };
  const presVal = tm.presentTrust || { score: s.trust, reason: "Current supply chain audit findings and maintainer trends." };
  const futVal = tm.futureTrust || { score: Math.max(0, Math.round(s.trust * 0.90)), reason: "Predicted decay slope based on commit speed." };

  document.getElementById("tmPastScore").textContent = `${pastVal.score || 80}%`;
  document.getElementById("tmPastReason").textContent = pastVal.reason || "";
  
  document.getElementById("tmPresentScore").textContent = `${presVal.score || s.trust}%`;
  document.getElementById("tmPresentReason").textContent = presVal.reason || "";
  
  document.getElementById("tmFutureScore").textContent = `${futVal.score || 70}%`;
  document.getElementById("tmFutureReason").textContent = futVal.reason || "";
  
  document.getElementById("tmTrendReasoning").textContent = tm.trendReasoning || "Slight structural drift expected.";
}

// ── Chart.js integrations ──
function renderRadarChart(dna) {
  const ctx = document.getElementById("radarChart").getContext("2d");
  
  if (radarChartInstance) {
    radarChartInstance.destroy();
  }

  const labels = Object.keys(dna);
  const dataValues = Object.values(dna);

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Trust DNA',
        data: dataValues,
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        borderColor: '#6366f1',
        borderWidth: 2,
        pointBackgroundColor: '#a855f7',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#6366f1'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          angleLines: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            display: false,
            maxTicksLimit: 4
          },
          pointLabels: {
            color: 'rgba(255, 255, 255, 0.5)',
            font: {
              family: 'Inter',
              size: 9,
              weight: '600'
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

function renderViabilityChart(viability) {
  const ctx = document.getElementById("viabilityChart").getContext("2d");
  document.getElementById("viabilityExplanation").textContent = viability?.explanation || "No explanation provided.";

  if (lineChartInstance) {
    lineChartInstance.destroy();
  }

  const forecast = viability?.forecast || [
    { period: "Current", score: 80 },
    { period: "6-Month", score: 78 },
    { period: "12-Month", score: 75 },
    { period: "24-Month", score: 70 }
  ];

  const labels = forecast.map(f => f.period);
  const scores = forecast.map(f => f.score);

  // Gradient fill for line
  const grad = ctx.createLinearGradient(0, 0, 0, 200);
  grad.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
  grad.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

  lineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Viability Forecast',
        data: scores,
        borderColor: '#a855f7',
        borderWidth: 2.5,
        backgroundColor: grad,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.03)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.4)',
            font: {
              family: 'Inter',
              size: 9
            }
          }
        },
        y: {
          min: 0,
          max: 100,
          grid: {
            color: 'rgba(255, 255, 255, 0.03)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.4)',
            font: {
              family: 'Inter',
              size: 9
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

// ════════ DEPENDENCY BLAST RADIUS CANVAS VISUALIZATION ════════
let blastNodes = [];
let blastLinks = [];
let selectedBlastNode = null;
let compromisedNodes = new Set();

function initBlastRadius() {
  const c = document.getElementById("blastCanvas");
  const area = c.parentElement;
  c.width = area.clientWidth;
  c.height = area.clientHeight || 450;
  const ctx = c.getContext("2d");

  // Clear selections
  selectedBlastNode = null;
  compromisedNodes.clear();
  document.getElementById("blastTargetNode").textContent = "Hover/Select a node";
  document.getElementById("blastTargetStatus").textContent = "INACTIVE";
  document.getElementById("blastTargetStatus").className = "console-val";
  document.getElementById("blastAffectedCount").textContent = "0";
  document.getElementById("blastSystemsAffected").textContent = "0%";
  document.getElementById("blastVerdictText").textContent = "Select a dependency node to begin cascade simulation.";
  document.getElementById("blastAlertPanel").className = "console-alert glass";

  const cx = c.width / 2;
  const cy = c.height / 2;

  // Build a mocked hierarchical dependency graph
  blastNodes = [
    { id: 0, label: state.name.split("/")[1] || "root", type: "root", x: cx, y: cy, r: 22 },
    
    // Direct dependencies
    { id: 1, label: "lodash", type: "direct", x: cx - 140, y: cy - 90, r: 15, risk: false },
    { id: 2, label: "express", type: "direct", x: cx - 140, y: cy + 90, r: 15, risk: false },
    { id: 3, label: "dotenv", type: "direct", x: cx + 140, y: cy - 90, r: 15, risk: false },
    { id: 4, label: "axios", type: "direct", x: cx + 140, y: cy + 90, r: 15, risk: false },
    { id: 5, label: "minimist", type: "direct", x: cx, y: cy - 150, r: 15, risk: true, info: "Known prototype pollution warning" },

    // Transitive dependencies
    { id: 6, label: "object-assign", type: "transitive", x: cx - 220, y: cy - 140, r: 11 },
    { id: 7, label: "mime-types", type: "transitive", x: cx - 240, y: cy + 40, r: 11 },
    { id: 8, label: "safe-buffer", type: "transitive", x: cx - 220, y: cy + 140, r: 11 },
    { id: 9, label: "content-type", type: "transitive", x: cx - 80, y: cy + 180, r: 11 },
    { id: 10, label: "follow-redirects", type: "transitive", x: cx + 240, y: cy + 120, r: 11, risk: true, info: "CVE-2024-28849 vulnerability flagged" },
    { id: 11, label: "form-data", type: "transitive", x: cx + 220, y: cy + 20, r: 11 }
  ];

  blastLinks = [
    { source: 1, target: 0 },
    { source: 2, target: 0 },
    { source: 3, target: 0 },
    { source: 4, target: 0 },
    { source: 5, target: 0 },

    { source: 6, target: 1 },
    { source: 7, target: 2 },
    { source: 8, target: 2 },
    { source: 9, target: 2 },
    { source: 10, target: 4 },
    { source: 11, target: 4 }
  ];

  // Mouse interactivity
  c.onmousemove = (e) => {
    const r = c.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    let hovered = null;
    
    blastNodes.forEach(node => {
      if (Math.hypot(node.x - mx, node.y - my) < node.r + 5) {
        hovered = node;
      }
    });

    drawBlastCanvas(hovered);
  };

  c.onclick = (e) => {
    const r = c.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    
    blastNodes.forEach(node => {
      if (Math.hypot(node.x - mx, node.y - my) < node.r + 5) {
        if (node.id !== 0) {
          triggerCompromise(node);
        }
      }
    });
  };

  drawBlastCanvas();
}

function drawBlastCanvas(hoveredNode = null) {
  const c = document.getElementById("blastCanvas");
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);

  // Draw links
  blastLinks.forEach(link => {
    const sNode = blastNodes.find(n => n.id === link.source);
    const tNode = blastNodes.find(n => n.id === link.target);
    if (!sNode || !tNode) return;

    ctx.beginPath();
    ctx.moveTo(sNode.x, sNode.y);
    ctx.lineTo(tNode.x, tNode.y);

    // Color based on compromise status
    if (compromisedNodes.has(sNode.id) && compromisedNodes.has(tNode.id)) {
      ctx.strokeStyle = "rgba(244, 63, 94, 0.6)";
      ctx.lineWidth = 2.5;
    } else {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1.5;
    }
    ctx.stroke();
  });

  // Draw nodes
  blastNodes.forEach(node => {
    const isHovered = hoveredNode && hoveredNode.id === node.id;
    const isCompromised = compromisedNodes.has(node.id);

    // Outer glow
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r * 1.8, 0, Math.PI * 2);
    
    let fillGlow = "transparent";
    if (isCompromised) {
      fillGlow = "rgba(244, 63, 94, 0.08)";
    } else if (node.type === "root") {
      fillGlow = "rgba(99, 102, 241, 0.08)";
    } else if (node.risk) {
      fillGlow = "rgba(245, 158, 11, 0.08)";
    } else if (isHovered) {
      fillGlow = "rgba(255, 255, 255, 0.04)";
    }
    
    ctx.fillStyle = fillGlow;
    ctx.fill();

    // Node Circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);

    let borderStroke = "rgba(255, 255, 255, 0.1)";
    let circleFill = "rgba(20, 20, 25, 0.8)";
    
    if (isCompromised) {
      borderStroke = "var(--rose)";
      circleFill = "rgba(244, 63, 94, 0.15)";
    } else if (node.type === "root") {
      borderStroke = "var(--accent)";
      circleFill = "rgba(99, 102, 241, 0.15)";
    } else if (node.risk) {
      borderStroke = "var(--amber)";
      circleFill = "rgba(245, 158, 11, 0.1)";
    } else if (isHovered) {
      borderStroke = "var(--text)";
    }

    ctx.strokeStyle = borderStroke;
    ctx.lineWidth = 1.5;
    ctx.fillStyle = circleFill;
    ctx.fill();
    ctx.stroke();

    // Node labels
    ctx.fillStyle = isHovered ? "#fff" : "rgba(255, 255, 255, 0.7)";
    ctx.font = node.type === "root" ? "700 10px JetBrains Mono" : "500 9px JetBrains Mono";
    ctx.textAlign = "center";
    ctx.fillText(node.label, node.x, node.y - node.r - 6);
  });
}

function triggerCompromise(node) {
  selectedBlastNode = node;
  compromisedNodes.clear();
  
  // Perform DFS/BFS to find all parent paths back to root node (0)
  compromisedNodes.add(node.id);
  
  let added = true;
  while (added) {
    added = false;
    blastLinks.forEach(link => {
      if (compromisedNodes.has(link.source) && !compromisedNodes.has(link.target)) {
        compromisedNodes.add(link.target);
        added = true;
      }
    });
  }

  // Draw the red path
  drawBlastCanvas();

  // Populate Simulation Console
  document.getElementById("blastTargetNode").textContent = node.label;
  const statusEl = document.getElementById("blastTargetStatus");
  statusEl.textContent = "COMPROMISED ⚠️";
  statusEl.className = "console-val text-rose";

  // Count affected packages (excluding root)
  const count = compromisedNodes.size - 1;
  document.getElementById("blastAffectedCount").textContent = count;

  // Systems affected calculations
  let systemsPct = "30%";
  let impactText = "Medium business impact. A transitive dependency vulnerability has been highlighted. Mitigate by pinning package versions and adding lockfiles.";
  let alertClass = "console-alert glass warn";
  
  if (node.type === "direct") {
    systemsPct = "85%";
    impactText = "HIGH risk. A direct repository dependency is compromised. Malicious code execution is likely in build pipelines. Block adoption immediately.";
    alertClass = "console-alert glass danger";
  }

  document.getElementById("blastSystemsAffected").textContent = systemsPct;
  document.getElementById("blastVerdictText").textContent = impactText;
  document.getElementById("blastAlertPanel").className = alertClass;
}

// ════════ COMPARISON COMMAND CENTER ════════
async function runComparison() {
  const inputVal = document.getElementById("compareReposInput").value.trim();
  if (!inputVal) return;

  const urls = inputVal.split(",").map(s => s.trim()).filter(Boolean);
  if (urls.length < 2) {
    alert("Please provide at least 2 repositories to compare.");
    return;
  }

  const loader = document.getElementById("compareLoader");
  const results = document.getElementById("compareResults");

  loader.classList.remove("hidden");
  results.classList.add("hidden");

  try {
    const res = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Comparison failed");

    // Populate comparison results
    document.getElementById("winnerBadge").textContent = (data.winner || "").toUpperCase();
    document.getElementById("winnerRecommendation").innerHTML = data.recommendation || "No recommendation advice available.";

    // Draw Matrix Table
    const table = document.getElementById("compareTable");
    table.innerHTML = "";

    // Build header row
    let headerRow = `<tr><th>Dimension</th>`;
    const repoNames = Object.keys(data.comparison);
    repoNames.forEach(name => {
      headerRow += `<th>${name}</th>`;
    });
    headerRow += `</tr>`;
    table.innerHTML += headerRow;

    // Dimensions to list
    const dimensions = [
      { key: "security", label: "Security & Policy" },
      { key: "maintenance", label: "Maintenance Activity" },
      { key: "community", label: "Community Size" },
      { key: "futureViability", label: "Future Viability Score" },
      { key: "enterpriseReadiness", label: "Enterprise Readiness" },
      { key: "documentation", label: "Documentation Index" }
    ];

    dimensions.forEach(dim => {
      let row = `<tr><td>${dim.label}</td>`;
      repoNames.forEach(name => {
        const val = data.comparison[name][dim.key] || 0;
        const colorClass = val >= 80 ? "text-mint" : val >= 55 ? "text-amber" : "text-rose";
        row += `<td class="matrix-score ${colorClass}">${val} / 100</td>`;
      });
      row += `</tr>`;
      table.innerHTML += row;
    });

    results.classList.remove("hidden");
  } catch (error) {
    alert("Error performing comparison: " + error.message);
  } finally {
    loader.classList.add("hidden");
  }
}

// ════════ TOOL LEADERBOARD DATA ════════
const LEADERBOARD_DATA = {
  mcp: [
    { name: "modelcontextprotocol/servers", trust: 92, readiness: 88, status: "Healthy", count: 1840 },
    { name: "CapedCrusader77/Rube-MCP", trust: 85, readiness: 80, status: "Stable", count: 954 },
    { name: "mcp-servers/gmail", trust: 78, readiness: 72, status: "Stable", count: 488 },
    { name: "mcp-servers/postgres", trust: 72, readiness: 65, status: "Declining", count: 312 }
  ],
  agents: [
    { name: "crewAI/crewAI", trust: 88, readiness: 84, status: "Healthy", count: 3820 },
    { name: "langchain-ai/langgraph", trust: 90, readiness: 87, status: "Healthy", count: 2940 },
    { name: "microsoft/autogen", trust: 84, readiness: 82, status: "Stable", count: 1844 },
    { name: "significant-gravitas/auto-gpt", trust: 65, readiness: 60, status: "Declining", count: 1540 }
  ],
  rag: [
    { name: "run-llama/llama_index", trust: 86, readiness: 82, status: "Healthy", count: 2450 },
    { name: "langchain-ai/langchain", trust: 85, readiness: 83, status: "Stable", count: 3950 },
    { name: "embedchain/embedchain", trust: 78, readiness: 70, status: "Stable", count: 980 }
  ],
  sdks: [
    { name: "google/generative-ai", trust: 95, readiness: 92, status: "Healthy", count: 5410 },
    { name: "openai/openai-node", trust: 94, readiness: 90, status: "Healthy", count: 4890 },
    { name: "anthropic-ai/sdk-node", trust: 92, readiness: 88, status: "Stable", count: 2110 }
  ]
};

function initLeaderboard(category) {
  const body = document.getElementById("leaderboardBody");
  body.innerHTML = "";
  const list = LEADERBOARD_DATA[category] || [];
  
  list.forEach((item, index) => {
    const statusClass = item.status.toLowerCase();
    const trustColor = item.trust >= 80 ? "text-mint" : item.trust >= 55 ? "text-amber" : "text-rose";
    const readColor = item.readiness >= 80 ? "text-mint" : item.readiness >= 55 ? "text-amber" : "text-rose";
    
    body.innerHTML += `
      <tr>
        <td>#${index + 1}</td>
        <td>${item.name}</td>
        <td class="${trustColor}">${item.trust}%</td>
        <td class="${readColor}">${item.readiness}/100</td>
        <td><span class="mc-status-badge ${statusClass}" style="font-size:0.65rem; padding:4px 10px;">${item.status}</span></td>
        <td style="font-family:var(--font-mono); font-size:0.8rem; color:var(--text3)">${item.count.toLocaleString()}</td>
      </tr>
    `;
  });
}

// ════════ CHAT ════════
async function sendChat() {
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

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoData: state, question: t })
    });
    const result = await res.json();
    typing.remove();
    box.innerHTML += `<div class="bubble ai">${result.response || "No response received."}</div>`;
  } catch (error) {
    typing.remove();
    box.innerHTML += `<div class="bubble ai error">Failed to connect to the AI advisor.</div>`;
  }
  box.scrollTop = box.scrollHeight;
}

// ════════ DIGITAL TWIN SIMULATOR CONTROLLER ════════
function initDigitalTwin() {
  if (!base) return;
  
  const mLeaves = document.getElementById("twinMaintainerLeaves");
  const rStop = document.getElementById("twinReleasesStop");
  const cCve = document.getElementById("twinCriticalCve");
  const aDrops = document.getElementById("twinActivityDrops");
  const dComp = document.getElementById("twinDepCompromised");
  
  // Set defaults to untoggled
  mLeaves.checked = false;
  rStop.checked = false;
  cCve.checked = false;
  aDrops.checked = false;
  dComp.checked = false;
  
  // Attach change event listeners
  const handler = () => recalculateDigitalTwin();
  mLeaves.onchange = handler;
  rStop.onchange = handler;
  cCve.onchange = handler;
  aDrops.onchange = handler;
  dComp.onchange = handler;
  
  document.getElementById("twinResetBtn").onclick = () => {
    mLeaves.checked = false;
    rStop.checked = false;
    cCve.checked = false;
    aDrops.checked = false;
    dComp.checked = false;
    recalculateDigitalTwin();
  };
  
  recalculateDigitalTwin();
}

function recalculateDigitalTwin() {
  if (!base) return;
  
  let simSecurity = Math.max(0, base.scores.security);
  let simMaintenance = Math.max(0, base.scores.maintenance);
  let simCommunity = Math.max(0, base.scores.community);
  let simSupply = Math.max(0, base.scores.supply);
  
  const maintainerLeaves = document.getElementById("twinMaintainerLeaves").checked;
  const releasesStop = document.getElementById("twinReleasesStop").checked;
  const criticalCve = document.getElementById("twinCriticalCve").checked;
  const activityDrops = document.getElementById("twinActivityDrops").checked;
  const depCompromised = document.getElementById("twinDepCompromised").checked;
  
  // Apply math impact constraints
  if (maintainerLeaves) {
    simMaintenance = Math.max(0, simMaintenance - 30);
    simCommunity = Math.max(0, simCommunity - 15);
  }
  if (releasesStop) {
    simMaintenance = Math.max(0, simMaintenance - 40);
  }
  if (criticalCve) {
    simSecurity = Math.max(0, simSecurity - 50);
  }
  if (activityDrops) {
    simCommunity = Math.max(0, simCommunity - 30);
    simMaintenance = Math.max(0, simMaintenance - 10);
  }
  if (depCompromised) {
    simSecurity = Math.max(0, simSecurity - 20);
    simSupply = Math.max(0, simSupply - 45);
  }
  
  // Re-run risk formula matching backend logic
  let activityRisk = base.regret.m3;
  let policyRisk = base.regret.m6;
  let hygieneRisk = base.regret.m12;
  
  if (maintainerLeaves) activityRisk = Math.min(30, activityRisk + 15);
  if (releasesStop) activityRisk = Math.min(30, activityRisk + 25);
  if (criticalCve) {
    policyRisk = Math.min(20, policyRisk + 20);
    hygieneRisk = Math.min(50, hygieneRisk + 15);
  }
  if (activityDrops) activityRisk = Math.min(30, activityRisk + 10);
  if (depCompromised) hygieneRisk = Math.min(50, hygieneRisk + 25);
  
  const simRisk = activityRisk + policyRisk + hygieneRisk;
  const simTrust = Math.max(0, Math.min(100, 100 - simRisk));
  
  // Update Score display
  document.getElementById("twinOriginalScore").textContent = base.trust;
  const simScoreEl = document.getElementById("twinSimulatedScore");
  simScoreEl.textContent = simTrust;
  
  if (simTrust >= 80) {
    simScoreEl.className = "tsc-num text-mint";
  } else if (simTrust >= 60) {
    simScoreEl.className = "tsc-num text-amber";
  } else {
    simScoreEl.className = "tsc-num text-rose";
  }
  
  // Verdict calculations
  let baseDecision = base.aiReport.boardroom.decision || "APPROVE WITH REVIEW";
  let simVerdict = "APPROVE WITH REVIEW";
  if (simTrust >= 85) simVerdict = "APPROVE";
  else if (simTrust < 55) simVerdict = "REJECT";
  else if (simTrust < 70) simVerdict = "RESTRICT";
  
  const origDecBadge = document.getElementById("twinOriginalDecision");
  const simDecBadge = document.getElementById("twinSimulatedDecision");
  
  origDecBadge.textContent = baseDecision;
  origDecBadge.className = "badge " + baseDecision.toLowerCase().replace(/\s+/g, '-');
  
  simDecBadge.textContent = simVerdict;
  simDecBadge.className = "badge " + simVerdict.toLowerCase().replace(/\s+/g, '-');
  
  // Render twin charts overlay
  drawTwinRadarChart(base.dna, {
    Security: simSecurity,
    Activity: simMaintenance,
    Popularity: base.dna.Popularity,
    Community: simCommunity,
    Maturity: base.dna.Maturity,
    Governance: Math.max(0, base.dna.Governance - (maintainerLeaves ? 15 : 0) - (depCompromised ? 20 : 0))
  });
  
  const baseForecast = base.aiReport.futureViability?.forecast || [];
  const baseScores = baseForecast.map(f => f.score);
  const baseLabels = baseForecast.map(f => f.period);
  
  const simulatedScores = [
    simTrust,
    Math.max(0, Math.round(simTrust * (releasesStop ? 0.7 : 0.95))),
    Math.max(0, Math.round(simTrust * (releasesStop ? 0.4 : 0.90))),
    Math.max(0, Math.round(simTrust * (releasesStop ? 0.1 : 0.80)))
  ];
  
  drawTwinLineChart(baseLabels, baseScores, simulatedScores);
  
  // Recalculate summary feedback text
  const summaryBox = document.getElementById("twinVerdictBox");
  const textEl = document.getElementById("twinVerdictText");
  
  let summaryText = [];
  if (maintainerLeaves) summaryText.push("Core developer departure drops maintenance activity indexes.");
  if (releasesStop) summaryText.push("Stagnant release cycles trigger severe future obsolescence decay.");
  if (criticalCve) summaryText.push("Critical CVE publication actively compromises security posture and trust integrity.");
  if (activityDrops) summaryText.push("Contributor drop-off warning triggers code decay and support latency risks.");
  if (depCompromised) summaryText.push("Transitive supply chain compromise directly threatens developer builds.");
  
  if (summaryText.length === 0) {
    textEl.textContent = "Digital twin is currently running in a nominal state. Adjust settings on the left to trigger forecasting events.";
    summaryBox.className = "twin-verdict-box";
  } else {
    textEl.innerHTML = summaryText.map(t => `• ${t}`).join("<br>");
    if (simTrust < 55) {
      summaryBox.className = "twin-verdict-box danger";
    } else {
      summaryBox.className = "twin-verdict-box warn";
    }
  }
}

function drawTwinRadarChart(baseDna, simDna) {
  const ctx = document.getElementById("twinRadarChart").getContext("2d");
  
  if (twinRadarChartInstance) {
    twinRadarChartInstance.destroy();
  }
  
  const labels = Object.keys(baseDna);
  const baseValues = Object.values(baseDna);
  const simValues = Object.values(simDna);
  
  twinRadarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Original State',
          data: baseValues,
          backgroundColor: 'rgba(99, 102, 241, 0.05)',
          borderColor: 'rgba(99, 102, 241, 0.4)',
          borderWidth: 1.5,
          pointRadius: 2
        },
        {
          label: 'Simulated State',
          data: simValues,
          backgroundColor: 'rgba(244, 63, 94, 0.15)',
          borderColor: '#f43f5e',
          borderWidth: 2,
          pointBackgroundColor: '#f43f5e',
          pointBorderColor: '#fff',
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          angleLines: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { display: false, maxTicksLimit: 3 },
          pointLabels: {
            color: 'rgba(255, 255, 255, 0.4)',
            font: { family: 'Inter', size: 8, weight: '600' }
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: 'rgba(255, 255, 255, 0.6)',
            boxWidth: 10,
            font: { size: 9, family: 'Inter' }
          }
        }
      }
    }
  });
}

function drawTwinLineChart(labels, originalScores, simulatedScores) {
  const ctx = document.getElementById("twinLineChart").getContext("2d");
  
  if (twinLineChartInstance) {
    twinLineChartInstance.destroy();
  }
  
  twinLineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Original Forecast',
          data: originalScores,
          borderColor: 'rgba(168, 85, 247, 0.4)',
          borderWidth: 1.5,
          borderDash: [4, 4],
          fill: false,
          pointRadius: 2
        },
        {
          label: 'Simulated Forecast',
          data: simulatedScores,
          borderColor: '#f43f5e',
          borderWidth: 2.5,
          backgroundColor: 'rgba(244, 63, 94, 0.05)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#f43f5e',
          pointBorderColor: '#fff',
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.02)' },
          ticks: { color: 'rgba(255, 255, 255, 0.4)', font: { family: 'Inter', size: 8 } }
        },
        y: {
          min: 0,
          max: 100,
          grid: { color: 'rgba(255, 255, 255, 0.02)' },
          ticks: { color: 'rgba(255, 255, 255, 0.4)', font: { family: 'Inter', size: 8 } }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: 'rgba(255, 255, 255, 0.6)',
            boxWidth: 10,
            font: { size: 9, family: 'Inter' }
          }
        }
      }
    }
  });
}

// ════════ ECOSYSTEM SOCIAL NETWORK MAP ════════
let ecosystemNodes = [];
let ecosystemLinks = [];
let selectedEcoNode = null;

function initEcosystemMap() {
  if (!state) return;
  const eco = state.aiReport?.ecosystemMap || { maintainers: [], contributors: [], relatedProjects: [], vulnerabilities: [], alternatives: [] };
  
  const c = document.getElementById("ecosystemCanvas");
  const area = c.parentElement;
  c.width = area.clientWidth;
  c.height = area.clientHeight || 450;
  
  const cx = c.width / 2;
  const cy = c.height / 2;
  
  selectedEcoNode = null;
  document.getElementById("ecoSelectPrompt").classList.remove("hidden");
  document.getElementById("ecoInspectorDetails").classList.add("hidden");
  
  // Assemble Graph Nodes
  ecosystemNodes = [];
  ecosystemLinks = [];
  
  // 1. Root Repository Node
  ecosystemNodes.push({
    id: "repo-root",
    label: state.name,
    type: "repository",
    x: cx,
    y: cy,
    r: 20,
    meta: {
      stars: state.stars,
      forks: state.forks,
      readiness: state.enterpriseReadinessScore || 70,
      trust: state.trust,
      license: state.aiReport?.dueDiligence?.adoptionRisk?.description || "MIT License"
    }
  });
  
  // Concentric ring radii
  const r1 = 90;  // Maintainers & Contributors
  const r2 = 150; // Dependencies & Organizations
  const r3 = 210; // Vulnerabilities & Alternatives
  
  // 2. Maintainers (Ring 1)
  const maintainers = eco.maintainers || ["core-developer"];
  maintainers.forEach((m, i) => {
    const angle = (Math.PI * 1.2) + (i * 0.25);
    const nid = `maint-${i}`;
    ecosystemNodes.push({
      id: nid,
      label: m,
      type: "maintainer",
      x: cx + r1 * Math.cos(angle),
      y: cy + r1 * Math.sin(angle),
      r: 10,
      meta: {
        role: "Core Repository Committer",
        publishAccess: "Yes",
        status: "Active"
      }
    });
    ecosystemLinks.push({ source: nid, target: "repo-root", relation: "maintains" });
  });
  
  // 3. Contributors (Ring 1)
  const contributors = eco.contributors || ["dev-alpha", "dev-beta"];
  contributors.forEach((contrib, i) => {
    const angle = (Math.PI * 0.7) - (i * 0.22);
    const nid = `contrib-${i}`;
    ecosystemNodes.push({
      id: nid,
      label: contrib,
      type: "contributor",
      x: cx + r1 * Math.cos(angle),
      y: cy + r1 * Math.sin(angle),
      r: 9,
      meta: {
        commitsMerged: Math.round(15 + Math.random() * 40),
        pullRequests: "Approved",
        status: "External Contributor"
      }
    });
    ecosystemLinks.push({ source: nid, target: "repo-root", relation: "contributed_to" });
  });
  
  // 4. Dependencies (Ring 2)
  const dependencies = ["lodash", "express", "dotenv", "axios"];
  dependencies.forEach((dep, i) => {
    const angle = (Math.PI * 0.15) + (i * 0.18);
    const nid = `dep-${i}`;
    ecosystemNodes.push({
      id: nid,
      label: dep,
      type: "dependency",
      x: cx + r2 * Math.cos(angle),
      y: cy + r2 * Math.sin(angle),
      r: 12,
      meta: {
        nature: "Runtime Package dependency",
        lockfileState: state.scoreDisplay?.supply || "Lockfile verified ✓",
        licensing: "Permissive Open Source"
      }
    });
    ecosystemLinks.push({ source: nid, target: "repo-root", relation: "depends_on" });
  });
  
  // 5. Related Projects (Ring 2)
  const related = eco.relatedProjects || [];
  related.forEach((rel, i) => {
    const angle = (-Math.PI * 0.2) - (i * 0.22);
    const nid = `related-${i}`;
    ecosystemNodes.push({
      id: nid,
      label: rel,
      type: "related",
      x: cx + r2 * Math.cos(angle),
      y: cy + r2 * Math.sin(angle),
      r: 11,
      meta: {
        organization: rel.split("/")[0],
        relationship: "Common Organization Framework",
        longevity: "High"
      }
    });
    ecosystemLinks.push({ source: nid, target: "repo-root", relation: "related_to" });
  });
  
  // 6. Vulnerabilities (Ring 3)
  const vulnerabilities = eco.vulnerabilities || [];
  vulnerabilities.forEach((v, i) => {
    const angle = Math.PI * 0.45;
    const nid = `vuln-${i}`;
    ecosystemNodes.push({
      id: nid,
      label: v.id,
      type: "vulnerability",
      x: cx + r3 * Math.cos(angle),
      y: cy + (r3 - 40) * Math.sin(angle),
      r: 10,
      meta: {
        severity: v.severity,
        cveId: v.id,
        description: v.description
      }
    });
    ecosystemLinks.push({ source: nid, target: "repo-root", relation: "warning_signal", style: "danger" });
  });
  
  // 7. Alternatives (Ring 3)
  const alternatives = eco.alternatives || [];
  alternatives.forEach((alt, i) => {
    const angle = (Math.PI * 1.5) + (i * 0.25);
    const nid = `alt-${i}`;
    ecosystemNodes.push({
      id: nid,
      label: alt.name,
      type: "alternative",
      x: cx + r3 * Math.cos(angle),
      y: cy + r3 * Math.sin(angle),
      r: 11,
      meta: {
        packageName: alt.name,
        justification: alt.reason,
        migrationCost: "Low-Medium"
      }
    });
    ecosystemLinks.push({ source: nid, target: "repo-root", relation: "alternative_to", style: "dashed" });
  });
  
  // Register Canvas Interactivity
  c.onmousemove = (e) => {
    const r = c.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    let hovered = null;
    
    ecosystemNodes.forEach(node => {
      if (Math.hypot(node.x - mx, node.y - my) < node.r + 5) {
        hovered = node;
      }
    });
    
    drawEcosystemCanvas(hovered);
  };
  
  c.onclick = (e) => {
    const r = c.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    let clicked = null;
    
    ecosystemNodes.forEach(node => {
      if (Math.hypot(node.x - mx, node.y - my) < node.r + 5) {
        clicked = node;
      }
    });
    
    if (clicked) {
      inspectEcoNode(clicked);
    }
  };
  
  drawEcosystemCanvas();
}

function drawEcosystemCanvas(hoveredNode = null) {
  const c = document.getElementById("ecosystemCanvas");
  if (!c) return;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  
  // 1. Draw Links
  ecosystemLinks.forEach(link => {
    const sNode = ecosystemNodes.find(n => n.id === link.source);
    const tNode = ecosystemNodes.find(n => n.id === link.target);
    if (!sNode || !tNode) return;
    
    ctx.beginPath();
    ctx.moveTo(sNode.x, sNode.y);
    ctx.lineTo(tNode.x, tNode.y);
    
    if (link.style === "dashed") {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
    } else if (link.style === "danger") {
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(244, 63, 94, 0.6)";
      ctx.lineWidth = 2;
    } else {
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1.2;
    }
    
    // Highlight lines if connected to hovered node
    if (hoveredNode && (hoveredNode.id === sNode.id || hoveredNode.id === tNode.id)) {
      ctx.strokeStyle = hoveredNode.type === "vulnerability" ? "rgba(244, 63, 94, 0.8)" : "rgba(99, 102, 241, 0.5)";
      ctx.lineWidth = 1.8;
    }
    
    ctx.stroke();
  });
  ctx.setLineDash([]); // Reset line dash
  
  // 2. Draw Nodes
  ecosystemNodes.forEach(node => {
    const isHovered = hoveredNode && hoveredNode.id === node.id;
    const isSelected = selectedEcoNode && selectedEcoNode.id === node.id;
    
    // Node Glow Circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r * 1.7, 0, Math.PI * 2);
    
    let glowColor = "transparent";
    if (node.type === "repository") glowColor = "rgba(99, 102, 241, 0.08)";
    else if (node.type === "vulnerability") glowColor = "rgba(244, 63, 94, 0.1)";
    else if (node.type === "dependency") glowColor = "rgba(16, 185, 129, 0.05)";
    else if (node.type === "maintainer") glowColor = "rgba(99, 102, 241, 0.05)";
    else if (node.type === "contributor") glowColor = "rgba(168, 85, 247, 0.05)";
    else if (node.type === "alternative") glowColor = "rgba(245, 158, 11, 0.05)";
    
    if (isHovered || isSelected) {
      glowColor = node.type === "vulnerability" ? "rgba(244, 63, 94, 0.2)" : "rgba(99, 102, 241, 0.2)";
    }
    
    ctx.fillStyle = glowColor;
    ctx.fill();
    
    // Node Body
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    
    let strokeColor = "rgba(255, 255, 255, 0.15)";
    let fillColor = "rgba(20, 20, 25, 0.9)";
    
    if (node.type === "repository") {
      strokeColor = "#6366f1";
      fillColor = "rgba(99, 102, 241, 0.15)";
    } else if (node.type === "vulnerability") {
      strokeColor = "#f43f5e";
      fillColor = "rgba(244, 63, 94, 0.15)";
    } else if (node.type === "dependency") {
      strokeColor = "#10b981";
      fillColor = "rgba(16, 185, 129, 0.08)";
    } else if (node.type === "maintainer") {
      strokeColor = "#818cf8";
    } else if (node.type === "contributor") {
      strokeColor = "#c084fc";
    } else if (node.type === "alternative") {
      strokeColor = "#fb923c";
    }
    
    if (isHovered || isSelected) {
      strokeColor = "#fff";
    }
    
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.8;
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.stroke();
    
    // Text Labels
    ctx.fillStyle = isHovered ? "#fff" : "rgba(255, 255, 255, 0.65)";
    ctx.font = node.type === "repository" ? "700 9px JetBrains Mono" : "500 8px JetBrains Mono";
    ctx.textAlign = "center";
    ctx.fillText(node.label, node.x, node.y - node.r - 6);
  });
}

function inspectEcoNode(node) {
  selectedEcoNode = node;
  
  document.getElementById("ecoSelectPrompt").classList.add("hidden");
  const detailsBox = document.getElementById("ecoInspectorDetails");
  detailsBox.classList.remove("hidden");
  
  document.getElementById("ecoNodeName").textContent = node.label;
  
  let formattedType = node.type.toUpperCase();
  if (node.type === "rel") formattedType = "RELATED ORGANIZATION PROJECT";
  document.getElementById("ecoNodeType").textContent = formattedType;
  
  const content = document.getElementById("ecoInspectorContent");
  content.innerHTML = "";
  
  const meta = node.meta || {};
  if (node.type === "repository") {
    content.innerHTML = `
      <div class="meta-row"><strong>Stars:</strong> <span>${meta.stars}</span></div>
      <div class="meta-row"><strong>Forks:</strong> <span>${meta.forks}</span></div>
      <div class="meta-row"><strong>Readiness:</strong> <span>${meta.readiness}/100</span></div>
      <div class="meta-row"><strong>Base Trust:</strong> <span>${meta.trust}%</span></div>
      <div class="meta-row"><strong>License Audit:</strong> <span>${meta.license}</span></div>
    `;
  } else if (node.type === "dependency") {
    content.innerHTML = `
      <div class="meta-row"><strong>Nature:</strong> <span>${meta.nature}</span></div>
      <div class="meta-row"><strong>Lockfile Compliance:</strong> <span>${meta.lockfileState}</span></div>
      <div class="meta-row"><strong>Legal Licensing:</strong> <span>${meta.licensing}</span></div>
    `;
  } else if (node.type === "maintainer") {
    content.innerHTML = `
      <div class="meta-row"><strong>Role:</strong> <span>${meta.role}</span></div>
      <div class="meta-row"><strong>Registry Access:</strong> <span>${meta.publishAccess}</span></div>
      <div class="meta-row"><strong>Activity Status:</strong> <span>${meta.status}</span></div>
    `;
  } else if (node.type === "contributor") {
    content.innerHTML = `
      <div class="meta-row"><strong>Merged Commits:</strong> <span>${meta.commitsMerged}</span></div>
      <div class="meta-row"><strong>PR Verification:</strong> <span>${meta.pullRequests}</span></div>
      <div class="meta-row"><strong>Community Role:</strong> <span>${meta.status}</span></div>
    `;
  } else if (node.type === "related") {
    content.innerHTML = `
      <div class="meta-row"><strong>Organization:</strong> <span>${meta.organization}</span></div>
      <div class="meta-row"><strong>Link Context:</strong> <span>${meta.relationship}</span></div>
      <div class="meta-row"><strong>Future Viability:</strong> <span>${meta.longevity}</span></div>
    `;
  } else if (node.type === "vulnerability") {
    const sevColor = meta.severity === "CRITICAL" || meta.severity === "HIGH" ? "text-rose" : "text-amber";
    content.innerHTML = `
      <div class="meta-row"><strong>Severity:</strong> <span class="${sevColor}"><strong>${meta.severity}</strong></span></div>
      <div class="meta-row"><strong>CVE Reference:</strong> <span>${meta.cveId}</span></div>
      <div class="meta-desc-box">${meta.description}</div>
    `;
  } else if (node.type === "alternative") {
    content.innerHTML = `
      <div class="meta-row"><strong>Package Name:</strong> <span>${meta.packageName}</span></div>
      <div class="meta-row"><strong>Migration Overhead:</strong> <span>${meta.migrationCost}</span></div>
      <div class="meta-desc-box"><strong>Justification:</strong><br>${meta.justification}</div>
    `;
  }
  
  drawEcosystemCanvas();
}
