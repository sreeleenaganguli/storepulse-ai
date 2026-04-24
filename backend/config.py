"""Central configuration — Gemini-only edition (single API key)."""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Paths ────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
DATA_DIR   = BASE_DIR / "data"
CHROMA_DIR = BASE_DIR / "chroma_db"
AUDIT_FILE = BASE_DIR / "audit.jsonl"
CACHE_FILE = BASE_DIR / "embed_cache.json"

# ── API Keys ─────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# ── Model names — personal laptop (free tier, flash only) ─────────────────────
MODEL_INGESTOR       = "gemini-2.5-flash"   # working ✅
MODEL_DIAGNOSTICIAN  = "gemini-2.5-flash"   # working ✅
MODEL_DIAG_FALLBACK  = "gemini-2.5-flash"   # same — only one working
MODEL_PLANNER        = "gemini-2.5-flash"   # working ✅
MODEL_FAST           = "gemini-2.5-flash"   # working ✅

# # ── Model names (Gemini-only) ─────────────────────────────────────────────
# MODEL_INGESTOR      = "gemini-2.5-flash-lite"   # fast entity extraction
# MODEL_DIAGNOSTICIAN = "gemini-2.5-pro"           # best reasoning available
# MODEL_DIAG_FALLBACK = "gemini-1.5-pro"           # fallback if 2.5-pro quota hit
# MODEL_PLANNER       = "gemini-2.5-flash"         # fast + instruction-following
# MODEL_FAST          = "gemini-2.5-flash-lite"    # validator / quick calls

# # config.py — optimised for free Gemini API tier
# MODEL_INGESTOR       = "gemini-2.0-flash-001"    # fastest, cheapest, great for JSON extraction
# MODEL_DIAGNOSTICIAN  = "gemini-2.5-pro"           # best reasoning on free tier
# MODEL_DIAG_FALLBACK  = "gemini-2.5-flash"         # fallback if 2.5-pro quota hits
# MODEL_PLANNER        = "gemini-2.5-flash"         # fast + good instruction following
# MODEL_PLANNER_FALLBACK = "gemini-2.0-flash-001"  # last resort

# ── RAG ───────────────────────────────────────────────────────────────────
CHUNK_SIZE             = 1400
CHUNK_OVERLAP          = 160
TOP_K_RUNBOOKS         = 3
TOP_K_INCIDENTS        = 3
RETRIEVAL_MIN_SCORE    = 0.65
MAX_RETRIEVAL_ATTEMPTS = 2
MIN_CONFIDENCE         = 0.50

# ── Mock mode ─────────────────────────────────────────────────────────────
MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"

# ── Error taxonomy per service (conflict detection) ───────────────────────
ERROR_TAXONOMY = {
    "pos-payment":     ["GW_TIMEOUT_503","GW_CONNECT_REFUSED","PAYMENT_SVC_UNAVAILABLE"],
    "sco-ui":          ["GW_TIMEOUT_503","GW_CONNECT_REFUSED","PAYMENT_SVC_UNAVAILABLE",
                        "PRINTER_OFFLINE_ERR","SCAN_DEVICE_LOST"],
    "receipt-service": ["PRINTER_OFFLINE_ERR","CUPS_QUEUE_BLOCKED","RECEIPT_SVC_TIMEOUT"],
    "printer-daemon":  ["PRINTER_OFFLINE_ERR","CUPS_QUEUE_BLOCKED"],
    "scan-service":    ["SCAN_DEVICE_LOST","USB_ENUM_FAILURE","SCAN_DECODE_ERROR"],
    "item-lookup":     ["SCAN_DECODE_ERROR"],
    "loyalty-api":     ["LOYALTY_API_503","LOYALTY_TIMEOUT","CIRCUIT_OPEN"],
    "customer-profile":["LOYALTY_API_503","LOYALTY_TIMEOUT"],
    "promo-engine":    ["PROMO_TIMEOUT","PROMO_ENGINE_CPU_HIGH","BASKET_EVAL_TIMEOUT"],
    "basket-service":  ["PROMO_TIMEOUT","BASKET_EVAL_TIMEOUT"],
    "store-network":   ["NET_LINK_FLAP","PACKET_LOSS_HIGH","SWITCH_PORT_DOWN"],
    "payment-gateway": ["GW_TIMEOUT_503","GW_CONNECT_REFUSED"],
}

PATTERN_MAP = {
    "GW_TIMEOUT_503":         "payment_timeout",
    "GW_CONNECT_REFUSED":     "payment_timeout",
    "PAYMENT_SVC_UNAVAILABLE":"payment_timeout",
    "PRINTER_OFFLINE_ERR":    "receipt_printer_failure",
    "CUPS_QUEUE_BLOCKED":     "receipt_printer_failure",
    "RECEIPT_SVC_TIMEOUT":    "receipt_printer_failure",
    "SCAN_DEVICE_LOST":       "barcode_scanner_issue",
    "USB_ENUM_FAILURE":       "barcode_scanner_issue",
    "SCAN_DECODE_ERROR":      "barcode_scanner_issue",
    "LOYALTY_API_503":        "loyalty_api_unavailable",
    "LOYALTY_TIMEOUT":        "loyalty_api_unavailable",
    "CIRCUIT_OPEN":           "loyalty_api_unavailable",
    "PROMO_TIMEOUT":          "promotion_engine_latency",
    "PROMO_ENGINE_CPU_HIGH":  "promotion_engine_latency",
    "BASKET_EVAL_TIMEOUT":    "promotion_engine_latency",
    "NET_LINK_FLAP":          "store_network_flap",
    "PACKET_LOSS_HIGH":       "store_network_flap",
    "SWITCH_PORT_DOWN":       "store_network_flap",
}

# KNOWN_PATTERNS = list(set(PATTERN_MAP.values()))


# # ── Model names (hackathon multi-provider) ─────────────────────────────────
# MODEL_INGESTOR       = "azure/genailab-maas-gpt-4.1-mini"          # fast + structured JSON
# MODEL_DIAGNOSTICIAN  = "azure_ai/genailab-maas-DeepSeek-R1"        # best reasoning
# MODEL_DIAG_FALLBACK  = "gemini-2.5-pro"                            # fallback reasoning
# MODEL_PLANNER        = "azure/genailab-maas-gpt-4.1"               # best instruction-following
# MODEL_PLANNER_FALLBACK = "azure_ai/genailab-maas-Phi-4-reasoning"  # small but strong
# MODEL_EMBEDDING      = "azure/genailab-maas-text-embedding-3-1arge" # replace current embedder
