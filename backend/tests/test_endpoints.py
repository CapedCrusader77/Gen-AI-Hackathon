from fastapi.testclient import TestClient
import sys
import os

# Add parent directory to python path for testing
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.main import app

client = TestClient(app)

def test_analyze_invalid_url():
    """
    Verifies that analyze route rejects invalid repo names with HTTP 400.
    """
    response = client.post("/api/analyze", json={"url": "invalid_url"})
    assert response.status_code == 400
    assert "Invalid GitHub repository" in response.json()["detail"]

def test_command_center_stats():
    """
    Verifies that the command center analytics dashboard endpoint returns the aggregate logs structure.
    """
    response = client.get("/api/command-center")
    assert response.status_code == 200
    data = response.json()
    assert "repositories" in data
    assert "totalScanned" in data
    assert "avgScores" in data

def test_benchmark_run():
    """
    Verifies that the benchmark runs and measures execution time.
    """
    response = client.post("/api/benchmark", json={"dataSize": 1000})
    assert response.status_code == 200
    data = response.json()
    assert "cpu_time_ms" in data
    assert "gpu_time_ms" in data
    assert "speedup" in data
    assert data["processed_records"] == 1000

def test_simulation_run():
    """
    Verifies that the Digital Twin simulation runs and recalculates scores.
    """
    mock_repo = {
        "name": "test/repo",
        "trust": 80,
        "scores": {
            "security": 80,
            "maintenance": 80,
            "community": 80,
            "supply": 80,
            "documentation": 90,
            "trust": 80
        },
        "contributors": 10,
        "has_security_policy": True,
        "has_lockfile": True,
        "has_license": True
    }
    
    response = client.post("/api/simulate", json={
        "repoData": mock_repo,
        "flags": {
            "maintainer_leaves": True,
            "releases_stop": False,
            "critical_cve": True,
            "activity_drops": False,
            "dependency_compromised": False
        }
    })
    assert response.status_code == 200
    data = response.json()
    assert data["trust"] < 80
    assert data["verdict"] != "APPROVE"
    assert "vulnerability" in data["sim_summary"].lower()
