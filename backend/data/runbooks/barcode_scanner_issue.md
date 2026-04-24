# Barcode Scanner Issue — SCO

## Pattern ID
`barcode_scanner_issue`

## Symptoms
- `SCAN_DEVICE_LOST` or `USB_ENUM_FAILURE` in `scan-service` logs
- Scanner beeps but items not registering on SCO screen
- `hidraw` device disappearing from `/dev/` on SCO unit
- Customers unable to scan items; manual barcode entry required

## Probable Causes
1. USB device disconnected or loose cable
2. USB hub power cycling issue
3. `scan-service` process stuck; device held in bad state
4. Scanner firmware crash requiring power cycle

## First Actions
1. **Check physical USB connection** — unplug and re-plug scanner cable on affected lane
2. **Restart scan-service** — `sudo systemctl restart scan-service`
3. **Force USB re-enumeration** — `sudo udevadm trigger --subsystem-match=usb`
4. **Power cycle scanner** — hold power button 10s, wait 30s, power on

## Escalation Path
- **L1 Store Support** → physical reconnect, service restart
- **L2 Store Systems** → USB hub replacement if multiple scanners affected
- **L3 Hardware Vendor** → firmware update or RMA if unit fails after power cycle

## Resolution Verification
- `/dev/hidraw` device appears in `ls /dev/hidraw*`
- `scan-service` logs show device registered
- Successful scan of a test item

## Related Runbooks
- SCO Hardware Replacement
- USB Peripheral Troubleshooting
