/* An original modal score for bowed strings, low choir and struck bells. */
(() => {
  let ctx,
    master,
    score,
    effects,
    reverb,
    timer,
    nextBeat = 0,
    beat = 0,
    act = 1,
    inBattle = true;
  let levels = { music: 35, effects: 65, muted: false };
  const pitch = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const cycle = [
    [38, 45, 53, 57],
    [34, 41, 50, 53],
    [41, 48, 53, 57],
    [36, 43, 52, 55],
    [38, 45, 53, 60],
    [31, 43, 50, 55],
    [34, 41, 53, 57],
    [33, 45, 52, 55],
  ];
  function note(bus, freq, start, len, amp, type = 'sine', attack = 0.012, detune = 0, lowpass = 2700) {
    const osc = ctx.createOscillator(),
      gain = ctx.createGain(),
      filter = ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    filter.Q.value = 0.35;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, amp), start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + len);
    osc.connect(filter).connect(gain).connect(bus);
    osc.start(start);
    osc.stop(start + len + 0.02);
    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
  function bell(bus, f, t, amp, decay = 2) {
    [1, 2.01, 2.73, 4.08].forEach((mul, i) =>
      note(bus, f * mul, t, decay / (1 + i * 0.26), amp / [1, 3, 5, 8][i]),
    );
  }
  function tick() {
    if (!ctx || ctx.state !== 'running') return;
    const spb = inBattle ? 0.72 : 0.88;
    if (nextBeat < ctx.currentTime) nextBeat = ctx.currentTime + 0.04;
    while (nextBeat < ctx.currentTime + 0.28) {
      const t = nextBeat,
        bar = Math.floor(beat / 8),
        chord = cycle[bar % 8],
        transpose = [0, -3, 2][act - 1] || 0;
      if (beat % 8 === 0) {
        chord.forEach((n, i) => {
          const f = pitch(n + transpose);
          note(score, f, t, spb * 8.7, i === 0 ? 0.2 : 0.045, 'triangle', spb * 1.2, -3, 690);
          note(
            score,
            f * 1.0022,
            t + 0.025,
            spb * 8.6,
            i === 0 ? 0.055 : 0.023,
            'sawtooth',
            spb * 1.7,
            3,
            520,
          );
        });
      }
      if ([1, 4, 6].includes(beat % 8)) {
        const i = ((bar + (beat % 8)) % 3) + 1;
        bell(
          score,
          pitch(chord[i] + transpose + (beat % 8 === 4 ? 0 : 12)),
          t,
          beat % 8 === 4 ? 0.045 : 0.026,
          2.4,
        );
      }
      if (inBattle && beat % 4 === 0)
        note(score, pitch(chord[0] - 12 + transpose), t, 0.63, 0.22, 'sine', 0.02);
      nextBeat += spb;
      beat++;
    }
  }
  function wake() {
    if (!ctx) {
      try {
        ctx = new AudioContext();
      } catch {
        return;
      }
      master = ctx.createGain();
      score = ctx.createGain();
      effects = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      score.connect(master);
      effects.connect(master);
      reverb = ctx.createConvolver();
      const size = Math.floor(ctx.sampleRate * 1.7),
        impulse = ctx.createBuffer(2, size, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / size, 3);
      }
      reverb.buffer = impulse;
      const wet = ctx.createGain();
      wet.gain.value = 0.19;
      score.connect(reverb);
      effects.connect(reverb);
      reverb.connect(wet).connect(master);
      set(levels);
      timer = setInterval(tick, 140);
    }
    if (ctx.state === 'suspended' && !document.hidden)
      ctx
        .resume()
        .then(tick)
        .catch(() => {});
  }
  function set(value) {
    levels = { ...levels, ...value };
    if (!ctx) return;
    score.gain.setTargetAtTime(levels.muted ? 0 : levels.music / 100, ctx.currentTime, 0.04);
    effects.gain.setTargetAtTime(levels.muted ? 0 : levels.effects / 100, ctx.currentTime, 0.025);
  }
  function play(kind) {
    wake();
    if (!ctx || levels.muted) return;
    const t = ctx.currentTime;
    if (kind === 'attack' || kind === 'enemy') {
      const f = kind === 'enemy' ? 76 : 132;
      note(effects, f, t, 0.28, 0.4, 'sawtooth', 0.008, -9, 480);
      note(effects, f * 0.58, t + 0.04, 0.36, 0.45, 'triangle');
      const src = ctx.createBufferSource(),
        len = Math.floor(ctx.sampleRate * 0.22),
        buf = ctx.createBuffer(1, len, ctx.sampleRate),
        arr = buf.getChannelData(0);
      for (let i = 0; i < len; i++) arr[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3 * 0.18;
      src.buffer = buf;
      src.connect(effects);
      src.start(t);
      src.onended = () => src.disconnect();
    } else if (kind === 'reward' || kind === 'victory') {
      [62, 65, 69, 74].forEach((n, i) => bell(effects, pitch(n), t + i * 0.13, 0.23, 2));
    } else if (kind === 'skill' || kind === 'power') {
      [62, kind === 'power' ? 74 : 69].forEach((n, i) => bell(effects, pitch(n), t + i * 0.08, 0.14, 1.2));
    } else if (kind === 'turn') {
      bell(effects, pitch(45), t, 0.23, 1.6);
    } else {
      note(effects, 286, t, 0.085, 0.1, 'triangle');
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else wake();
  });
  window.AshAudio = {
    set,
    wake,
    play,
    scene: (a, b) => {
      act = a;
      inBattle = b;
    },
  };
})();
