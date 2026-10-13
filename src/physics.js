export const LIMIT = 1612;
export const UNLOCK_SPEED = 100 / 3.6;
export const ROAD_LENGTH = 2600;
export const MAX_SPEED = 260 / 3.6;
export const CRITICAL_RATIO = 0.85;
export const VEHICLES = {
  suv: { name: '重型 SUV', model: 'V800', maxSpeed: 260 / 3.6, acceleration: 7.4, deceleration: 10.8, pressure: 1, release: 900, note: '稳重扎实 · 制动均衡' },
  sport: { name: '轻型跑车', model: 'R9', maxSpeed: 310 / 3.6, acceleration: 11.6, deceleration: 15, pressure: 1.12, release: 1100, note: '加速凶猛 · 刹车灵敏' },
  van: { name: '老旧面包车', model: '老伙计', maxSpeed: 180 / 3.6, acceleration: 5.1, deceleration: 7.8, pressure: 1.3, release: 650, note: '动力温和 · 踏板难伺候' },
};
export const WEATHER = {
  dry: { name: '晴天', grip: 1, note: '干燥路面，抓地稳定' },
  rain: { name: '雨天', grip: 0.7, note: '湿滑路面，提前制动' },
  snow: { name: '冰雪', grip: 0.38, note: '抓地骤降，停车距离更长' },
};

export function createRun(vehicle = 'suv', weather = 'dry') {
  if (!VEHICLES[vehicle] || !WEATHER[weather]) throw new Error('Unknown vehicle or weather');
  return { speed: 0, distance: 0, force: 0, maxForce: 0, elapsed: 0,
    braking: false, brakeSpeed: 0, brakeStart: 0, brakeTime: 0, holdTime: 0,
    vehicle, weather, criticalTime: 0,
    outcome: null, history: [] };
}

// Speeds are m/s; distance is metres. Cutting power is permanent for this run.
export function stepRun(run, dt, pressed) {
  if (run.outcome) return;
  const vehicle = VEHICLES[run.vehicle], weather = WEATHER[run.weather];
  run.elapsed += dt;
  if (pressed && (run.braking || run.speed >= UNLOCK_SPEED)) {
    if (!run.braking) {
      run.braking = true;
      run.brakeSpeed = run.speed * 3.6;
      run.brakeStart = run.distance;
    }
    run.holdTime += dt;
    run.force = Math.min(LIMIT, run.force + (200 + 800 * run.holdTime) * vehicle.pressure * dt);
  } else {
    run.holdTime = 0;
    run.force = Math.max(0, run.force - vehicle.release * dt);
  }
  run.maxForce = Math.max(run.maxForce, run.force);
  const previousSpeed = run.speed;
  if (run.braking) {
    run.brakeTime += dt;
    const deceleration = 0.15 + 0.00022 * run.speed ** 2 + (run.force / LIMIT) * vehicle.deceleration * weather.grip;
    run.speed = Math.max(0, run.speed - deceleration * dt);
  } else {
    run.speed = Math.min(vehicle.maxSpeed, run.speed + vehicle.acceleration * (1 - (run.speed / vehicle.maxSpeed) ** 1.55) * dt);
  }
  run.distance += (previousSpeed + run.speed) * 0.5 * dt;
  if (run.braking) run.history.push({ time: run.brakeTime, speed: run.speed * 3.6, force: run.force });
  // A broken pedal takes precedence over a stop in the same physics tick.
  if (run.force >= LIMIT) run.outcome = 'broken';
  else if (run.distance >= ROAD_LENGTH - 2.7) run.outcome = 'crash';
  else if (run.braking && run.speed <= 0.08) { run.speed = 0; run.outcome = 'stopped'; }
  if (run.braking && previousSpeed > 1 && run.force >= LIMIT * CRITICAL_RATIO && run.force < LIMIT && run.outcome !== 'crash') run.criticalTime += dt;
}

export function scoreBreakdown(run) {
  if (run.outcome !== 'stopped') return { base: 0, bonus: 0, total: 0 };
  const base = Math.round(run.brakeSpeed ** 2 / Math.max(run.brakeTime, 0.001));
  const bonus = Math.floor(run.criticalTime * 350);
  return { base, bonus, total: base + bonus };
}
export function scoreRun(run) {
  return scoreBreakdown(run).total;
}
