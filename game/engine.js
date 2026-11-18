/* Ashen Vow | deterministic, serializable single-foe combat. */
(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  root.Engine = engine;
})(typeof globalThis === 'object' ? globalThis : window, function () {
  'use strict';

  function effect(kind, value, upgradedValue = value, hits = 1) {
    return { kind, value, upgradedValue, hits };
  }
  const hit = (a, b, hits = 1) => effect('hit', a, b, hits);
  const guard = (a, b) => effect('block', a, b);
  const ember = (a, b) => effect('ember', a, b);
  const draw = (a, b) => effect('draw', a, b);
  const burn = (a, b) => effect('burn', a, b);
  function cardData(id, name, en, type, cost, rarity, art, effects, options = {}) {
    return { id, name, en, type, cost, rarity, art, effects, ...options };
  }
  const A = 'attack',
    S = 'skill',
    P = 'power';
  const basic = 'basic',
    common = 'common',
    uncommon = 'uncommon',
    rare = 'rare';
  const catalog = [
    cardData('strike', '余烬斩', 'Cinder Cut', A, 1, basic, 'blade', [hit(6, 9)]),
    cardData('ward', '铁誓', 'Iron Oath', S, 1, basic, 'shield', [guard(5, 8)]),
    cardData('kindle', '引火', 'First Spark', S, 0, basic, 'flame', [ember(2, 3), draw(1)], {
      exhausts: true,
    }),
    cardData('cinder', '烬火刺', 'Ashen Thrust', A, 1, basic, 'spear', [effect('litHit', 7, 10)]),
    cardData('vigil', '守夜', 'Night Vigil', S, 1, basic, 'lantern', [guard(4, 6), ember(1, 2)]),
    cardData('brand', '烙印', 'Searing Brand', A, 1, common, 'flame', [hit(4, 6), burn(3, 4)]),
    cardData('clapper', '裂钟', 'Broken Peal', A, 2, common, 'bell', [hit(12, 16), effect('weak', 1, 2)]),
    cardData('needle', '渡鸦双刺', 'Raven Needles', A, 1, common, 'spear', [hit(4, 5, 2)]),
    cardData('parry', '回刃', 'Returning Steel', A, 1, common, 'blade', [hit(5, 7), guard(4, 5)]),
    cardData('tinder', '藏芯', 'Hidden Wick', S, 0, common, 'lantern', [ember(1, 2), guard(2, 3)]),
    cardData('absolution', '赦罪', 'Absolution', S, 1, common, 'shield', [guard(7, 9), effect('cleanse', 1)]),
    cardData('page', '残卷', 'Torn Folio', S, 0, common, 'bell', [draw(1, 2)], { exhausts: true }),
    cardData('shackle', '牵魂锁', 'Soul Chain', A, 1, common, 'chain', [hit(5, 7), effect('vulnerable', 2)]),
    cardData('emberspear', '穿炉长枪', 'Furnace Lance', A, 2, common, 'spear', [effect('forgeHit', 10, 15)]),
    cardData('prayer', '提灯祷词', 'Lamplight Litany', S, 1, common, 'lantern', [guard(5, 7), draw(1)]),
    cardData('breathe', '风箱', 'Bellows', S, 1, common, 'flame', [ember(3, 4), burn(2, 4)]),
    cardData('mourn', '哀钟', 'Mourning Bell', S, 1, common, 'bell', [guard(4, 6), effect('weak', 2)]),
    cardData('coals', '余火弹', 'Coalshot', A, 0, common, 'flame', [hit(3, 5), burn(1)]),
    cardData('bulwark', '铜门', 'Brazen Gate', S, 2, common, 'shield', [guard(13, 17)]),
    cardData('march', '葬列', 'Funeral March', A, 1, common, 'chain', [hit(6, 8), draw(1)]),
    cardData('riposte', '盾缘重击', 'Shield Rim', A, 1, uncommon, 'shield', [effect('shieldHit', 3, 6)]),
    cardData('bonfire', '焚香炉', 'Incense Pyre', S, 1, uncommon, 'flame', [effect('pyre', 4, 6)]),
    cardData('hymn', '归途颂', 'Homeward Hymn', P, 1, uncommon, 'lantern', [effect('pilot', 1, 2)]),
    cardData('procession', '行灯列阵', 'March of Lanterns', P, 1, uncommon, 'shield', [
      effect('bulwark', 3, 4),
    ]),
    cardData('censer', '荆棘香炉', 'Thorn Censer', P, 1, uncommon, 'chain', [effect('thorns', 3, 5)]),
    cardData('oath', '折剑为誓', 'Sword Oath', S, 1, uncommon, 'blade', [effect('strength', 2, 3)], {
      exhausts: true,
    }),
    cardData('watchfire', '烽灯', 'Beacon Debt', S, 0, uncommon, 'lantern', [effect('convert', 1, 2)], {
      exhausts: true,
    }),
    cardData('ashes', '拾烬', 'Ash Gleaner', S, 0, uncommon, 'crown', [effect('recover', 1, 2)], {
      exhausts: true,
    }),
    cardData('ribbons', '断罪三连', 'Triptych', A, 2, uncommon, 'blade', [hit(5, 7, 3)]),
    cardData('ironveil', '铁幕圣咏', 'Iron Canticle', S, 1, uncommon, 'shield', [
      guard(7, 10),
      effect('retain', 5, 7),
    ]),
    cardData('funeral', '送葬银钉', 'Burial Nail', A, 2, uncommon, 'spear', [effect('burnHit', 12, 16)]),
    cardData(
      'threshold',
      '门槛之血',
      'Threshold Blood',
      S,
      0,
      uncommon,
      'chain',
      [effect('blood', 2), draw(2, 3)],
      { exhausts: true },
    ),
    cardData('lanternstorm', '灯影急袭', 'Lantern Rush', A, 1, uncommon, 'spear', [hit(4, 6, 2), ember(1)]),
    cardData('lastlight', '残照', 'Last Gleam', S, 1, uncommon, 'lantern', [effect('heal', 4, 7), guard(4)], {
      exhausts: true,
    }),
    cardData('glass', '碎镜裁决', 'Mirror Verdict', A, 1, uncommon, 'blade', [effect('lonelyHit', 8, 11)]),
    cardData('martyr', '殉灯者', 'Wick Martyr', P, 2, rare, 'crown', [effect('kindling', 2, 3)]),
    cardData('sundering', '弑日', 'Sunfall', A, 3, rare, 'spear', [hit(26, 34), effect('vulnerable', 2)]),
    cardData('requiem', '终祷', 'Final Requiem', S, 2, rare, 'bell', [effect('doubleBurn', 6, 10)]),
    cardData('aegis', '无名圣壁', 'Nameless Aegis', S, 2, rare, 'shield', [
      guard(15, 19),
      effect('retain', 15, 19),
    ]),
    cardData('coronation', '灰冠加冕', 'Crown of Ash', P, 2, rare, 'crown', [effect('zeal', 1, 2)]),
    cardData(
      'processional',
      '千灯朝圣',
      'Thousand Lights',
      S,
      1,
      rare,
      'lantern',
      [ember(3, 4), draw(3, 4)],
      { exhausts: true },
    ),
    cardData('forbidden', '禁钟连鸣', 'Forbidden Peal', A, 1, rare, 'bell', [effect('bellHit', 4, 5)]),
    cardData(
      'rebirth',
      '灰中复燃',
      'Rekindled',
      S,
      0,
      rare,
      'flame',
      [effect('blood', 3), effect('energy', 2), draw(1, 2)],
      { exhausts: true },
    ),
    cardData('seal', '封圣', 'Seal of Saints', A, 2, rare, 'crown', [hit(14, 19), guard(9, 12)]),
  ];
  const byId = Object.fromEntries(catalog.map((c) => [c.id, c]));
  const effectText = {
    hit: (v, h) => (h > 1 ? '造成 ' + v + ' 点伤害，攻击 ' + h + ' 次' : '造成 ' + v + ' 点伤害'),
    block: (v) => '获得 ' + v + ' 点格挡',
    ember: (v) => '获得 ' + v + ' 点炉火',
    draw: (v) => '抽 ' + v + ' 张牌',
    burn: (v) => '施加 ' + v + ' 层灼烧',
    weak: (v) => '施加 ' + v + ' 回合虚弱',
    vulnerable: (v) => '施加 ' + v + ' 回合易伤',
    litHit: (v) => '造成 ' + v + ' 点伤害。拥有至少 3 点炉火时，额外造成 4 点伤害',
    forgeHit: (v) => '消耗至多 3 点炉火，造成 ' + v + ' 点伤害，每点炉火额外增加 4 点',
    cleanse: () => '清除自身虚弱与脆弱',
    shieldHit: (v) => '造成等同于自身格挡加 ' + v + ' 的伤害',
    pyre: (v) => '消耗至多 3 点炉火，施加 ' + v + ' 层灼烧，每点炉火额外增加 2 层',
    pilot: (v) => '每回合开始时获得 ' + v + ' 点炉火',
    bulwark: (v) => '每回合开始时获得 ' + v + ' 点格挡',
    thorns: (v) => '每次遭受攻击时反击 ' + v + ' 点伤害',
    strength: (v) => '本场战斗获得 ' + v + ' 点力量',
    convert: (v) => '消耗 2 点炉火，获得 ' + v + ' 点能量',
    recover: (v) => '从弃牌堆顶取回 ' + v + ' 张牌',
    retain: (v) => '下回合保留至多 ' + v + ' 点格挡',
    burnHit: (v) => '造成 ' + v + ' 点伤害，加上目标的灼烧层数',
    blood: (v) => '失去 ' + v + ' 点生命，最低剩余 1 点',
    heal: (v) => '恢复 ' + v + ' 点生命',
    lonelyHit: (v) => '造成 ' + v + ' 点伤害，若这是手中唯一的攻击牌则伤害翻倍',
    kindling: (v) => '每打出一张攻击牌，施加 ' + v + ' 层灼烧',
    doubleBurn: (v) => '施加 ' + v + ' 层灼烧，然后使灼烧层数翻倍',
    zeal: (v) => '每回合开始时获得 ' + v + ' 点力量',
    bellHit: (v) => '造成 ' + v + ' 点伤害，每拥有 1 点炉火多攻击一次',
    energy: (v) => '获得 ' + v + ' 点能量',
  };
  function cardKey(value) {
    if (typeof value === 'string') return value;
    return value && (value.key || value.id + (value.upgraded ? '+' : ''));
  }
  const cardCache = Object.create(null);
  for (const data of catalog) {
    for (const upgraded of [false, true]) {
      const key = data.id + (upgraded ? '+' : '');
      const effects = data.effects.map((e) => ({
        kind: e.kind,
        value: upgraded ? e.upgradedValue : e.value,
        hits: e.hits,
      }));
      const text = effects.map((e) => effectText[e.kind](e.value, e.hits)).join('。') + '。';
      cardCache[key] = Object.freeze({
        ...data,
        key,
        upgraded,
        effects,
        name: data.name + (upgraded ? '+' : ''),
        description: text + (data.exhausts || data.type === P ? ' 消耗。' : ''),
      });
    }
  }
  const card = (key) => cardCache[cardKey(key)] || null;
  function upgrade(key) {
    const data = card(key);
    return data ? data.id + '+' : null;
  }
  const cards = catalog.map((data) => card(data.id));
  const starterDeck = () => [
    'strike',
    'strike',
    'strike',
    'ward',
    'ward',
    'ward',
    'kindle',
    'cinder',
    'vigil',
    'brand',
  ];
  function relic(id, name, description) {
    return { id, name, description };
  }
  const relics = Object.fromEntries(
    [
      relic('wick', '不灭灯芯', '战斗开始时获得 2 点炉火。'),
      relic('rivet', '圣门铆钉', '战斗开始时获得 7 点格挡。'),
      relic('rosary', '炭晶念珠', '每回合打出的第一张攻击牌额外施加 2 层灼烧。'),
      relic('tongue', '铜制钟舌', '第一回合获得 1 点额外能量。'),
      relic('veil', '送葬黑纱', '每回合第一次获得格挡时，额外获得 2 点。'),
      relic('pin', '银烛针', '你的力量增加 1 点。'),
      relic('casket', '温灰匣', '胜利时恢复 4 点生命。'),
      relic('lens', '雾港透镜', '每回合打出的第三张牌使你抽 1 张牌。'),
      relic('latch', '余热门闩', '每回合开始时保留至多 3 点格挡。'),
      relic('wickbone', '白骨灯座', '每回合开始时获得 1 点炉火。'),
      relic('claw', '鸦足印', '对易伤目标的攻击额外造成 2 点伤害，再计算易伤加成。'),
      relic('script', '金边抄本', '每回合额外抽 1 张牌。'),
    ].map((r) => [r.id, r]),
  );

  function damage(name, amount, hits = 1) {
    return { name, type: 'attack', base: amount, hits };
  }
  function defend(name, block) {
    return { name, type: 'guard', block };
  }
  function buff(name, power, block = 0) {
    return { name, type: 'buff', power, block };
  }
  function curse(name, debuff, duration, base = 0) {
    return { name, type: base ? 'attack' : 'curse', debuff, duration, base, hits: base ? 1 : 0 };
  }
  function foe(id, name, en, act, tier, hp, pattern, rage, tagline) {
    return { id, name, en, act, tier, hp, maxHp: hp, pattern, rage, tagline };
  }
  const enemies = Object.fromEntries(
    [
      foe(
        'bellkeeper',
        '守钟人',
        'The Bellkeeper',
        1,
        'normal',
        38,
        [damage('沉钟坠击', 7), defend('铜甲闭合', 5), damage('鹿角横扫', 5, 2), buff('晚祷钟鸣', 2)],
        null,
        '鹿角之下，钟声早已替他开口。',
      ),
      foe(
        'waxling',
        '滴蜡童子',
        'Tallow Child',
        1,
        'normal',
        34,
        [curse('白蜡蒙眼', 'weak', 1, 4), damage('烛芯扑击', 4, 2), defend('凝蜡', 8)],
        null,
        '圣像在哭，蜡泪却向火焰爬去。',
      ),
      foe(
        'tollman',
        '收骨税吏',
        'The Titheman',
        1,
        'normal',
        40,
        [damage('清算', 8), curse('征捐', 'frail', 2), damage('加征', 6, 2)],
        null,
        '每一块骨头，都记在账上。',
      ),
      foe(
        'vesper',
        '晚祷石像',
        'Vesper Gargoyle',
        1,
        'elite',
        55,
        [defend('合拢石翼', 9), damage('断柱俯冲', 13), damage('石羽', 5, 2), buff('裂壳', 2, 4)],
        null,
        '暮钟响过，它终于从檐角落下。',
      ),
      foe(
        'choir',
        '空喉唱诗班',
        'The Hollow Choir',
        1,
        'boss',
        84,
        [damage('领唱', 8), buff('和声', 1, 5), damage('三叠咏', 4, 3), curse('失声祷词', 'weak', 1, 5)],
        [damage('末节咏叹', 13), defend('互为回响', 7), damage('四声齐鸣', 3, 4)],
        '每一具空喉，都在等一个活人的声带。',
      ),
      foe(
        'sexton',
        '拾灯掘墓人',
        'Lamp Sexton',
        2,
        'normal',
        48,
        [damage('埋灯', 10), curse('覆土', 'weak', 1, 6), defend('掩墓', 8)],
        null,
        '他把灭掉的灯一盏盏埋进土里。',
      ),
      foe(
        'cenobite',
        '锁面修士',
        'Chainbound Friar',
        2,
        'normal',
        46,
        [curse('拷问', 'frail', 1, 5), damage('铁鞭', 4, 3), buff('苦行', 2, 5)],
        null,
        '锁链敲击他的脸，祈祷便有了节拍。',
      ),
      foe(
        'glasshound',
        '琉璃猎犬',
        'The Glass Hound',
        2,
        'normal',
        45,
        [damage('裂光噬咬', 6, 2), defend('镜面鳞甲', 9), damage('碎晶飞散', 11)],
        null,
        '倒影总比它先一步露出獠牙。',
      ),
      foe(
        'confessor',
        '铜舌告解师',
        'Brazen Confessor',
        2,
        'elite',
        74,
        [curse('告罪', 'weak', 1, 7), damage('烫印', 13), buff('圣令', 2, 6), damage('铜舌双响', 7, 2)],
        null,
        '忏悔一次，铜舌便重一分。',
      ),
      foe(
        'abbess',
        '缄烛女院长',
        'Abbess of Tapers',
        2,
        'boss',
        118,
        [
          curse('缄默礼', 'frail', 1, 6),
          damage('七枝烛台', 5, 3),
          defend('灵柩合拢', 11),
          buff('护灵圣咏', 2, 3),
        ],
        [damage('焚尽残祷', 14), curse('黑烟', 'weak', 1), damage('烛泪齐坠', 5, 3)],
        '她的修院已有百年无人吹熄蜡烛。',
      ),
      foe(
        'astrologer',
        '盲眼星官',
        'The Blind Astronomer',
        3,
        'normal',
        56,
        [damage('陨星', 13), buff('星移', 2, 7), curse('黑曜尘', 'frail', 1, 8)],
        null,
        '群星熄灭后，他的预言才开始准确。',
      ),
      foe(
        'saint',
        '失首圣徒',
        'Headless Saint',
        3,
        'normal',
        62,
        [defend('举首为盾', 11), damage('圣骨剑', 7, 2), curse('悼词', 'weak', 1, 8)],
        null,
        '他提着自己的头，沿石阶向上行走。',
      ),
      foe(
        'reliquary',
        '活圣物匣',
        'Living Reliquary',
        3,
        'normal',
        53,
        [damage('绞链', 5, 3), defend('合匣', 12), buff('遗骨躁动', 3)],
        null,
        '匣内不时传来活人的心跳。',
      ),
      foe(
        'astralstag',
        '环蚀冠鹿',
        'Eclipse Stag',
        3,
        'elite',
        90,
        [damage('逐月', 15), buff('轮蚀', 2, 7), damage('折光鹿角', 7, 2), curse('熄星', 'frail', 1, 9)],
        null,
        '每折断一枚鹿角，天上便少一颗星。',
      ),
      foe(
        'eclipse',
        '无昼之王',
        'The Dayless King',
        3,
        'boss',
        154,
        [
          damage('王权敲击', 12),
          buff('失落朝仪', 1, 8),
          curse('长夜帷幕', 'weak', 1, 8),
          damage('黑日冠冕', 6, 3),
        ],
        [
          curse('末日晨祷', 'frail', 1, 10),
          damage('破晓逆行', 18),
          buff('黑日升起', 2, 7),
          damage('三重日蚀', 7, 3),
        ],
        '暮色从王座垂下，在此跪拜的影子从未起身。',
      ),
    ].map((f) => [f.id, f]),
  );

  function seedNumber(seed) {
    if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
    let result = 2166136261;
    for (const ch of String(seed ?? Date.now())) result = Math.imul(result ^ ch.charCodeAt(0), 16777619);
    return result >>> 0;
  }
  function random(b) {
    b.rng = (b.rng + 0x6d2b79f5) >>> 0;
    let h = Math.imul(b.rng ^ (b.rng >>> 15), 1 | b.rng);
    h ^= h + Math.imul(h ^ (h >>> 7), 61 | h);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(b, pile) {
    for (let i = pile.length - 1; i > 0; i--) {
      const j = Math.floor(random(b) * (i + 1));
      [pile[i], pile[j]] = [pile[j], pile[i]];
    }
    return pile;
  }
  const owns = (b, id) => b.relics.includes(id);
  const EMBER_LIMIT = 6;
  const HAND_LIMIT = 10;
  function log(b, msg) {
    b.log.push(msg);
    if (b.log.length > 80) b.log.shift();
  }
  function emit(b, type, target, value) {
    b.events.push({ type, target, value });
  }
  function gainEmber(b, amount) {
    const before = b.ember;
    b.ember = Math.min(EMBER_LIMIT, b.ember + amount);
    if (b.ember !== before) emit(b, 'ember', 'player', b.ember - before);
  }
  function gainBlock(b, value) {
    let gained = b.frail > 0 ? Math.floor(value * 0.75) : value;
    if (gained && !b.gainedBlock && owns(b, 'veil')) gained += 2;
    b.block += gained;
    if (gained) {
      b.gainedBlock = true;
      emit(b, 'block', 'player', gained);
    }
  }
  function heal(b, value) {
    const gained = Math.min(b.maxHp - b.hp, value);
    b.hp += gained;
    if (gained) emit(b, 'heal', 'player', gained);
  }
  function drawCards(b, count) {
    for (let i = 0; i < count && b.hand.length < HAND_LIMIT; i++) {
      if (!b.draw.length && b.discard.length) {
        b.draw = shuffle(b, b.discard.splice(0));
        log(b, '弃牌堆已洗入抽牌堆。');
      }
      if (!b.draw.length) break;
      b.hand.push(b.draw.pop());
    }
  }
  function strikeValue(b, base) {
    const bonus = owns(b, 'claw') && b.enemy.vulnerable ? 2 : 0;
    let amount = Math.max(0, base + b.strength + bonus);
    if (b.weak) amount = Math.floor(amount * 0.75);
    if (b.enemy.vulnerable) amount = Math.floor(amount * 1.5);
    return amount;
  }
  function receiveHit(b, target, amount, piercing = false) {
    const unit = target === 'player' ? b : b.enemy;
    const blocked = piercing ? 0 : Math.min(unit.block, amount);
    const lost = Math.min(unit.hp, amount - blocked);
    unit.block -= blocked;
    unit.hp -= lost;
    if (blocked) emit(b, 'blocked', target, blocked);
    if (lost) emit(b, 'damage', target, lost);
    return lost;
  }
  function strike(b, base, hits = 1) {
    for (let i = 0; i < hits && b.enemy.hp > 0; i++) receiveHit(b, 'enemy', strikeValue(b, base));
  }
  function addBurn(b, v) {
    b.enemy.burn += v;
    emit(b, 'burn', 'enemy', v);
  }
  const debuffNames = { weak: '虚弱', frail: '脆弱' };
  function intentData(b) {
    const cfg = enemies[b.enemy.id];
    const pattern = b.enemy.enraged && cfg.rage ? cfg.rage : cfg.pattern;
    return pattern[b.enemy.step % pattern.length];
  }
  function refreshIntent(b) {
    const source = intentData(b);
    let amount = source.base ? source.base + b.enemy.strength + b.difficultyDamage : 0;
    if (b.enemy.weak) amount = Math.floor(amount * 0.75);
    const hits = source.hits || 0,
      block = source.block || 0;
    const parts = [];
    if (amount)
      parts.push(
        hits > 1 ? '攻击 ' + hits + ' 次，每次造成 ' + amount + ' 点伤害' : '造成 ' + amount + ' 点伤害',
      );
    if (block) parts.push('获得 ' + block + ' 点格挡');
    if (source.power) parts.push('获得 ' + source.power + ' 点力量');
    if (source.debuff) parts.push('施加 ' + source.duration + ' 回合' + debuffNames[source.debuff]);
    b.enemy.intent = {
      name: source.name,
      type: source.type,
      damage: amount,
      hits,
      block,
      power: source.power || 0,
      debuff: source.debuff || '',
      duration: source.duration || 0,
      description: parts.join('，') + '。',
    };
  }
  function establishOutcome(b) {
    if (b.hp <= 0) {
      b.status = 'lost';
      log(b, '灯火熄灭。');
    } else if (b.enemy.hp <= 0) {
      b.status = 'won';
      log(b, b.enemy.name + '已倒下。');
      if (owns(b, 'casket')) heal(b, 4);
    }
    return b.status !== 'active';
  }
  function startTurn(b, openingHand) {
    b.turn++;
    b.energy = b.maxEnergy + (b.turn === 1 && owns(b, 'tongue') ? 1 : 0);
    b.block = Math.min(b.block, b.retain + (owns(b, 'latch') ? 3 : 0));
    b.played = 0;
    b.attacksPlayed = 0;
    b.gainedBlock = false;
    b.retain = 0;
    gainEmber(b, b.powers.pilot + (owns(b, 'wickbone') ? 1 : 0));
    if (b.powers.bulwark) gainBlock(b, b.powers.bulwark);
    b.strength += b.powers.zeal;
    if (b.turn === 1 && owns(b, 'rivet')) gainBlock(b, 7);
    if (openingHand) {
      for (const id of ['strike', 'ward', 'kindle', 'cinder', 'vigil']) {
        const pos = b.draw.findIndex((key) => card(key).id === id);
        if (pos !== -1) b.hand.push(b.draw.splice(pos, 1)[0]);
      }
    }
    drawCards(b, 5 + (owns(b, 'script') ? 1 : 0) - b.hand.length);
    refreshIntent(b);
    log(b, '第 ' + b.turn + ' 回合 · ' + b.enemy.name + '准备「' + b.enemy.intent.name + '」。');
  }
  function createBattle(options = {}) {
    const cfg = enemies[options.enemy || options.enemyId] || enemies.bellkeeper;
    const deck = (options.deck || starterDeck()).map(cardKey);
    if (!deck.length || deck.some((key) => !card(key))) throw new Error('牌组含未知卡牌或缺少卡牌。');
    const maxHp = Math.max(1, Math.floor(options.maxHp ?? 72));
    const floor = Math.max(1, Math.floor(options.floor || 1));
    const ascension = Math.max(0, Math.min(20, Math.floor(options.ascension || 0)));
    const foeHp = Math.round(cfg.hp * (1 + 0.05 * ascension));
    const b = {
      version: 1,
      status: 'active',
      rng: seedNumber(options.seed),
      turn: 0,
      energy: 0,
      maxEnergy: 3,
      ember: 0,
      maxEmber: EMBER_LIMIT,
      hp: Math.max(1, Math.min(maxHp, Math.floor(options.hp ?? maxHp))),
      maxHp,
      block: 0,
      strength: 0,
      weak: 0,
      frail: 0,
      retain: 0,
      played: 0,
      attacksPlayed: 0,
      gainedBlock: false,
      relics: [...new Set(options.relics ?? ['wick'])],
      floor,
      ascension,
      difficultyDamage: Math.ceil(ascension / 3),
      powers: { pilot: 0, bulwark: 0, thorns: 0, kindling: 0, zeal: 0 },
      enemy: {
        id: cfg.id,
        name: cfg.name,
        en: cfg.en,
        tier: cfg.tier,
        hp: foeHp,
        maxHp: foeHp,
        block: 0,
        strength: 0,
        weak: 0,
        vulnerable: 0,
        burn: 0,
        step: 0,
        enraged: false,
        intent: null,
      },
      draw: deck.slice(),
      hand: [],
      discard: [],
      exhaust: [],
      log: [],
      events: [],
      lastAction: { type: 'start' },
    };
    if (owns(b, 'wick')) gainEmber(b, 2);
    if (owns(b, 'pin')) b.strength++;
    shuffle(b, b.draw);
    startTurn(b, cfg.id === 'bellkeeper' && floor === 1);
    return b;
  }
  function spend(b, n) {
    const used = Math.min(b.ember, n);
    b.ember -= used;
    if (used) emit(b, 'ember', 'player', -used);
    return used;
  }
  function applyEffect(b, e) {
    const v = e.value,
      enemy = b.enemy;
    switch (e.kind) {
      case 'hit':
        strike(b, v, e.hits);
        break;
      case 'block':
        gainBlock(b, v);
        break;
      case 'ember':
        gainEmber(b, v);
        break;
      case 'draw':
        drawCards(b, v);
        break;
      case 'burn':
        addBurn(b, v);
        break;
      case 'weak':
        enemy.weak += v;
        break;
      case 'vulnerable':
        enemy.vulnerable += v;
        break;
      case 'litHit':
        strike(b, v + (b.ember >= 3 ? 4 : 0));
        break;
      case 'forgeHit':
        strike(b, v + 4 * spend(b, 3));
        break;
      case 'shieldHit':
        strike(b, v + b.block);
        break;
      case 'pyre':
        addBurn(b, v + 2 * spend(b, 3));
        break;
      case 'cleanse':
        b.weak = 0;
        b.frail = 0;
        break;
      case 'pilot':
      case 'bulwark':
      case 'thorns':
      case 'kindling':
      case 'zeal':
        b.powers[e.kind] += v;
        break;
      case 'strength':
        b.strength += v;
        break;
      case 'convert':
        spend(b, 2);
        b.energy += v;
        break;
      case 'recover': {
        for (let i = 0; i < v && b.discard.length && b.hand.length < HAND_LIMIT; i++)
          b.hand.push(b.discard.pop());
        break;
      }
      case 'retain':
        b.retain += v;
        break;
      case 'burnHit':
        strike(b, v + enemy.burn);
        break;
      case 'blood': {
        const loss = Math.min(v, b.hp - 1);
        b.hp -= loss;
        if (loss) emit(b, 'damage', 'player', loss);
        break;
      }
      case 'heal':
        heal(b, v);
        break;
      case 'lonelyHit':
        strike(b, v * (b.hand.some((key) => card(key).type === A) ? 1 : 2));
        break;
      case 'doubleBurn':
        addBurn(b, enemy.burn + 2 * v);
        break;
      case 'bellHit':
        strike(b, v, 1 + b.ember);
        break;
      case 'energy':
        b.energy += v;
        break;
      default:
        throw new Error('未知卡牌效果 ' + e.kind);
    }
  }
  function blockedReason(b, index) {
    if (b.status !== 'active') return '战斗已结束';
    if (!Number.isInteger(index) || index < 0 || index >= b.hand.length) return '请选择手牌';
    const data = card(b.hand[index]);
    if (data.cost > b.energy) return '能量不足';
    if (data.id === 'watchfire' && b.ember < 2) return '需要 2 点炉火';
    return '';
  }
  const canPlay = (b, index) => !blockedReason(b, index);
  function cardSummary(b, data) {
    const sum = (type, target) =>
      b.events.reduce(
        (n, event) => (event.type === type && event.target === target ? n + event.value : n),
        0,
      );
    const parts = [];
    const damage = sum('damage', 'enemy'),
      absorbed = sum('blocked', 'enemy');
    const block = sum('block', 'player'),
      healed = sum('heal', 'player'),
      burned = sum('burn', 'enemy');
    if (damage) parts.push('造成 ' + damage + ' 点伤害');
    if (absorbed) parts.push('敌方格挡抵消 ' + absorbed + ' 点');
    if (block) parts.push('获得 ' + block + ' 点格挡');
    if (healed) parts.push('恢复 ' + healed + ' 点生命');
    if (burned) parts.push('施加 ' + burned + ' 层灼烧');
    return '打出「' + data.name + '」' + (parts.length ? '，' + parts.join('，') : '') + '。';
  }
  function playCard(b, index) {
    if (!canPlay(b, index)) return false;
    const [key] = b.hand.splice(index, 1);
    const data = card(key);
    b.events = [];
    b.lastAction = { type: 'card', key, cardType: data.type };
    b.energy -= data.cost;
    b.played++;
    for (const e of data.effects) applyEffect(b, e);
    if (data.type === A) {
      b.attacksPlayed++;
      if (b.powers.kindling) addBurn(b, b.powers.kindling);
      if (b.attacksPlayed === 1 && owns(b, 'rosary')) addBurn(b, 2);
    }
    if (data.type === P || data.exhausts) b.exhaust.push(key);
    else b.discard.push(key);
    if (b.played === 3 && owns(b, 'lens')) drawCards(b, 1);
    b.lastAction.description = cardSummary(b, data);
    log(b, b.lastAction.description);
    refreshIntent(b);
    establishOutcome(b);
    return true;
  }
  function endTurn(b) {
    if (b.status !== 'active') return false;
    b.events = [];
    const enemy = b.enemy,
      intent = enemy.intent;
    b.lastAction = { type: 'enemy', intent: { ...intent } };
    b.discard.push(...b.hand.splice(0));
    if (enemy.burn > 0) {
      const lost = receiveHit(b, 'enemy', enemy.burn, true);
      log(b, '灼烧造成 ' + lost + ' 点伤害。');
      enemy.burn = Math.max(0, enemy.burn - 2);
      if (establishOutcome(b)) return true;
    }
    enemy.block = 0;
    const hpBefore = b.hp,
      blockBefore = b.block;
    if (intent.damage) {
      for (let i = 0; i < intent.hits && b.hp > 0 && enemy.hp > 0; i++) {
        receiveHit(b, 'player', intent.damage);
        if (b.powers.thorns) receiveHit(b, 'enemy', b.powers.thorns);
      }
      log(
        b,
        enemy.name +
          '施展「' +
          intent.name +
          '」，格挡抵消 ' +
          (blockBefore - b.block) +
          ' 点，损失 ' +
          (hpBefore - b.hp) +
          ' 点生命。',
      );
    } else log(b, enemy.name + '施展「' + intent.name + '」。');
    if (establishOutcome(b)) return true;
    enemy.block += intent.block;
    enemy.strength += intent.power;
    b.weak = Math.max(0, b.weak - 1);
    b.frail = Math.max(0, b.frail - 1);
    if (intent.debuff) b[intent.debuff] += intent.duration;
    enemy.weak = Math.max(0, enemy.weak - 1);
    enemy.vulnerable = Math.max(0, enemy.vulnerable - 1);
    enemy.step++;
    if (enemies[enemy.id].rage && !enemy.enraged && enemy.hp <= enemy.maxHp / 2) {
      enemy.enraged = true;
      enemy.step = 0;
      log(b, enemy.name + '的仪式进入终章。');
    }
    startTurn(b, false);
    return true;
  }
  const rules = Object.freeze({
    ember: '炉火在本场战斗内保留，最多 6 点。带有炉火条件的牌可获得额外效果。',
    energy: '每回合回复 3 点能量。卡牌左上角的数字表示打出费用。',
    burn: '敌人行动前，每层灼烧造成 1 点穿透格挡的伤害，然后减少 2 层。',
    block: '格挡抵消本回合受到的攻击伤害，下一回合开始时清空。',
    weak: '虚弱使攻击伤害降低 25%。',
    vulnerable: '易伤使受到的攻击伤害增加 50%。',
    frail: '脆弱使新获得的格挡降低 25%。',
    strength: '每点力量使每段攻击增加 1 点伤害。',
    exhaust: '消耗牌在本场战斗内移入消耗堆。战斗结束后回归牌组。',
    draw: '每回合抽 5 张牌，手牌上限 10 张。抽牌堆耗尽时自动洗入弃牌堆。',
  });
  return Object.freeze({
    card,
    cards,
    enemies,
    relics,
    upgrade,
    starterDeck,
    createBattle,
    playCard,
    endTurn,
    canPlay,
    blockedReason,
    rules,
  });
});
