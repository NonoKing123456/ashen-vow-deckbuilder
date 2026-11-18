(function script() {
  'use strict';
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = (x) => x * x * (3 - 2 * x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const peak = (t, at, spread) => Math.max(0, 1 - Math.abs(t - at) / spread);
  function profile(card, enemy, intent, events, end) {
    if (end) {
      if (!intent.damage) return intent.type === 'guard' ? 'ward' : 'rite';
      if (['abbess', 'choir', 'astrologer', 'confessor'].includes(enemy)) return 'hex';
      if (['bellkeeper', 'reliquary', 'vesper'].includes(enemy) || intent.damage >= 15) return 'hammer';
      if (['astralstag', 'glasshound'].includes(enemy)) return 'charge';
      if (enemy === 'cenobite') return 'lash';
      if (enemy === 'waxling') return 'firebolt';
      return 'blade';
    }
    if (card.type === 'attack') {
      if (card.art === 'spear') return 'thrust';
      if (card.art === 'flame') return 'firebolt';
      if (card.cost >= 2 || card.art === 'shield') return 'hammer';
      return 'blade';
    }
    if (card.type === 'power') return 'rite';
    if (events.some((e) => e.type === 'heal')) return 'mend';
    if (card.art === 'flame' || events.some((e) => e.type === 'burn')) return 'kindle';
    if (events.some((e) => e.type === 'block')) return 'ward';
    return 'rite';
  }
  function choreography(input) {
    const { card, intent, enemyId, events, end } = input;
    const kind = profile(card, enemyId, intent, events, end);
    const contactGroups = new Map(),
      other = [];
    for (const e of events) {
      if (e.contact === undefined) {
        other.push(e);
        continue;
      }
      if (!contactGroups.has(e.contact)) contactGroups.set(e.contact, []);
      contactGroups.get(e.contact).push(e);
    }
    const groups = [...contactGroups.values()];
    const pre = groups.filter((g) => g[0].source === 'burn');
    const strikes = groups.filter((g) => g[0].source === 'strike');
    const burnOnly = end && pre.length > 0 && !strikes.length && input.outcome === 'won';
    const lead = pre.length ? 195 : 0;
    const windup = end
      ? kind === 'hammer'
        ? 385
        : 310
      : kind === 'hammer'
        ? 285
        : kind === 'thrust' || kind === 'blade'
          ? 176
          : 170;
    const first = lead + windup;
    const gap = strikes.length > 3 ? 112 : 157;
    const beats = pre.map((group) => ({ at: 74, group, kind: 'burn', target: 'enemy', index: 0 }));
    let hit = -1;
    for (const group of groups) {
      const { target, source } = group[0];
      if (source === 'burn') continue;
      if (source !== 'thorns') hit++;
      beats.push({
        at: first + Math.max(0, hit) * gap + (source === 'thorns' ? 35 : 0),
        kind: source === 'thorns' ? 'thorns' : kind,
        target,
        group,
        index: Math.max(0, hit),
      });
    }
    if (other.length || (!strikes.length && !burnOnly)) {
      const tgt = burnOnly
        ? other[0]?.target || 'enemy'
        : card?.type === 'attack'
          ? 'enemy'
          : end
            ? 'enemy'
            : 'player';
      const extra = {
        at: burnOnly ? 80 : first,
        group: other,
        kind: burnOnly ? 'mend' : kind,
        target: tgt,
        index: 0,
        support: true,
      };
      const main = beats.find((b) => b.at === extra.at && b.kind === kind);
      if (main) main.group = [...main.group, ...other];
      else beats.push(extra);
    }
    beats.sort((a, b) => a.at - b.at);
    const last = Math.max(...beats.map((b) => b.at), 0);
    const tail = input.outcome === 'active' ? (end ? 315 : 245) : 610;
    return { kind, first, last, duration: last + tail, lead, burnOnly, beats };
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = { choreography };
    return;
  }

  const assets = new Map();
  function load(src) {
    if (!assets.has(src)) {
      const img = new Image();
      img.src = src;
      assets.set(src, img);
      img.decode().catch(() => {});
    }
    return assets.get(src);
  }
  const atlas = load('assets/motion/effects.webp');
  const tint = {
    charge: '#eed6a9',
    lash: '#d6d4dc',
    blade: '#ffd09a',
    thrust: '#ffd280',
    hammer: '#eabe80',
    block: '#b8ebfa',
    ward: '#b5e5ed',
    firebolt: '#ffad5b',
    burn: '#ff9f60',
    kindle: '#ffc06c',
    mend: '#ccedac',
    rite: '#ffdfa0',
    hex: '#dfb7ff',
    thorns: '#e2d5c0',
  };
  const effectCell = {
    charge: 3,
    lash: 0,
    blade: 0,
    thrust: 1,
    hammer: 3,
    firebolt: 5,
    burn: 5,
    kindle: 5,
    ward: 4,
    block: 4,
    rite: 6,
    mend: 6,
    hex: 7,
    thorns: 2,
  };
  const strikeSounds = {
    charge: 'heavy',
    lash: 'steel',
    block: 'block',
    blade: 'steel',
    thrust: 'thrust',
    hammer: 'heavy',
    firebolt: 'burn',
    hex: 'spell',
    ward: 'ward',
    kindle: 'ember',
    rite: 'power',
    mend: 'power',
    burn: 'burn',
    thorns: 'steel',
  };
  const sounds = (kind, pan, intensity = 0.7, combo = 0) =>
    window.AshAudio?.cue?.(kind, { pan: clamp(pan, -0.8, 0.8), intensity: clamp(intensity), combo });
  function prewarm(id) {
    const library = window.AshMotion || {};
    for (const info of [library.hero, library[id]]) {
      if (info) for (const src of Object.values(info.clips).flatMap((c) => c.frames)) load(src);
    }
  }
  function geometry(el, world, defaults) {
    const rect = el.getBoundingClientRect();
    const idle = el.querySelector('.idle-art');
    const x = rect.left - world.left,
      y = rect.top - world.top,
      w = rect.width,
      h = rect.height;
    const anchor = defaults?.idlePivot || [0.5, 0.99];
    return { el, idle, x, y, w, h, fx: x + w * anchor[0], fy: y + h * anchor[1], chest: y + h * 0.48 };
  }
  function pose(unit, meta, clip, t) {
    if (!meta || !clip || t < 0 || t >= 1) {
      unit.el.classList.remove('posed');
      return;
    }
    let index = 0;
    for (let i = 1; i < clip.frames.length; i++) {
      if (t >= clip.stops[i]) index = i;
      else break;
    }
    const img = load(clip.frames[index]);
    if (!img.complete || !img.naturalWidth) {
      unit.el.classList.remove('posed');
      return;
    }
    let layer = unit.el.querySelector('.pose-art');
    if (!layer) {
      layer = document.createElement('img');
      layer.className = 'pose-art';
      layer.alt = '';
      unit.el.append(layer);
    }
    if (layer.getAttribute('src') !== clip.frames[index]) layer.setAttribute('src', clip.frames[index]);
    const anchor = meta.idlePivot || [0.5, 0.99],
      pivot = clip.pivot || meta.pivot;
    layer.style.height = 100 * (clip.scale || meta.scale) + '%';
    layer.style.left = anchor[0] * 100 + '%';
    layer.style.top = anchor[1] * 100 + '%';
    layer.style.transform = `translate(${-pivot[0] * 100}%,${-pivot[1] * 100}%)`;
    unit.el.classList.add('posed');
  }
  function makeParticle(x, y, dir, kind, i, strength) {
    const a = i * 2.39996 + Math.random() * 0.38,
      speed = (55 + Math.random() * 200) * strength;
    return {
      x,
      y,
      vx: Math.cos(a) * speed + dir * speed * 0.35,
      vy: Math.sin(a) * speed - speed * 0.36,
      life: 190 + Math.random() * 330,
      thickness: 0.65 + Math.random() * 1.8,
      color: i % 4 === 0 ? '#fff6dc' : tint[kind] || '#ffe2b2',
    };
  }
  function decal(ctx, cell, x, y, size, alpha, rotation = 0, stretch = 1, mirror = false) {
    if (!atlas.complete || !atlas.naturalWidth || alpha <= 0) return;
    const w = atlas.naturalWidth / 4,
      h = atlas.naturalHeight / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(mirror ? -1 : 1, stretch);
    ctx.globalAlpha = clamp(alpha);
    ctx.drawImage(
      atlas,
      (cell % 4) * w + 2,
      Math.floor(cell / 4) * h + 2,
      w - 4,
      h - 4,
      -size / 2,
      -size / 2,
      size,
      size,
    );
    ctx.restore();
  }
  let current = null;
  function finish() {
    if (current) current.finish();
  }
  function play(input) {
    finish();
    const plan = choreography(input);
    const arena = document.getElementById('arena'),
      host = arena?.querySelector('.battle-world');
    if (!host || input.reduced) {
      for (const beat of plan.beats) input.onBeat(beat.group);
      const beat = plan.beats[0];
      if (beat)
        sounds(
          beat.group.some((e) => e.type === 'blocked') ? 'block' : strikeSounds[beat.kind],
          input.end ? -0.3 : 0.3,
        );
      input.onFinish();
      return;
    }
    prewarm(input.enemyId);
    const world = arena.getBoundingClientRect(),
      w = world.width,
      h = world.height;
    const library = window.AshMotion || {};
    const hero = geometry(host.querySelector('.hero-model'), world, library.hero);
    const foe = geometry(host.querySelector('.foe-model'), world, library[input.enemyId]);
    const actor = input.end ? foe : hero,
      target = input.end ? hero : foe,
      dir = input.end ? -1 : 1;
    const meta = input.end ? library[input.enemyId] : library.hero;
    const defenderMeta = input.end ? library.hero : library[input.enemyId];
    const melee = ['blade', 'thrust', 'hammer', 'charge', 'lash'].includes(plan.kind) && !plan.burnOnly;
    const offensive = melee || ['firebolt', 'hex'].includes(plan.kind);
    const clip = meta?.clips[plan.kind] || meta?.clips[melee ? 'attack' : 'cast'];
    const reach = actor.h * (clip?.reach ?? 0.46);
    const distance = melee ? dir * Math.max(0, Math.abs(target.fx - actor.fx) - reach) : 0;
    const shadow = host.querySelector(input.end ? '.foe-shadow' : '.hero-shadow');
    const otherShadow = host.querySelector(input.end ? '.hero-shadow' : '.foe-shadow');
    const canvas = host.querySelector('.combat-fx'),
      ctx = canvas.getContext('2d');
    const ratio = Math.min(1.65, devicePixelRatio || 1);
    canvas.width = Math.ceil(w * ratio);
    canvas.height = Math.ceil(h * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const labels = document.getElementById('vfx');
    const caption = document.createElement('div');
    caption.className = 'combat-call ' + (input.end ? 'hostile' : '');
    caption.innerHTML = '<i></i><span></span><i></i>';
    caption.querySelector('span').textContent = plan.burnOnly ? '余火噬尽' : input.name;
    if (input.ignited) {
      const tag = document.createElement('small');
      tag.textContent = '炉火强化';
      caption.append(tag);
    }
    labels.replaceChildren(caption);
    arena.classList.add('performing');
    arena.dataset.move = plan.kind;
    const particles = [],
      bursts = [];
    const start = performance.now();
    let index = 0,
      wind = false,
      raf = 0,
      done = false,
      lastStrike = -10000,
      lastResult = null;
    const hitHold = plan.kind === 'hammer' ? 80 : 46;
    const settleStart = plan.last + hitHold + 16;
    const returnTime =
      input.outcome === 'active' ? plan.duration : Math.min(plan.duration, settleStart + 235);
    const force = Math.max(
      0,
      ...input.events.filter((e) => e.type === 'damage' || e.type === 'blocked').map((e) => e.value),
    );
    const strength = clamp(
      (plan.kind === 'hammer' ? 0.76 : 0.47) +
        Math.min(0.26, force / 60) +
        (input.outcome !== 'active' ? 0.16 : 0),
    );
    const action = { finish: end };
    current = action;
    function end() {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      for (; index < plan.beats.length; index++) input.onBeat(plan.beats[index].group);
      for (const unit of [actor, target]) {
        unit.el.style.removeProperty('translate');
        unit.el.style.removeProperty('rotate');
        unit.el.style.removeProperty('filter');
        unit.el.style.removeProperty('opacity');
        unit.el.style.removeProperty('scale');
        unit.el.style.removeProperty('z-index');
        unit.el.classList.remove('posed');
      }
      for (const n of [shadow, otherShadow]) n.style.removeProperty('translate');
      host.style.removeProperty('transform');
      host.style.removeProperty('transform-origin');
      host.querySelector('.landscape').style.removeProperty('filter');
      ctx.clearRect(0, 0, w, h);
      arena.classList.remove('performing');
      delete arena.dataset.move;
      caption.remove();
      current = null;
      input.onFinish();
    }
    function labelAt(beat, x, y) {
      const lines = [];
      for (const e of beat.group) {
        const amount = e.value;
        if (e.type === 'damage') lines.push(['damage', '−' + amount, e.target]);
        else if (e.type === 'blocked') lines.push(['blocked', '格挡 ' + amount, e.target]);
        else if (e.type === 'block') lines.push(['blocked', '+' + amount + ' 格挡', e.target]);
        else if (e.type === 'ember' && amount > 0) lines.push(['ember', '+' + amount + ' 炉火', e.target]);
        else if (e.type === 'burn') lines.push(['ember', '灼烧 +' + amount, e.target]);
        else if (e.type === 'heal') lines.push(['heal', '+' + amount, e.target]);
      }
      for (const side of ['player', 'enemy']) {
        const values = lines.filter((entry) => entry[2] === side);
        if (!values.length) continue;
        values.sort((left, right) => Number(right[0] === 'damage') - Number(left[0] === 'damage'));
        const unit = side === 'player' ? hero : foe;
        const stack = document.createElement('div');
        stack.className = 'combat-result';
        stack.dataset.side = side;
        stack.style.left =
          clamp((side === beat.target ? x : unit.fx) + ((beat.index % 2) * 2 - 1) * 13, 45, w - 50) + 'px';
        stack.style.top = clamp(unit.chest - h * 0.19, 18, h * 0.58) + 'px';
        for (const [type, value] of values) {
          const line = document.createElement('span');
          line.className = 'battle-number ' + type;
          line.textContent = value;
          stack.append(line);
        }
        labels.querySelector('.combat-result[data-side="' + side + '"]')?.remove();
        labels.append(stack);
        stack.animate(
          [
            { opacity: 0.86, translate: '-50% 5px', scale: '.78' },
            { offset: 0.13, opacity: 1, translate: '-50% -3px', scale: '1.12' },
            { offset: 0.62, opacity: 1, scale: '1' },
            { opacity: 0, translate: '-50% -32px', scale: '.96' },
          ],
          { duration: 575, fill: 'forwards' },
        ).onfinish = () => stack.remove();
      }
    }
    function contact(beat) {
      const unit = beat.target === 'player' ? hero : foe,
        x = unit.fx,
        y =
          melee && clip?.hitHeight && unit === target
            ? actor.fy - actor.h * clip.hitHeight
            : beat.kind === 'hammer'
              ? unit.fy - unit.h * 0.2
              : unit.chest;
      const blocked = beat.group.some((e) => e.type === 'blocked'),
        damage = beat.group.some((e) => e.type === 'damage');
      const kind = blocked && !damage ? 'block' : beat.kind;
      if (!beat.support || !offensive) {
        lastStrike = beat.at;
        lastResult = beat;
      }
      const impact = { ...beat, x, y, kind, unit };
      bursts.push(impact);
      const n = melee ? 24 : 18,
        scale = clamp(h / 420, 0.62, 1.8);
      for (let i = 0; i < n; i++)
        particles.push({ ...makeParticle(x, y, dir, kind, i, scale * (0.6 + strength * 0.6)), at: beat.at });
      if (input.end && !beat.support && blocked && damage) sounds('break', -0.4, 0.5);
      sounds(strikeSounds[kind] || 'block', (x / w - 0.5) * 1.4, strength, beat.index);
      if (input.outcome !== 'active' && beat.at === plan.last) sounds('fall', x / w - 0.5, 0.8);
      input.onBeat(beat.group);
      labelAt(beat, x, y);
    }
    function frame(now) {
      if (done) return;
      if (!arena.isConnected) {
        end();
        return;
      }
      const t = now - start;
      if (t >= plan.duration) {
        while (index < plan.beats.length) contact(plan.beats[index++]);
        end();
        return;
      }
      if (!wind && t >= Math.max(20, plan.first - 137) && !plan.burnOnly) {
        wind = true;
        if (input.ignited) sounds('ember', -0.3, 0.53);
        if (offensive) sounds('wind', actor.fx / w - 0.5, strength);
      }
      while (index < plan.beats.length && t >= plan.beats[index].at) contact(plan.beats[index++]);
      const a = clamp((t - plan.lead) / (plan.first - plan.lead)),
        back = smooth(clamp((t - settleStart) / Math.max(1, returnTime - settleStart)));
      const charge = smooth(clamp(a / 0.52)),
        lunge = smooth(clamp((a - 0.52) / 0.48));
      const progress = t < plan.first ? lunge : 1 - back;
      const recoilTime = t - lastStrike,
        recoil =
          recoilTime >= 0 && recoilTime < 190
            ? Math.sin((Math.min(1, recoilTime / 46) * Math.PI) / 2) *
              (1 - smooth(clamp((recoilTime - 48) / 142)))
            : 0;
      const step = (0.18 * charge + 0.82 * lunge) * (1 - back);
      const dx = distance * step - dir * actor.h * 0.045 * charge * (1 - lunge);
      const hop = melee
        ? -Math.sin(Math.PI * lunge) * actor.h * (plan.kind === 'charge' ? 0.22 : 0.1) -
          peak(back, 0.48, 0.45) * actor.h * 0.085
        : 0;
      actor.el.style.translate = dx + 'px ' + hop + 'px';
      actor.el.style.zIndex = '2';
      const stagger = offensive && !plan.burnOnly ? recoil * dir * target.h * 0.055 : 0;
      target.el.style.translate = stagger + 'px 0';
      target.el.style.rotate = (stagger / target.h) * 53 + 'deg';
      target.el.style.filter = stagger
        ? 'brightness(' + (1 + recoil * 0.83) + ') sepia(' + recoil * 0.45 + ')'
        : '';
      shadow.style.translate = dx + 'px 0';
      otherShadow.style.translate = stagger + 'px 0';
      if (!clip && !plan.burnOnly)
        actor.el.style.rotate = dir * (-3 * charge * (1 - lunge) + (melee ? 5 : 1.6) * progress) + 'deg';
      const hitPos = clip?.contact ?? 0.51;
      let phase =
        t < plan.first ? lerp(0, hitPos, clamp((t - plan.lead) / (plan.first - plan.lead))) : hitPos;
      if (t > plan.first + hitHold) {
        const next = plan.beats.find((b) => b.at > t && b.group.some((e) => e.source === 'strike'));
        phase = next
          ? hitPos - 0.21 * Math.sin(Math.PI * clamp((next.at - t) / 157))
          : lerp(hitPos, 1, smooth(clamp((t - plan.last - hitHold) / (returnTime - plan.last - hitHold))));
      }
      if (!plan.burnOnly) pose(actor, meta, clip, phase);
      if (
        recoilTime >= 0 &&
        recoilTime < 155 &&
        lastResult?.target === (input.end ? 'player' : 'enemy') &&
        lastResult.group.some((e) => e.type === 'damage')
      ) {
        pose(target, defenderMeta, defenderMeta?.clips.hurt, 0.5);
      } else if (input.end && input.guard > 0 && offensive && t < plan.last + 110 && !plan.burnOnly) {
        pose(target, defenderMeta, defenderMeta?.clips.ward, 0.58);
      } else target.el.classList.remove('posed');
      const zoom = 1 + (melee ? (plan.kind === 'hammer' ? 0.16 : 0.125) : 0.06) * charge * (1 - back);
      const shake =
        offensive && recoilTime < 130
          ? Math.exp(-recoilTime / 38) * Math.sin(recoilTime * 0.16) * h * 0.013 * strength
          : 0;
      host.style.transformOrigin = `${offensive ? (dir > 0 ? 96 : 4) : (actor.fx / w) * 100}% 65%`;
      host.style.transform = `scale(${zoom}) translate(${shake}px,${-0.3 * shake}px)`;
      host.querySelector('.landscape').style.filter =
        `brightness(${1 - 0.19 * charge * (1 - back)}) saturate(${1 - 0.18 * charge * (1 - back)})`;
      if (input.outcome !== 'active' && t >= plan.last + 85) {
        const fallen = input.outcome === 'won' ? foe : hero;
        const fade = smooth(clamp((t - plan.last - 85) / 430));
        fallen.el.style.opacity = 1 - fade;
        fallen.el.style.rotate = (input.outcome === 'won' ? 9 : -9) * fade + 'deg';
        fallen.el.style.translate = (fallen === actor ? dx : stagger) + 'px ' + fade * fallen.h * 0.12 + 'px';
      }
      ctx.clearRect(0, 0, w, h);
      if (melee && a > 0.22 && t < plan.first + 100) {
        const life = clamp((t - plan.lead - (plan.first - plan.lead) * 0.22) / 260);
        decal(
          ctx,
          3,
          actor.fx - dir * actor.h * 0.04,
          actor.fy - h * 0.017,
          h * (0.16 + 0.3 * life),
          Math.sin(life * Math.PI) * 0.32,
          0,
          0.3,
          dir > 0,
        );
      }
      if (!plan.burnOnly && a > 0.12 && a < 1) {
        const along = offensive && !melee ? lunge : 0;
        const cx = lerp(actor.fx + dx + dir * actor.h * 0.15, target.fx, along);
        const cy = lerp(actor.chest, target.chest, along);
        if (!melee)
          decal(
            ctx,
            effectCell[plan.kind],
            cx,
            cy,
            h * (0.12 + 0.43 * a),
            Math.sin(a * Math.PI) * 0.85,
            t * 0.0009,
          );
        else if (a > 0.66)
          decal(
            ctx,
            plan.kind === 'thrust' ? 1 : 0,
            actor.fx + dx + dir * reach * 0.6,
            actor.chest,
            h * 0.45,
            0.52 * lunge,
            -dir * 0.18,
            1,
            dir < 0,
          );
      }
      for (const burst of bursts) {
        const age = t - burst.at;
        if (age < 0 || age > 510) continue;
        const u = age / 510,
          fade = (1 - u) ** 1.45,
          expansion = 1 - Math.exp(-age / 48);
        const hitSize =
          h *
          (burst.kind === 'hammer'
            ? 0.96
            : burst.kind === 'thrust'
              ? 0.88
              : ['rite', 'ward', 'block'].includes(burst.kind)
                ? 0.7
                : 0.76);
        const x = burst.x,
          y = burst.y;
        if (input.ignited) {
          decal(
            ctx,
            5,
            x - dir * h * 0.1,
            y - h * 0.01,
            h * (0.27 + 0.39 * expansion),
            fade * 0.85,
            -0.8 - dir * u,
            1.2,
          );
          decal(
            ctx,
            1,
            x - dir * h * 0.19,
            y,
            h * (0.44 + 0.48 * expansion),
            fade * 0.95,
            0.59,
            0.51,
            dir < 0,
          );
        }
        decal(
          ctx,
          effectCell[burst.kind] ?? 2,
          x,
          y,
          hitSize * (0.4 + 0.68 * expansion + 0.16 * u),
          fade * (0.7 + 0.3 * expansion),
          burst.kind === 'ward' || burst.kind === 'block' ? 0 : dir * 0.13 * u,
          1,
          dir < 0 && burst.kind !== 'ward',
        );
        if (burst.kind === 'hammer') decal(ctx, 2, x, y, hitSize * 0.66 * expansion, fade, 0);
        if ((burst.kind === 'blade' || burst.kind === 'thrust' || burst.kind === 'block') && u < 0.7)
          decal(ctx, 2, x, y, h * (0.13 + 0.54 * expansion), fade * 0.96, burst.index, 1);
        if (burst.kind === 'firebolt' || burst.kind === 'kindle' || burst.kind === 'burn')
          decal(ctx, 5, x, y - h * 0.05 * u, hitSize * 0.62, fade * 0.7, -u * 0.8);
      }
      for (const p of particles) {
        const age = t - p.at;
        if (age < 0 || age > p.life) continue;
        const sec = age / 1000;
        const xx = p.x + p.vx * sec,
          yy = p.y + p.vy * sec + 170 * sec * sec;
        ctx.globalAlpha = (1 - age / p.life) ** 1.5;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.thickness;
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx - p.vx * 0.027, yy - (p.vy + 340 * sec) * 0.027);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }
  window.AshBattleFX = { play, finish, prewarm, choreography };
})();
