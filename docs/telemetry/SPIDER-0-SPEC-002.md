# SPIDER-0-SPEC-002 v0.1

**Document ID:** SPIDER-0-SPEC-002 v0.1  
**Parent:** SPIDER-0-SCHEMA-001-CDDL v0.1 / VO-1 SRD v1.0  
**Layer:** Layer 3 — Signs / HMI & Telemetry  
**Status:** Accepted baseline; wire format frozen pending conformance testing  
**Physical authorization:** None

## Purpose

SPIDER-0 defines the deterministic telemetry fabric between a VO-1 station, field gateways, the digital twin, and the operator HMI.

### Wire baseline

- Deterministic CBOR, RFC 8949 §4.2.
- Integer-only fixed-point sensor representation.
- Ed25519 signatures with VO-1 context separation `SPIDER-0-V01-AUTH`.
- Monotonic sequence replay gate.
- ±120 second timestamp drift gate, with quarantine for skewed frames.
- Adaptive telemetry cadence based on operational mode.
- TELE-012 16-bit fault register.

## Message classes

| Type | Name | Purpose |
|---:|---|---|
| `0x01` | Telemetry | Periodic instantaneous sensor vector |
| `0x02` | Presence | Heartbeat / route presence |
| `0x03` | Event | Immediate fault or priority event |
| `0x04` | Cluster Presence | Aggregated multi-node presence |

## Telemetry payload keys

| Key | Field | Encoding |
|---:|---|---|
| 1 | Internal temperature | °C × 10 |
| 2 | External temperature | °C × 10 |
| 3 | Internal humidity | % RH |
| 4 | Battery SoC | % |
| 5 | PV input power | W |
| 6 | PV daily yield | Wh |
| 7 | System load | W |
| 8 | Battery temperature | °C × 10 |
| 9 | Canopy latch | `0/1` |
| 10 | Ground anchoring | `0/1` |
| 11 | Communications link | enum |
| 12 | TELE-012 faults | uint16 |
| 13 | HMI primary state | enum |

## Operational cadence

| Mode | HMI | Telemetry | Heartbeat |
|---:|---|---:|---:|
| 0 Normal | Green | 60 s | 300 s |
| 1 Conservation | Amber | 300 s | 900 s |
| 2 Survival | Amber | 900 s | 1800 s |
| 3 Emergency | Red | Immediate | 30 s continuous |

Priority-0 edge events preempt scheduled telemetry.

## Cryptographic boundary

The signing input is:

```text
ASCII("SPIDER-0-V01-AUTH") || SHA-256(canonical-envelope-without-signature)
```

The signature is a detached 64-byte Ed25519 signature. Public-key resolution is external to the wire format and must use the node identity/certificate authority defined by the deployment environment.

## Replay / time gates

A receiver accepts a frame only when its sequence is strictly greater than the highest accepted sequence for that node. A timestamp outside the configured ±120 s window is quarantined rather than silently accepted.

## TELE-012 fault register

Bits 0–9 are assigned; bits 10–15 are reserved and must remain zero.

- 0 Battery overtemperature
- 1 Battery undertemperature
- 2 PV zero in daylight
- 3 Canopy unlatched
- 4 Anchor displaced
- 5 Communications lost
- 6 Habitat temperature unsafe
- 7 Condensation risk
- 8 Power overload
- 9 Emergency disconnect

## Conformance status

The received diagnostic examples are stored as **source examples**, not yet as accepted canonical golden vectors. Independent encoding/decoding tests must establish the exact canonical bytes before firmware or hardware implementation treats them as normative.
