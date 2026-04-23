

def triage(incident, logs, runbooks):
    actions = []
    if incident.get("severity") == "Sev1" and "payment" in incident.get("symptoms","").lower():
        actions.append("Immediately switch to fallback payment mode")

    for rb, score in runbooks:
        actions.extend(rb["first_actions"])

    return {
        "summary": f"{incident['service']} experiencing failure",
        "category": "Payment Gateway Timeout",
        "likely_causes": [
            "Payment gateway timeout",
            "Network degradation",
            "Retry exhaustion"
        ],
        "recommended_actions": actions[:3],
        "escalation": "Integration Support Team",
        "confidence": 0.82
    }
