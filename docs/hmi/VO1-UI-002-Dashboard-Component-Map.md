# VO1-UI-002 Dashboard Component Map

The dashboard is a read-only presentation layer over the SPIDER-0 decoder and digital-twin result contracts.

| Component | Source | Primary state |
|---|---|---|
| Structure / Level 0 | geometry status | zinc / green |
| Level 1 Structural FEA | simulation result | green / amber / red |
| Level 2 Solar Optical Yield | simulation result | green / amber |
| Level 3 Thermal / CFD | simulation result | green / amber / red |
| Level 4 Power / Battery | SPIDER-0 telemetry | green / amber / red |
| Field Repair / Part QR | asset registry | sky / zinc |
| Sovereign Deployment Charter | charter status | zinc / amber |
| Communications | SPIDER-0 presence | sky |
| Fault feed | TELE-012 | amber / red |

## HMI state tokens

- Green = nominal / energy-positive
- Amber = attention / reduced margin
- Red = fault / protective action
- Blue = telemetry / communications activity
- Zinc = structural or informational state

## Authority rule

No UI action may mutate a simulation pass/fail result or fabricate a telemetry value. Operator controls may request actions only through an explicitly authorized future command interface; this repository currently defines telemetry as read-only.
