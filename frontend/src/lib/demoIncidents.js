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
      log_snippet: `2024-11-15T13:21:44Z ERROR pos-payment Gateway connection timed out after 30s; retry 3/3 failed [GW_TIMEOUT_503]
2024-11-15T13:21:47Z ERROR pos-payment Gateway connection timed out after 30s; retry 3/3 failed [GW_TIMEOUT_503]
2024-11-15T13:22:01Z WARN  sco-ui Payment service returning 503 — customer basket held [PAYMENT_SVC_UNAVAILABLE]
2024-11-15T13:22:15Z ERROR pos-payment Circuit breaker OPEN — all gateway connections halted [GW_TIMEOUT_503]
2024-11-15T13:22:18Z WARN  sco-ui Retry queue depth: 47 pending transactions [PAYMENT_SVC_UNAVAILABLE]`,
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
      log_snippet: `2024-11-08T09:14:32Z ERROR receipt-service Printer device not responding on lane-03 [PRINTER_OFFLINE_ERR]
2024-11-08T09:14:35Z ERROR receipt-service Printer device not responding on lane-04 [PRINTER_OFFLINE_ERR]
2024-11-08T09:14:40Z WARN  printer-daemon CUPS queue blocked — 23 jobs pending [CUPS_QUEUE_BLOCKED]
2024-11-08T09:14:55Z ERROR receipt-service Receipt print timeout after 10s on lane-05 [RECEIPT_SVC_TIMEOUT]`,
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
      log_snippet: `2024-12-01T11:04:45Z ERROR scan-service USB device enumeration failed on lane-02 [USB_ENUM_FAILURE]
2024-12-01T11:04:48Z ERROR scan-service Scanner device lost — no response [SCAN_DEVICE_LOST]
2024-12-01T11:04:52Z WARN  item-lookup Scan decode error — item not found [SCAN_DECODE_ERROR]
2024-12-01T11:05:01Z ERROR scan-service USB device enumeration failed on lane-06 [USB_ENUM_FAILURE]`,
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
      log_snippet: `2024-11-20T16:29:50Z ERROR loyalty-api Loyalty service returned 503 [LOYALTY_API_503]
2024-11-20T16:29:55Z ERROR customer-profile Loyalty lookup timeout after 5s [LOYALTY_TIMEOUT]
2024-11-20T16:30:02Z WARN  loyalty-api Circuit breaker OPEN after 5 consecutive failures [CIRCUIT_OPEN]
2024-11-20T16:30:10Z ERROR loyalty-api Loyalty service returned 503 [LOYALTY_API_503]`,
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
      log_snippet: `2024-11-25T09:59:40Z WARN  promo-engine Basket evaluation latency: 7200ms [PROMO_TIMEOUT]
2024-11-25T09:59:55Z ERROR promo-engine CPU utilisation at 94% — promotion engine degraded [PROMO_ENGINE_CPU_HIGH]
2024-11-25T10:00:05Z ERROR basket-service Basket evaluation timeout after 8s [BASKET_EVAL_TIMEOUT]
2024-11-25T10:00:12Z WARN  promo-engine Queue depth 312 — processing backlog [PROMO_TIMEOUT]`,
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
      log_snippet: `2024-11-30T22:09:30Z ERROR store-network Link flap detected on switch port ge-0/0/4 [NET_LINK_FLAP]
2024-11-30T22:09:35Z WARN  store-network Packet loss 34% on uplink [PACKET_LOSS_HIGH]
2024-11-30T22:09:40Z ERROR store-network Switch port down — failover in progress [SWITCH_PORT_DOWN]
2024-11-30T22:09:50Z ERROR pos-payment Gateway connection timed out after 30s [GW_TIMEOUT_503]`,
    },
  },
];
