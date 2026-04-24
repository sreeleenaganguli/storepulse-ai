# Loyalty API Unavailable

## Pattern ID
`loyalty_api_unavailable`

## Symptoms
- `LOYALTY_API_503` or `CIRCUIT_OPEN` in `loyalty-api` or `customer-profile` logs
- Loyalty points not applying at checkout
- Circuit breaker tripped: "Circuit breaker OPEN" messages in logs
- SCO shows "Loyalty unavailable" banner

## Probable Causes
1. Loyalty API service deployment or maintenance window
2. Database connection pool exhaustion in loyalty service
3. Network partition between store network and loyalty API cluster
4. Loyalty API overloaded during peak trading (Black Friday, etc.)

## First Actions
1. **Check loyalty API health dashboard** — URL in runbook portal → External Services → Loyalty
2. **Enable offline loyalty cache mode** — in store config portal → Loyalty → Enable Cache Fallback
3. **Reset circuit breaker** — `curl -X POST http://loyalty-api.internal/actuator/circuitbreakers/reset`
4. **Check network connectivity** — `curl -I https://loyalty-api.internal/health`

## Escalation Path
- **L1 Store Support** → enable cache fallback
- **L2 Integration Support** → circuit breaker reset, API key validation
- **L3 Loyalty Engineering** → service-level investigation

## Business Note
Transactions must still complete. Loyalty points can be credited retrospectively from transaction logs. Communicate to customers that points will be applied within 24h.

## Resolution Verification
- Loyalty API health endpoint returns HTTP 200
- Circuit breaker state returns to CLOSED
- Test transaction shows loyalty points applied

## Related Runbooks
- Store Network Flap
- Offline Cache Procedures
