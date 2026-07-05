import os
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any

from backend.config import PORT
from backend.services.github_service import parse_repository, fetch_repo_telemetry
from backend.services.gemini_service import generate_ai_report, generate_ai_comparison, generate_ai_chat_response
from backend.services.simulation_service import recalculate_simulation
from backend.services.benchmark_service import execute_benchmarks
from backend.database import save_scan, get_scans_summary

app = FastAPI(title="TrustGraph Decision API", version="1.0.0")

# CORS setup for frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    url: str

class CompareRequest(BaseModel):
    urls: List[str]

class ChatRequest(BaseModel):
    repoData: Dict[str, Any]
    question: str

class SimulateRequest(BaseModel):
    repoData: Dict[str, Any]
    flags: Dict[str, bool]

class BenchmarkRequest(BaseModel):
    dataSize: int = 200000

@app.post("/api/analyze")
async def analyze_repo(req: AnalyzeRequest):
    repo_name = parse_repository(req.url)
    if not repo_name:
        raise HTTPException(status_code=400, detail="Invalid GitHub repository identifier. Use format owner/repo.")
        
    try:
        # Fetch GitHub parameters
        telemetry = await fetch_repo_telemetry(repo_name)
        
        # Call Gemini to get Boardroom Advisor report
        ai_report = await generate_ai_report(telemetry)
        
        # Combine telemetry and AI report
        telemetry["aiReport"] = ai_report
        
        # Calculate adoption readiness environmental rules (grounded in telemetry)
        avg_trust = telemetry["trust"]
        sec = telemetry["scores"]["security"]
        
        # Environment thresholds helper
        def env_rule(score, min_score, name):
            if score >= min_score:
                return "APPROVED", f"Telemetry thresholds satisfied for {name} profile."
            elif score >= max(10, min_score - 20):
                return "APPROVED WITH REVIEW", f"Minor compliance warnings for {name}. Review suggested."
            elif score >= max(5, min_score - 40):
                return "RESTRICT", f"Severe telemetry drift under {name}. Restrict deployment."
            else:
                return "REJECTED", f"Fails mandatory security and stability gates for {name}."
                
        adoption_readiness = {
            "personal": {
                "verdict": env_rule(avg_trust, 40, "Personal Projects")[0],
                "reasoning": env_rule(avg_trust, 40, "Personal Projects")[1]
            },
            "startup": {
                "verdict": env_rule(avg_trust, 55, "Startup MVP")[0],
                "reasoning": env_rule(avg_trust, 55, "Startup MVP")[1]
            },
            "enterprise": {
                "verdict": env_rule(avg_trust, 70, "Internal Enterprise")[0],
                "reasoning": env_rule(avg_trust, 70, "Internal Enterprise")[1]
            },
            "saas": {
                "verdict": env_rule(avg_trust, 75, "Production SaaS")[0],
                "reasoning": env_rule(avg_trust, 75, "Production SaaS")[1]
            },
            "banking": {
                "verdict": env_rule(min(avg_trust, sec), 85, "Banking")[0],
                "reasoning": env_rule(min(avg_trust, sec), 85, "Banking")[1]
            },
            "healthcare": {
                "verdict": env_rule(min(avg_trust, sec), 85, "Healthcare")[0],
                "reasoning": env_rule(min(avg_trust, sec), 85, "Healthcare")[1]
            },
            "government": {
                "verdict": env_rule(min(avg_trust, sec), 90, "Government")[0],
                "reasoning": env_rule(min(avg_trust, sec), 90, "Government")[1]
            }
        }
        
        telemetry["adoptionReadiness"] = adoption_readiness
        
        # Calculate overall enterprise readiness score
        contribs = telemetry["contributors"]
        readiness_score = int(
            (25 if telemetry["has_security_policy"] else 0) +
            (15 if telemetry["has_license"] else 0) +
            (20 if telemetry["has_lockfile"] else 0) +
            min(40, (contribs / 100) * 40)
        )
        telemetry["enterpriseReadinessScore"] = readiness_score
        
        # Log to Database (mimics BigQuery engine)
        save_scan(repo_name, telemetry)
        
        return telemetry
    except Exception as e:
        print(f"[Analyze API] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/compare")
async def compare_repos(req: CompareRequest):
    if not req.urls or len(req.urls) < 1:
        raise HTTPException(status_code=400, detail="Provide at least one repository identifier.")
        
    try:
        repos_data = []
        for url in req.urls:
            repo_name = parse_repository(url)
            if not repo_name:
                raise HTTPException(status_code=400, detail=f"Invalid repository string: {url}")
            telemetry = await fetch_repo_telemetry(repo_name)
            repos_data.append(telemetry)
            
        # Get AI comparison
        result = await generate_ai_comparison(repos_data)
        return result
    except Exception as e:
        print(f"[Compare API] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_advisor(req: ChatRequest):
    try:
        reply = await generate_ai_chat_response(req.repoData, req.question)
        return {"response": reply}
    except Exception as e:
        print(f"[Chat API] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulate")
async def simulate_threat(req: SimulateRequest):
    try:
        simulated_data = recalculate_simulation(req.repoData, req.flags)
        return simulated_data
    except Exception as e:
        print(f"[Simulate API] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/benchmark")
async def run_benchmark(req: BenchmarkRequest):
    try:
        results = execute_benchmarks(req.dataSize)
        return results
    except Exception as e:
        print(f"[Benchmark API] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/command-center")
def get_command_center_stats():
    try:
        stats = get_scans_summary()
        return stats
    except Exception as e:
        print(f"[Command Center API] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Mount static React files when they are built
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")
    print(f"[Main] Mounting static assets from {frontend_dist}")
else:
    print(f"[Warning] Static build folder not found at {frontend_dist}. Serves API endpoints only.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=PORT, reload=True)
