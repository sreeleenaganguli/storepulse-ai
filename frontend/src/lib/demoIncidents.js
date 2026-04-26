export const DEMO_INCIDENTS = [
  {
    label: "💳 Payment Timeout",
    color: "error",
    incident: {
      incident_id: "INC-SCO-20241115-0019",
      service: "pos-payment",
      severity: "Sev1",
      symptoms: "Payment retries failing on 18 SCO units across Store 104; customers unable to complete basket at card reader. GW_TIMEOUT_503 flooding logs.",
      created: "2024-11-15T13:22:00Z",
    },
  },
  {
    label: "🖨️ Receipt Printer",
    color: "warning",
    incident: {
      incident_id: "INC-RCP-20241108-0041",
      service: "receipt-service",
      severity: "Sev2",
      symptoms: "Receipt printers offline on 12 tills in Store 217. Customers not receiving paper receipts after payment. PRINTER_OFFLINE_ERR across lanes 3-14.",
      created: "2024-11-08T09:15:00Z",
    },
  },
  {
    label: "📷 Barcode Scanner",
    color: "warning",
    incident: {
      incident_id: "INC-SCN-20241201-0007",
      service: "scan-service",
      severity: "Sev2",
      symptoms: "Barcode scanners on 8 SCO units not registering items. USB enum failure on multiple lanes. SCAN_DEVICE_LOST errors appearing.",
      created: "2024-12-01T11:05:00Z",
    },
  },
  {
    label: "🎁 Loyalty API Down",
    color: "primary",
    incident: {
      incident_id: "INC-LOY-20241120-0033",
      service: "loyalty-api",
      severity: "Sev2",
      symptoms: "Loyalty points not being awarded at checkout across all stores. Customer profile lookups timing out. LOYALTY_API_503 in multiple services.",
      created: "2024-11-20T16:30:00Z",
    },
  },
  {
    label: "⚡ Promo Engine Lag",
    color: "primary",
    incident: {
      incident_id: "INC-PRO-20241125-0018",
      service: "promo-engine",
      severity: "Sev3",
      symptoms: "Promotion calculations taking >8s at checkout. Basket evaluation timeouts causing delayed receipts. Peak trading period — Black Friday.",
      created: "2024-11-25T10:00:00Z",
    },
  },
  {
    label: "🌐 Network Flap",
    color: "error",
    incident: {
      incident_id: "INC-NET-20241130-0055",
      service: "store-network",
      severity: "Sev1",
      symptoms: "Store network flapping on Store 089 — intermittent connectivity drops affecting all services. Payment symptoms visible but root cause is network switch.",
      created: "2024-11-30T22:10:00Z",
    },
  },
];
