import sqlite3
import os
import json
from datetime import datetime
from backend.config import GOOGLE_APPLICATION_CREDENTIALS

DB_FILE = os.path.join(os.path.dirname(__file__), "trustgraph.db")

def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Repositories scanned
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scanned_repositories (
            repo_name TEXT PRIMARY KEY,
            stars INTEGER,
            forks INTEGER,
            contributors INTEGER,
            trust_score INTEGER,
            security_score INTEGER,
            maintenance_score INTEGER,
            community_score INTEGER,
            supply_score INTEGER,
            readiness_score INTEGER,
            verdict TEXT,
            status TEXT,
            analyzed_at TEXT
        )
    """)
    
    # Individual environment decisions logged
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS decision_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            repo_name TEXT,
            environment TEXT,
            verdict TEXT,
            reasoning TEXT,
            logged_at TEXT
        )
    """)
    conn.commit()
    conn.close()
    
    # Try initializing BigQuery if credentials available
    if GOOGLE_APPLICATION_CREDENTIALS:
        print("[DB] Google Application Credentials found. Simulating/Initializing BigQuery connection...")
    else:
        print("[DB] SQLite database initialized successfully at", DB_FILE)

def save_scan(repo_name, data):
    conn = get_connection()
    cursor = conn.cursor()
    
    scores = data.get("scores", {})
    try:
        cursor.execute("""
            INSERT OR REPLACE INTO scanned_repositories 
            (repo_name, stars, forks, contributors, trust_score, security_score, 
             maintenance_score, community_score, supply_score, readiness_score, verdict, status, analyzed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            repo_name,
            data.get("raw_stars", 0),
            data.get("raw_forks", 0),
            data.get("raw_contributors", 0),
            data.get("trust", 50),
            scores.get("security", 50),
            scores.get("maintenance", 50),
            scores.get("community", 50),
            scores.get("supply", 50),
            data.get("enterpriseReadinessScore", 50),
            data.get("verdict", "REVIEW"),
            data.get("status", "STABLE"),
            datetime.utcnow().isoformat()
        ))
        
        # Save environment decisions
        readiness = data.get("adoptionReadiness", {})
        for env, info in readiness.items():
            cursor.execute("""
                INSERT INTO decision_logs (repo_name, environment, verdict, reasoning, logged_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                repo_name,
                env,
                info.get("verdict", "REVIEW"),
                info.get("reasoning", "No telemetry reasoning."),
                datetime.utcnow().isoformat()
            ))
            
        conn.commit()
    except Exception as e:
        print(f"[DB] Error saving scan: {e}")
    finally:
        conn.close()

def get_scans_summary():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM scanned_repositories ORDER BY analyzed_at DESC")
        repos = [dict(row) for row in cursor.fetchall()]
        
        cursor.execute("""
            SELECT environment, verdict, count(*) as count 
            FROM decision_logs 
            GROUP BY environment, verdict
        """)
        decisions = [dict(row) for row in cursor.fetchall()]
        
        # Total counts
        cursor.execute("SELECT count(*) as count FROM scanned_repositories")
        total_scanned = cursor.fetchone()["count"]
        
        # Average scores
        cursor.execute("""
            SELECT 
                AVG(trust_score) as avg_trust,
                AVG(security_score) as avg_security,
                AVG(maintenance_score) as avg_maintenance,
                AVG(community_score) as avg_community
            FROM scanned_repositories
        """)
        avg_row = cursor.fetchone()
        avg_scores = {
            "trust": round(avg_row["avg_trust"] or 0, 1),
            "security": round(avg_row["avg_security"] or 0, 1),
            "maintenance": round(avg_row["avg_maintenance"] or 0, 1),
            "community": round(avg_row["avg_community"] or 0, 1)
        }
        
        return {
            "repositories": repos,
            "decisions": decisions,
            "totalScanned": total_scanned,
            "avgScores": avg_scores
        }
    except Exception as e:
        print(f"[DB] Error reading summary: {e}")
        return {"repositories": [], "decisions": [], "totalScanned": 0, "avgScores": {}}
    finally:
        conn.close()

# Initialize DB on import
init_db()
