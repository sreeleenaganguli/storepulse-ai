# Promotion Engine Latency

## Pattern ID
`promotion_engine_latency`

## Symptoms
- `PROMO_TIMEOUT` or `BASKET_EVAL_TIMEOUT` in `promo-engine` or `basket-service` logs
- Basket calculation taking >5s at checkout; customers waiting
- promo-engine CPU metrics above 90%
- SCO shows spinner during "Calculating discounts" step

## Probable Causes
1. New promotion rule with unbounded evaluation complexity
2. promo-engine JVM heap exhaustion under load
3. Promotion rule database stale; cache miss storm
4. Concurrent basket evaluations exceeding thread pool capacity

## First Actions
1. **Check promo-engine metrics** — Grafana dashboard → Store Systems → Promotion Engine → CPU/Memory/Queue Depth
2. **Identify slow rule** — `grep PROMO_TIMEOUT /var/log/promo-engine/app.log | sort | uniq -c | sort -rn | head -10`
3. **Restart promo-engine** if CPU >90% sustained — `sudo systemctl restart promo-engine`
4. **Rollback last promotion rule** — Promotion Admin Portal → Rules → View Recent Changes → Rollback

## Escalation Path
- **L1 Store Support** → report symptoms, check SCO impact
- **L2 Store Systems** → service restart, rule identification
- **L3 Promotions Engineering** → rule optimization or emergency rollback

## Resolution Verification
- promo-engine CPU returns below 70%
- Basket evaluation P99 latency <2000ms
- `PROMO_TIMEOUT` errors stop in logs

## Related Runbooks
- Promotion Rule Management
- JVM Heap Dump Procedure
