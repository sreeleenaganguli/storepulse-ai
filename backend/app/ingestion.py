
import json, os

def load_data():
    with open("app/data/incidents.jsonl") as f:
        incidents = [json.loads(line) for line in f]
    with open("app/data/logs.jsonl") as f:
        logs = [json.loads(line) for line in f]
    runbooks = []
    for file in os.listdir("app/data/runbooks"):
        with open(f"app/data/runbooks/{file}") as f:
            runbooks.append({
                "name": file,
                "content": f.read(),
                "first_actions": [
                    "Check gateway status",
                    "Enable fallback payments",
                    "Escalate if >5 units"
                ]
            })
    return incidents, logs, runbooks
