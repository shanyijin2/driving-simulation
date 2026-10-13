import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stepRun, scoreRun, LIMIT, ROAD_LENGTH } from '../src/physics.js';

const dt = 1 / 120;
function advance(run, seconds, pressed) {
  for (let i = 0; i < seconds / dt && !run.outcome; i++) stepRun(run, dt, pressed);
}
test('braking is locked below 100 km/h', () => {
  const run = createRun(); advance(run, 1, true);
  assert.equal(run.braking, false); assert.equal(run.force, 0);
  assert.ok(run.speed > 0);
});
test('first press cuts power even after releasing the pedal', () => {
  const run = createRun(); advance(run, 5, false); stepRun(run, dt, true);
  const speed = run.speed; advance(run, 1, false);
  assert.ok(run.braking); assert.ok(run.speed < speed); assert.equal(run.force, 0);
});
test('continuous excessive pressure breaks the pedal', () => {
  const run = createRun(); advance(run, 12, false); advance(run, 3, true);
  assert.equal(run.outcome, 'broken'); assert.equal(run.maxForce, LIMIT);
  assert.equal(scoreRun(run), 0);
});
test('controlled pressure stops the car and earns a score', () => {
  const run = createRun(); advance(run, 8, false);
  for (let i = 0; i < 120 * 60 && !run.outcome; i++) stepRun(run, dt, run.force < 1350);
  assert.equal(run.outcome, 'stopped'); assert.equal(run.speed, 0);
  assert.ok(scoreRun(run) > 0); assert.ok(run.maxForce < LIMIT);
  assert.ok(run.distance - run.brakeStart > 0); assert.ok(run.history.length > 0);
});
test('missing the braking window hits the roadblock', () => {
  const run = createRun(); advance(run, 90, false);
  assert.equal(run.outcome, 'crash'); assert.ok(run.distance >= ROAD_LENGTH - 2.7);
});
test('finished runs no longer change', () => {
  const run = createRun(); advance(run, 90, false);
  const snapshot = structuredClone(run); stepRun(run, 1, true);
  assert.deepEqual(run, snapshot);
});
