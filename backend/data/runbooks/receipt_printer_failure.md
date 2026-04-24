# Receipt Printer Failure — SCO

## Pattern ID
`receipt_printer_failure`

## Symptoms
- `PRINTER_OFFLINE_ERR` or `CUPS_QUEUE_BLOCKED` in `receipt-service` or `printer-daemon` logs
- Transactions completing successfully but no receipts printing
- CUPS print queue showing jobs stuck in "Processing" or "Stopped" state
- Customers reporting "Receipt failed" message on SCO screen

## Probable Causes
1. Paper jam or empty paper roll in receipt printer
2. CUPS print queue deadlock requiring flush
3. USB connection issue between SCO unit and printer
4. `printer-daemon` service crash

## First Actions
1. **Check physical printer** — inspect paper roll and clear any paper jam
2. **Flush CUPS queue** — SSH to SCO unit, run `sudo cancel -a -x` to purge all jobs
3. **Restart printer daemon** — `sudo systemctl restart cups && sudo systemctl restart receipt-service`
4. **Test print** — issue a test print from SCO admin panel

## Escalation Path
- **L1 Store Support** → physical check, queue flush, service restart
- **L2 Store Systems** → USB hardware replacement, CUPS config review
- **L3 Infrastructure** → persistent daemon crashes may indicate OS-level issue

## Resolution Verification
- Test receipt prints successfully on affected unit
- `receipt-service` logs show successful spool job
- CUPS queue empty and idle

## Related Runbooks
- SCO Hardware Replacement
- CUPS Diagnostic Guide
