# Payment Gateway Timeout — SCO/POS

## Pattern ID
`payment_timeout`

## Symptoms
- Repeated `GW_TIMEOUT_503` or `GW_CONNECT_REFUSED` in `pos-payment` or `payment-gateway` logs
- Customer basket stuck at payment confirmation screen
- POS terminals showing "Processing…" indefinitely
- Multiple checkout lanes affected simultaneously

## Probable Causes
1. Upstream payment gateway service degradation or maintenance
2. Network connectivity loss between store and payment gateway
3. Payment gateway certificate expiry causing TLS handshake failure
4. Overloaded gateway under peak trading conditions

## First Actions
1. **Check gateway status page** — visit the payment provider status dashboard (bookmark in runbook portal)
2. **Switch affected terminals to fallback payment mode** — in POS admin console → Settings → Payment → Enable Fallback
3. **Verify store network** — ping gateway endpoint `pay.gateway.internal` from a POS terminal
4. **Escalate to integration team** if >5 terminals affected or if fallback mode also fails

## Escalation Path
- **L1 Store Support** → attempt fallback mode
- **L2 Integration Support** → check gateway credentials, certificates, firewall rules
- **L3 Payment Engineering** → engage gateway provider incident support (Sev1 bridge)

## Business Continuity (Sev1)
> ⚠️ If severity is Sev1 and payment is impacted: **Immediately activate cash-only checkout mode** on all tills. Notify store manager. Open Sev1 bridge with Payment Engineering within 5 minutes.

## Resolution Verification
- GW_TIMEOUT errors stop appearing in `pos-payment` logs
- Test transaction completes successfully on one terminal before re-enabling all
- Monitor for 10 minutes before declaring resolved

## Related Runbooks
- Store Network Flap (network root cause)
- SCO Restart Procedure
