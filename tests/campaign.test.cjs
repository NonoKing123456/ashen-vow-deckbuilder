'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Campaign = require('../game/campaign.js');
const Engine = require('../game/engine.js');

function win(run) {
  run.battle.enemy.hp = 0;
  run.battle.status = 'won';
  return Campaign.syncBattle(run);
}

test('the seed determines route graph, first hand, battle and reward', () => {
  const a = Campaign.newRun({ seed: '炉火 731' }),
    b = Campaign.newRun({ seed: '炉火 731' });
  assert.notEqual(a.id, b.id);
  assert.deepEqual(a.route, b.route);
  assert.deepEqual(a.battle, b.battle);
  assert.equal(Campaign.currentNode(a).enemyId, 'bellkeeper');
  const visited = new Set(a.route[0].map((n) => n.id));
  for (const row of a.route)
    for (const n of row) {
      assert.ok(visited.has(n.id), 'all nodes can be reached from the beginning');
      n.next.forEach((id) => visited.add(id));
    }
  const blocked = a.route[3][0].id;
  Campaign.enter(a, blocked);
  assert.equal(a.floor, 1);
  win(a);
  win(b);
  assert.deepEqual(a.room, b.room);
  assert.equal(new Set(a.room.cards).size, 3);
  const gold = a.gold,
    size = a.deck.length;
  Campaign.syncBattle(a);
  assert.equal(a.gold, gold);
  Campaign.reward(a, 'unknown');
  assert.equal(a.phase, 'reward');
  Campaign.reward(a, a.room.cards[0]);
  assert.equal(a.deck.length, size + 1);
  Campaign.enter(a, blocked);
  assert.equal(a.floor, 1);
  Campaign.enter(a, Campaign.choices(a)[0].id);
  assert.equal(a.floor, 2);
});

test('mid-turn reload preserves the complete battle state and no card play is repeated', () => {
  const r = Campaign.newRun({ seed: 'save' });
  assert.ok(Engine.playCard(r.battle, 0));
  Campaign.syncBattle(r);
  const reloaded = Campaign.load();
  assert.deepEqual(r, reloaded);
  Engine.endTurn(r.battle);
  Engine.endTurn(reloaded.battle);
  assert.deepEqual(reloaded.battle, r.battle);
});

test('three-act path awards boss relics, heals between acts, archives once, and unlocks difficulty', () => {
  const r = Campaign.newRun({ seed: 'long-night' });
  const prior = Campaign.profile();
  let iterations = 0;
  while (r.phase !== 'victory' && iterations++ < 110) {
    switch (r.phase) {
      case 'combat':
        win(r);
        break;
      case 'reward':
        Campaign.reward(r, null);
        break;
      case 'map':
        Campaign.enter(r, Campaign.choices(r)[0].id);
        break;
      case 'transition': {
        assert.equal(r.actFloor, 8);
        r.hp = r.maxHp - 10;
        Campaign.continueAct(r);
        assert.equal(r.hp, r.maxHp - 4);
        assert.deepEqual(Campaign.choices(r), r.route[0]);
        break;
      }
      case 'shop':
      case 'camp':
      case 'event':
        Campaign.leave(r);
        break;
      default:
        assert.fail(r.phase);
    }
    assert.deepEqual(Campaign.load(), r);
  }
  assert.equal(r.phase, 'victory');
  assert.equal(r.floor, 24);
  assert.equal(r.path.length, 24);
  assert.equal(r.stats.bosses, 3);
  assert.equal(Campaign.profile().wins, prior.wins + 1);
  assert.equal(Campaign.profile().runs, prior.runs + 1);
  assert.ok(Campaign.profile().maxAscension >= 1);
  assert.equal(Campaign.newRun({ seed: r.seed, ascension: 1 }).battle.ascension, 1);
});

test('transactions reject invalid indices and double purchases', () => {
  const r = Campaign.newRun({ seed: 'wares' });
  const shop = r.route.flat().find((n) => n.type === 'shop');
  const preceding = r.route[shop.row - 1].find((n) => n.next.includes(shop.id));
  r.phase = 'map';
  r.nodeId = preceding.id;
  Campaign.enter(r, shop.id);
  assert.equal(r.phase, 'shop');
  assert.equal(r.room.items.length, 6);
  const saved = structuredClone(r);
  Campaign.purchase(r, 'purge', -1);
  assert.deepEqual(saved, r);
  r.gold = 0;
  Campaign.purchase(r, 'c0');
  assert.deepEqual(r.deck, saved.deck);
  r.gold = 100;
  Campaign.purchase(r, 'c0');
  const balance = r.gold;
  assert.equal(r.deck.length, saved.deck.length + 1);
  Campaign.purchase(r, 'c0');
  assert.equal(r.gold, balance);
  assert.equal(r.deck.length, saved.deck.length + 1);
  Campaign.purchase(r, 'purge', 0);
  assert.equal(r.deck.length, saved.deck.length);
  r.phase = 'camp';
  Campaign.camp(r, 'upgrade', 0);
  assert.ok(r.deck[0].endsWith('+'));
  assert.equal(r.stats.upgrades, 1);
  assert.equal(r.phase, 'map');
});
test('event effects are previewable and cannot spend lethal HP or incomplete costs', () => {
  const r = Campaign.newRun({ seed: 'moonfont' });
  r.phase = 'event';
  r.room = { eventId: 'scribe' };
  const gold = r.gold;
  Campaign.event(r, 'lesson', 999);
  assert.equal(r.gold, gold);
  assert.equal(r.phase, 'event');
  Campaign.event(r, 'lesson', 0);
  assert.equal(r.gold, gold - 24);
  assert.ok(r.deck[0].endsWith('+'));
  r.hp = 8;
  r.phase = 'event';
  r.room = { eventId: 'wellspring' };
  assert.equal(Campaign.eventEnabled(r, 'salvage'), false);
  Campaign.event(r, 'dive');
  assert.equal(r.hp, 8);
  const max = r.maxHp;
  Campaign.event(r, 'drink');
  assert.equal(r.maxHp, max + 5);
  assert.equal(r.hp, 13);
});
test('defeat is archived exactly once and the terminal state survives reload', () => {
  const r = Campaign.newRun({ seed: 'ash' });
  const prior = Campaign.profile();
  r.battle.status = 'lost';
  r.battle.hp = 0;
  Campaign.syncBattle(r);
  assert.equal(r.phase, 'defeat');
  assert.equal(Campaign.load().hp, 0);
  assert.equal(Campaign.load().phase, 'defeat');
  assert.equal(Campaign.profile().runs, prior.runs + 1);
  assert.equal(Campaign.profile().wins, prior.wins);
});
test('every event choice can resolve and unique event nodes are assigned within the act', () => {
  for (const e of Campaign.events)
    for (const option of e.options) {
      const r = Campaign.newRun({ seed: e.id });
      const eventIds = r.route
        .flat()
        .filter((n) => n.type === 'event')
        .map((n) => n.eventId);
      assert.equal(new Set(eventIds).size, eventIds.length);
      r.phase = 'event';
      r.room = { eventId: e.id };
      r.gold = 100;
      r.hp = 50;
      assert.equal(Campaign.eventEnabled(r, option.effect), true, e.id + ':' + option.id);
      Campaign.event(r, option.id, 0);
      assert.equal(r.phase, 'map', e.id + ':' + option.id);
      assert.ok(r.notice);
      assert.ok(r.hp > 0 && r.hp <= r.maxHp && r.gold >= 0);
      assert.ok(r.deck.every((k) => Engine.card(k).name));
      assert.ok(r.relics.every((k) => Engine.relics[k]));
    }
});

test('copies preserve the upgrade level, including after a save', () => {
  const r = Campaign.newRun({ seed: 'mirror' });
  r.phase = 'event';
  r.room = { eventId: 'mirror' };
  r.deck[0] = Engine.upgrade(r.deck[0]);
  const original = r.deck[0];
  Campaign.event(r, 'reflect', 0);
  assert.equal(r.deck.at(-1), original);
  assert.deepEqual(Campaign.load(), r);
});
test('a fresh browser context recovers a damaged primary save from its last committed snapshot', () => {
  const vm = require('node:vm');
  const fs = require('node:fs');
  const source = fs.readFileSync(require.resolve('../game/campaign.js'), 'utf8');
  const data = new Map();
  const storage = { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
  function reloadGame() {
    const context = vm.createContext({ Engine, localStorage: storage });
    vm.runInContext(source, context);
    return context.Campaign;
  }
  const campaign = reloadGame();
  const run = campaign.newRun({ seed: 'recover' });
  const firstHand = Array.from(run.battle.hand);
  Engine.playCard(run.battle, 0);
  campaign.syncBattle(run);
  data.set('ashenvow.expedition.v1', '{');
  const restored = reloadGame().load();
  assert.equal(restored.seed, 'recover');
  assert.deepEqual(Array.from(restored.battle.hand), firstHand);
  assert.equal(JSON.parse(data.get('ashenvow.expedition.v1')).battle.played, 0);
});
