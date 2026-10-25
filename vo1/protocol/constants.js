export const SPIDER0_MAGIC = 0x5350;
export const SPIDER0_VERSION = 1;
export const SIGNING_CONTEXT = 'SPIDER-0-V01-AUTH';
export const TIMESTAMP_DRIFT_SECONDS = 120;

export const MessageType = Object.freeze({
  TELEMETRY: 0x01,
  PRESENCE: 0x02,
  EVENT: 0x03,
  CLUSTER_PRESENCE: 0x04,
});

export const HmiState = Object.freeze({
  GREEN: 0,
  AMBER: 1,
  RED: 2,
});

export const OperatingMode = Object.freeze({
  NORMAL: 0,
  CONSERVATION: 1,
  SURVIVAL: 2,
  EMERGENCY: 3,
});

export const CadenceSeconds = Object.freeze({
  [OperatingMode.NORMAL]: { telemetry: 60, heartbeat: 300 },
  [OperatingMode.CONSERVATION]: { telemetry: 300, heartbeat: 900 },
  [OperatingMode.SURVIVAL]: { telemetry: 900, heartbeat: 1800 },
  [OperatingMode.EMERGENCY]: { telemetry: 0, heartbeat: 30 },
});

export const FaultBit = Object.freeze({
  BATT_OVERTEMP: 0,
  BATT_UNDERTEMP: 1,
  PV_ZERO_DAYLIGHT: 2,
  CANOPY_UNLATCHED: 3,
  ANCHOR_DISPLACED: 4,
  COMMS_LOST: 5,
  TEMP_HAB_UNSAFE: 6,
  CONDENSATION_RISK: 7,
  POWER_OVERLOAD: 8,
  EMERGENCY_DISCON: 9,
});

export const RESERVED_FAULT_MASK = 0xfc00;
export const SIGNATURE_BYTES = 64;

export function assertFaultRegister(faults) {
  if (!Number.isInteger(faults) || faults < 0 || faults > 0xffff) {
    throw new RangeError('TELE-012 must be uint16');
  }
  if ((faults & RESERVED_FAULT_MASK) !== 0) {
    throw new Error('TELE-012 reserved bits 10-15 must remain zero');
  }
}

export function validateReplay(seq, highestAccepted) {
  if (!Number.isInteger(seq) || seq < 0) throw new RangeError('seq must be uint');
  return seq > highestAccepted;
}

export function validateTimestamp(timestamp, networkTime, drift = TIMESTAMP_DRIFT_SECONDS) {
  if (!Number.isInteger(timestamp) || !Number.isInteger(networkTime)) {
    throw new RangeError('timestamps must be integer epoch seconds');
  }
  return Math.abs(timestamp - networkTime) <= drift;
}
