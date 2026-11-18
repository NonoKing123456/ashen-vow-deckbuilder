/* Shared, dependency-free game iconography and collectible card faces. */
(() => {
  'use strict';
  const paths = {
    brand:
      '<path d="M12 1 21 9l-1 9-8 5-8-5-1-9z"/><path d="m12 4-5 5h10zM8 10l1 6 3 3 3-3 1-6z"/><path d="m12 10-1.4 3.6 1.4 1.8 1.4-1.8z" fill="currentColor"/>',
    swords:
      '<path d="m3 2 4 2 12 13-2 2L4 6zM21 2l-4 2-5 6m-3 4-4 4 2 2 4-4M3 16l5 5m8-1 5-5m-4 5 3 2m-15-2-2 2"/>',
    sword: '<path d="m4 21 4-4m-4-3 6 6m-3-5L17 3l4-1-1 5L9 17"/>',
    map: '<path d="m2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3zM8 2v17m8-14v17"/>',
    deck: '<path d="m3 6 6-3 4 1M3 8l-1 10 4 1m1-13 6-2 4 1M7 8l-1 12 4 1m1-14h10v15H11z"/><path d="m16 11 2 3-2 3-2-3z"/>',
    book: '<path d="M2 4c4-1 7 0 10 2 3-2 6-3 10-2v15c-4-1-7 0-10 2-3-2-6-3-10-2zM12 6v15"/>',
    settings:
      '<path d="m10 2 4 0 1 3 2 1 3-1 2 4-2 2v2l2 2-2 4-3-1-2 1-1 3h-4l-1-3-2-1-3 1-2-4 2-2v-2l-2-2 2-4 3 1 2-1z"/><circle cx="12" cy="12" r="3"/>',
    coin: '<path d="m12 2 8 5v10l-8 5-8-5V7z"/><path d="m12 6 4 6-4 6-4-6z"/>',
    flame:
      '<path d="M12 2c3 5 0 6 3 10 2-2 2-4 2-6 8 9 4 16-5 16-9 0-12-9-5-16-1 4 1 5 2 6 3-4 0-7 3-10z"/><path d="m12 13-2 5 2 2 2-2z"/>',
    shield: '<path d="m12 2 9 3v7c-1 5-5 8-9 10-4-2-8-5-9-10V5z"/><path d="m12 6 5 1v5c-1 3-3 5-5 6z"/>',
    lamp: '<path d="m4 8 8-5 8 5zM6 10l2 9 4 3 4-3 2-9M12 1v3m-4 6h8"/><path d="m12 11 2 4-2 3-2-3z" fill="currentColor"/>',
    heart: '<path d="M12 21 3.5 12C-1 6 6 0 12 6c6-6 13 0 8.5 6z" fill="currentColor" stroke-width=".5"/>',
    crown: '<path d="m2 6 5 4 5-8 5 8 5-4-3 12H5zM6 21h12"/>',
    sound: '<path d="M3 9h4l5-4v14l-5-4H3zm12-2c3 2 3 8 0 10m3-13c5 4 5 12 0 16"/>',
    mute: '<path d="M3 9h4l5-4v14l-5-4H3zm13 0 6 6m0-6-6 6"/>',
    log: '<path d="M5 3h13v14c0 2 0 3 2 4H7c-2-1-2-2-2-4zM8 7h7m-7 4h7m-7 4h4"/>',
    arrow: '<path d="M3 12h17m-6-6 6 6-6 6"/>',
    turn: '<path d="M4 8h10a6 6 0 0 1 0 12h-3M8 3 3 8l5 5"/>',
    layer: '<path d="m12 2 9 5-9 5-9-5zm-9 10 9 5 9-5m-18 5 9 5 9-5"/>',
    close: '<path d="m5 5 14 14m0-14L5 19"/>',
    sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    draw: '<path d="M4 7 16 3l3 1M2 10l3 11 4-1m-2-13 11-3 2 1M9 7h12v15H9z"/><path d="m15 10 3 4-3 4-3-4z"/>',
    discard: '<path d="M3 6h12v14H3zM8 4h10v14m-6-16h9v13M6 10l5 5m-5 0 5-5"/>',
    question: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 3-3 2-3 5m0 2v1"/>',
    check: '<path d="m3 12 6 6L21 5"/>',
    feather: '<path d="m3 22 12-13M6 17C3 9 13 1 22 2c0 10-7 17-16 15z"/>',
  };
  function icon(name, size = 20) {
    return (
      '<svg class="ic" aria-hidden="true" width="' +
      size +
      '" height="' +
      size +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">' +
      (paths[name] || paths.sun) +
      '</svg>'
    );
  }
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"']/g,
      (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
    );
  const types = { attack: '攻击', skill: '技能', power: '能力' };
  const ranks = { basic: '初始', common: '普通', uncommon: '罕见', rare: '稀有' };
  const first = { strike: 'blade', ward: 'shield', kindle: 'flame', cinder: 'spear', vigil: 'lantern' };
  const imageFor = (c) => 'assets/cards/' + (first[c.id] || c.id) + '.webp';
  function card(key) {
    const c = Engine.card(key);
    return (
      '<span data-card="' +
      esc(key) +
      '" class="playing-card ' +
      c.type +
      ' ' +
      (c.upgraded ? 'upgraded' : '') +
      '"><span class="card-picture" style="background-image:url(' +
      imageFor(c) +
      ')"></span><span class="card-border"></span><span class="cost-badge"><b>' +
      c.cost +
      '</b></span><span class="card-body"><span class="card-type"><i></i>' +
      types[c.type] +
      '<i></i></span><span class="card-name">' +
      esc(c.name) +
      '</span><span class="card-desc">' +
      esc(c.description).replace(/(\d+)/g, '<strong>$1</strong>') +
      '</span><span class="card-ornament"><i></i>◆<i></i></span></span></span>'
    );
  }
  window.AshUI = { icon, esc, types, ranks, imageFor, card };
})();
