# Store Network Flap

## Pattern ID
`store_network_flap`

## Symptoms
- `NET_LINK_FLAP` or `PACKET_LOSS_HIGH` in `store-network` logs
- Multiple services failing simultaneously (payment, loyalty, promo)
- BGP session drops between store router and DC
- Intermittent connectivity — devices cycling online/offline

## Probable Causes
1. ISP line instability or upstream outage
2. Core switch port failure or SFP transceiver fault
3. Power fluctuation causing switch reboot
4. VLAN misconfiguration after recent network change

## First Actions
1. **Check store network dashboard** — NetOps portal → Store Network → [Store ID] → Link Status
2. **Verify physical connections** — check core-sw-01 port LEDs in comms room
3. **Test connectivity from NOC** — `ping -c 20 store-gw-{store_id}.net.internal`
4. **Initiate ISP fault report** — call ISP NOC line (number in runbook portal → Contacts → ISP NOC)

## Escalation Path
- **L1 Store Support** → document impacted services, check physical layer
- **L2 Network Operations** → switch-level diagnostics, ISP liaison
- **L3 Network Engineering** → BGP reconfiguration, hardware swap

## Business Continuity (Sev1)
> ⚠️ If store network is fully down: Activate **standalone mode** on POS systems (offline payment pre-auth). Notify store manager. Page Network Operations immediately.

## Resolution Verification
- `NET_LINK_FLAP` events cease in monitoring
- Packet loss returns to <0.1%
- All store services reconnect and pass health checks

## Related Runbooks
- Payment Gateway Timeout (cascade symptom)
- Store Standalone Mode Procedure
