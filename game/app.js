(function game() {
  'use strict';
  const { icon, esc, types, ranks, card } = AshUI,
    $ = (s) => document.querySelector(s);
  const stage = $('#stage'),
    hud = $('#hud'),
    bar = $('#statusbar'),
    dialog = $('#overlay'),
    inner = $('#modal-inner');
  let run = Campaign.load() || Campaign.newRun(),
    locked = false,
    enemyActing = false,
    queued = null,
    sceneKey = '',
    modal = '',
    bookTab = 'cards',
    deckFilter = 'all',
    advanced = false,
    toastTimer = 0,
    lastJournal = [],
    motionPref = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let settings = { music: 35, effects: 65, muted: false, reduced: motionPref };
  try {
    Object.assign(settings, JSON.parse(localStorage.getItem('ashenvow.prefs') || '{}'));
  } catch {}
  function prefs() {
    document.documentElement.classList.toggle('quiet', settings.reduced);
    AshAudio.set(settings);
    window.AshFigures?.resume();
    try {
      localStorage.setItem('ashenvow.prefs', JSON.stringify(settings));
    } catch {}
  }
  prefs();
  const roman = ['I', 'II', 'III'],
    digits = (n) => String(n).padStart(2, '0');
  const btn = (action, html, cls = '', title = '') =>
    `<button type="button" class="${cls}" data-act="${action}" ${title ? `title="${esc(title)}" aria-label="${esc(title)}"` : ''}>${html}</button>`;
  function note(msg) {
    const toast = $('#toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2100);
  }
  function top() {
    const active =
      modal === 'deck'
        ? 'deck'
        : modal === 'codex'
          ? 'codex'
          : modal === 'map' || run.phase === 'map'
            ? 'map'
            : 'battle';
    const nav = [
      ['battle', 'swords', '远征'],
      ['map', 'map', '地图'],
      ['deck', 'deck', '牌组'],
      ['codex', 'book', '图鉴'],
    ];
    hud.innerHTML = `<button type="button" class="brand" data-act="title" title="主菜单" aria-label="打开主菜单"><span class="brand-sigil">${icon('brand', 44)}</span><div><strong>灰烬誓约</strong><small>ASHEN VOW</small></div></button><nav aria-label="游戏导航">${nav.map(([id, i, name]) => btn(id, `${icon(i, 17)}<span>${name}</span>${id === 'deck' ? `<small>${run.deck.length}</small>` : ''}`, `nav-item ${active === id ? 'active' : ''}`)).join('')}</nav><div class="hud-right">${run.phase === 'combat' ? '' : '<div class="travel-hp">' + icon('heart', 15) + ' ' + run.hp + ' / ' + run.maxHp + '</div>'}${btn('relics', icon('lamp', 20) + `<span>遗物</span><b>${run.relics.length}</b>`, 'relic-icon', '查看携带的遗物')}<div class="gold" title="铸币，可在商旅和奇遇中使用">${icon('coin', 20)}<b>${run.gold}</b></div>${btn('settings', icon('settings', 20), 'gear', '设置')}</div>`;
  }
  function foot() {
    const inCombat = run.phase === 'combat';
    bar.innerHTML = `<div class="bar-left"><span class="save-led"></span>${Campaign.storageFailed ? '存档暂存于内存' : '自动存档'}<i></i>${btn('guide', icon('question', 14) + '玩法说明', 'foot-link')}</div><div class="bar-keys">${inCombat ? '<kbd>1–9</kbd> 出牌 <kbd>空格</kbd> 结束回合 <kbd>M</kbd> 地图' : ''}</div><div class="bar-right">${btn('log', icon('log', 14) + '战斗记录', 'foot-link')}${btn('mute', icon(settings.muted ? 'mute' : 'sound', 17), 'foot-link', settings.muted ? '开启声音' : '静音')}</div>`;
  }
  function meter(target, p) {
    const isPlayer = target === 'player';
    const tags = [
      ['block', '格挡', 'shield'],
      ['burn', '灼烧', 'flame'],
      ['strength', '力量', 'sword'],
      ['weak', '虚弱', 'feather'],
      ['vulnerable', '易伤', 'heart'],
      ['frail', '脆弱', 'shield'],
    ];
    return `<div class="fighter-hud ${target}"><div class="fighter-name">${isPlayer ? icon('lamp', 15) : icon(p.tier === 'boss' ? 'crown' : 'swords', 15)}<b>${isPlayer ? '守誓人' : esc(p.name)}</b><small>${isPlayer ? 'OATHKEEPER' : esc(p.en.replace(/^The /, '').toUpperCase())}</small></div><div class="hp-line"><div class="hp-track"><i style="width:${(p.hp / p.maxHp) * 100}%"></i></div><strong>${p.hp}<em> / ${p.maxHp}</em></strong></div><div class="tags">${tags
      .filter(([key]) => p[key] > 0)
      .map(
        ([key, label, i]) =>
          `<span title="${esc(Engine.rules[key] || label)}">${icon(i, 12)}${label} ${p[key]}</span>`,
      )
      .join('')}${
      isPlayer
        ? Object.entries(p.powers)
            .filter(([, v]) => v)
            .map(
              ([k, v]) =>
                `<span>${{ pilot: '归途颂', bulwark: '行灯列阵', thorns: '荆棘', kindling: '殉灯者', zeal: '灰冠' }[k]} ${v}</span>`,
            )
            .join('')
        : ''
    }</div></div>`;
  }
  function setGuardLights(player, enemy) {
    $('.hero-model')?.classList.toggle('guarded', player > 0);
    $('.foe-model')?.classList.toggle('guarded', enemy > 0);
  }
  function combatScene() {
    const b = run.battle,
      enemy = b.enemy,
      intent = enemy.intent,
      act = Campaign.acts[run.act - 1];
    const relative = `assets/field-${run.act}.webp`;
    const image = new URL(relative, document.baseURI).href;
    const intentIcon = { attack: 'sword', guard: 'shield', buff: 'crown', curse: 'flame' }[intent.type];
    const key = run.id + '/' + run.nodeId;
    if (sceneKey !== key || !$('#arena')) {
      sceneKey = key;
      AshBattleFX.prewarm(enemy.id);
      stage.innerHTML = `<section id="arena" style="--arena:url('${image}')"><div class="battle-world"><div class="landscape"></div><i class="ground-shadow hero-shadow"></i><i class="ground-shadow foe-shadow"></i><div class="combatant hero-model"><img class="idle-art" alt="" src="assets/oathkeeper.webp"></div><div class="combatant foe-model ${enemy.tier} ${enemy.id}"><img class="idle-art" alt="" src="assets/enemies/${enemy.id}.webp"></div><div class="arena-light"></div><div class="cinders" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--x:${(i * 17) % 97}%;--t:${5 + (i % 6)}s;--d:-${i * 0.83}s"></i>`).join('')}</div><canvas class="combat-fx" aria-hidden="true"></canvas></div><div class="scene-heading"><div class="act-title"><i></i>ACT ${roman[run.act - 1]}<span>/</span>第${['一', '二', '三'][run.act - 1]}幕</div><h1>${act.name}</h1><div class="place">${icon('layer', 13)}第 ${digits(run.floor)} 层<b>·</b>${esc(Campaign.currentNode(run).name)}</div></div><div id="intention"></div><div id="fighters"></div><div id="vfx" aria-hidden="true"></div></section><section id="table"></section>`;
      AshFigures.attach($('#arena'));
    }
    $('#intention').innerHTML = btn(
      'intent',
      `<span class="intent-icon">${icon(intentIcon, 20)}</span><span><small>敌方意图</small><b>${esc(intent.name)}</b></span>${intent.damage ? `<strong>${intent.damage}${intent.hits > 1 ? '×' + intent.hits : ''}</strong>` : intent.block ? `<strong>+${intent.block}</strong>` : ''}`,
      'intent-button',
      intent.description,
    );
    $('#fighters').innerHTML = meter('player', b) + meter('enemy', enemy);
    setGuardLights(b.block, enemy.block);
    const tip =
      run.floor === 1 && b.turn === 1
        ? b.ember < 3 && b.hand.includes('kindle') && b.hand.includes('cinder')
          ? '先打出「引火」，可强化「烬火刺」。'
          : b.energy === 0
            ? '能量已尽，结束回合可重新抽牌。'
            : ''
        : '';
    const pile = (id, label, list, ic) =>
      btn(id, `${icon(ic, 22)}<span>${label}</span><b>${list.length}</b>`, 'pile');
    $('#table').innerHTML =
      `<div class="table-seam"><i></i></div><div class="turn-line"><span class="turn-glyph">${icon('sun', 18)}</span><strong>你的回合</strong><i></i><small>TURN ${digits(b.turn)}</small><span class="line-fade"></span>${tip ? '<small class="tactical-hint">' + tip + '</small>' : ''}</div><div class="desk"><aside class="left-console"><div class="energy-dial" title="${Engine.rules.energy}"><div class="dial-inner"><small>能　量</small><span><b>${b.energy}</b><i>/</i>${b.maxEnergy}</span></div></div><div class="embers" title="${Engine.rules.ember}"><span>${icon('flame', 13)}炉火</span><b>${b.ember} <em>/ 6</em></b></div><div class="ember-ticks" aria-hidden="true">${Array.from({ length: 6 }, (_, i) => `<i class="${b.ember > i ? 'lit' : ''}"></i>`).join('')}</div></aside><div id="hand" class="${b.hand.length > 6 ? 'crowded' : ''}" style="--count:${b.hand.length};--slots:${Math.max(5, b.hand.length)}">${b.hand.map((key, index) => `<button type="button" class="hand-card ${Engine.canPlay(b, index) ? '' : 'unavailable'}" data-play="${index}" aria-label="${esc(Engine.card(key).name + '：' + Engine.card(key).description)}" aria-disabled="${!Engine.canPlay(b, index)}">${card(key)}<span class="card-shortcut">${index === 9 ? '0' : index + 1}</span></button>`).join('') || '<p class="empty-hand">手牌已尽</p>'}</div><aside class="right-console"><div class="pile-box">${pile('draw', '抽牌堆', b.draw, 'draw')}${pile('discard', '弃牌堆', b.discard, 'discard')}${b.exhaust.length ? pile('exhaust', '消耗堆', b.exhaust, 'flame') : ''}</div>${btn('end', `<span>结束回合</span>${icon('arrow', 17)}`, 'end-turn')}<small class="end-hint">SPACE</small></aside></div>`;
  }
  function render(next = run) {
    run = next;
    top();
    foot();
    AshAudio.scene(run.act, run.phase === 'combat');
    stage.className = run.phase === 'combat' ? 'battle-stage' : 'journey-stage';
    if (run.phase === 'combat') combatScene();
    else {
      sceneKey = '';
      ExpeditionUI.render(stage, run, (nextRun) => {
        AshAudio.play(nextRun.phase === 'combat' ? 'turn' : 'click');
        render(nextRun);
      });
    }
  }
  function castGhost(key, rect) {
    const el = document.createElement('div');
    el.className = 'cast-ghost';
    el.innerHTML = card(key);
    Object.assign(el.style, { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px' });
    document.body.append(el);
    const anim = el.animate(
      [
        { opacity: 1, transform: 'perspective(650px) translateY(0) scale(1)', filter: 'brightness(1.1)' },
        {
          offset: 0.34,
          opacity: 0.99,
          transform: 'perspective(650px) translateY(-22px) rotateX(-9deg) scale(1.045)',
          filter: 'brightness(1.32)',
        },
        {
          opacity: 0,
          transform: 'perspective(650px) translateY(-94px) rotateX(56deg) scale(.62)',
          filter: 'brightness(1.55)',
        },
      ],
      { duration: 245, easing: 'cubic-bezier(.25,.7,.45,1)', fill: 'forwards' },
    );
    anim.onfinish = anim.oncancel = () => el.remove();
  }
  function dealHand(previous) {
    const pile = document.querySelector('[data-act="draw"]')?.getBoundingClientRect();
    document.querySelectorAll('.hand-card').forEach((el, i) => {
      const key = el.querySelector('.playing-card').dataset.card;
      const found = previous.findIndex((c) => c.key === key);
      const orig = found < 0 ? null : previous.splice(found, 1)[0].rect;
      const box = el.getBoundingClientRect();
      if (orig) {
        const dx = orig.left - box.left;
        if (Math.abs(dx) > 2)
          el.animate([{ translate: dx + 'px 0' }, { translate: '0 0' }], {
            duration: 180,
            easing: 'cubic-bezier(.18,.76,.25,1)',
          });
      } else {
        const dx = Math.min(190, Math.max(25, (pile?.left ?? box.right) - box.left));
        el.animate(
          [
            { opacity: 0, transform: `translate(${dx}px,16px) rotate(9deg) scale(.83)` },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 235, delay: i * 20, fill: 'backwards', easing: 'cubic-bezier(.15,.72,.2,1)' },
        );
      }
    });
  }
  function inspect(key) {
    const c = Engine.card(key),
      up = Engine.card(Engine.upgrade(key));
    show(
      'inspect',
      c.name,
      'CARD INSPECTION',
      '<div class="inspect-layout"><div>' +
        card(key) +
        '</div><section><small>' +
        esc(c.en) +
        '</small><h3>' +
        types[c.type] +
        ' · ' +
        ranks[c.rarity] +
        '</h3><p>' +
        esc(c.description) +
        '</p>' +
        (c.upgraded ? '' : '<h3>锤炼后</h3><p>' + esc(up.description) + '</p>') +
        '</section></div>',
    );
  }
  function titleMenu() {
    show(
      'title',
      '灰烬誓约',
      'ASHEN VOW',
      '<div class="title-menu"><small>ASHEN VOW</small><h1>灰烬誓约</h1><div class="title-rule"></div><p>第 ' +
        digits(run.floor) +
        ' 层　·　' +
        Campaign.acts[run.act - 1].name +
        '</p>' +
        btn('battle', icon('lamp', 17) + '继续远征' + icon('arrow', 15), 'title-continue') +
        btn('newform', '开始新的远征') +
        btn('codex', '灰烬图鉴') +
        btn('settings', '游戏设置') +
        (window.AshDesktop ? btn('quit', '退出游戏') : '') +
        '</div>',
      true,
    );
  }
  function action(index) {
    const isEnd = index === null;
    if (dialog.open || run.phase !== 'combat') return;
    const b = run.battle;
    if (locked) {
      if (!enemyActing && !queued && (!isEnd ? Engine.canPlay(b, index) : true)) {
        queued = { key: isEnd ? null : b.hand[index], index, turn: b.turn, runId: run.id };
        document
          .querySelector(isEnd ? '[data-act="end"]' : `[data-play="${index}"]`)
          ?.classList.add('queued-card');
      }
      return;
    }
    if (!isEnd && !Engine.canPlay(b, index)) {
      note(Engine.blockedReason(b, index) || '这张牌当前不可用');
      return;
    }
    const usedKey = isEnd ? null : b.hand[index];
    const cardData = usedKey ? Engine.card(usedKey) : null;
    const oldHand = [...document.querySelectorAll('.hand-card')].map((el, i) => ({
      key: b.hand[i],
      rect: el.getBoundingClientRect(),
      used: !isEnd && i === index,
    }));
    const before = { player: { ...b, powers: { ...b.powers } }, enemy: { ...b.enemy } };
    const intent = { ...b.enemy.intent };
    const name = isEnd ? intent.name : cardData.name;
    if (!(isEnd ? Engine.endTurn(b) : Engine.playCard(b, index))) return;
    lastJournal = b.log.slice();
    run.journal = lastJournal;
    Campaign.syncBattle(run);
    locked = true;
    enemyActing = isEnd;
    const reduced = settings.reduced;
    if (!isEnd) {
      AshAudio.cue?.('cast', { pan: 0, intensity: 0.66 });
      if (!reduced) castGhost(usedKey, oldHand[index].rect);
      if (run.phase === 'combat') {
        render();
        if (!reduced) dealHand(oldHand.filter((c) => !c.used));
      } else {
        const used = document.querySelector(`[data-play="${index}"]`);
        if (used) used.style.visibility = 'hidden';
      }
    } else {
      document.querySelector('.turn-line strong').textContent = '敌方回合';
      const hint = document.querySelector('.tactical-hint');
      if (hint) hint.textContent = '';
      if (!reduced)
        document.querySelectorAll('.hand-card').forEach((el, i) =>
          el.animate(
            [
              { opacity: 1, transform: 'translate(0,0)' },
              { opacity: 0, transform: 'translate(25px,17px) rotate(5deg) scale(.94)' },
            ],
            { duration: 125, delay: i * 13, fill: 'forwards' },
          ),
        );
    }
    const updateMeters = () => {
      $('#fighters').innerHTML = meter('player', before.player) + meter('enemy', before.enemy);
      setGuardLights(before.player.block, before.enemy.block);
    };
    updateMeters();
    AshBattleFX.play({
      card: cardData,
      enemyId: b.enemy.id,
      end: isEnd,
      name,
      intent,
      outcome: b.status,
      events: b.events,
      reduced,
      guard: before.player.block,
      ignited: cardData?.effects.some((e) => e.kind === 'litHit') && before.player.ember >= 3,
      onBeat(events) {
        const priorHp = { player: before.player.hp, enemy: before.enemy.hp };
        for (const e of events) {
          const unit = before[e.target];
          if (e.type === 'damage') unit.hp = Math.max(0, unit.hp - e.value);
          if (e.type === 'heal') unit.hp = Math.min(unit.maxHp, unit.hp + e.value);
          if (e.type === 'block') unit.block += e.value;
          if (e.type === 'blocked') unit.block = Math.max(0, unit.block - e.value);
          if (e.type === 'burn') unit.burn = (unit.burn || 0) + e.value;
        }
        updateMeters();
        if (!reduced)
          for (const side of ['player', 'enemy']) {
            const unit = before[side],
              lost = priorHp[side] - unit.hp;
            if (lost <= 0) continue;
            const strip = document.createElement('span');
            strip.className = 'hp-loss';
            strip.style.left = (100 * unit.hp) / unit.maxHp + '%';
            strip.style.width = (100 * lost) / unit.maxHp + '%';
            document.querySelector('.fighter-hud.' + side + ' .hp-track').append(strip);
            strip.animate(
              [
                { opacity: 0.95, scale: '1 1' },
                { offset: 0.35, opacity: 0.83 },
                { opacity: 0, scale: '0 1' },
              ],
              { duration: 410, fill: 'forwards' },
            ).onfinish = () => strip.remove();
          }
      },
      onFinish() {
        locked = false;
        enemyActing = false;
        if (isEnd || run.phase !== 'combat') {
          if (run.phase !== 'combat') AshAudio.play(run.phase === 'defeat' ? 'turn' : 'reward');
          render();
          if (isEnd && run.phase === 'combat') {
            AshAudio.cue?.('draw', { intensity: 0.6, pan: 0 });
            if (!reduced) dealHand([]);
          }
        } else {
          $('#fighters').innerHTML = meter('player', b) + meter('enemy', b.enemy);
          setGuardLights(b.block, b.enemy.block);
        }
        const next = queued;
        queued = null;
        if (
          next &&
          run.id === next.runId &&
          run.phase === 'combat' &&
          next.turn === b.turn &&
          (next.index === null || next.key === b.hand[next.index])
        ) {
          action(next.index);
        }
      },
    });
  }
  function show(id, title, en, body, wide = false) {
    const previous = modal;
    modal = id;
    dialog.classList.toggle('title-screen', id === 'title');
    inner.innerHTML = `<div class="modal-heading"><div><small>${en}</small><h2 id="modal-title">${title}</h2></div>${btn('close', icon('close', 18), 'close', '关闭面板')}</div><div class="modal-content">${body}</div>`;
    dialog.classList.toggle('wide', wide);
    if (!dialog.open) dialog.showModal();
    if (previous !== id) inner.scrollTop = 0;
    top();
  }
  function close() {
    if (dialog.open) dialog.close();
    modal = '';
    top();
  }
  function listing(keys) {
    return keys.length
      ? `<div class="card-grid">${keys.map((k) => `<div>${card(k)}</div>`).join('')}</div>`
      : '<div class="void">这里还没有卡牌。</div>';
  }
  function tabs(options, active) {
    return `<div class="tabs">${options.map(([id, name]) => btn(id, name, active === id ? 'selected' : '')).join('')}</div>`;
  }
  function guide() {
    show(
      'guide',
      '守誓人手册',
      'FIELD MANUAL',
      `<div class="guide-intro">穿过三幕、二十四层，为失钟教区重新点灯。每场交战只需击倒眼前的敌人。</div><div class="rule-list">${[
        [
          'sword',
          '打出手牌',
          '点击手牌、拖到战场，或按数字键出牌。右键查看完整牌面。左上数字是能量费用。攻击会自动击中敌人。',
        ],
        ['shield', '读懂敌人', '敌人头顶的意图预告下次行动。先用格挡抵消攻击，结束回合后敌人行动。'],
        ['flame', '积攒炉火', Engine.rules.ember + ' 先打「引火」，再打「烬火刺」可增加伤害。'],
        ['deck', '建立牌组', Engine.rules.draw + ' 每场胜利可从三张牌中选一张，也可以跳过。'],
        ['map', '选择路线', '商旅出售牌与遗物，营火可休息或锤炼一张牌。击败每幕第八层的幕主可继续前行。'],
      ]
        .map(([i, n, t]) => `<section>${icon(i, 26)}<div><h3>${n}</h3><p>${t}</p></div></section>`)
        .join('')}</div>`,
    );
  }
  function codex() {
    const menus = [
      ['cod-cards', '卡牌'],
      ['cod-enemies', '敌人'],
      ['cod-relics', '遗物'],
      ['cod-rules', '术语'],
      ['cod-history', '远征记录'],
    ];
    const group = (title, body) => `<article class="entry"><h3>${title}</h3><p>${body}</p></article>`;
    let body = '';
    if (bookTab === 'cards')
      body =
        tabs(
          [
            ['filter-all', '全部 · ' + Engine.cards.length],
            ['filter-attack', '攻击'],
            ['filter-skill', '技能'],
            ['filter-power', '能力'],
            ['upgrade-view', advanced ? '查看基础牌' : '查看升级牌'],
          ],
          'filter-' + deckFilter,
        ) +
        listing(
          Engine.cards
            .filter((c) => deckFilter === 'all' || c.type === deckFilter)
            .map((c) => (advanced ? Engine.upgrade(c.id) : c.id)),
        );
    if (bookTab === 'enemies')
      body = `<div class="entry-grid">${Object.values(Engine.enemies)
        .map((e) =>
          group(
            esc(e.name) + ` <small>ACT ${roman[e.act - 1]}</small>`,
            esc(e.tagline) + '<br><em>' + e.pattern.map((p) => p.name).join(' · ') + '</em>',
          ),
        )
        .join('')}</div>`;
    if (bookTab === 'relics')
      body = `<div class="entry-grid">${Object.values(Engine.relics)
        .map((e) => group(icon('lamp', 16) + ' ' + esc(e.name), esc(e.description)))
        .join('')}</div>`;
    if (bookTab === 'rules') {
      const labels = ['炉火', '能量', '灼烧', '格挡', '虚弱', '易伤', '脆弱', '力量', '消耗', '抽牌'];
      body = `<div class="entry-grid">${Object.values(Engine.rules)
        .map((r, i) => group(labels[i], r))
        .join('')}</div>`;
    }
    if (bookTab === 'history') {
      const p = Campaign.profile();
      body =
        group('远征编年史', `已完成 ${p.runs} 次远征　·　胜利 ${p.wins} 次　·　最高 ${p.bestFloor} 层`) +
        p.history
          .map((h) =>
            group(
              h.won ? '余烬重燃' : '誓约长眠',
              `${new Date(h.date).toLocaleDateString('zh-CN')}　·　第 ${h.floor} 层　·　誓阶 ${h.ascension}　·　种子 ${esc(h.seed)}`,
            ),
          )
          .join('');
    }
    show('codex', '灰烬图鉴', 'THE ARCHIVE', tabs(menus, 'cod-' + bookTab) + body, true);
  }
  function settingsPage() {
    show(
      'settings',
      '游戏设置',
      'SETTINGS',
      `<div class="settings-list">${[
        ['music', '音乐音量'],
        ['effects', '音效音量'],
      ]
        .map(
          ([id, name]) =>
            `<label class="setting"><span>${name}</span><input type="range" data-setting="${id}" min="0" max="100" value="${settings[id]}"><output>${settings[id]}%</output></label>`,
        )
        .join(
          '',
        )}<label class="setting">静音<input type="checkbox" data-setting="muted" ${settings.muted ? 'checked' : ''}></label><label class="setting">减少动态效果<input type="checkbox" data-setting="reduced" ${settings.reduced ? 'checked' : ''}></label><div class="setting"><span>显示模式</span>${btn('fullscreen', '切换全屏', 'basic-btn')}</div><div class="setting"><span>远征种子</span><code>${esc(run.seed)}</code></div></div><div class="settings-actions">${btn('title', '主菜单', 'basic-btn')}${btn('guide', '玩法说明', 'basic-btn')}${btn('newform', '重新远征', 'basic-btn')}</div><small class="credits">灰烬誓约 / ASHEN VOW　·　v0.9.1</small>`,
    );
  }
  function handle(id) {
    if (id === 'close' || id === 'battle') {
      close();
      return;
    }
    if (id === 'end') {
      action(null);
      return;
    }
    if (id === 'title') {
      titleMenu();
      return;
    }
    if (id === 'quit') {
      window.AshDesktop?.quit();
      return;
    }
    if (id === 'settings') {
      settingsPage();
      return;
    }
    if (id === 'mute') {
      settings.muted = !settings.muted;
      prefs();
      foot();
      return;
    }
    if (id === 'guide') {
      guide();
      return;
    }
    if (id === 'map') {
      show('map', '远征地图', 'EXPEDITION MAP', '<div id="map-preview"></div>', true);
      ExpeditionUI.mapPreview($('#map-preview'), run);
      return;
    }
    if (id === 'deck') {
      show(
        'deck',
        '当前牌组',
        'YOUR DECK',
        `<p class="modal-caption">${run.deck.length} 张卡牌 · ${run.deck.filter((c) => c.endsWith('+')).length} 张已锤炼</p>` +
          listing(run.deck),
        true,
      );
      return;
    }
    if (id === 'codex') {
      codex();
      return;
    }
    if (id.startsWith('cod-')) {
      bookTab = id.slice(4);
      codex();
      return;
    }
    if (id.startsWith('filter-')) {
      deckFilter = id.slice(7);
      codex();
      return;
    }
    if (id === 'upgrade-view') {
      advanced = !advanced;
      codex();
      return;
    }
    if (['draw', 'discard', 'exhaust'].includes(id) && run.battle) {
      show(
        id,
        { draw: '抽牌堆', discard: '弃牌堆', exhaust: '消耗堆' }[id],
        'BATTLE DECK',
        `<p class="modal-caption">${run.battle[id].length} 张${id === 'draw' ? ' · 按牌名排列' : ''}</p>` +
          listing(
            id === 'draw'
              ? [...run.battle[id]].sort((a, b) =>
                  Engine.card(a).name.localeCompare(Engine.card(b).name, 'zh-CN'),
                )
              : run.battle[id],
          ),
        true,
      );
      return;
    }
    if (id === 'relics') {
      show(
        id,
        '携带的遗物',
        'RELIQUARY',
        run.relics
          .map(
            (k) =>
              `<article class="entry"><h3>${icon('lamp', 18)} ${Engine.relics[k].name}</h3><p>${Engine.relics[k].description}</p></article>`,
          )
          .join(''),
      );
      return;
    }
    if (id === 'intent' && run.battle) {
      const e = run.battle.enemy;
      show(
        id,
        e.name,
        'ENEMY INTENT',
        `<p class="guide-intro">${Engine.enemies[e.id].tagline}</p><article class="entry"><h3>${e.intent.name}</h3><p>${e.intent.description}</p></article>`,
      );
      return;
    }
    if (id === 'log') {
      const lines = run.battle?.log || run.journal || lastJournal;
      show(
        id,
        '战斗记录',
        'COMBAT JOURNAL',
        lines.length
          ? `<ol class="journal">${lines
              .slice()
              .reverse()
              .map((l) => `<li>${esc(l)}</li>`)
              .join('')}</ol>`
          : '<p>尚无交战记录。</p>',
      );
      return;
    }
    if (id === 'fullscreen') {
      if (window.AshDesktop) window.AshDesktop.fullscreen();
      else
        (document.fullscreenElement
          ? document.exitFullscreen()
          : document.documentElement.requestFullscreen()
        ).catch(() => note('当前窗口无法切换全屏'));
      return;
    }
    if (id === 'newform') {
      const max = Campaign.profile().maxAscension;
      show(
        id,
        '开始新的远征',
        'A NEW OATH',
        `<p class="guide-intro">点燃新灯将替换当前远征进度。</p><label class="field">远征种子<input id="run-seed" maxlength="48" placeholder="留空以随机生成"></label><label class="field">誓阶<select id="ascend">${Array.from({ length: max + 1 }, (_, i) => `<option value="${i}">${i === 0 ? '初始难度' : '誓阶 ' + i}</option>`).join('')}</select></label><div class="settings-actions">${btn('settings', '返回', 'basic-btn')}${btn('restart', '点燃新灯', 'basic-btn primary')}</div>`,
      );
      return;
    }
    if (id === 'restart') {
      const seed = $('#run-seed').value,
        ascension = Number($('#ascend').value);
      close();
      lastJournal = [];
      render(Campaign.newRun({ seed, ascension }));
    }
  }
  document.addEventListener('click', (e) => {
    const play = e.target.closest('[data-play]'),
      target = e.target.closest('[data-act]');
    if (play) {
      action(Number(play.dataset.play));
      return;
    }
    if (target) {
      if (locked && !dialog.open && target.dataset.act !== 'end') {
        queued = null;
        AshBattleFX.finish();
      }
      if (target.dataset.act !== 'end') AshAudio.play('click');
      handle(target.dataset.act);
    }
    if (e.target === dialog) close();
  });
  inner.addEventListener('input', (e) => {
    const id = e.target.dataset.setting;
    if (!id) return;
    settings[id] = e.target.type === 'checkbox' ? e.target.checked : Number(e.target.value);
    prefs();
    foot();
    if (e.target.nextElementSibling?.tagName === 'OUTPUT')
      e.target.nextElementSibling.value = settings[id] + '%';
  });
  dialog.addEventListener('close', () => {
    modal = '';
    top();
  });
  document.addEventListener('keydown', (e) => {
    if (
      e.altKey ||
      e.ctrlKey ||
      e.metaKey ||
      e.repeat ||
      e.isComposing ||
      ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)
    )
      return;
    if (dialog.open) return;
    const k = e.key.toLowerCase();
    if (k === 'm' || k === 'd' || k === 'escape' || k === '?') {
      e.preventDefault();
      if (locked) {
        queued = null;
        AshBattleFX.finish();
      }
      handle({ m: 'map', d: 'deck', escape: 'settings', '?': 'guide' }[k]);
      return;
    }
    if (run.phase !== 'combat') return;
    if (/^[0-9]$/.test(k)) {
      e.preventDefault();
      const i = k === '0' ? 9 : Number(k) - 1;
      if (i < run.battle.hand.length) action(i);
    } else if (k === ' ') {
      e.preventDefault();
      action(null);
    }
  });
  document.addEventListener('contextmenu', (e) => {
    const face = e.target.closest('.playing-card');
    if (!face) return;
    if (locked) {
      queued = null;
      AshBattleFX.finish();
    }
    e.preventDefault();
    const key = face.dataset.card;
    if (key) inspect(key);
  });
  let gesture = null,
    ignoreClickUntil = 0;
  function stopDrag() {
    if (!gesture) return;
    const active = gesture;
    gesture = null;
    active.ghost?.remove();
    active.button.classList.remove('casting');
    document.querySelector('#arena')?.classList.remove('aiming-enemy', 'aiming-player');
    if (active.button.hasPointerCapture(active.pointer)) active.button.releasePointerCapture(active.pointer);
  }
  document.addEventListener('pointerdown', (event) => {
    const button = event.target.closest('[data-play]');
    if (event.button !== 0 || !event.isPrimary || !button || locked || dialog.open || gesture) return;
    const index = Number(button.dataset.play);
    if (!Engine.canPlay(run.battle, index)) return;
    gesture = {
      button,
      index,
      key: run.battle.hand[index],
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      ghost: null,
    };
  });
  document.addEventListener('pointermove', (event) => {
    const g = gesture;
    if (!g || event.pointerId !== g.pointer) return;
    const dx = event.clientX - g.x,
      dy = event.clientY - g.y;
    if (!g.ghost) {
      if (dy > -10 || Math.abs(dx) > Math.abs(dy) * 1.7) return;
      const ghost = document.createElement('div');
      ghost.className = 'drag-card';
      ghost.innerHTML = card(g.key);
      ghost.style.width = Math.min(170, g.button.getBoundingClientRect().width) + 'px';
      document.body.append(ghost);
      g.ghost = ghost;
      g.button.setPointerCapture(event.pointerId);
      g.button.classList.add('casting');
      $('#arena').classList.add(Engine.card(g.key).type === 'attack' ? 'aiming-enemy' : 'aiming-player');
    }
    g.ghost.style.left = event.clientX + 'px';
    g.ghost.style.top = event.clientY + 'px';
  });
  document.addEventListener('pointerup', (event) => {
    const g = gesture;
    if (!g || g.pointer !== event.pointerId) return;
    const dragged = Boolean(g.ghost),
      bounds = $('#arena')?.getBoundingClientRect();
    stopDrag();
    if (!dragged) return;
    ignoreClickUntil = performance.now() + 180;
    if (
      bounds &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom &&
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      run.battle?.hand[g.index] === g.key
    )
      action(g.index);
  });
  document.addEventListener('pointercancel', stopDrag);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      queued = null;
      AshBattleFX.finish();
    }
  });
  window.addEventListener('blur', stopDrag);
  document.addEventListener(
    'click',
    (event) => {
      if (performance.now() < ignoreClickUntil) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  document.addEventListener('pointerdown', () => AshAudio.wake(), { once: true });
  render();
})();
