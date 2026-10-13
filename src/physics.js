export const LIMIT = 1612;
export const UNLOCK_SPEED = 100 / 3.6;
export const ROAD_LENGTH = 2600;
export const MAX_SPEED = 260 / 3.6;

export function createRun() {
  return { speed: 0, distance: 0, force: 0, maxForce: 0, elapsed: 0,
    braking: false, brakeSpeed: 0, brakeStart: 0, brakeTime: 0, holdTime: 0,
    outcome: null, history: [] };
}

// Speeds are m/s; distance is metres. Cutting power is permanent for this run.
export function stepRun(run, dt, pressed) {
  if (run.outcome) return;
  run.elapsed += dt;
  if (pressed && (run.braking || run.speed >= UNLOCK_SPEED)) {
    if (!run.braking) {
      run.braking = true;
      run.brakeSpeed = run.speed * 3.6;
      run.brakeStart = run.distance;
    }
    run.holdTime += dt;
    run.force = Math.min(LIMIT, run.force + (200 + 800 * run.holdTime) * dt);
  } else {
    run.holdTime = 0;
    run.force = Math.max(0, run.force - 900 * dt);
  }
  run.maxForce = Math.max(run.maxForce, run.force);
  const previousSpeed = run.speed;
  if (run.braking) {
    run.brakeTime += dt;
    const deceleration = 0.15 + 0.00022 * run.speed ** 2 + (run.force / LIMIT) * 10.8;
    run.speed = Math.max(0, run.speed - deceleration * dt);
  } else {
    run.speed = Math.min(MAX_SPEED, run.speed + 7.4 * (1 - (run.speed / MAX_SPEED) ** 1.55) * dt);
  }
  run.distance += (previousSpeed + run.speed) * 0.5 * dt;
  if (run.braking) run.history.push({ time: run.brakeTime, speed: run.speed * 3.6, force: run.force });
  // A broken pedal takes precedence over a stop in the same physics tick.
  if (run.force >= LIMIT) run.outcome = 'broken';
  else if (run.distance >= ROAD_LENGTH - 2.7) run.outcome = 'crash';
  else if (run.braking && run.speed <= 0.08) { run.speed = 0; run.outcome = 'stopped'; }
}

export function scoreRun(run) {
  return run.outcome === 'stopped' ? Math.round(run.brakeSpeed ** 2 / Math.max(run.brakeTime, 0.001)) : 0;
}
