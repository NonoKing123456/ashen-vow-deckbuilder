'use strict';
// Render with Chromium's actual oscillators, filters, panners, reverb and mixer.
// CHROME_PATH can point at another Chromium binary.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const kinds = [
  'cast',
  'wind',
  'steel',
  'thrust',
  'heavy',
  'ward',
  'block',
  'ember',
  'burn',
  'power',
  'break',
  'fall',
  'draw',
  'spell',
];
const program = fs.readFileSync(path.resolve(__dirname, '../game/audio.js'), 'utf8');
const db = (value) => 20 * Math.log10(Math.max(1e-12, value));
(async () => {
  const locations = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
  ];
  const browser = await chromium.launch({
    executablePath: locations.find((p) => p && fs.existsSync(p)),
    headless: true,
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto('about:blank');
    async function render(events, prefs = { music: 0, effects: 100, muted: false }, duration = 2) {
      return page.evaluate(
        async ({ events, prefs, duration, program }) => {
          const frame = document.createElement('iframe');
          document.body.append(frame);
          const w = frame.contentWindow;
          const rate = 44100,
            off = new w.OfflineAudioContext(2, Math.ceil(rate * duration), rate);
          let time = 0,
            seed = 3717,
            tick;
          w.Math.random = () => {
            seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
            return seed / 4294967296;
          };
          // Production graph, controlled scheduling clock. Realtime oscillators
          // and noise sources are rendered by the native OfflineAudioContext.
          const clock = new Proxy(off, {
            get(target, key) {
              if (key === 'currentTime') return time;
              if (key === 'state') return 'running';
              const value = Reflect.get(target, key, target);
              return typeof value === 'function' ? value.bind(target) : value;
            },
          });
          w.AudioContext = function () {
            return clock;
          };
          w.setInterval = (fn) => {
            tick = fn;
            return 1;
          };
          w.eval(program);
          w.AshAudio.set(prefs);
          w.AshAudio.wake();
          for (const event of events) {
            time = event.time || 0;
            if (event.score) tick();
            else if (event.legacy) w.AshAudio.play(event.legacy);
            else w.AshAudio.cue(event.kind, event.opts);
          }
          const audio = await off.startRendering(),
            left = audio.getChannelData(0),
            right = audio.getChannelData(1);
          let peak = 0,
            maxRms = 0,
            energy = 0,
            l = 0,
            r = 0,
            zeroCross = 0,
            last = 0;
          const blocks = [];
          for (let start = 0; start < left.length; start += 441) {
            let square = 0;
            for (let i = start; i < Math.min(start + 441, left.length); i++) {
              const a = left[i],
                b = right[i];
              if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('Non-finite audio');
              peak = Math.max(peak, Math.abs(a), Math.abs(b));
              l += a * a;
              r += b * b;
              square += (a * a + b * b) / 2;
              if (a * last < 0) zeroCross++;
              last = a;
            }
            energy += square;
            blocks.push(square);
            maxRms = Math.max(maxRms, Math.sqrt(square / 441));
          }
          let cumulative = 0;
          const p90 =
            blocks.findIndex((val) => {
              cumulative += val;
              return cumulative >= energy * 0.9;
            }) * 10;
          let estimatedTruePeak = peak;
          if (events.length > 30) {
            // Four-phase bandlimited interpolation, 16-tap Hann-windowed sinc.
            for (let phase = 1; phase < 4; phase++) {
              const weights = [];
              for (let k = -7; k <= 8; k++) {
                const x = k - phase / 4;
                weights.push(
                  ((0.5 + 0.5 * Math.cos((Math.PI * x) / 8)) * Math.sin(Math.PI * x)) / (Math.PI * x),
                );
              }
              const norm = weights.reduce((s, v) => s + v, 0);
              for (let i = 7; i < left.length - 8; i++) {
                let a = 0,
                  b = 0;
                for (let k = 0; k < 16; k++) {
                  a += left[i + k - 7] * weights[k];
                  b += right[i + k - 7] * weights[k];
                }
                estimatedTruePeak = Math.max(estimatedTruePeak, Math.abs(a / norm), Math.abs(b / norm));
              }
            }
          }
          frame.remove();
          return { peak, estimatedTruePeak, maxRms, p90, leftEnergy: l, rightEnergy: r, zeroCross };
        },
        { events, prefs, duration, program },
      );
    }
    const measurements = {};
    for (const kind of kinds) {
      const row = await render([{ kind, opts: { intensity: 1 } }]);
      assert.ok(row.peak > 0.037 && row.peak < 0.94, kind + ' has an unexpected peak ' + row.peak);
      assert.ok(row.maxRms > 0.008, kind + ' is too quiet');
      measurements[kind] = {
        peakDb: +db(row.peak).toFixed(1),
        rms10msDb: +db(row.maxRms).toFixed(1),
        energy90ms: row.p90,
      };
    }
    assert.ok(measurements.wind.energy90ms > measurements.steel.energy90ms);
    assert.ok(measurements.steel.peakDb > measurements.wind.peakDb + 3);
    assert.ok(measurements.heavy.peakDb > measurements.cast.peakDb + 4);
    assert.ok(measurements.power.energy90ms > measurements.cast.energy90ms + 100);
    const left = await render([{ kind: 'thrust', opts: { pan: -1 } }]),
      right = await render([{ kind: 'thrust', opts: { pan: 1 } }]);
    assert.ok(left.leftEnergy > left.rightEnergy * 4 && right.rightEnergy > right.leftEnergy * 4);
    const soft = await render([{ kind: 'steel', opts: { intensity: 0.25 } }]);
    assert.ok(db(soft.peak) < measurements.steel.peakDb - 5);
    const base = await render([{ kind: 'power', opts: { combo: 0 } }]),
      chain = await render([{ kind: 'power', opts: { combo: 5 } }]);
    assert.notEqual(base.zeroCross, chain.zeroCross);
    const silent = await render([{ kind: 'steel', opts: { intensity: 0 } }, { kind: 'unknown' }]);
    assert.equal(silent.peak, 0);
    const muted = await render([{ kind: 'heavy' }, { score: true }, { legacy: 'reward' }], {
      music: 100,
      effects: 100,
      muted: true,
    });
    assert.equal(muted.peak, 0);
    const legacy = await render(
      ['attack', 'enemy', 'enemy-guard', 'click', 'skill', 'power', 'turn', 'reward'].map((legacy, i) => ({
        legacy,
        time: i * 0.08,
      })),
    );
    assert.ok(legacy.peak > 0.1);
    const stress = [{ score: true }, { legacy: 'reward' }];
    for (let i = 0; i < 60; i++)
      stress.push({
        kind: kinds[i % kinds.length],
        time: 0.12 + Math.floor(i / 10) * 0.029,
        opts: { intensity: 1, combo: i, pan: i % 2 ? 0.5 : -0.5 },
      });
    const mix = await render(stress, { music: 100, effects: 100, muted: false });
    assert.ok(mix.peak < 0.94 && mix.peak > 0.2);
    assert.ok(mix.estimatedTruePeak < 1, 'Intersample overload: ' + mix.estimatedTruePeak);
    await page.evaluate(() => {
      const Original = AudioContext;
      window.AudioContext = class extends Original {
        constructor() {
          super();
          window.liveContext = this;
        }
      };
    });
    await page.addScriptTag({ content: program });
    await page.setContent('<button id="audio-start">Start</button>');
    await page.evaluate(() => (document.querySelector('button').onclick = () => AshAudio.cue('cast')));
    await page.click('#audio-start');
    await page.waitForFunction(() => window.liveContext?.state === 'running');
    await page.evaluate(
      (ks) =>
        ks.forEach((kind, i) => setTimeout(() => AshAudio.cue(kind, { pan: i % 2 ? 0.4 : -0.4 }), i * 22)),
      kinds,
    );
    await page.waitForTimeout(1550);
    assert.equal(await page.evaluate(() => liveContext.state), 'running');
    assert.deepEqual(errors, []);
    console.table(measurements);
    console.log(
      '60-cue overload with music and reward: ' +
        db(mix.peak).toFixed(1) +
        ' dBFS sample peak, ' +
        db(mix.estimatedTruePeak).toFixed(1) +
        ' dBTP estimated.',
    );
    console.log('All 14 cues, pan, mute, intensity, legacy sounds and polyphonic headroom passed.');
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
