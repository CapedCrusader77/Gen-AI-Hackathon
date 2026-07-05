from copy import deepcopy

def recalculate_simulation(base_data: dict, flags: dict) -> dict:
    """
    Simulates threats and recalculates all trust scores and verdicts.
    flags: {
      "maintainer_leaves": bool,
      "releases_stop": bool,
      "critical_cve": bool,
      "activity_drops": bool,
      "dependency_compromised": bool
    }
    """
    sim_data = deepcopy(base_data)
    
    # Extract baseline scores
    scores = sim_data.get("scores", {})
    sec = scores.get("security", 50)
    maint = scores.get("maintenance", 50)
    comm = scores.get("community", 50)
    supply = scores.get("supply", 50)
    doc = scores.get("documentation", 95)
    
    impact_text = []
    
    # 1. Maintainer Leaves Impact
    if flags.get("maintainer_leaves"):
        comm = max(10, comm - 35)
        maint = max(10, maint - 15)
        impact_text.append("Core developer departure increases the repository bus factor and decelerates issue triage.")
        
    # 2. Releases Stop Impact
    if flags.get("releases_stop"):
        maint = max(5, maint - 40)
        impact_text.append("Release freeze raises maintenance warnings and indicates project stagnation.")
        
    # 3. Critical CVE Appears Impact
    if flags.get("critical_cve"):
        sec = max(5, sec - 45)
        supply = max(10, supply - 20)
        impact_text.append("Critical CVE (CVSS 9.8) detected. Exposed vulnerability requires immediate architectural review.")
        
    # 4. Contributor Activity Drops Impact
    if flags.get("activity_drops"):
        comm = max(10, comm - 20)
        maint = max(10, maint - 20)
        impact_text.append("50% decrease in commit volume indicates maintainer burnout.")
        
    # 5. Dependency Compromised Impact
    if flags.get("dependency_compromised"):
        supply = max(5, supply - 55)
        sec = max(5, sec - 25)
        impact_text.append("Direct dependency registry version compromised. Malicious supply chain payload active.")

    # Recalculate average trust score
    # Base risk recalculated
    sim_data["scores"]["security"] = sec
    sim_data["scores"]["maintenance"] = maint
    sim_data["scores"]["community"] = comm
    sim_data["scores"]["supply"] = supply
    
    # Trust recalculation
    avg_trust = round((sec * 0.35) + (maint * 0.25) + (comm * 0.20) + (supply * 0.20))
    sim_data["trust"] = avg_trust
    sim_data["scores"]["trust"] = avg_trust
    
    # Status badges
    sim_data["status"] = "STRONG" if avg_trust >= 80 else "MODERATE" if avg_trust >= 55 else "FRAGILE"
    
    # Recalculate compliance environment verdicts
    readiness = {}
    
    # Decision Helper
    def get_verdict(score, min_score, name):
        if score >= min_score:
            return "APPROVED", f"Telemetry thresholds satisfied for {name} profile."
        elif score >= max(10, min_score - 20):
            return "APPROVED WITH REVIEW", f"Minor compliance warnings for {name}. Review suggested."
        elif score >= max(5, min_score - 40):
            return "RESTRICT", f"Severe telemetry drift under {name}. Restrict deployment."
        else:
            return "REJECTED", f"Fails mandatory security and stability gates for {name}."
            
    # Tailored environments
    readiness["personal"] = {
        "verdict": get_verdict(avg_trust, 40, "Personal Projects")[0],
        "reasoning": get_verdict(avg_trust, 40, "Personal Projects")[1]
    }
    readiness["startup"] = {
        "verdict": get_verdict(avg_trust, 55, "Startup MVP")[0],
        "reasoning": get_verdict(avg_trust, 55, "Startup MVP")[1]
    }
    readiness["enterprise"] = {
        "verdict": get_verdict(avg_trust, 70, "Internal Enterprise")[0],
        "reasoning": get_verdict(avg_trust, 70, "Internal Enterprise")[1]
    }
    readiness["saas"] = {
        "verdict": get_verdict(avg_trust, 75, "Production SaaS")[0],
        "reasoning": get_verdict(avg_trust, 75, "Production SaaS")[1]
    }
    
    # Banking, Healthcare, Government require high security
    bank_score = min(avg_trust, sec)
    health_score = min(avg_trust, sec)
    gov_score = min(avg_trust, sec)
    
    readiness["banking"] = {
        "verdict": get_verdict(bank_score, 85, "Banking")[0],
        "reasoning": get_verdict(bank_score, 85, "Banking")[1]
    }
    readiness["healthcare"] = {
        "verdict": get_verdict(health_score, 85, "Healthcare")[0],
        "reasoning": get_verdict(health_score, 85, "Healthcare")[1]
    }
    readiness["government"] = {
        "verdict": get_verdict(gov_score, 90, "Government")[0],
        "reasoning": get_verdict(gov_score, 90, "Government")[1]
    }
    
    sim_data["adoptionReadiness"] = readiness
    
    # Recalculate global decision verdict
    global_verdict = "APPROVE" if avg_trust >= 80 else "REVIEW" if avg_trust >= 55 else "RESTRICT" if avg_trust >= 40 else "REJECT"
    sim_data["verdict"] = global_verdict
    
    # Recalculate enterprise readiness score
    has_policy = sim_data.get("has_security_policy", False) and not flags.get("critical_cve")
    has_lock = sim_data.get("has_lockfile", False) and not flags.get("dependency_compromised")
    contribs = sim_data.get("contributors", 10)
    if flags.get("maintainer_leaves"):
        contribs = max(1, contribs - 5)
        
    readiness_score = int(
        (25 if has_policy else 0) +
        (15 if sim_data.get("has_license") else 0) +
        (20 if has_lock else 0) +
        min(40, (contribs / 100) * 40)
    )
    sim_data["enterpriseReadinessScore"] = max(5, readiness_score)
    
    # Summary of impact
    if not impact_text:
        summary_bullet = "Digital twin runs in a nominal state. Toggles represent simulated threats."
    else:
        summary_bullet = " | ".join(impact_text)
        
    sim_data["sim_summary"] = summary_bullet
    
    # Recalculate Future Viability Time Machine forecasts
    sim_data["timeMachine"] = {
        "pastTrust": { "score": min(100, int(avg_trust * 1.05)), "date": "12 months ago", "reason": "Nominal baseline reference." },
        "presentTrust": { "score": avg_trust, "date": "Today (Simulated)", "reason": "Reflects simulated disruptions." },
        "futureTrust": { "score": max(5, int(avg_trust - (25 if flags.get("releases_stop") or flags.get("maintainer_leaves") else 10))), "date": "12 months from now", "reason": "Forecasted decay under simulated conditions." },
        "trendReasoning": f"Simulated trajectory curves downward with a forecast score of {max(5, int(avg_trust - (25 if flags.get("releases_stop") or flags.get("maintainer_leaves") else 10)))}."
    }
    
    return sim_data
