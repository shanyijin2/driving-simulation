export function createAudio() {
  let context, master, engine, engineGain, squeal, squealGain, stress, stressGain;
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
        stress = context.createOscillator(); stress.type = 'sawtooth';
        stressGain = context.createGain(); stressGain.gain.value = 0;
        const stressFilter = context.createBiquadFilter(); stressFilter.type = 'bandpass'; stressFilter.frequency.value = 1300; stressFilter.Q.value = 5;
        stress.connect(stressFilter).connect(stressGain).connect(master); stress.start();
      }
      if (context.state === 'suspended') context.resume().catch(() => {});
    },
    toggle() { muted = !muted; if (master) master.gain.setTargetAtTime(muted ? 0 : .12, context.currentTime, .05); return muted; },
    update(run, active) {
      if (!context) return;
      const now = context.currentTime;
      const enginePitch = run.vehicle === 'sport' ? 4.8 : run.vehicle === 'van' ? 2.2 : 3;
      engine.frequency.setTargetAtTime(run.braking ? 55 : 55 + run.speed * enginePitch, now, .08);
      engineGain.gain.setTargetAtTime(active ? .22 : 0, now, .1);
      squeal.frequency.setTargetAtTime(1000 + run.force * .65, now, .06);
      squealGain.gain.setTargetAtTime(active && run.braking && run.speed > 1 ? (run.force / 1612) ** 2 * .15 : 0, now, .06);
      const danger = Math.max(0, (run.force / 1612 - .85) / .15);
      stress.frequency.setTargetAtTime(65 + danger * 65 + Math.sin(now * 27) * 15, now, .02);
      stressGain.gain.setTargetAtTime(active && run.speed > 1 ? danger * .8 * (.6 + .4 * Math.sin(now * 36)) : 0, now, .03);
    },
    snap() {
      if (!context) return;
      const buffer = context.createBuffer(1, context.sampleRate * .65, context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.exp(-i / (context.sampleRate * .12));
      const source = context.createBufferSource(); source.buffer = buffer;
      const gain = context.createGain(); gain.gain.value = 2.5;
      source.connect(gain).connect(master); source.start(); source.onended = () => { source.disconnect(); gain.disconnect(); };
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
