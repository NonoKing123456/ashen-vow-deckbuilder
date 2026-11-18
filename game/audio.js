/* An original modal score for bowed strings, low choir and struck bells. */
(() => {
  let ctx,
    master,
    score,
    effects,
    reverb,
    noiseBuffer,
    timer,
    nextBeat = 0,
    beat = 0,
    act = 1,
    inBattle = true;
  let levels = { music: 35, effects: 65, muted: false };
  const voices = new Set();
  const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
  const optionsNumber = (value, fallback) => (Number.isFinite(value) ? value : fallback);
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
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -5;
      limiter.knee.value = 3;
      limiter.ratio.value = 16;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.12;
      // Transparent through the score's normal range. Catch coincident transients
      // within the compressor's attack time, even at full music and FX volume.
      const ceiling = ctx.createWaveShaper();
      ceiling.curve = Float32Array.from({ length: 2049 }, (_, i) => {
        const x = i / 1024 - 1,
          a = Math.abs(x);
        return a < 0.72 ? x : Math.sign(x) * (0.72 + 0.13 * Math.tanh((a - 0.72) / 0.13));
      });
      master.connect(limiter).connect(ceiling).connect(ctx.destination);
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
      noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 2), ctx.sampleRate);
      const noise = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noise.length; i++) noise[i] = Math.random() * 2 - 1;
      score.gain.value = levels.muted ? 0 : levels.music / 100;
      effects.gain.value = levels.muted ? 0 : levels.effects / 100;
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
    master.gain.setTargetAtTime(levels.muted ? 0 : 0.55, ctx.currentTime, 0.016);
    score.gain.setTargetAtTime(levels.muted ? 0 : levels.music / 100, ctx.currentTime, 0.04);
    effects.gain.setTargetAtTime(levels.muted ? 0 : levels.effects / 100, ctx.currentTime, 0.025);
  }
  // Each cue has a hand-shaped transient, body and tail. Ring frequencies are
  // deliberately inharmonic for metal. The choir uses pitched, filtered reeds.
  const cues = {
    cast(v) {
      v.air(0, 0.1, 1300, 3350, 0.72, 0.024);
      v.air(0.036, 0.08, 3100, 1700, 0.51, 0.009);
      v.tone(0.076, 0.085, 180, 88, 0.4, 'triangle');
      v.air(0.078, 0.032, 900, 440, 0.47);
    },
    draw(v) {
      v.air(0, 0.083, 1200, 4700, 0.63, 0.025);
      v.air(0.043, 0.063, 3800, 2100, 0.43, 0.016);
      v.air(0.096, 0.046, 1900, 3200, 0.29, 0.01);
    },
    wind(v) {
      v.air(0, 0.19, 250, 2150, 1.3, 0.092, 0.65);
      v.air(0.048, 0.125, 940, 3950, 0.63, 0.057);
      v.tone(0.045, 0.136, 790, 330, 0.075, 'sine', 0.052);
    },
    steel(v) {
      v.air(0, 0.037, 5100, 1750, 1.05);
      v.tone(0, 0.14, 205, 86, 0.56, 'triangle');
      v.ring(0.002, [447, 813, 1324, 2196], [0.31, 0.36, 0.26, 0.15], [0.31, 0.22, 0.145, 0.09]);
      v.air(0.013, 0.1, 1590, 560, 0.55, 0.012);
    },
    thrust(v) {
      v.air(0, 0.062, 3600, 780, 1.25, 0.003, 1.2);
      v.tone(0.006, 0.092, 450, 120, 0.46, 'triangle');
      v.tone(0.027, 0.2, 132, 66, 0.51);
      v.ring(0.009, [972, 1713], [0.103, 0.073], [0.17, 0.09]);
    },
    heavy(v) {
      v.air(0, 0.075, 1740, 350, 1.65);
      v.tone(0, 0.31, 173, 48, 0.79, 'triangle');
      v.tone(0.016, 0.39, 89, 43, 0.63);
      v.air(0.024, 0.21, 700, 155, 1.15, 0.018, 0.5);
      v.tone(0.066, 0.16, 157, 94, 0.2, 'triangle');
    },
    ward(v) {
      v.air(0, 0.14, 550, 1550, 0.85, 0.043);
      v.tone(0.048, 0.105, 102, 172, 0.25, 'triangle', 0.014);
      v.ring(0.093, [326, 511, 892], [0.36, 0.29, 0.22], [0.35, 0.2, 0.13]);
      v.air(0.095, 0.056, 2590, 890, 0.66);
    },
    block(v) {
      v.air(0, 0.049, 3370, 1100, 1.04);
      v.tone(0, 0.14, 220, 89, 0.37, 'triangle');
      v.ring(
        0.002,
        [558, 772, 1085, 1721, 2840],
        [0.56, 0.49, 0.34, 0.22, 0.15],
        [0.32, 0.29, 0.19, 0.12, 0.07],
      );
      v.air(0.031, 0.12, 2190, 840, 0.43, 0.013);
    },
    ember(v) {
      v.air(0, 0.023, 4100, 2300, 1.04);
      v.air(0.017, 0.31, 430, 1030, 1.34, 0.048, 0.48);
      v.tone(0.025, 0.17, 131, 94, 0.29, 'triangle', 0.02);
      v.crackle(0.048, 5, 0.19);
    },
    burn(v) {
      v.air(0, 0.43, 1230, 290, 1.25, 0.037, 0.42);
      v.air(0.054, 0.31, 310, 790, 1.16, 0.074, 0.64);
      v.tone(0.025, 0.26, 96, 62, 0.24, 'triangle', 0.038);
      v.crackle(0.016, 9, 0.41);
    },
    power(v) {
      [146.83, 220, 349.23].forEach((f, i) => {
        const t = 0.025 + i * 0.055;
        v.reed(t, 1.12 - i * 0.06, f, 740 + i * 144, 0.34 - i * 0.065, 0.125);
        v.tone(t, 1.23, f * 1.004, f, 0.22 - i * 0.038, 'sine', 0.1);
      });
      v.ring(0, [879, 1321], [0.41, 0.31], [0.105, 0.065]);
    },
    break(v) {
      v.air(0, 0.073, 3450, 1130, 1.03);
      v.tone(0, 0.12, 248, 87, 0.36, 'triangle');
      v.ring(0.004, [630, 1270], [0.19, 0.14], [0.24, 0.2]);
      for (let i = 0; i < 5; i++) {
        const t = 0.039 + i * 0.042 + v.rand() * 0.021,
          f = 1180 + v.rand() * 1450;
        v.tone(t, 0.13 - i * 0.012, f, f * 0.96, 0.16 - i * 0.018);
        v.air(t, 0.024, 3900, 2000, 0.5 - i * 0.06);
      }
    },
    fall(v) {
      v.tone(0, 0.41, 121, 43, 0.8, 'triangle');
      v.air(0, 0.19, 1060, 170, 1.45, 0.012, 0.45);
      v.ring(0.018, [239, 471, 708], [0.27, 0.32, 0.19], [0.31, 0.16, 0.12]);
      v.air(0.106, 0.31, 2350, 410, 0.95, 0.038, 0.5);
      v.tone(0.17, 0.21, 145, 60, 0.32, 'triangle');
      v.ring(0.2, [531, 932], [0.19, 0.16], [0.14, 0.08]);
    },
    spell(v) {
      v.air(0, 0.49, 350, 2180, 0.8, 0.16, 1.1);
      v.reed(0.02, 0.54, 155.56, 970, 0.4, 0.12);
      v.tone(0.04, 0.66, 231, 205, 0.29, 'sine', 0.19);
      v.tone(0.09, 0.57, 350, 308, 0.2, 'sine', 0.14);
      v.ring(0.22, [697, 1024], [0.34, 0.22], [0.16, 0.09]);
    },
  };
  // Per-cue trims measured on the stereo mix. The paper and approach sit
  // below contact so closely spaced casts retain their attack silhouette.
  const cueGain = {
    cast: 0.75,
    wind: 0.51,
    steel: 2.2,
    thrust: 1.85,
    heavy: 1.38,
    ward: 0.72,
    block: 2.1,
    ember: 0.82,
    burn: 0.95,
    power: 0.92,
    break: 1.8,
    fall: 1.52,
    draw: 1.05,
    spell: 0.82,
  };
  function cue(kind, opts = {}) {
    if (!Object.hasOwn(cues, kind) || levels.muted || levels.effects <= 0 || document.hidden) return;
    const intensity = clamp(optionsNumber(opts?.intensity, 0.78), 0, 1);
    if (!intensity) return;
    wake();
    if (!ctx) return;
    const start = ctx.currentTime + 0.001;
    const combo = clamp(optionsNumber(opts?.combo, 0), 0, 6);
    const variation = (0.973 + Math.random() * 0.054) * (1 + combo * 0.017);
    const mix = ctx.createGain(),
      pan = ctx.createStereoPanner();
    pan.pan.value = clamp(optionsNumber(opts?.pan, 0), -1, 1);
    mix.gain.value = Math.sqrt(intensity) * 0.84 * cueGain[kind];
    mix.connect(pan).connect(effects);
    const sources = new Set();
    const voice = {
      fade() {
        mix.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.003);
        for (const source of sources) source.stop(ctx.currentTime + 0.017);
        voices.delete(voice);
      },
    };
    if (voices.size >= 12) voices.values().next().value.fade();
    voices.add(voice);
    function connect(source, filter, delay, duration, amplitude, attack, offset = 0) {
      const t = start + delay,
        end = t + duration,
        gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(amplitude, t + Math.min(duration * 0.7, attack));
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      if (filter) source.connect(filter).connect(gain);
      else source.connect(gain);
      gain.connect(mix);
      sources.add(source);
      source.onended = () => {
        source.disconnect();
        filter?.disconnect();
        gain.disconnect();
        sources.delete(source);
        if (!sources.size) {
          mix.disconnect();
          pan.disconnect();
          voices.delete(voice);
        }
      };
      if (source.buffer) source.start(t, offset);
      else source.start(t);
      source.stop(end + 0.002);
    }
    function air(t, len, from, to, amp, attack = 0.0015, q = 0.86) {
      const source = ctx.createBufferSource(),
        filter = ctx.createBiquadFilter();
      source.buffer = noiseBuffer;
      filter.type = 'bandpass';
      filter.Q.value = q;
      filter.frequency.setValueAtTime(from * variation, start + t);
      filter.frequency.exponentialRampToValueAtTime(to * variation, start + t + len);
      connect(source, filter, t, len, amp, attack, Math.random() * (noiseBuffer.duration - len - 0.01));
    }
    function tone(t, len, from, to, amp, type = 'sine', attack = 0.0018) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(from * variation, start + t);
      osc.frequency.exponentialRampToValueAtTime(to * variation, start + t + len);
      connect(osc, null, t, len, amp, attack);
    }
    function reed(t, len, f, formant, amp, attack) {
      const osc = ctx.createOscillator(),
        filter = ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.value = f * variation;
      filter.type = 'bandpass';
      filter.frequency.value = formant;
      filter.Q.value = 2.4;
      connect(osc, filter, t, len, amp, attack);
    }
    function ring(t, freqs, lengths, amps) {
      freqs.forEach((f, i) => tone(t + i * 0.0009, lengths[i], f * 1.013, f, amps[i]));
    }
    function crackle(t, count, len) {
      for (let i = 0; i < count; i++) {
        const delay = t + ((i + Math.random() * 0.72) * len) / count;
        air(
          delay,
          0.012 + Math.random() * 0.015,
          1800 + Math.random() * 2300,
          900,
          0.33 + Math.random() * 0.35,
        );
      }
    }
    cues[kind]({ air, tone, reed, ring, crackle, rand: Math.random });
  }
  function play(kind) {
    wake();
    if (!ctx || levels.muted) return;
    const t = ctx.currentTime;
    if (kind === 'attack' || kind === 'enemy' || kind === 'enemy-guard') {
      cue({ attack: 'steel', enemy: 'heavy', 'enemy-guard': 'ward' }[kind]);
    } else if (kind === 'reward' || kind === 'victory') {
      [62, 65, 69, 74].forEach((n, i) => bell(effects, pitch(n), t + i * 0.13, 0.23, 2));
    } else if (kind === 'skill' || kind === 'power') {
      cue(kind === 'power' ? 'power' : 'ward');
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
    cue,
    scene: (a, b) => {
      act = a;
      inBattle = b;
    },
  };
})();
