/* All poses share a ground anchor with the original idle painting.
 * Clip stops are normalized animation times. contact is the frame sampled at damage resolution. */
(() => {
  const frames = (name, count) =>
    Array.from(
      { length: count },
      (_, i) => 'assets/motion/foe-' + name + '-' + String(i + 1).padStart(2, '0') + '.webp',
    );
  const twoPose = (name, reach, hitHeight) => {
    const clip = { frames: frames(name, 2), stops: [0, 0.54], contact: 0.54, reach, hitHeight };
    return {
      scale: 1.18,
      idlePivot: [0.5, 1],
      pivot: [0.5, 1],
      clips: { attack: clip, cast: clip, ward: { ...clip, frames: [clip.frames[0]], stops: [0] } },
    };
  };
  const hero = (name) => [1, 2, 3, 4].map((i) => 'assets/motion/hero-' + name + '-0' + i + '.webp');
  const hold = (name) => ({
    frames: [1, 2, 1].map((i) => 'assets/motion/hero-' + name + '-0' + i + '.webp'),
    stops: [0, 0.48, 0.85],
    contact: 0.48,
  });
  window.AshMotion = {
    hero: {
      scale: 1.18,
      idlePivot: [0.764, 0.995],
      pivot: [0.36, 0.95],
      clips: {
        attack: {
          frames: ['hero-attack-01', 'hero-attack-02', 'hero-cleave-03', 'hero-attack-04'].map(
            (n) => 'assets/motion/' + n + '.webp',
          ),
          stops: [0, 0.337, 0.54, 0.78],
          contact: 0.54,
          reach: 0.77,
          hitHeight: 0.19,
        },
        thrust: {
          frames: hero('thrust'),
          stops: [0, 0.377, 0.54, 0.78],
          contact: 0.54,
          reach: 1.45,
          hitHeight: 0.52,
        },
        hurt: { frames: ['assets/motion/hero-hit.webp'], stops: [0], contact: 0 },
        ward: hold('guard'),
        cast: hold('lantern'),
      },
    },
    bellkeeper: {
      scale: 1.18,
      idlePivot: [0.5, 1],
      pivot: [0.5, 1],
      clips: {
        ward: { frames: ['assets/motion/foe-bellkeeper-01.webp'], stops: [0], contact: 0.5 },
        attack: {
          frames: frames('bellkeeper', 4),
          stops: [0, 0.2, 0.55, 0.77],
          contact: 0.55,
          reach: 1.02,
          hitHeight: 0.17,
        },
        hurt: { frames: ['assets/motion/foe-bellkeeper-hit.webp'], stops: [0], contact: 0 },
      },
    },
    ...Object.fromEntries(
      Object.entries({
        waxling: [1.01, 0.58],
        tollman: [1, 0.34],
        vesper: [0.84, 0.54],
        choir: [0.74, 0.65],
        sexton: [0.81, 0.02],
        cenobite: [0.82, 0.51],
        glasshound: [1.05, 0.29],
        confessor: [1.09, 0.69],
        abbess: [1, 0.67],
        astrologer: [1.03, 0.85],
        saint: [1.14, 0.05],
        reliquary: [0.57, 0.06],
        astralstag: [1.03, 0.49],
        eclipse: [0.74, 0.28],
      }).map(([id, [reach, height]]) => [id, twoPose(id, reach, height)]),
    ),
  };
})();
