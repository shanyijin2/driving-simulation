import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stepRun, scoreRun, scoreBreakdown, VEHICLES, WEATHER, LIMIT, ROAD_LENGTH } from '../src/physics.js';

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

test('vehicle acceleration and pressure response are distinct', () => {
  const runs = ['sport','suv','van'].map(vehicle => createRun(vehicle));
  for(const run of runs) advance(run,3,false);
  assert.ok(runs[0].speed > runs[1].speed && runs[1].speed > runs[2].speed);
  for(const run of runs){run.speed=40;advance(run,.5,true);}
  assert.ok(runs[2].force > runs[0].force && runs[0].force > runs[1].force);
});

test('wet and icy roads require longer stopping distances at equal starting speed', () => {
  const runs = ['dry','rain','snow'].map(weather => createRun('suv',weather));
  for(const run of runs){run.speed=40;for(let i=0;i<120*90&&!run.outcome;i++)stepRun(run,dt,run.force<1450);}
  for(const run of runs)assert.equal(run.outcome,'stopped');
  assert.ok(runs[2].distance > runs[1].distance && runs[1].distance > runs[0].distance);
});

test('critical braking bonus accrues while moving and pays only for a successful stop', () => {
  const run=createRun();run.speed=40;
  for(let i=0;i<120*60&&!run.outcome;i++)stepRun(run,dt,run.force<1450);
  assert.equal(run.outcome,'stopped');assert.ok(run.criticalTime>0);
  const score=scoreBreakdown(run);
  assert.equal(score.bonus,Math.floor(run.criticalTime*350));assert.equal(scoreRun(run),score.base+score.bonus);
  run.outcome='broken';assert.deepEqual(scoreBreakdown(run),{base:0,bonus:0,total:0});
});

test('low pressure and stationary vehicles cannot farm critical rewards', () => {
  const low=createRun();low.speed=40;advance(low,.5,true);assert.equal(low.criticalTime,0);
  const stationary=createRun();stationary.braking=true;stationary.force=1450;stepRun(stationary,dt,false);
  assert.equal(stationary.criticalTime,0);
});

for(const vehicle of Object.keys(VEHICLES))for(const weather of Object.keys(WEATHER)) {
  test(`${vehicle}/${weather}: controlled braking can win and excessive pressure can fail`, () => {
    const controlled=createRun(vehicle,weather);controlled.speed=40;
    for(let i=0;i<120*120&&!controlled.outcome;i++)stepRun(controlled,dt,controlled.force<1450);
    assert.equal(controlled.outcome,'stopped');assert.ok(scoreRun(controlled)>0);
    const reckless=createRun(vehicle,weather);reckless.speed=40;advance(reckless,3,true);
    assert.equal(reckless.outcome,'broken');assert.equal(scoreRun(reckless),0);
  });
}
