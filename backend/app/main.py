
from fastapi import FastAPI
from ingestion import load_data
from retrieval import retrieve_runbooks
from triage import triage

app = FastAPI(title="StorePulse AI")
incidents, logs, runbooks = load_data()

@app.post("/triage")
def triage_incident(incident: dict):
    query = incident["service"] + " " + incident["symptoms"]
    top_runbooks = retrieve_runbooks(query, runbooks)
    return triage(incident, logs, top_runbooks)
