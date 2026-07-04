// ════════════════════════════════════════════════════════════
//  TrustGraph — Adoption Decision Intelligence Platform
// ════════════════════════════════════════════════════════════

let state = null, base = null;
let radarChartInstance = null;
let lineChartInstance = null;
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
  decBadge.textContent = boardroom.decision || "REVIEW REQUIRED";
  decBadge.className = "br-decision-badge " + (boardroom.decision || "").toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');

  document.getElementById("brConfidence").textContent = `${boardroom.confidence || 75}%`;
  
  // Risk fields
  const setRiskClass = (id, val) => {
    const el = document.getElementById(id);
    el.textContent = val || "Medium";
    el.className = "br-risk-val " + (val || "medium").toLowerCase();
  };
  setRiskClass("brBusinessRisk", boardroom.businessRisk);
  setRiskClass("brMaintenanceRisk", boardroom.maintenanceRisk);
  setRiskClass("brSecurityRisk", boardroom.securityRisk);

  document.getElementById("brSummaryText").textContent = boardroom.summary || "Executive summary unavailable.";

  // Adoption profiles
  const profiles = ai.adoptionProfiles || {};
  const profilesList = ["personal", "startup", "enterprise", "saas", "banking", "healthcare", "government"];
  profilesList.forEach(prof => {
    const data = profiles[prof] || { verdict: "REVIEW REQUIRED", reasoning: "No details." };
    const card = document.querySelector(`.rec-card[data-profile="${prof}"]`);
    if (card) {
      const badge = card.querySelector(".badge");
      badge.textContent = data.verdict;
      badge.className = "badge " + data.verdict.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
      card.querySelector("p").textContent = data.reasoning;
    }
  });

  // Metrics status badges
  const healthBadge = document.getElementById("healthStatusBadge");
  healthBadge.textContent = (ai.healthStatus || "Stable").toUpperCase();
  healthBadge.className = "mc-status-badge " + (ai.healthStatus || "stable").toLowerCase();

  document.getElementById("enterpriseReadinessVal").textContent = ai.enterpriseReadinessScore || 70;
  document.getElementById("subSecurity").textContent = s.scores.security;
  document.getElementById("subMaintenance").textContent = s.scores.maintenance;

  // Render Charts
  renderRadarChart(s.dna);
  renderViabilityChart(ai.futureViability);

  // Trust History timeline
  const timelineContainer = document.getElementById("historyTimeline");
  timelineContainer.innerHTML = "";
  const timelineData = ai.timeline || [];
  timelineData.forEach(item => {
    const typeClass = (item.type || "neutral").toLowerCase();
    timelineContainer.innerHTML += `
      <div class="timeline-item ${typeClass}">
        <span class="ti-date">${item.date}</span>
        <p class="ti-event">${item.event}</p>
        <span class="ti-score">Telemetry Index: ${item.score}</span>
      </div>
    `;
  });

  // Alternatives
  const altContainer = document.getElementById("alternativesList");
  altContainer.innerHTML = "";
  const alternatives = ai.alternatives || [];
  if (alternatives.length > 0) {
    alternatives.forEach(alt => {
      altContainer.innerHTML += `
        <div class="alt-item">
          <h5>${alt.name}</h5>
          <p>${alt.reason}</p>
        </div>
      `;
    });
  } else {
    altContainer.innerHTML = `<div class="alt-item"><p style="color:var(--text3)">No alternatives needed. This repository is highly recommended.</p></div>`;
  }
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
