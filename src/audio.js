export function createAudio() {
  let context, master, engine, engineGain, squeal, squealGain;
  let muted = false;
  return {
    unlock() {
      if (!context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        context = new AudioContext();
        master = context.createGain(); master.gain.value = muted ? 0 : .12; master.connect(context.destination);
        engine = context.createOscillator(); engine.type = 'sawtooth';
        engineGain = context.createGain(); engineGain.gain.value = 0;
        const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 700;
        engine.connect(filter).connect(engineGain).connect(master); engine.start();
        squeal = context.createOscillator(); squeal.type = 'triangle';
        squealGain = context.createGain(); squealGain.gain.value = 0;
        squeal.connect(squealGain).connect(master); squeal.start();
      }
      if (context.state === 'suspended') context.resume().catch(() => {});
    },
    toggle() { muted = !muted; if (master) master.gain.setTargetAtTime(muted ? 0 : .12, context.currentTime, .05); return muted; },
    update(run, active) {
      if (!context) return;
      const now = context.currentTime;
      engine.frequency.setTargetAtTime(run.braking ? 55 : 55 + run.speed * 3, now, .08);
      engineGain.gain.setTargetAtTime(active ? .22 : 0, now, .1);
      squeal.frequency.setTargetAtTime(1000 + run.force * .65, now, .06);
      squealGain.gain.setTargetAtTime(active && run.braking && run.speed > 1 ? (run.force / 1612) ** 2 * .15 : 0, now, .06);
    },
    tone(frequency = 660, duration = .15, delay = 0) {
      if (!context) return;
      const osc = context.createOscillator(), gain = context.createGain(), start = context.currentTime + delay;
      osc.frequency.value = frequency; osc.type = 'sine'; gain.gain.setValueAtTime(.001, start);
      gain.gain.exponentialRampToValueAtTime(.5, start + .01);
      gain.gain.exponentialRampToValueAtTime(.001, start + duration);
      osc.connect(gain).connect(master); osc.start(start); osc.stop(start + duration + .01);
    },
  };
}
