import './style.css';
import { createScene } from './scene.js';
import { createAudio } from './audio.js';
import { createRun, stepRun, scoreRun, scoreBreakdown, VEHICLES, WEATHER, CRITICAL_RATIO, LIMIT, UNLOCK_SPEED, ROAD_LENGTH } from './physics.js';

const $ = id => document.getElementById(id);
const show = (id, visible) => $(id).classList.toggle('hidden', !visible);
const audio = createAudio();
let scene;
try {
  scene = createScene($('scene'));
  show('loading', false);
} catch (error) {
  $('loading').textContent = '3D 场景无法启动，请开启浏览器硬件加速后刷新。';
  console.error(error);
}
let mode = 'menu', run = createRun(), countdown = 0, lastCount = 0;
let previousTime = performance.now(), accumulator = 0, finishDelay = 0, noticeUntil = 0;
let keys = new Set(), pointers = new Set(), readyNotified = false, best = 0;
let selectedVehicle = 'suv', selectedWeather = 'dry';
const bestKey = () => `brake:v2:${selectedVehicle}:${selectedWeather}`;
function updateBest() {
  best = 0;
  try { const saved = Number(localStorage.getItem(bestKey())); if (Number.isFinite(saved)) best = Math.max(0, saved); } catch {}
  $('best').textContent = best ? `本组合最佳 ${best.toLocaleString()} 分` : '本组合最佳 —';
}
function updateSetup() {
  run = createRun(selectedVehicle, selectedWeather);
  scene?.configure(selectedVehicle, selectedWeather);
  $('setup-note').textContent = `${VEHICLES[selectedVehicle].note} · ${WEATHER[selectedWeather].note}`;
  document.querySelector('.wordmark').innerHTML = `${VEHICLES[selectedVehicle].model} <i>PERFORMANCE</i>`;
  updateBest();
}
for (const kind of ['vehicle', 'weather']) {
  document.querySelectorAll(`[data-${kind}]`).forEach(button => button.addEventListener('click', () => {
    if (kind === 'vehicle') selectedVehicle = button.dataset.vehicle; else selectedWeather = button.dataset.weather;
    document.querySelectorAll(`[data-${kind}]`).forEach(option => {
      const selected = option === button;
      option.classList.toggle('selected', selected); option.setAttribute('aria-pressed', String(selected));
    });
    updateSetup();
  }));
}
updateSetup();

function clearInput() { keys.clear(); pointers.clear(); }
function notify(text, alert = false, duration = 2000) {
  $('notice').textContent = text; $('notice').classList.toggle('alert', alert);
  show('notice', true); noticeUntil = performance.now() + duration;
}
function start() {
  if (!scene) return;
  audio.unlock(); clearInput(); run = createRun(selectedVehicle, selectedWeather); accumulator = 0;
  scene.configure(selectedVehicle, selectedWeather);
  show('crash-cinematic', false); document.body.classList.remove('critical-active');
  countdown = 3; lastCount = 3; readyNotified = false; mode = 'countdown';
  show('menu', false); show('result', false); show('hud', true); show('notice', false);
  show('countdown', true); $('countdown').textContent = '3'; audio.tone();
  document.querySelector('.masthead').classList.add('hidden');
  $('start').blur(); $('retry').blur();
}
function home() {
  clearInput(); mode = 'menu'; updateSetup();
  show('crash-cinematic', false); document.body.classList.remove('critical-active');
  show('menu', true); show('hud', false); show('result', false); show('countdown', false); show('notice', false);
  document.querySelector('.masthead').classList.remove('hidden'); updateBest(); $('start').focus();
}
$('start').addEventListener('click', start); $('retry').addEventListener('click', start);
$('home').addEventListener('click', home); $('exit').addEventListener('click', home);
$('mute').addEventListener('click', () => {
  audio.unlock(); const muted = audio.toggle();
  $('mute').textContent = `音效：${muted ? '关' : '开'}`; $('mute').setAttribute('aria-pressed', String(muted));
});

window.addEventListener('pointerdown', event => {
  if (mode !== 'running' || event.button !== 0 || event.target.closest('.panel, #exit')) return;
  event.preventDefault(); pointers.add(event.pointerId);
  if (run.speed < UNLOCK_SPEED && !run.braking) notify('车速达到 100 km/h 后才能刹车');
});
for (const type of ['pointerup', 'pointercancel']) window.addEventListener(type, event => pointers.delete(event.pointerId));
window.addEventListener('keydown', event => {
  if (!['Space', 'ArrowDown'].includes(event.code) || mode !== 'running' || event.target.closest('button')) return;
  event.preventDefault(); keys.add(event.code);
  if (run.speed < UNLOCK_SPEED && !run.braking && !event.repeat) notify('车速达到 100 km/h 后才能刹车');
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => {
  clearInput(); previousTime = performance.now(); accumulator = 0;
});
$('scene').addEventListener('contextmenu', event => event.preventDefault());
$('brake').addEventListener('contextmenu', event => event.preventDefault());

function updateHUD() {
  const ready = run.braking || run.speed >= UNLOCK_SPEED;
  const pressed = keys.size + pointers.size > 0;
  $('speed').textContent = Math.round(run.speed * 3.6);
  $('timer').innerHTML = `${run.brakeTime.toFixed(3)} <small>s</small>`;
  $('distance').innerHTML = `${Math.max(0, Math.round(ROAD_LENGTH - 2.7 - run.distance))} <small>m</small>`;
  $('force-fill').style.height = `${Math.min(100, run.force / LIMIT * 100)}%`;
  $('force-value').textContent = `${Math.round(run.force)} N`;
  const critical = mode === 'running' && run.speed > 1 && run.force >= LIMIT * CRITICAL_RATIO && run.force < LIMIT;
  document.querySelector('.force').classList.toggle('warning', critical);
  document.body.classList.toggle('critical-active', critical);
  $('critical').classList.toggle('active', critical);
  $('critical-bonus').textContent = `+${Math.floor(run.criticalTime * 350).toLocaleString()}`;
  $('critical-hint').textContent = critical ? `危险区间 ${run.criticalTime.toFixed(1)} s · 成功刹停兑现` : '1370 N 以上积累奖励';
  $('run-setup').textContent = `${VEHICLES[run.vehicle].name} / ${WEATHER[run.weather].name}`;
  $('speed-arc').style.strokeDashoffset = 100 - run.speed / VEHICLES[run.vehicle].maxSpeed * 100;
  document.querySelector('.speedometer text:last-child').textContent = Math.round(VEHICLES[run.vehicle].maxSpeed * 3.6);
  $('speed-arc').classList.toggle('ready', ready);
  $('brake').disabled = !ready || mode !== 'running';
  $('brake').classList.toggle('ready', ready);
  $('brake').classList.toggle('pressed', pressed && ready && mode === 'running');
  $('brake-label').textContent = ready ? (run.braking ? '按住加力' : '踩刹车') : '100 后解锁';
  $('drive-status').textContent = run.braking ? '动力已切断 · 松开可卸力' : ready ? '刹车已解锁' : '自动全力加速';
}

function finish() {
  const success = run.outcome === 'stopped';
  const title = success ? '刹停成功' : run.outcome === 'broken' ? '刹车踏板断裂' : '撞上路障';
  $('result-title').textContent = title; $('result-title').classList.toggle('fail', !success);
  const vehicle = VEHICLES[run.vehicle];
  $('result-setup').textContent = `${vehicle.name} / ${WEATHER[run.weather].name} / 制动测试报告`;
  $('result-sub').textContent = success ? (run.criticalTime > 2 ? '脚下是极限，停车是艺术。' : run.weather === 'snow' ? '冰上也刹得住，你这脚有点东西。' : `${vehicle.model} 稳稳停住，乘客一致好评。`) : run.outcome === 'broken' ? '车停了，只是车顶朝下。踏板表示：尽力了。' : '路障没动，是你的刹车晚了一点。';
  const hasBraked = run.braking;
  $('stat-speed').textContent = hasBraked ? `${run.brakeSpeed.toFixed(1)} km/h` : '—';
  $('stat-time').textContent = hasBraked ? `${run.brakeTime.toFixed(3)} s` : '—';
  $('stat-distance').textContent = hasBraked ? `${(run.distance - run.brakeStart).toFixed(1)} m` : '—';
  $('stat-force').textContent = hasBraked ? `${Math.round(run.maxForce)} N` : '—';
  const score = scoreRun(run); $('score').textContent = score.toLocaleString();
  const breakdown = scoreBreakdown(run);
  $('score-detail').textContent = success ? `基础 ${breakdown.base.toLocaleString()} + 极限制动 ${breakdown.bonus.toLocaleString()} · 危险区间 ${run.criticalTime.toFixed(2)} s` : `曾坚持极限制动 ${run.criticalTime.toFixed(2)} s · 失败不兑现奖励`;
  $('record').textContent = !success ? '翻车不计分，再挑战一次吧' : score > best ? '新的个人最佳纪录' : `个人最佳 ${best.toLocaleString()} 分`;
  if (score > best) { best = score; try { localStorage.setItem(bestKey(), String(best)); } catch {} }
  show('crash-cinematic', false); document.body.classList.remove('critical-active');
  mode = 'result'; show('hud', false); show('notice', false); show('result', true);
  document.querySelector('.chart-box').classList.toggle('hidden', !hasBraked);
  $('result').focus(); drawChart();
}

function drawChart() {
  if (mode !== 'result' || !run.history.length) return;
  const canvas = $('chart'), width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return;
  const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = width * dpr; canvas.height = height * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  const left = 30, right = width - 32, top = 14, bottom = height - 22;
  const maxSpeed = Math.ceil(run.brakeSpeed / 50) * 50;
  const x = time => left + time / Math.max(run.brakeTime, .001) * (right - left);
  const y = (value, max) => bottom - value / max * (bottom - top);
  ctx.font = '9px monospace';
  for (let i = 0; i <= 4; i++) {
    const cy = top + (bottom - top) * i / 4;
    ctx.strokeStyle = '#ffffff10'; ctx.beginPath(); ctx.moveTo(left, cy); ctx.lineTo(right, cy); ctx.stroke();
    ctx.fillStyle = '#d8c39a99'; ctx.textAlign = 'right'; ctx.fillText(Math.round(maxSpeed * (1 - i / 4)), left - 5, cy + 3);
  }
  ctx.strokeStyle = '#ff5545'; ctx.setLineDash([4, 4]);
  const limitY = y(LIMIT, 1800); ctx.beginPath(); ctx.moveTo(left, limitY); ctx.lineTo(right, limitY); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#ff7e4d'; ctx.textAlign = 'left'; ctx.fillText('1612', right + 4, limitY + 3); ctx.fillText('0', right + 4, bottom);
  for (const [key, max, color] of [['speed', maxSpeed, '#f1dcae'], ['force', 1800, '#ff7e4d']]) {
    ctx.beginPath(); ctx.moveTo(left, y(key === 'speed' ? run.brakeSpeed : 0, max));
    for (const sample of run.history) ctx.lineTo(x(sample.time), y(sample[key], max));
    ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.fillStyle = '#a9a29a'; ctx.textAlign = 'center';
  for (let i = 0; i <= 4; i++) { const time = run.brakeTime * i / 4; ctx.fillText(`${time.toFixed(1)}s`, x(time), height - 5); }
}
window.addEventListener('resize', drawChart);

function frame(now) {
  const dt = document.hidden ? 0 : Math.min((now - previousTime) / 1000, .05); previousTime = now;
  if (mode === 'countdown') {
    countdown -= dt;
    const count = Math.ceil(countdown);
    if (count !== lastCount && count > 0) { lastCount = count; $('countdown').textContent = count; audio.tone(); }
    if (countdown <= 0) { mode = 'running'; $('countdown').textContent = 'GO'; audio.tone(1320, .3); }
  }
  if (mode === 'running') {
    if (countdown > -.7) countdown -= dt; else show('countdown', false);
    accumulator += dt;
    while (accumulator >= 1 / 120) {
      const hadBraked = run.braking;
      stepRun(run, 1 / 120, keys.size + pointers.size > 0); accumulator -= 1 / 120;
      if (!hadBraked && run.braking) notify(`动力切断 · 初速度 ${run.brakeSpeed.toFixed(1)} km/h`);
      if (!readyNotified && run.speed >= UNLOCK_SPEED) { readyNotified = true; notify('100 km/h · 刹车已解锁'); audio.tone(880, .1); }
      if (run.outcome) {
        clearInput(); show('countdown', false); mode = 'finishing'; finishDelay = run.outcome === 'stopped' ? .9 : 5.6;
        if (run.outcome === 'broken') show('crash-cinematic', true);
        notify(run.outcome === 'stopped' ? '完美刹停！' : run.outcome === 'broken' ? '刹车踏板断裂！' : '撞上路障！', run.outcome !== 'stopped', 3000);
        if (run.outcome === 'stopped') [523,659,784,1047].forEach((frequency,i) => audio.tone(frequency,.4,i*.1));
        else { audio.snap(); [180,100,55].forEach((frequency,i) => audio.tone(frequency,.4,i*.12)); }
        break;
      }
    }
  } else if (mode === 'finishing') {
    finishDelay -= dt;
    if (finishDelay < 4.65) show('crash-cinematic', false);
    if (finishDelay <= 0) finish();
  }
  if (now > noticeUntil) show('notice', false);
  if (mode !== 'menu' && mode !== 'result') updateHUD();
  audio.update(run, mode === 'running' && !document.hidden);
  if (scene && !document.hidden) scene.render(run, mode, dt, now / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
