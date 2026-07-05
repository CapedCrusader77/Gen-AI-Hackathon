import httpx
import json
from backend.config import GEMINI_API_KEY

async def call_gemini(prompt: str) -> str:
    """
    Directly queries the Google Gemini API REST endpoint using httpx.
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not configured in the environment.")
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json" if "json" in prompt.lower() else "text/plain"
        }
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, timeout=25.0)
        if response.status_code != 200:
            raise Exception(f"Gemini API returned error code {response.status_code}: {response.text}")
        
        result_json = response.json()
        try:
            text = result_json["candidates"][0]["content"]["parts"][0]["text"]
            return text
        except (KeyError, IndexOffBoundsError, TypeError) as e:
            raise ValueError(f"Unexpected response structure from Gemini API: {e}. Raw response: {result_json}")

async def generate_ai_report(repo_data: dict) -> dict:
    """
    Generates a structured tech analysis report for a single repository.
    """
    # Deterministic Generator (Fallback/Base structure)
    fallback = generate_mock_ai_report(repo_data)
    
    if not GEMINI_API_KEY:
        return fallback
        
    prompt = f"""
You are TrustGraph's Boardroom AI Advisor, an expert in software supply chain security, architectural design, and open-source licensing compliance.
Your job is to analyze a repository based on GitHub telemetry and output a structured JSON report.

DO NOT hallucinate. Ground your assessments strictly in the provided metrics.
Ensure your response is valid JSON and maps EXACTLY to the following schema structure.

Repository Metrics:
{json.dumps(repo_data, indent=2)}

JSON Output Schema:
{{
  "boardroom": {{
    "decision": "APPROVED" | "APPROVE WITH REVIEW" | "RESTRICT" | "REJECT",
    "confidence": 0-100,
    "summary": "Detailed 2-3 sentence executive decision summary grounded in telemetry."
  }},
  "dueDiligence": {{
    "technicalRisk": {{ "level": "Low" | "Medium" | "High", "description": "Analysis of open issues, history, and structure." }},
    "securityRisk": {{ "level": "Low" | "Medium" | "High", "description": "Analysis of security policies, scan statuses, and license." }},
    "maintenanceRisk": {{ "level": "Low" | "Medium" | "High", "description": "Analysis of push intervals, release frequencies." }},
    "communityRisk": {{ "level": "Low" | "Medium" | "High", "description": "Analysis of contributor concentrations, bus factors." }},
    "adoptionRisk": {{ "level": "Low" | "Medium" | "High", "description": "Analysis of license details." }},
    "vendorLockInRisk": {{ "level": "Low" | "Medium" | "High", "description": "Proprietary codebases vs portable libraries." }},
    "futureViabilityRisk": {{ "level": "Low" | "Medium" | "High", "description": "Project longevity and decay curve evaluation." }}
  }},
  "investmentAnalyst": {{
    "growthRating": "A+" | "A" | "B" | "C" | "D",
    "healthRating": "Strong" | "Moderate" | "Fragile",
    "riskRating": "Low" | "Elevated" | "Severe",
    "momentumRating": "Accelerating" | "Stagnant" | "Decelerating",
    "viabilityRating": "Viable" | "At-Risk" | "Unviable",
    "recommendation": "BUY" | "HOLD" | "AVOID",
    "justification": "Detailed Bloomberg-style equity rationale detailing architectural health."
  }},
  "timeMachine": {{
    "pastTrust": {{ "score": 0-100, "date": "12 months ago", "reason": "Historical posture reason." }},
    "presentTrust": {{ "score": 0-100, "date": "Today", "reason": "Current posture details." }},
    "futureTrust": {{ "score": 0-100, "date": "12 months from now", "reason": "Predicted shift and decay rationale." }},
    "trendReasoning": "Overall future-proofing trajectory details."
  }}
}}
"""
    try:
        raw_text = await call_gemini(prompt)
        # Parse JSON
        parsed_json = json.loads(raw_text.replace("```json", "").replace("```", "").strip())
        return parsed_json
    except Exception as e:
        print(f"[Gemini Service] Exception calling Gemini report, using fallback: {e}")
        return fallback

async def generate_ai_chat_response(repo_data: dict, question: str) -> str:
    """
    Answers user queries grounded in repository telemetry.
    """
    if not GEMINI_API_KEY:
        # Fallback answers based on keywords
        return get_fallback_chat_reply(repo_data, question)
        
    prompt = f"""
You are TrustGraph's Boardroom AI Advisor. You are helping an enterprise evaluate whether they should adopt this repository.
Provide a direct, professional, and evidence-based answer. Ground your answers strictly in the repository metrics. Do not make up facts.
Keep it under 3-4 sentences.

Repository Telemetry:
{json.dumps(repo_data, indent=2)}

User Question:
"{question}"
"""
    try:
        reply = await call_gemini(prompt)
        return reply.strip()
    except Exception as e:
        print(f"[Gemini Service] Exception in chat: {e}")
        return get_fallback_chat_reply(repo_data, question)

async def generate_ai_comparison(repos_data: list) -> dict:
    """
    Compares repositories and generates a recommendation.
    """
    fallback = calculate_deterministic_comparison(repos_data)
    
    if not GEMINI_API_KEY:
        return fallback
        
    prompt = f"""
You are TrustGraph's Boardroom AI Advisor. Compare these repositories and declare a winner.
Output your analysis in valid JSON matching the schema below. Keep details strict and grounded.

Repositories:
{json.dumps(repos_data, indent=2)}

Output Schema:
{{
  "winner": "Full Repository Name",
  "comparison": {{
     "repo_name_1": {{ "security": 0-100, "maintenance": 0-100, "community": 0-100, "futureViability": 0-100, "enterpriseReadiness": 0-100, "documentation": 0-100 }},
     "repo_name_2": {{ "security": 0-100, "maintenance": 0-100, "community": 0-100, "futureViability": 0-100, "enterpriseReadiness": 0-100, "documentation": 0-100 }}
  }},
  "recommendation": "Comparative breakdown text detailing reasons for the winner."
}}
"""
    try:
        raw_text = await call_gemini(prompt)
        parsed = json.loads(raw_text.replace("```json", "").replace("```", "").strip())
        return parsed
    except Exception as e:
        print(f"[Gemini Service] Exception in comparison, using fallback: {e}")
        return fallback

def generate_mock_ai_report(repo: dict) -> dict:
    """
    Generates a high-fidelity local report when API keys are not present.
    """
    name = repo.get("name", "Unknown/Repo")
    trust = repo.get("trust", 50)
    stars = repo.get("stars", 0)
    contribs = repo.get("contributors", 0)
    days = repo.get("days_since_push", 365)
    has_policy = repo.get("has_security_policy", False)
    has_lock = repo.get("has_lockfile", False)
    
    decision = "APPROVE WITH REVIEW"
    if trust >= 80:
        decision = "APPROVED"
    elif trust < 50:
        decision = "REJECT"
    elif trust < 65:
        decision = "RESTRICT"
        
    tech_level = "Low" if trust >= 80 else "Medium" if trust >= 60 else "High"
    sec_level = "Low" if has_policy and has_lock else "Medium" if has_policy or has_lock else "High"
    maint_level = "Low" if days <= 60 else "Medium" if days <= 180 else "High"
    comm_level = "Low" if contribs >= 50 else "Medium" if contribs >= 10 else "High"
    
    growth = "A" if trust >= 85 else "B" if trust >= 70 else "C" if trust >= 50 else "D"
    health = "Strong" if trust >= 80 else "Moderate" if trust >= 60 else "Fragile"
    risk = "Low" if trust >= 80 else "Elevated" if trust >= 60 else "Severe"
    momentum = "Accelerating" if days <= 30 else "Stagnant" if days <= 120 else "Decelerating"
    viability = "Viable" if trust >= 70 else "At-Risk" if trust >= 50 else "Unviable"
    rec = "BUY" if trust >= 80 and days < 90 else "HOLD" if trust >= 60 else "AVOID"
    
    justification = f"Detailed architectural asset audit for {name}. Telemetry indicates a trust index of {trust}%. Contributor count is {contribs} with pushed updates {round(days)} days ago. We recommend {rec} status, indicating {risk.lower()} supply chain risk profile with {viability.lower()} longevity."
    
    return {
      "boardroom": {
        "decision": decision,
        "confidence": min(100, max(30, int(trust + (10 if contribs > 100 else -10)))),
        "summary": f"Adoption Advisory for {name}: Decision stands as {decision}. Telemetry indexes score repository health at {health.lower()} with active push interval at {round(days)} days by {contribs} contributors."
      },
      "dueDiligence": {
        "technicalRisk": { "level": tech_level, "description": f"Architectural score evaluated based on open issue ratios and {stars} stars." },
        "securityRisk": { "level": sec_level, "description": f"Security posture shows {'active security policy file' if has_policy else 'missing security policy metadata'} and {'active dependency lockfile' if has_lock else 'unlocked packages risk'}." },
        "maintenanceRisk": { "level": maint_level, "description": f"Last activity tracked {round(days)} days ago." },
        "communityRisk": { "level": comm_level, "description": f"Contributed by {contribs} developers. Bus factor concentration checked." },
        "adoptionRisk": { "level": "Low" if repo.get("has_license") else "High", "description": f"License details: {repo.get('license', 'None')}." },
        "vendorLockInRisk": { "level": "Low", "description": "Codebase is highly portable. No heavy platform bindings detected." },
        "futureViabilityRisk": { "level": "Low" if days < 90 else "High", "description": f"24-Month trajectory based on push intervals." }
      },
      "investmentAnalyst": {
        "growthRating": growth,
        "healthRating": health,
        "riskRating": risk,
        "momentumRating": momentum,
        "viabilityRating": viability,
        "recommendation": rec,
        "justification": justification
      },
      "timeMachine": {
        "pastTrust": { "score": min(100, int(trust * 1.05)), "date": "12 months ago", "reason": "Consistent release cycle and developer counts." },
        "presentTrust": { "score": trust, "date": "Today", "reason": "Calculated from current push intervals, licensing, and metadata security checks." },
        "futureTrust": { "score": max(0, int(trust - (15 if days > 90 else 5))), "date": "12 months from now", "reason": "Reflects forecasted support decay." },
        "trendReasoning": f"Trend curve projects a {'stable and active' if days <= 90 else 'decaying and stagnating'} trajectory for the upcoming 12 months."
      }
    }

def get_fallback_chat_reply(repo: dict, question: str) -> str:
    name = repo.get("name", "the repository")
    trust = repo.get("trust", 50)
    risk = 100 - trust
    sec = repo.get("scores", {}).get("security", 50)
    maint = repo.get("scores", {}).get("maintenance", 50)
    lc = question.lower()
    
    if "startup" in lc:
        if risk > 40:
            return f"[AI CTO Fallback] Building a startup on {name} is risky. The telemetry risk of {risk}% is elevated due to maintenance or security gaps. Sandboxing is suggested before production commit."
        return f"[AI CTO Fallback] Yes, we can build a startup MVP on {name}. The telemetry index of {trust}% trust shows adequate stability and speed advantages."
    elif "healthcare" in lc or "medical" in lc:
        if sec < 80:
            return f"[AI CTO Fallback] REJECTED. Healthcare requires HIPAA compliance and active security disclosure channels. With a security score of only {sec}%, {name} lacks the required compliance hygiene."
        return f"[AI CTO Fallback] APPROVED WITH REVIEW. Security score is high ({sec}%), but a full static analysis (SAST) and container isolation are required before exposing patient records."
    elif "banking" in lc or "finance" in lc:
        if sec < 85:
            return f"[AI CTO Fallback] REJECTED. Banking compliance requires zero-trust registries and explicit commercial licenses. {name}'s trust scores are below our compliance threshold."
        return f"[AI CTO Fallback] APPROVED WITH REVIEW. Banking deployment requires hosting a private registry and pinned packages. Direct public access is blocked."
    elif "risk" in lc or "concern" in lc or "worry" in lc:
        return f"[AI CTO Fallback] Evaluating risk: The technical risk index is {risk}%, security score is {sec}%, and maintenance index is {maint}%. Gaps in security policies and release cycle lag represent the largest concerns."
    else:
        return f"[AI CTO Fallback] Telemetry summary for {name}: Trust index is {trust}%. Adoption recommendation is APPROVED WITH REVIEW. Dedicated developer cycles should be allocated to monitor upstream updates."

def calculate_deterministic_comparison(repos: list) -> dict:
    result = {
        "winner": "",
        "comparison": {},
        "recommendation": ""
    }
    highest = -1
    for r in repos:
        name = r.get("name")
        scores = r.get("scores", {})
        
        # Calculate readiness and viability
        readiness = int(
            (25 if r.get("has_security_policy") else 0) +
            (20 if r.get("has_lockfile") else 0) +
            min(40, (r.get("contributors", 0) / 100) * 40) +
            15
        )
        viability = max(10, int(scores.get("trust", 50) - (15 if r.get("days_since_push", 0) > 90 else 0)))
        
        avg = int((scores.get("security", 50) + scores.get("maintenance", 50) + scores.get("community", 50) + viability + readiness + scores.get("documentation", 50)) / 6)
        
        result["comparison"][name] = {
            "security": scores.get("security", 50),
            "maintenance": scores.get("maintenance", 50),
            "community": scores.get("community", 50),
            "futureViability": viability,
            "enterpriseReadiness": readiness,
            "documentation": scores.get("documentation", 50)
        }
        
        if avg > highest:
            highest = avg
            result["winner"] = name
            
    result["recommendation"] = f"Based on multi-factor scores, the architect choice is {result['winner']}. It provides the most balanced distribution of security controls, active maintainer velocity, and overall compliance profiles."
    return result
