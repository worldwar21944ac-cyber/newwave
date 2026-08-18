# VO-1 / SPIDER-0 Repository Foundation

This tree establishes the software-side foundation for the VO-1 digital twin telemetry stack.

## Authority

- `docs/telemetry/SPIDER-0-SPEC-002.md` — governing wire-protocol specification as received.
- The digital twin remains authoritative for simulation pass/fail.
- Telemetry and HMI code are display/transport layers and must not override simulation authority.
- No file in this tree authorizes physical fabrication or radio deployment.

## Structure

```text
vo1/
├── hmi/                         # React/Tailwind operator interface contract
├── protocol/                    # SPIDER-0 wire types, constants, validation
├── telemetry/                   # runtime decoding/normalization boundary
├── tests/                       # protocol/conformance tests and golden vectors
└── schemas/                     # machine-readable protocol contracts

docs/
├── telemetry/                   # accepted protocol specifications
├── hmi/                         # HMI sign/state language and component map
├── simulation/                  # simulation plans and result contracts
└── deployment/                  # deployment charter and authority gates
```

## Important conformance note

The supplied SPIDER-0 document contains example wire bytes that should not yet be treated as an RFC 8949 deterministic-CBOR golden vector. RFC 8949 deterministic map ordering is applied by encoded-key length and then bytewise value. The supplied prose/hex uses a different field ordering, and the stated `payload_len` should be independently verified. This repository therefore records the received specification while keeping executable golden-vector acceptance explicitly pending conformance review.
