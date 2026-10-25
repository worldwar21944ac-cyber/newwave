export const telemetryPayloadKeys = Object.freeze({
  internalTempC10: 1,
  externalTempC10: 2,
  internalHumidityPct: 3,
  batterySocPct: 4,
  pvInputW: 5,
  pvDailyWh: 6,
  systemLoadW: 7,
  batteryTempC10: 8,
  canopyLatch: 9,
  groundAnchoring: 10,
  commsLink: 11,
  faults: 12,
  hmiState: 13,
});

export function decodeTelemetryPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new TypeError('payload must be an object');
  return {
    internalTempC: payload[1] / 10,
    externalTempC: payload[2] / 10,
    internalHumidityPct: payload[3],
    batterySocPct: payload[4],
    pvInputW: payload[5],
    pvDailyWh: payload[6],
    systemLoadW: payload[7],
    batteryTempC: payload[8] / 10,
    canopyLatch: payload[9],
    groundAnchoring: payload[10],
    commsLink: payload[11],
    faults: payload[12],
    hmiState: payload[13],
  };
}

export function toHmiPresentation(telemetry) {
  const faulted = telemetry.faults !== 0;
  return {
    ...telemetry,
    primaryState: faulted ? 'red' : telemetry.hmiState === 1 ? 'amber' : 'green',
  };
}
