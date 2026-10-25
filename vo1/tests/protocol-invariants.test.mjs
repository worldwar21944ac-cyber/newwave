import assert from 'node:assert/strict';
import {
  MessageType,
  HmiState,
  OperatingMode,
  assertFaultRegister,
  validateReplay,
  validateTimestamp,
} from '../protocol/constants.js';

assert.equal(MessageType.TELEMETRY, 1);
assert.equal(MessageType.PRESENCE, 2);
assert.equal(MessageType.EVENT, 3);
assert.equal(MessageType.CLUSTER_PRESENCE, 4);
assert.doesNotThrow(() => assertFaultRegister(0));
assert.throws(() => assertFaultRegister(0x400));
assert.equal(validateReplay(1043, 1042), true);
assert.equal(validateReplay(1042, 1042), false);
assert.equal(validateTimestamp(1000, 1120), true);
assert.equal(validateTimestamp(1000, 1121), false);
assert.equal(HmiState.GREEN, 0);
assert.equal(HmiState.AMBER, 1);
assert.equal(HmiState.RED, 2);
assert.equal(OperatingMode.NORMAL, 0);
assert.equal(OperatingMode.EMERGENCY, 3);
console.log('SPIDER-0 protocol invariants: PASS');
