# VO1-CHARTER-001 v0.1 — Sovereign Deployment Charter

**Status:** Draft / non-authorizing.

## Authority hierarchy

1. Digital twin simulation authority.
2. Approved engineering specifications and schemas.
3. Telemetry transport and validation layer.
4. HMI presentation layer.

A lower layer cannot override a higher layer's result.

## Deployment boundary

This charter defines software governance only. It does not authorize fabrication, procurement, radio activation, field deployment, or energization.

## Data custody

- Telemetry is accepted only after protocol validation.
- Node identity and public-key resolution are deployment-controlled.
- Signature failures, replayed sequences, and timestamp-skewed frames are rejected or quarantined according to the receiver policy.
- Simulation results are immutable from the HMI.

## Freeze requirements

Before any physical deployment decision, the project must separately approve:

- CBOR conformance vectors.
- Cryptographic signing/verification tests.
- Digital-twin simulation gates.
- Electrical/thermal/structural reviews.
- Field safety and deployment procedures.

## Current status

SPIDER-0 is software specification only. Physical radio and firmware remain unauthorized.
