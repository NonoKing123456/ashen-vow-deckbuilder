/* Route atlas and expedition rooms. Each command commits through Campaign. */
(function (root) {
  'use strict';
  const C = root.Campaign;
  const E = root.Engine;
  const marks = {
    combat: '<path d="m6 18 3-4m-4-2 8 7m-6-5 9-11 4-1-1 5-9 9"/>',
    elite: '<path d="M6 13 3 5l6 4 3-7 3 7 6-4-3 8v4l-6 5-6-5z"/><path d="m8 14 2 1m6-1-2 1"/>',
    camp: '<path d="M8 3c2 5-4 7-4 12a8 8 0 0 0 16 0c0-4-2-6-3-8 0 4-2 5-3 5 1-4-1-8-6-9z"/><path d="M9 20c-2-4 2-5 3-8 1 3 4 5 3 8"/>',
    shop: '<path d="M4 11v9h16v-9M3 11l2-7h14l2 7c-1 3-4 3-5 0-1 3-4 3-5 0-1 3-4 3-5 0-1 2-2 2-3 0z"/><path d="M9 20v-5h6v5"/>',
    event: '<path d="M8 8a4 4 0 1 1 6 3c-2 1-2 2-2 4"/><circle cx="12" cy="19" r=".7"/>',
    boss: '<path d="m2 6 5 4 5-8 5 8 5-4-3 11H5zM7 21h10"/><path d="m12 7 2 4-2 3-2-3z"/>',
    coin: '<ellipse cx="12" cy="12" rx="8" ry="9"/><path d="m12 6 3 6-3 6-3-6z"/>',
    relic: '<path d="m12 2 7 10-7 10-7-10z"/><path d="m6 12 6-3 6 3-6 3z"/>',
    quill: '<path d="M3 21 16 8M7 16C4 8 16 3 21 3c0 8-6 15-14 13z"/>',
    drop: '<path d="M12 2C9 8 4 11 4 15a8 8 0 1 0 16 0c0-4-5-7-8-13z"/><path d="M8 16c0 2 2 3 4 3"/>',
    gate: '<path d="M3 21h18M5 20V10c0-4 4-6 7-9 3 3 7 5 7 9v10M9 21V10l3-4 3 4v11"/>',
    flame: '<path d="M12 2c3 5-1 7 2 9 1-1 2-3 2-5 8 9 4 16-4 16-8 0-12-7-5-14-1 4 1 6 2 6 2-4-1-7 3-12z"/>',
    anvil: '<path d="M2 6h13v4h7c-1 4-5 6-10 6l2 4H7l2-4-4-3z"/><path d="M4 3h12"/>',
    heart: '<path d="M12 21 3 11C-1 4 7 0 12 7c5-7 13-3 9 4z"/>',
    cards: '<path d="m5 5 7-3 6 15-6 3M2 7l2 12 5-1M11 7h10v15H11z"/>',
    path: '<circle cx="5" cy="18" r="2"/><circle cx="19" cy="5" r="2"/><path d="M7 18h4a4 4 0 0 0 0-8h-1a2.5 2.5 0 0 1 0-5h7"/>',
    arrow: '<path d="M3 12h17m-6-6 6 6-6 6"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
  };
  const ordinal = ['第一幕', '第二幕', '第三幕'];
  const esc = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
    );
  const icon = (id, size = 24) =>
    '<svg class="ex-icon" aria-hidden="true" width="' +
    size +
    '" height="' +
    size +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' +
    (marks[id] || marks.relic) +
    '</svg>';
  const rule = '<div class="ex-rule" aria-hidden="true"><i></i></div>';
  const button = (action, label, style = '', disabled = false) =>
    '<button type="button" class="ex-button ' +
    style +
    '" data-ex="' +
    esc(action) +
    '" ' +
    (disabled ? 'disabled' : '') +
    '>' +
    label +
    '</button>';
  const head = (en, name, sub = '') =>
    '<header class="ex-head"><div class="ex-overline">' +
    esc(en) +
    '</div><h1>' +
    esc(name) +
    '</h1>' +
    rule +
    (sub ? '<p>' + esc(sub) + '</p>' : '') +
    '</header>';
  function emblem(id) {
    const ticks = Array.from(
      { length: 36 },
      (_, i) =>
        '<path d="M100 16v' + (i % 3 === 0 ? '8' : '3') + '" transform="rotate(' + i * 10 + ' 100 100)"/>',
    ).join('');
    return (
      '<div class="ex-emblem" aria-hidden="true"><svg viewBox="0 0 200 200" fill="none" stroke="currentColor"><circle cx="100" cy="100" r="83" stroke-dasharray="1 5"/><circle cx="100" cy="100" r="70"/><circle cx="100" cy="100" r="65" stroke-dasharray="119 17"/><path d="m100 5 56 95-56 95-56-95z" opacity=".48"/><path d="m100 13 87 87-87 87-87-87z" opacity=".23"/>' +
      ticks +
      '</svg><div>' +
      icon(id, 58) +
      '</div></div>'
    );
  }
  const actArt = ['parish', 'cloister', 'eclipse'];
  const eventArt = {
    tithe: 'bell',
    scribe: 'scribe',
    wellspring: 'font',
    coffin: 'parish',
    swarm: 'font',
    foundry: 'bell',
    pilot: 'cloister',
    mirror: 'orrery',
    bonevault: 'bell',
    astrarium: 'orrery',
    pawn: 'merchant',
  };
  function painting(scene, mark) {
    return (
      '<div class="ex-painting" aria-hidden="true"><div class="ex-painting-inner"><img src="assets/rooms/' +
      scene +
      '.webp" alt=""/></div><span class="ex-painting-seal">' +
      icon(mark, 23) +
      '</span></div>'
    );
  }
  function atlas(run, preview) {
    const options = C.choices(run).map((n) => n.id);
    const rows = run.route,
      nodes = rows.flat();
    const point = (n) => ({ x: 8 + n.x * 84, y: 6.5 + (7 - n.row) * (87 / 7) });
    const edges = [];
    nodes.forEach((node) =>
      node.next.forEach((id) => {
        const other = nodes.find((n) => n.id === id);
        const a = point(node),
          b = point(other);
        const traced = run.path.includes(id) && run.path.includes(node.id);
        const open = run.phase === 'map' && node.id === run.nodeId;
        edges.push(
          '<line class="' +
            (traced ? 'ex-traced' : open ? 'ex-open' : '') +
            '" x1="' +
            a.x +
            '%" y1="' +
            a.y +
            '%" x2="' +
            b.x +
            '%" y2="' +
            b.y +
            '%"/>',
        );
      }),
    );
    const tokens = nodes
      .map((n) => {
        const p = point(n);
        const current = n.id === run.nodeId,
          visited = run.path.includes(n.id);
        const open = run.phase === 'map' && options.includes(n.id);
        const status = current ? '所在位置' : visited ? '已抵达' : open ? '可前往' : '未抵达';
        const label = '第 ' + (n.row + 1) + ' 层 · ' + C.kinds[n.type] + ' · ' + n.name + ' · ' + status;
        const name = n.type === 'boss' ? E.enemies[n.enemyId]?.name || n.name : n.name;
        const tag = !preview && open ? 'button' : 'span';
        const attr =
          tag === 'button'
            ? 'type="button" data-ex="node:' + n.id + '" aria-label="' + esc(label) + '"'
            : 'role="img" aria-label="' + esc(label) + '"';
        return (
          '<' +
          tag +
          ' ' +
          attr +
          ' title="' +
          esc(label) +
          '" style="left:' +
          p.x +
          '%;top:' +
          p.y +
          '%" class="ex-node ex-n-' +
          n.type +
          (current ? ' is-current' : '') +
          (visited ? ' is-visited' : '') +
          (open ? ' is-open' : '') +
          '">' +
          icon(n.type, 19) +
          '<span class="ex-node-caption">' +
          esc(n.type === 'boss' ? name : C.kinds[n.type]) +
          '</span></' +
          tag +
          '>'
        );
      })
      .join('');
    const levels = rows
      .map(
        (row, i) =>
          '<span class="ex-level" style="top:' +
          point(row[0]).y +
          '%">' +
          String(i + 1).padStart(2, '0') +
          '</span>',
      )
      .join('');
    return (
      '<div class="ex-atlas ex-atlas-' +
      actArt[run.act - 1] +
      '"><div class="ex-atlas-spine"></div>' +
      levels +
      '<svg class="ex-links" aria-hidden="true">' +
      edges.join('') +
      '</svg>' +
      tokens +
      '</div>'
    );
  }
  function legend() {
    return (
      '<div class="ex-legend">' +
      Object.entries(C.kinds)
        .map(([k, l]) => '<span>' + icon(k, 15) + esc(l) + '</span>')
        .join('') +
      '</div>'
    );
  }
  function mapPreview(container, run) {
    container.innerHTML =
      '<div class="expedition-root ex-preview"><div class="ex-map-top"><span>' +
      esc(ordinal[run.act - 1]) +
      ' · ' +
      esc(C.acts[run.act - 1].name) +
      '</span><small>朝圣路线</small></div>' +
      atlas(run, true) +
      legend() +
      '</div>';
  }
  function map(run) {
    const act = C.acts[run.act - 1];
    const options = C.choices(run);
    return (
      '<div class="ex-map-page"><section class="ex-map-paper"><div class="ex-map-top"><span>' +
      icon('path', 19) +
      ' 朝圣路线</span><small>ACT ' +
      act.roman +
      ' / ' +
      esc(act.en) +
      '</small></div>' +
      atlas(run, false) +
      legend() +
      '</section><aside class="ex-map-side"><div class="ex-overline">ACT ' +
      act.roman +
      ' · ' +
      ordinal[run.act - 1] +
      '</div><h1>' +
      act.name +
      '</h1>' +
      rule +
      '<p>' +
      act.lore +
      '</p>' +
      (run.notice
        ? '<div class="ex-notice" role="status">' + icon('check', 15) + ' ' + esc(run.notice) + '</div>'
        : '') +
      '<div class="ex-choice-intro">选择前往第 ' +
      (options[0].row + 1) +
      ' 层的路线</div><div class="ex-map-actions">' +
      options
        .map(
          (n) =>
            '<button class="ex-route" type="button" data-ex="node:' +
            n.id +
            '"><span class="ex-route-icon">' +
            icon(n.type) +
            '</span><span><small>' +
            C.kinds[n.type] +
            (n.enemyId ? ' · ' + esc(E.enemies[n.enemyId]?.name) : '') +
            '</small><b>' +
            esc(n.name) +
            '</b></span>' +
            icon('arrow', 18) +
            '</button>',
        )
        .join('') +
      '</div></aside></div>'
    );
  }
  function cardFace(key) {
    if (root.AshUI && root.AshUI.card) return root.AshUI.card(key, { interactive: false });
    const card = E.card(key);
    return (
      '<span class="ex-fallback-card"><small>' +
      esc(card.cost) +
      ' ◆</small>' +
      icon(card.type === 'attack' ? 'combat' : 'relic', 51) +
      '<strong>' +
      esc(card.name) +
      '</strong><span>' +
      esc(card.description || card.desc) +
      '</span></span>'
    );
  }
  function reward(run) {
    const r = run.room;
    return (
      '<div class="ex-standard ex-loot">' +
      head('SPOILS OF THE VIGIL', '战利品', '选择一张牌加入你的牌组。') +
      '<div class="ex-payout"><span>' +
      icon('coin', 18) +
      ' 已获得 ' +
      r.gold +
      ' 铸币</span>' +
      (r.relic
        ? '<span title="' +
          esc(E.relics[r.relic].description) +
          '">' +
          icon('relic', 18) +
          ' ' +
          esc(E.relics[r.relic].name) +
          '</span>'
        : '') +
      '</div><div class="ex-reward-cards">' +
      r.cards
        .map(
          (id, i) =>
            '<button type="button" class="ex-card-offer" aria-label="获得 ' +
            esc(E.card(id).name) +
            '" data-ex="reward:' +
            i +
            '">' +
            cardFace(id) +
            '</button>',
        )
        .join('') +
      '</div>' +
      button('skip', '跳过选牌 ' + icon('arrow', 17), 'ex-subtle') +
      '</div>'
    );
  }
  function option(id, title, text, mark, disabled = false) {
    return (
      '<button type="button" class="ex-option" data-ex="' +
      id +
      '" ' +
      (disabled ? 'disabled' : '') +
      '><span class="ex-option-icon">' +
      icon(mark, 30) +
      '</span><span><b>' +
      esc(title) +
      '</b><small>' +
      esc(text) +
      '</small></span>' +
      icon('arrow', 18) +
      '</button>'
    );
  }
  function narrative(en, title, story, mark, body, scene) {
    return (
      '<div class="ex-narrative"><div class="ex-illustration">' +
      painting(scene, mark) +
      '</div><section><div class="ex-overline">' +
      esc(en) +
      '</div><h1>' +
      esc(title) +
      '</h1>' +
      rule +
      '<p class="ex-story">' +
      esc(story) +
      '</p><div class="ex-options">' +
      body +
      '</div></section></div>'
    );
  }
  function camp(run) {
    return narrative(
      'SANCTUARY',
      C.currentNode(run).name,
      '铁罩里的余烬尚温。你可以在这里包扎伤口，或把一行新的誓词刻进旧牌。',
      'camp',
      option(
        'rest',
        '倚火休整',
        '恢复 ' + Math.ceil(run.maxHp * 0.32) + ' 生命（当前 ' + run.hp + ' / ' + run.maxHp + '）。',
        'heart',
        run.hp === run.maxHp,
      ) +
        option(
          'pick:camp',
          '锤炼誓牌',
          '选择一张尚未锤炼的牌，永久升级。',
          'anvil',
          !run.deck.some((_, i) => C.canUpgrade(run, i)),
        ) +
        button('leave', '离开营火 ' + icon('arrow', 17), 'ex-subtle'),
      'camp',
    );
  }
  function eventRoom(run) {
    const e = C.currentEvent(run);
    return narrative(
      e.en,
      e.name,
      e.lore,
      e.icon,
      e.options
        .map((o) => option('event:' + o.id, o.name, o.text, e.icon, !C.eventEnabled(run, o.effect)))
        .join('') + button('leave', '默然离去 ' + icon('arrow', 17), 'ex-subtle'),
      eventArt[e.id],
    );
  }
  function shop(run) {
    const wares = run.room.items;
    return (
      '<div class="ex-shop-layout"><aside class="ex-stall">' +
      painting('merchant', 'shop') +
      '</aside><div class="ex-standard ex-shop">' +
      head('THE ASH PEDDLER', '渡烬商旅', '商人揭开旧毯。灯油、遗物与折角的誓牌，整齐地陈列在灰里。') +
      '<div class="ex-payout">' +
      icon('coin', 18) +
      ' 持有 ' +
      run.gold +
      ' 铸币</div><div class="ex-shop-grid">' +
      wares
        .map((w) => {
          let name, description, mark;
          if (w.type === 'card') {
            const c = E.card(w.id);
            name = c.name;
            description = c.description || c.desc;
            mark = 'cards';
          } else if (w.type === 'relic') {
            const r = E.relics[w.id];
            name = r.name;
            description = r.description;
            mark = 'relic';
          } else if (w.type === 'tend') {
            name = '苦香药膏';
            description = '恢复 15 点生命。';
            mark = 'drop';
          } else {
            name = '忘却仪式';
            description = '选择并永久移除一张牌。';
            mark = 'quill';
          }
          const unusable =
            w.sold ||
            w.price > run.gold ||
            (w.type === 'tend' && run.hp === run.maxHp) ||
            (w.type === 'purge' && run.deck.length < 2);
          return (
            '<button type="button" class="ex-ware' +
            (w.sold ? ' is-sold' : '') +
            '" data-ex="buy:' +
            w.key +
            '" ' +
            (unusable ? 'disabled' : '') +
            '><span class="ex-ware-mark">' +
            icon(mark, 26) +
            '</span><span class="ex-ware-text"><b>' +
            esc(name) +
            '</b><small>' +
            esc(description) +
            '</small></span><span class="ex-price">' +
            (w.sold ? '已购' : icon('coin', 14) + ' ' + w.price) +
            '</span></button>'
          );
        })
        .join('') +
      '</div>' +
      button('leave', '返回路线 ' + icon('arrow', 17), 'ex-primary') +
      '</div></div>'
    );
  }
  function picker(run, mode) {
    const option =
      mode.startsWith('event:') && C.currentEvent(run).options.find((o) => o.id === mode.slice(6));
    const effect = option ? option.effect : mode;
    const isRemove = effect === 'purge' || effect === 'erase';
    const isCopy = effect === 'bloodcopy' || effect === 'silvercopy';
    return (
      '<div class="ex-standard ex-pick">' +
      head(
        isRemove ? 'RITE OF FORGETTING' : isCopy ? 'THE SECOND OATH' : 'RITE OF TEMPERING',
        isRemove ? '选择遗忘的牌' : isCopy ? '选择复制的牌' : '选择锤炼的牌',
        isRemove
          ? '选择后，该牌将永久移出本局牌组。'
          : isCopy
            ? '将一张完全相同的牌加入本局牌组。'
            : '下列牌面展示升级后的效果。选择后生效。',
      ) +
      '<div class="ex-picker">' +
      run.deck
        .map((id, i) => {
          if (!isRemove && !isCopy && !C.canUpgrade(run, i)) return '';
          const card = E.card(isRemove || isCopy ? id : E.upgrade(id));
          return (
            '<button type="button" class="ex-pick-row" data-ex="index:' +
            i +
            '"><span class="ex-index">' +
            String(i + 1).padStart(2, '0') +
            '</span><span><b>' +
            esc(card.name) +
            '</b><small>' +
            esc(card.description || card.desc) +
            '</small></span>' +
            icon(isRemove ? 'quill' : isCopy ? 'cards' : 'anvil', 20) +
            '</button>'
          );
        })
        .join('') +
      '</div>' +
      button('cancel', '返回', 'ex-subtle') +
      '</div>'
    );
  }
  function terminal(run) {
    const won = run.phase === 'victory',
      p = C.profile();
    const choices = Array.from(
      { length: p.maxAscension + 1 },
      (_, i) =>
        '<option value="' +
        i +
        '" ' +
        (i === Math.min(p.maxAscension, run.ascension + (won ? 1 : 0)) ? 'selected' : '') +
        '>' +
        (i === 0 ? '初始难度' : '誓阶 ' + i) +
        '</option>',
    ).join('');
    const records = p.history
      .slice(0, 10)
      .map(
        (rec, i) =>
          '<button class="ex-history-row" type="button" data-ex="history:' +
          i +
          '"><span>' +
          esc(rec.date.slice(0, 10)) +
          '</span><b>' +
          (rec.won ? '归来' : '止步') +
          ' · ' +
          rec.floor +
          ' 层</b><span>' +
          esc(rec.seed) +
          '</span>' +
          icon('arrow', 14) +
          '</button>',
      )
      .join('');
    return (
      '<div class="ex-standard ex-ending ' +
      (won ? 'ex-won' : '') +
      '">' +
      emblem(won ? 'flame' : 'gate') +
      head(
        won ? 'THE DAWN RETURNS' : 'THE VIGIL ENDS',
        won ? '长夜，终有余火' : '灯火归于沉寂',
        won
          ? '最后一座钟塔响起，失落的黎明循声而来。'
          : '黑暗合上了这一页。你走过的路，已刻进守灯人的编年史。',
      ) +
      '<div class="ex-score">' +
      [
        ['抵达层数', run.floor + ' / 24'],
        ['取胜场次', run.stats.victories],
        ['所得铸币', run.stats.gold],
        ['终局牌组', run.deck.length],
      ]
        .map(([k, v]) => '<span><b>' + v + '</b><small>' + k + '</small></span>')
        .join('') +
      '</div>' +
      '<div class="ex-record">历次朝圣 ' +
      p.runs +
      '　·　通关 ' +
      p.wins +
      '　·　最高 ' +
      p.bestFloor +
      ' 层</div>' +
      '<div class="ex-run-code">本局种子 <code>' +
      esc(run.seed) +
      '</code></div><form class="ex-new-run"><label>朝圣种子<input type="text" name="seed" maxlength="48" placeholder="随机种子" autocomplete="off" /></label><label>难度<select name="ascension">' +
      choices +
      '</select></label><button class="ex-button ex-primary" type="submit">再次启程 ' +
      icon('arrow', 17) +
      '</button></form>' +
      (records
        ? '<details class="ex-history"><summary>远征记录 · 选择种子重游</summary>' + records + '</details>'
        : '') +
      '</div>'
    );
  }
  function transition(run) {
    const a = C.acts[run.act];
    return narrative(
      'ACT ' + a.roman + ' · ' + a.en,
      a.name,
      a.lore,
      'gate',
      '<p class="ex-transition-note">' +
        icon('heart', 16) +
        ' 幕间休憩将恢复 ' +
        Math.ceil((run.maxHp - run.hp) * 0.6) +
        ' 生命。</p>' +
        button('continue', '进入' + ordinal[run.act] + ' ' + icon('arrow', 17), 'ex-primary'),
      actArt[run.act],
    );
  }
  function render(container, run, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'expedition-root ex-room ex-phase-' + run.phase;
    let selection = '';
    const redraw = () => {
      if (selection) wrapper.innerHTML = picker(run, selection);
      else {
        const screens = {
          map,
          reward,
          camp,
          event: eventRoom,
          shop,
          transition,
          victory: terminal,
          defeat: terminal,
        };
        wrapper.innerHTML = screens[run.phase] ? screens[run.phase](run) : '';
      }
    };
    const change = (next) => {
      if (typeof onChange === 'function') onChange(next);
      else render(container, next);
    };
    const select = (mode) => {
      selection = mode;
      redraw();
      wrapper.querySelector('button:not([disabled])')?.focus({ preventScroll: true });
    };
    wrapper.addEventListener('click', (e) => {
      const target = e.target.closest('button[data-ex]');
      if (!target || target.disabled) return;
      const [action, value] = target.dataset.ex.split(':');
      if (action === 'history') {
        const rec = C.profile().history[Number(value)];
        const form = wrapper.querySelector('.ex-new-run');
        if (rec && form) {
          form.elements.seed.value = rec.seed;
          form.elements.ascension.value = rec.ascension;
          form.elements.seed.focus();
        }
        return;
      }
      if (action === 'pick') {
        select(value);
        return;
      }
      if (action === 'cancel') {
        select('');
        return;
      }
      if (action === 'buy' && value === 'purge') {
        select('purge');
        return;
      }
      if (action === 'event') {
        const op = C.currentEvent(run)?.options.find((o) => o.id === value);
        if (!op) return;
        if (['purge', 'erase', 'study', 'lesson', 'bloodcopy', 'silvercopy'].includes(op.effect)) {
          select('event:' + value);
          return;
        }
        change(C.event(run, value));
        return;
      }
      if (action === 'index') {
        const idx = Number(value);
        if (selection === 'camp') change(C.camp(run, 'upgrade', idx));
        else if (selection === 'purge') change(C.purchase(run, 'purge', idx));
        else if (selection.startsWith('event:')) change(C.event(run, selection.slice(6), idx));
        return;
      }
      const commands = {
        node: () => C.enter(run, value),
        reward: () => C.reward(run, run.room.cards[Number(value)]),
        skip: () => C.reward(run, null),
        leave: () => C.leave(run),
        rest: () => C.camp(run, 'rest'),
        continue: () => C.continueAct(run),
        buy: () => C.purchase(run, value),
      };
      if (commands[action]) change(commands[action]());
    });
    wrapper.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!e.target.matches('.ex-new-run')) return;
      const data = new FormData(e.target);
      change(C.newRun({ seed: data.get('seed'), ascension: Number(data.get('ascension')) }));
    });
    redraw();
    container.replaceChildren(wrapper);
  }
  root.ExpeditionUI = { render, mapPreview };
})(globalThis);
