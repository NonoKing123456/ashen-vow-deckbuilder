/* Ashen Vow — expeditions, routes and persistence. */
(function (root, factory) {
  const engine = typeof module === 'object' && module.exports ? require('./engine.js') : root.Engine;
  const api = factory(engine, root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Campaign = api;
})(globalThis, function (Engine, root) {
  'use strict';

  const SAVE_KEY = 'ashenvow.expedition.v1';
  const BACKUP_KEY = SAVE_KEY + '.previous';
  const PROFILE_KEY = 'ashenvow.chronicle.v1';
  const VERSION = 1;
  const FLOORS = 8;
  const acts = [
    {
      name: '失钟教区',
      en: 'THE SILENT PARISH',
      roman: 'I',
      seal: '钟',
      boss: 'choir',
      place: '断钟阶',
      lore: '最后一声晚祷从钟楼落下时，整座教区闭上了眼睛。只有灯芯仍在燃烧。',
    },
    {
      name: '烬海修院',
      en: 'THE CINDER CLOISTER',
      roman: 'II',
      seal: '潮',
      boss: 'abbess',
      place: '盐白回廊',
      lore: '烬潮退去，海床上裸露出一条盐白色的长廊。那些唱诗的人仍坐在水线以下。',
    },
    {
      name: '蚀日圣座',
      en: 'THE ECLIPSED SEE',
      roman: 'III',
      seal: '蚀',
      boss: 'eclipse',
      place: '无日圣坛',
      lore: '黑日悬在圣座上方，投下一圈金色的阴影。没有人记得，是谁先为它点亮了灯。',
    },
  ];
  const places = {
    combat: ['褪色礼拜堂', '熄灯小径', '袖珍圣堂', '铜铃拱门', '渡鸦庭院', '弃誓甬道'],
    elite: ['缄默刑坛', '守誓者墓园', '碎冠王庭'],
    camp: ['余火圣龛', '灰灯营地', '长夜壁炉'],
    shop: ['渡烬商旅', '香料集市', '流亡者货栈'],
    event: ['断绳古井', '沉烬密室', '旧衣礼堂'],
    boss: ['终祷钟楼', '溺海内殿', '日蚀王座'],
  };
  const kinds = { combat: '交战', elite: '精英', event: '奇遇', camp: '营火', shop: '商旅', boss: '幕主' };
  const events = [
    {
      id: 'tithe',
      name: '无声的什一税',
      en: 'THE SILENT TITHE',
      icon: 'relic',
      lore: '石像伸出两只掌心。一只盛着褪色的金箔，另一只，留着上一位朝圣者的血迹。',
      options: [
        { id: 'blood', name: '留下血印', text: '失去 7 生命，获得 46 铸币。', effect: 'blood' },
        { id: 'bread', name: '供上铸币', text: '支付 22 铸币，恢复 16 生命。', effect: 'tend' },
      ],
    },
    {
      id: 'scribe',
      name: '无脸抄经人',
      en: 'THE NAMELESS SCRIBE',
      icon: 'quill',
      lore: '她每写完一行，就从纸上剥下一层旧墨。摊开的那页上，恰好写着你的名字。',
      options: [
        { id: 'lesson', name: '交付学资', text: '支付 24 铸币，选择一张牌升级。', effect: 'lesson' },
        { id: 'erase', name: '刮去旧誓', text: '失去 5 生命，选择移除一张牌。', effect: 'erase' },
      ],
    },
    {
      id: 'wellspring',
      name: '月下的洗礼池',
      en: 'THE LUNAR FONT',
      icon: 'drop',
      lore: '石池里的水逆流而上。有人把一枚烧焦的戒指留在池底，而水面映出的天空依旧是白昼。',
      options: [
        { id: 'drink', name: '捧水饮下', text: '生命上限增加 5，并恢复 5 生命。', effect: 'vigor' },
        { id: 'dive', name: '打捞沉物', text: '失去 8 生命，获得一件未持有的遗物。', effect: 'salvage' },
      ],
    },
    {
      id: 'coffin',
      name: '无人送别的灵车',
      en: 'THE LAST CARRIAGE',
      icon: 'gate',
      lore: '没有马匹的灵车停在岔路中央。车夫请你替他的最后一位客人，选好一件入土的旧物。',
      options: [
        { id: 'release', name: '埋葬往事', text: '选择移除一张牌。', effect: 'purge' },
        { id: 'escort', name: '护送灵车', text: '获得 25 铸币。', effect: 'wage' },
      ],
    },
    {
      id: 'swarm',
      name: '赴灯之蛾',
      en: 'THE WICK MOTHS',
      icon: 'flame',
      lore: '无数白蛾落在灯罩上。它们的翅膀上，有几行比灰烬还淡的字。',
      options: [
        { id: 'read', name: '解读蛾文', text: '失去 4 生命，选择一张牌升级。', effect: 'study' },
        { id: 'rest', name: '垂灯小憩', text: '恢复 9 生命。', effect: 'respite' },
      ],
    },
    {
      id: 'foundry',
      acts: [1],
      name: '铸钟师的遗稿',
      en: 'THE UNFINISHED PEAL',
      icon: 'anvil',
      lore: '模具里还留着指纹。铸钟师给儿子的最后一封信，只写了一遍浇铸的次序。',
      options: [
        { id: 'cast', name: '以血浇铸', text: '失去 6 生命，复制牌组中的一张牌。', effect: 'bloodcopy' },
        { id: 'sell', name: '卖掉铜模', text: '获得 25 铸币。', effect: 'wage' },
      ],
    },
    {
      id: 'pilot',
      acts: [2],
      name: '盐海上的摆渡人',
      en: 'THE SALT FERRY',
      icon: 'drop',
      lore: '她的船里没有桨，只有一只盛盐的小碗。她问你，想带着哪一段往事渡海。',
      options: [
        {
          id: 'carry',
          name: '买下盐符',
          text: '支付 26 铸币，生命上限增加 8，并恢复 8 生命。',
          effect: 'salt',
        },
        { id: 'sink', name: '让往事下沉', text: '选择移除一张牌。', effect: 'purge' },
      ],
    },
    {
      id: 'mirror',
      acts: [2, 3],
      name: '朝圣者的银镜',
      en: 'THE SILVER DOUBLE',
      icon: 'relic',
      lore: '银镜深处的朝圣者比你早一步抬手。他指向你的牌组，等你先挑出一句誓言。',
      options: [
        {
          id: 'reflect',
          name: '借镜重誓',
          text: '支付 20 铸币，复制一张牌，保留其锤炼等级。',
          effect: 'silvercopy',
        },
        { id: 'unlearn', name: '敲碎倒影', text: '失去 5 生命，选择移除一张牌。', effect: 'erase' },
      ],
    },
    {
      id: 'bonevault',
      acts: [2],
      name: '沉钟库房',
      en: 'THE SUNKEN VAULT',
      icon: 'gate',
      lore: '海泥里露出修院的旧库门。两根锈蚀的铁栅之间，仍躺着一卷封蜡完好的经文。',
      options: [
        { id: 'retrieve', name: '伸手取经', text: '失去 6 生命，获得一张随机稀有牌。', effect: 'scripture' },
        { id: 'wade', name: '搜集散钱', text: '获得 25 铸币。', effect: 'wage' },
      ],
    },
    {
      id: 'astrarium',
      acts: [3],
      name: '逆转的星仪',
      en: 'THE HOLLOW ORRERY',
      icon: 'relic',
      lore: '轨道上只剩一颗暗星。守仪人收取铸币，只让客人看一眼自己未曾许下的誓词。',
      options: [
        {
          id: 'readstars',
          name: '借读星图',
          text: '支付 32 铸币，获得一张随机稀有牌。',
          effect: 'astrology',
        },
        { id: 'sacrifice', name: '取走暗星', text: '失去 8 生命，获得一件未持有的遗物。', effect: 'salvage' },
      ],
    },
    {
      id: 'pawn',
      acts: [1, 3],
      name: '挂灯当铺',
      en: 'THE LANTERN BROKER',
      icon: 'shop',
      lore: '天花板上吊着的灯，都属于没能赎回它们的人。掌柜压低灯火，请你看柜台最底层。',
      options: [
        { id: 'buyback', name: '赎出旧物', text: '支付 45 铸币，获得一件未持有的遗物。', effect: 'collect' },
        { id: 'tend', name: '讨一口热汤', text: '恢复 9 生命。', effect: 'respite' },
      ],
    },
  ];
  const memory = Object.create(null);
  const pendingWrites = new Set();
  function read(key) {
    try {
      const storage = root.AshDesktop?.storage || root.localStorage;
      const value = pendingWrites.has(key) || !storage ? memory[key] : storage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (_) {
      return memory[key] ? JSON.parse(memory[key]) : null;
    }
  }
  function write(key, value) {
    const data = JSON.stringify(value);
    memory[key] = data;
    try {
      const storage = root.AshDesktop?.storage || root.localStorage;
      if (storage) {
        storage.setItem(key, data);
        pendingWrites.delete(key);
      }
    } catch (_) {
      pendingWrites.add(key);
    }
  }
  function blankProfile() {
    return { runs: 0, wins: 0, bestFloor: 0, maxAscension: 0, bestGold: 0, history: [] };
  }
  function profile() {
    const data = read(PROFILE_KEY);
    return data && Array.isArray(data.history) ? Object.assign(blankProfile(), data) : blankProfile();
  }
  function hashSeed(value) {
    let hash = 2166136261;
    for (const ch of String(value)) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
    return hash >>> 0;
  }
  function random(state) {
    state.rng = (state.rng + 0x6d2b79f5) >>> 0;
    let word = Math.imul(state.rng ^ (state.rng >>> 15), 1 | state.rng);
    word ^= word + Math.imul(word ^ (word >>> 7), word | 61);
    return ((word ^ (word >>> 14)) >>> 0) / 4294967296;
  }
  function pick(state, list) {
    return list[Math.floor(random(state) * list.length)];
  }
  function shuffled(state, values) {
    const list = values.slice();
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(random(state) * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }
  function newSeed() {
    if (root.crypto && root.crypto.getRandomValues) {
      const words = root.crypto.getRandomValues(new Uint32Array(2));
      return words[0].toString(36).toUpperCase() + '-' + words[1].toString(36).toUpperCase().slice(0, 4);
    }
    return (
      Date.now().toString(36).toUpperCase() +
      '-' +
      Math.floor(Math.random() * 65536)
        .toString(36)
        .toUpperCase()
    );
  }
  function makeRoute(run, act) {
    const pools = [
      ['combat', 'combat', 'combat'],
      ['event', 'combat', 'combat'],
      ['shop', 'combat', 'event'],
      ['elite', 'event', 'combat'],
      ['camp', 'combat', 'shop'],
      ['elite', 'combat', 'event'],
      ['camp', 'event', 'camp'],
      ['boss'],
    ];
    const route = [];
    const pool = shuffled(
      run,
      events.filter((e) => !e.acts || e.acts.includes(act)),
    );
    const eventPool = pool.sort(
      (a, b) => Number(run.seenEvents.includes(a.id)) - Number(run.seenEvents.includes(b.id)),
    );
    pools.forEach((pool, i) => {
      let types = shuffled(run, pool);
      if (act === 1 && i === 0) types = ['combat'];
      const row = types.map((type, lane) => {
        const tier = type === 'combat' ? 'normal' : type;
        const candidates = Object.values(Engine.enemies).filter((e) => e.act === act && e.tier === tier);
        let enemyId = candidates.length ? pick(run, candidates).id : null;
        if (type === 'boss') enemyId = acts[act - 1].boss;
        if (act === 1 && i === 0) enemyId = 'bellkeeper';
        return {
          id: act + '.' + (i + 1) + '.' + lane,
          row: i,
          lane,
          type,
          name: type === 'boss' ? places.boss[act - 1] : pick(run, places[type]),
          x: types.length === 1 ? 0.5 : [0.16, 0.5, 0.84][lane] + (random(run) - 0.5) * 0.065,
          enemyId,
          eventId: type === 'event' ? eventPool.shift().id : null,
          next: [],
        };
      });
      route.push(row);
    });
    for (let i = 0; i < route.length - 1; i++) {
      const row = route[i],
        next = route[i + 1];
      row.forEach((node, j) => {
        if (row.length === 1 || next.length === 1) node.next = next.map((n) => n.id);
        else {
          node.next = [next[j].id];
          if (j === 0 || j === 2) node.next.push(next[1].id);
          else node.next.push(next[random(run) < 0.5 ? 0 : 2].id);
        }
      });
    }
    return route;
  }
  function find(run, id) {
    return run.route.flat().find((n) => n.id === id);
  }
  function currentNode(run) {
    return run.nodeId ? find(run, run.nodeId) : null;
  }
  function choices(run) {
    const node = currentNode(run);
    return node ? node.next.map((id) => find(run, id)) : run.route[0];
  }
  const phases = new Set([
    'combat',
    'map',
    'reward',
    'event',
    'shop',
    'camp',
    'transition',
    'defeat',
    'victory',
  ]);
  const cardIds = new Set(Engine.cards.map((card) => card.id));
  function validSave(run) {
    if (!run || run.version !== VERSION || !phases.has(run.phase) || !acts[run.act - 1]) return false;
    if (
      !Array.isArray(run.deck) ||
      !run.deck.length ||
      !run.deck.every((key) => typeof key === 'string' && cardIds.has(key.replace(/\+$/, '')))
    )
      return false;
    if (
      !Array.isArray(run.route) ||
      run.route.length !== FLOORS ||
      !run.route.every(
        (row) =>
          Array.isArray(row) && row.length && row.every((n) => n && kinds[n.type] && Array.isArray(n.next)),
      )
    )
      return false;
    if (
      !Array.isArray(run.path) ||
      !Array.isArray(run.relics) ||
      !run.stats ||
      !Number.isFinite(run.hp) ||
      !Number.isFinite(run.maxHp)
    )
      return false;
    if (run.nodeId && !currentNode(run)) return false;
    if (run.phase === 'combat') return !!run.battle?.enemy?.intent && Array.isArray(run.battle.hand);
    if (run.phase === 'reward')
      return Array.isArray(run.room?.cards) && run.room.cards.every((id) => cardIds.has(id));
    if (run.phase === 'event') return !!currentEvent(run);
    if (run.phase === 'shop') return Array.isArray(run.room?.items);
    return true;
  }
  function save(run) {
    const previous = read(SAVE_KEY);
    write(BACKUP_KEY, previous?.id === run.id && validSave(previous) ? previous : run);
    write(SAVE_KEY, run);
    return run;
  }
  function load() {
    let run = read(SAVE_KEY);
    if (!validSave(run)) {
      run = read(BACKUP_KEY);
      if (!validSave(run)) return null;
      write(SAVE_KEY, run);
    }
    if (!Array.isArray(run.seenEvents)) run.seenEvents = [];
    if (run.phase === 'victory' || run.phase === 'defeat') archive(run);
    return run;
  }
  function newRun(options = {}) {
    const seed = String(options.seed == null || String(options.seed).trim() === '' ? newSeed() : options.seed)
      .trim()
      .slice(0, 48);
    const ascension = Math.max(
      0,
      Math.min(profile().maxAscension, Math.trunc(Number(options.ascension) || 0)),
    );
    const run = {
      version: VERSION,
      id: newSeed() + '-' + Date.now(),
      seed,
      rng: hashSeed(seed),
      ascension,
      hp: 72,
      maxHp: 72,
      gold: 55,
      act: 1,
      actFloor: 0,
      floor: 0,
      deck: Engine.starterDeck(),
      relics: ['wick'],
      route: [],
      path: [],
      seenEvents: [],
      nodeId: null,
      stats: { victories: 0, elites: 0, bosses: 0, gold: 0, upgrades: 0, events: 0 },
      phase: 'map',
      battle: null,
      room: null,
    };
    run.route = makeRoute(run, 1);
    return enter(run, run.route[0][0].id);
  }
  function cardOffers(run, count) {
    const available = Engine.cards.filter((c) => c.rarity !== 'basic');
    const offers = [];
    for (let i = 0; i < count && available.length; i++) {
      const roll = random(run);
      const elite = currentNode(run)?.type === 'elite';
      const rare = roll < (elite ? 0.18 : 0.07) + (run.act - 1) * 0.025;
      const tier = rare ? 'rare' : roll < 0.43 ? 'uncommon' : 'common';
      const candidates = available.filter((c) => c.rarity === tier);
      const card = pick(run, candidates.length ? candidates : available);
      offers.push(card.id);
      available.splice(available.indexOf(card), 1);
    }
    return offers;
  }
  function freeRelics(run) {
    return Object.keys(Engine.relics).filter((id) => !run.relics.includes(id) && id !== 'wick');
  }
  function newShop(run) {
    const cards = cardOffers(run, 3);
    const items = cards.map((id, i) => {
      const base = { common: 31, uncommon: 46, rare: 67 }[Engine.card(id).rarity] || 35;
      return { key: 'c' + i, type: 'card', id, price: base + 2 * run.act, sold: false };
    });
    const relic = pick(run, freeRelics(run));
    if (relic)
      items.push({ key: 'treasure', type: 'relic', id: relic, price: 68 + run.act * 5, sold: false });
    items.push(
      { key: 'tend', type: 'tend', price: 19, sold: false },
      { key: 'purge', type: 'purge', price: 35 + run.act * 3, sold: false },
    );
    return { items };
  }
  function enter(run, id) {
    if (run.phase !== 'map') return run;
    const node = choices(run).find((n) => n.id === id);
    if (!node) return run;
    run.nodeId = id;
    run.notice = '';
    run.path.push(id);
    run.actFloor = node.row + 1;
    run.floor = (run.act - 1) * FLOORS + run.actFloor;
    run.room = null;
    if (['combat', 'elite', 'boss'].includes(node.type)) {
      run.phase = 'combat';
      run.battle = Engine.createBattle({
        hp: run.hp,
        maxHp: run.maxHp,
        deck: run.deck.slice(),
        relics: run.relics.slice(),
        enemy: node.enemyId,
        floor: run.floor,
        act: run.act,
        ascension: run.ascension,
        seed: Math.floor(random(run) * 4294967296),
      });
    } else {
      run.phase = node.type;
      if (node.type === 'shop') run.room = newShop(run);
      if (node.type === 'event') {
        run.room = { eventId: node.eventId };
        if (!run.seenEvents.includes(node.eventId)) run.seenEvents.push(node.eventId);
        run.stats.events++;
      }
    }
    return save(run);
  }
  function gainGold(run, value) {
    run.gold += value;
    run.stats.gold += value;
  }
  function heal(run, value) {
    run.hp = Math.min(run.maxHp, run.hp + value);
  }
  function archive(run) {
    const p = profile();
    if (p.history.some((record) => record.id === run.id)) return;
    const won = run.phase === 'victory';
    p.runs++;
    p.wins += Number(won);
    p.bestFloor = Math.max(p.bestFloor, run.floor);
    p.bestGold = Math.max(p.bestGold, run.stats.gold);
    if (won) p.maxAscension = Math.min(10, Math.max(p.maxAscension, run.ascension + 1));
    p.history.unshift({
      id: run.id,
      seed: run.seed,
      floor: run.floor,
      won,
      ascension: run.ascension,
      victories: run.stats.victories,
      date: new Date().toISOString(),
    });
    p.history = p.history.slice(0, 30);
    write(PROFILE_KEY, p);
  }
  function finish(run, won) {
    run.phase = won ? 'victory' : 'defeat';
    run.room = null;
    save(run);
    archive(run);
    return run;
  }
  function syncBattle(run) {
    if (run.phase !== 'combat' || !run.battle) return run;
    run.hp = run.battle.hp;
    run.maxHp = run.battle.maxHp;
    if (run.battle.status === 'lost') return finish(run, false);
    if (run.battle.status !== 'won') return save(run);
    run.stats.victories++;
    const type = currentNode(run).type;
    const elite = type === 'elite',
      boss = type === 'boss';
    if (elite) run.stats.elites++;
    if (boss) run.stats.bosses++;
    const gold = (boss ? 48 : elite ? 31 : 15) + run.act * 2 + Math.floor(random(run) * 9);
    gainGold(run, gold);
    if (boss && run.act === 3) return finish(run, true);
    const relic = elite || boss ? pick(run, freeRelics(run)) : null;
    if (relic) run.relics.push(relic);
    run.phase = 'reward';
    run.room = { cards: cardOffers(run, 3), gold, relic: relic || null, boss };
    run.battle = null;
    return save(run);
  }
  function reward(run, cardId) {
    if (run.phase !== 'reward' || (cardId != null && !run.room.cards.includes(cardId))) return run;
    if (cardId != null) run.deck.push(cardId);
    run.phase = run.room.boss ? 'transition' : 'map';
    run.room = null;
    return save(run);
  }
  function continueAct(run) {
    if (run.phase !== 'transition' || run.act >= 3) return run;
    run.act++;
    run.actFloor = 0;
    run.route = makeRoute(run, run.act);
    run.nodeId = null;
    heal(run, Math.ceil((run.maxHp - run.hp) * 0.6));
    run.phase = 'map';
    return save(run);
  }
  function canUpgrade(run, i) {
    return (
      Number.isInteger(i) &&
      i >= 0 &&
      i < run.deck.length &&
      !run.deck[i].endsWith('+') &&
      Engine.upgrade(run.deck[i]) !== run.deck[i]
    );
  }
  function upgrade(run, i) {
    run.deck[i] = Engine.upgrade(run.deck[i]);
    run.stats.upgrades++;
  }
  function camp(run, option, index) {
    if (run.phase !== 'camp') return run;
    if (option === 'rest') heal(run, Math.ceil(run.maxHp * 0.32));
    else if (option === 'upgrade' && canUpgrade(run, index)) upgrade(run, index);
    else return run;
    run.notice =
      option === 'rest'
        ? '休整完毕 · 当前生命 ' + run.hp + ' / ' + run.maxHp
        : '已锤炼「' + Engine.card(run.deck[index]).name + '」';
    return leave(run);
  }
  function purchase(run, key, index) {
    if (run.phase !== 'shop') return run;
    const item = run.room.items.find((it) => it.key === key);
    if (!item || item.sold || run.gold < item.price) return run;
    switch (item.type) {
      case 'card':
        run.deck.push(item.id);
        break;
      case 'relic':
        if (run.relics.includes(item.id)) return run;
        run.relics.push(item.id);
        break;
      case 'tend':
        if (run.hp === run.maxHp) return run;
        heal(run, 15);
        break;
      case 'purge':
        if (!canRemove(run, index)) return run;
        run.deck.splice(index, 1);
        break;
      default:
        return run;
    }
    run.gold -= item.price;
    item.sold = true;
    return save(run);
  }
  function currentEvent(run) {
    return events.find((e) => e.id === run.room?.eventId);
  }
  function canRemove(run, index) {
    return Number.isInteger(index) && index >= 0 && index < run.deck.length && run.deck.length > 1;
  }
  function eventEnabled(run, effect) {
    const hasUpgrade = run.deck.some((_, i) => canUpgrade(run, i));
    switch (effect) {
      case 'tend':
        return run.gold >= 22 && run.hp < run.maxHp;
      case 'blood':
        return run.hp > 7;
      case 'lesson':
        return run.gold >= 24 && hasUpgrade;
      case 'erase':
        return run.hp > 5 && run.deck.length > 1;
      case 'salvage':
        return run.hp > 8 && freeRelics(run).length > 0;
      case 'purge':
        return run.deck.length > 1;
      case 'study':
        return run.hp > 4 && hasUpgrade;
      case 'respite':
        return run.hp < run.maxHp;
      case 'bloodcopy':
      case 'scripture':
        return run.hp > 6;
      case 'silvercopy':
        return run.gold >= 20;
      case 'salt':
        return run.gold >= 26;
      case 'astrology':
        return run.gold >= 32;
      case 'collect':
        return run.gold >= 45 && freeRelics(run).length > 0;
      default:
        return true;
    }
  }
  function event(run, id, index) {
    if (run.phase !== 'event') return run;
    const option = currentEvent(run).options.find((o) => o.id === id);
    if (!option || !eventEnabled(run, option.effect)) return run;
    const previousRelics = run.relics.length,
      previousDeck = run.deck.length;
    const originalCard = Number.isInteger(index) && run.deck[index] ? Engine.card(run.deck[index]).name : '';
    switch (option.effect) {
      case 'blood':
        run.hp -= 7;
        gainGold(run, 46);
        break;
      case 'tend':
        run.gold -= 22;
        heal(run, 16);
        break;
      case 'lesson':
      case 'study':
        if (!canUpgrade(run, index)) return run;
        upgrade(run, index);
        if (option.effect === 'lesson') run.gold -= 24;
        else run.hp -= 4;
        break;
      case 'erase':
      case 'purge':
        if (!canRemove(run, index)) return run;
        run.deck.splice(index, 1);
        if (option.effect === 'erase') run.hp -= 5;
        break;
      case 'vigor':
        run.maxHp += 5;
        run.hp += 5;
        break;
      case 'salvage':
        run.hp -= 8;
        run.relics.push(pick(run, freeRelics(run)));
        break;
      case 'wage':
        gainGold(run, 25);
        break;
      case 'respite':
        heal(run, 9);
        break;
      case 'bloodcopy':
      case 'silvercopy':
        if (!Number.isInteger(index) || !run.deck[index]) return run;
        if (option.effect === 'bloodcopy') run.hp -= 6;
        else run.gold -= 20;
        run.deck.push(run.deck[index]);
        break;
      case 'salt':
        run.gold -= 26;
        run.maxHp += 8;
        run.hp += 8;
        break;
      case 'scripture':
      case 'astrology':
        if (option.effect === 'scripture') run.hp -= 6;
        else run.gold -= 32;
        run.deck.push(
          pick(
            run,
            Engine.cards.filter((c) => c.rarity === 'rare'),
          ).id,
        );
        break;
      case 'collect':
        run.gold -= 45;
        run.relics.push(pick(run, freeRelics(run)));
        break;
      default:
        return run;
    }
    if (run.relics.length > previousRelics)
      run.notice = '获得遗物「' + Engine.relics[run.relics.at(-1)].name + '」';
    else if (run.deck.length > previousDeck) run.notice = '获得「' + Engine.card(run.deck.at(-1)).name + '」';
    else if (run.deck.length < previousDeck) run.notice = '已遗忘「' + originalCard + '」';
    else if (option.effect === 'lesson' || option.effect === 'study')
      run.notice = '已锤炼「' + Engine.card(run.deck[index]).name + '」';
    else run.notice = '已完成 · ' + option.name;
    return leave(run);
  }
  function leave(run) {
    if (!['event', 'shop', 'camp'].includes(run.phase)) return run;
    run.room = null;
    run.phase = 'map';
    return save(run);
  }
  return {
    acts,
    kinds,
    events,
    profile,
    newRun,
    load,
    save,
    currentNode,
    choices,
    enter,
    syncBattle,
    reward,
    continueAct,
    canUpgrade,
    camp,
    purchase,
    event,
    eventEnabled,
    currentEvent,
    leave,
    get storageFailed() {
      return pendingWrites.size > 0;
    },
  };
});
