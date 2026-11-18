/* Standard Gamepad API. All gameplay actions go through the live UI controls. */
(() => {
  'use strict';
  if (!navigator.getGamepads || document.getElementById('pad-styles')) return;
  const styles = document.createElement('style');
  styles.id = 'pad-styles';
  styles.textContent = [
    '.using-pad [data-pad-focus]{outline:2px solid #ffdc96!important;outline-offset:2px;box-shadow:0 0 0 4px #251e17,0 0 12px #dbc08c99;z-index:2}',
    '.using-pad .hand-card[data-pad-focus]{transform:translateY(-3px)}',
    '.using-pad .bar-keys,.using-pad .card-shortcut,.using-pad .end-hint{visibility:hidden}',
    '.pad-help{display:none}.using-pad .pad-help{display:flex;align-items:center;justify-content:center;gap:8px;color:#ead7b7;font:11px/1.4 var(--sans);pointer-events:none}',
    '#statusbar:has(.pad-help){position:relative}.using-pad #statusbar>.pad-help{position:absolute;left:50%;transform:translateX(-50%);background:#171618;padding:2px 5px;white-space:nowrap}',
    '.using-pad #modal-inner>.pad-help,.using-pad .pad-keys>.pad-help{flex:none;padding:8px;background:#211d1b;border-top:1px solid #64533d}',
    '.pad-help kbd{font:700 10px/1.3 sans-serif;color:#f3d99b;margin-right:2px;border:1px solid #847054;border-radius:3px;padding:1px 3px}',
    '.pad-keys{color:#eddbba;background:#262220;border:1px solid #a18a62;padding:15px;width:min(420px,90vw)}.pad-keys::backdrop{background:#0c0a0bef}',
    '.pad-keys output{display:block;min-height:34px;overflow-wrap:anywhere;margin:6px 0 12px;background:#171617;padding:7px;color:#ffdfa0}',
    '.pad-letters{display:grid;grid-template-columns:repeat(8,1fr);gap:4px}.pad-keys button{background:#38312a;border:1px solid #706046;min-height:30px}.pad-edit-actions{display:flex;gap:6px;margin:10px 0}.pad-edit-actions button{flex:1}',
    '@media(max-width:710px){.using-pad #statusbar:has(.pad-help){flex-wrap:wrap;gap:4px}.using-pad #statusbar>.pad-help{position:static;transform:none;width:100%;order:5}.using-pad .pad-help{gap:4px;font-size:10px}}',
  ].join('\n');
  document.head.append(styles);

  const root = document.documentElement;
  const history = new Map();
  const pads = new Map();
  const reconnect = new Set();
  const select = 'button,input:not([type=hidden]),select,textarea,summary,a[href],.card-grid [data-card]';
  let current = null,
    scope = null,
    screen = '',
    active = false,
    lastInput = 0,
    usedPad = null;
  let editor = null,
    help = null,
    rememberedDetail = '';
  const openModal = () => editor || document.querySelector('dialog[open]');
  function context() {
    const modal = openModal();
    if (modal)
      return [
        modal,
        editor ? 'seed-editor' : 'dialog:' + (modal.querySelector('#modal-title')?.textContent || modal.id),
      ];
    const room = document.querySelector('.ex-room');
    return [document, room ? room.className + (room.querySelector('.ex-pick') ? ':pick' : '') : 'combat'];
  }
  function eligible(el) {
    return (
      el &&
      !el.disabled &&
      el.getAttribute('aria-disabled') !== 'true' &&
      !el.closest('[hidden],[inert]') &&
      el.getClientRects().length > 0 &&
      getComputedStyle(el).visibility === 'visible' &&
      (!el.matches('[data-card]') || !el.closest('button'))
    );
  }
  function candidates() {
    return [...scope.querySelectorAll(select)].filter(eligible);
  }
  function identity(el) {
    for (const key of ['play', 'act', 'ex', 'setting', 'padKey', 'card']) {
      if (el.dataset[key] !== undefined)
        return key + ':' + el.dataset[key] + (key === 'ex' ? ':' + el.classList[0] : '');
    }
    return el.id || el.name || el.tagName;
  }
  function focus(el) {
    current?.removeAttribute('data-pad-focus');
    current = el;
    if (!current) return;
    if (el.matches('.card-grid [data-card]')) el.tabIndex = -1;
    el.dataset.padFocus = '';
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    history.set(screen, identity(el));
  }
  function preferred(list) {
    const match = (selector) => list.find((el) => el.matches(selector));
    return (
      match('[data-play]') ||
      match('.title-continue,.ex-route,.ex-card-offer,.ex-option,.ex-pick-row') ||
      match('.modal-content input,.modal-content .tabs button,.card-grid [data-card],.pad-letters button') ||
      match('.ex-room button,[data-act="end"]') ||
      list[0]
    );
  }
  function updateHelp() {
    const host =
      editor ||
      (scope === document ? document.querySelector('#statusbar') : scope.querySelector('#modal-inner'));
    if (!host) return;
    if (!help || help.parentElement !== host) {
      help?.remove();
      help = document.createElement('div');
      help.className = 'pad-help';
      host.append(help);
    }
    const pairs = [
      ['A', '确认'],
      ['B', scope === document ? '返回 / 设置' : '返回'],
    ];
    if (current?.matches('select,input[type=range]')) pairs.push(['← →', '调整']);
    else if (scope === document) {
      if (document.querySelector('.battle-stage [data-act="end"]')) pairs.push(['X', '结束回合']);
      pairs.push(['Y', '地图']);
    } else if (!editor) pairs.push(['R', '滚动']);
    if (current?.querySelector('[data-card]')) pairs.push(['LT', '检视']);
    pairs.push(['LB/RB', '逐项']);
    const markup = pairs.map(([key, label]) => '<span><kbd>' + key + '</kbd>' + label + '</span>').join('');
    if (help.innerHTML !== markup) help.innerHTML = markup;
  }
  function sync() {
    const [next, view] = context();
    if (
      next !== scope ||
      view !== screen ||
      !current?.isConnected ||
      !eligible(current) ||
      !next.contains(current)
    ) {
      scope = next;
      screen = view;
      const list = candidates(),
        key = history.get(screen);
      let el = list.find((it) => identity(it) === key);
      if (!el && key?.startsWith('play:')) el = list.filter((it) => it.hasAttribute('data-play')).at(-1);
      focus(el || preferred(list));
    }
    updateHelp();
  }
  function release() {
    if (!active) return;
    active = false;
    root.classList.remove('using-pad');
    for (const pad of pads.values()) pad.waitNeutral = true;
    if (current) current.removeAttribute('data-pad-focus');
    current = null;
    help?.remove();
    help = null;
  }
  function engage(index) {
    const wasActive = active;
    active = true;
    usedPad = index;
    lastInput = performance.now();
    root.classList.add('using-pad');
    if (!wasActive) window.AshAudio?.wake();
    sync();
    return wasActive;
  }
  function signal(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function adjust(el, amount) {
    if (el.matches('input[type=range]')) {
      if (amount > 0) el.stepUp(5);
      else el.stepDown(5);
    } else if (el.matches('select')) {
      let index = el.selectedIndex + amount;
      while (index >= 0 && index < el.options.length && el.options[index].disabled) index += amount;
      if (index >= 0 && index < el.options.length) el.selectedIndex = index;
    } else return false;
    signal(el);
    return true;
  }
  function navigate(direction) {
    if (!current) return;
    const list = candidates(),
      horizontal = direction === 'left' || direction === 'right',
      delta = ['left', 'up', 'prev'].includes(direction) ? -1 : 1;
    if (horizontal && adjust(current, delta)) return;
    if (direction === 'prev' || direction === 'next') {
      focus(list[(list.indexOf(current) + delta + list.length) % list.length]);
      return;
    }
    const box = current.getBoundingClientRect(),
      cx = (box.left + box.right) / 2,
      cy = (box.top + box.bottom) / 2;
    let choice = null,
      best = Infinity;
    for (const el of list) {
      if (el === current) continue;
      const rect = el.getBoundingClientRect(),
        dx = (rect.left + rect.right) / 2 - cx,
        dy = (rect.top + rect.bottom) / 2 - cy;
      const advance = delta * (horizontal ? dx : dy),
        lateral = Math.abs(horizontal ? dy : dx);
      if (advance < 3 || lateral > advance * 2.8) continue;
      const cost = advance + lateral * 2.5 + (lateral * lateral) / advance;
      if (cost < best) {
        best = cost;
        choice = el;
      }
    }
    if (choice) focus(choice);
  }
  function editSeed(input) {
    const box = document.createElement('dialog');
    box.className = 'pad-keys';
    box.setAttribute('aria-label', '输入远征种子');
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
    box.innerHTML =
      '<strong>远征种子</strong><output></output><div class="pad-letters">' +
      [...letters].map((c) => '<button type="button" data-pad-key="' + c + '">' + c + '</button>').join('') +
      '</div><div class="pad-edit-actions"><button data-pad-key="delete">退格</button><button data-pad-key="cancel">取消</button><button data-pad-key="apply">完成</button></div>';
    let draft = input.value;
    const output = box.querySelector('output');
    const display = () => {
      output.textContent = draft || '随机种子';
    };
    box.addEventListener('keydown', (e) => e.stopPropagation());
    display();
    box.addEventListener('click', (e) => {
      const key = e.target.closest('[data-pad-key]')?.dataset.padKey;
      if (!key) return;
      if (key === 'apply') {
        input.value = draft;
        signal(input);
        box.close();
      } else if (key === 'cancel') box.close();
      else {
        if (key === 'delete') draft = Array.from(draft).slice(0, -1).join('');
        else if (draft.length < (input.maxLength > 0 ? input.maxLength : 48)) draft += key;
        display();
      }
    });
    box.addEventListener(
      'close',
      () => {
        editor = null;
        box.remove();
        if (active) sync();
      },
      { once: true },
    );
    document.body.append(box);
    editor = box;
    history.delete('seed-editor');
    box.showModal();
    sync();
  }
  function activate() {
    if (!current) return;
    if (current.matches('input:not([type]),input[type=text],textarea')) return editSeed(current);
    if (current.matches('select,input[type=range]')) return navigate('next');
    if (current.matches('.card-grid [data-card]')) {
      const parent = scope.querySelector('.modal-heading small')?.textContent;
      rememberedDetail = { 'THE ARCHIVE': 'codex', 'YOUR DECK': 'deck' }[parent] || '';
      if (!rememberedDetail && parent === 'BATTLE DECK')
        rememberedDetail =
          { 抽牌堆: 'draw', 弃牌堆: 'discard', 消耗堆: 'exhaust' }[
            scope.querySelector('#modal-title')?.textContent
          ] || '';
      current.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    } else current.click();
  }
  function back() {
    if (editor) {
      editor.close();
      return;
    }
    const modal = openModal();
    if (modal) {
      if (rememberedDetail && modal.querySelector('.inspect-layout')) {
        document.querySelector('[data-act="' + rememberedDetail + '"]')?.click();
        rememberedDetail = '';
        return;
      }
      const button = modal.querySelector('#run-seed')
        ? modal.querySelector('[data-act="settings"]')
        : modal.querySelector('[data-act="close"]');
      button?.click();
      rememberedDetail = '';
      return;
    }
    (
      document.querySelector('[data-ex="cancel"]') || document.querySelector('#hud [data-act="settings"]')
    )?.click();
  }
  function scrollReading(axis, ms) {
    const area = editor || openModal()?.querySelector('.modal-content') || document.querySelector('.ex-room');
    const target = area && area.scrollHeight > area.clientHeight + 1 ? area : document.scrollingElement;
    target?.scrollBy({ top: Math.sign(axis) * (Math.abs(axis) - 0.25) * ms * 0.9, behavior: 'instant' });
  }
  const down = (g, i) => Boolean(g.buttons[i]?.pressed || g.buttons[i]?.value > 0.55);
  function stickDirection(g, held) {
    if (down(g, 12)) return 'up';
    if (down(g, 13)) return 'down';
    if (down(g, 14)) return 'left';
    if (down(g, 15)) return 'right';
    const x = g.axes[0] || 0,
      y = g.axes[1] || 0;
    if (Math.max(Math.abs(x), Math.abs(y)) < (held ? 0.38 : 0.55)) return '';
    if (Math.abs(x) > Math.abs(y)) return x < 0 ? 'left' : 'right';
    return y < 0 ? 'up' : 'down';
  }
  const keys = [0, 1, 2, 3, 4, 5, 6];
  let previousFrame = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || !document.hasFocus()) {
      release();
      return;
    }
    let list;
    try {
      list = Array.from(navigator.getGamepads());
    } catch {
      return;
    }
    const connected = new Set();
    for (const g of list) {
      if (!g || !g.connected || g.mapping !== 'standard') continue;
      connected.add(g.index);
      let state = pads.get(g.index);
      if (!state || state.id !== g.id) {
        state = { id: g.id, buttons: [], dir: '', next: 0, waitNeutral: reconnect.delete(g.index) };
        pads.set(g.index, state);
      }
      const pressed = keys.map((i) => down(g, i)),
        edge = pressed.findIndex((value, i) => value && !state.buttons[i]);
      const dir = stickDirection(g, state.dir),
        scroll = g.axes[3] || 0;
      if (state.waitNeutral) {
        if (!dir && !pressed.some(Boolean) && Math.abs(scroll) < 0.38) state.waitNeutral = false;
      } else if (edge !== -1) {
        const wasActive = engage(g.index);
        if (edge === 0 && wasActive) activate();
        if (edge === 1) back();
        if (edge === 2 && !openModal()) document.querySelector('.battle-stage [data-act="end"]')?.click();
        if (edge === 3 && !openModal()) document.querySelector('#hud [data-act="map"]')?.click();
        if (edge === 4 || edge === 5) navigate(edge === 4 ? 'prev' : 'next');
        if (edge === 6) {
          rememberedDetail = '';
          current
            ?.querySelector('[data-card]')
            ?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
        }
        sync();
      } else if (dir && (dir !== state.dir || now >= state.next)) {
        const wasActive = engage(g.index);
        if (wasActive) navigate(dir);
        state.next = now + (dir !== state.dir ? 345 : 140);
      } else if (Math.abs(scroll) > 0.38) {
        engage(g.index);
        scrollReading(scroll, Math.min(45, now - previousFrame));
      }
      state.buttons = pressed;
      state.dir = dir;
    }
    for (const index of pads.keys())
      if (!connected.has(index)) {
        pads.delete(index);
        reconnect.add(index);
      }
    if (active && (!connected.has(usedPad) || now - lastInput > 60000)) release();
    if (
      active &&
      (!current?.isConnected || openModal() !== (scope === document ? null : scope) || !help?.isConnected)
    )
      sync();
    previousFrame = now;
  }
  for (const event of ['pointerdown', 'pointermove', 'keydown'])
    document.addEventListener(event, release, { capture: true, passive: true });
  window.addEventListener('blur', release);
  requestAnimationFrame(frame);
})();
