'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const E = require('../game/engine.js');

function encounter(options = {}) {
  return E.createBattle({ seed: 47, ...options });
}
function fixedHand(keys, options = {}) {
  const b = encounter({ deck: keys, ...options });
  b.hand = keys.slice();
  b.draw = [];
  b.energy = 20;
  return b;
}
const allCards = (b) => [...b.hand, ...b.draw, ...b.discard, ...b.exhaust].sort();

test('the same file runs as a plain browser script and a CommonJS module', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve('../game/engine.js'), 'utf8'), context);
  assert.equal(context.Engine.cards.length, E.cards.length);
  assert.deepEqual(JSON.parse(JSON.stringify(context.Engine.createBattle({ seed: 47 }))), encounter());
});
test('first encounter teaches five different cards and previews a real attack', () => {
  const b = encounter();
  assert.deepEqual(b.hand, ['strike', 'ward', 'kindle', 'cinder', 'vigil']);
  assert.equal(b.ember, 2);
  assert.equal(b.enemy.intent.damage, 7);
  assert.equal(b.enemy.intent.hits, 1);
  E.playCard(b, 0);
  E.playCard(b, 0);
  E.endTurn(b);
  assert.equal(b.hp, b.maxHp - 2);
  assert.equal(b.block, 0);
  assert.equal(b.energy, 3);
  assert.equal(b.turn, 2);
});
test('every base and upgraded card resolves and conserves a physical copy', () => {
  assert.equal(new Set(E.cards.map((c) => c.id)).size, E.cards.length);
  for (const base of E.cards)
    for (const key of [base.key, E.upgrade(base.key)]) {
      const data = E.card(key);
      assert.ok(data.description && data.name && data.en && data.art, key);
      const deck = [key, 'strike', 'ward', 'brand', 'vigil', 'strike', 'vigil', 'cinder'];
      const b = encounter({ deck, enemy: 'eclipse' });
      b.hand = [key];
      b.draw = deck.slice(1);
      b.discard = [];
      b.ember = 6;
      assert.ok(E.canPlay(b, 0), key);
      assert.ok(E.playCard(b, 0), key);
      assert.deepEqual(allCards(b), [...deck].sort(), key);
      assert.ok(b.ember >= 0 && b.ember <= 6, key);
      assert.ok(b.energy >= 0, key);
    }
});
test('actions with unmet costs are atomic', () => {
  const b = fixedHand(['watchfire', 'sundering'], { relics: [] });
  b.energy = 1;
  for (const index of [0, 1, -1, 3, 0.5, '0']) {
    const saved = JSON.stringify(b);
    assert.ok(E.blockedReason(b, index));
    assert.equal(E.playCard(b, index), false);
    assert.equal(JSON.stringify(b), saved);
  }
});
test('shuffling, draw, hand limits and exhaust survive save-and-resume', () => {
  const b = encounter({
    deck: ['page+', 'prayer', 'kindle', 'strike', 'ward', 'brand', 'vigil'],
    seed: 'loop',
  });
  const twin = JSON.parse(JSON.stringify(b));
  for (let t = 0; t < 15 && b.status === 'active'; t++) {
    let index = b.hand.findIndex((_, i) => E.canPlay(b, i));
    for (let n = 0; n < 15 && index >= 0; n++) {
      E.playCard(b, index);
      E.playCard(twin, index);
      index = b.hand.findIndex((_, i) => E.canPlay(b, i));
    }
    E.endTurn(b);
    E.endTurn(twin);
    assert.deepEqual(b, twin);
    assert.equal(allCards(b).length, 7);
    assert.ok(b.hand.length <= 10);
  }
  const extra = encounter({ deck: Array(14).fill('processional+') });
  for (let i = 0; i < 3; i++) E.playCard(extra, 0);
  assert.equal(extra.hand.length, 10);
  assert.equal(extra.exhaust.length, 3);
  assert.equal(extra.ember, 6);
});
test('weak changes the displayed attack, burn pierces armor before retaliation', () => {
  const b = fixedHand(['clapper', 'brand']);
  E.playCard(b, 0);
  assert.equal(b.enemy.intent.damage, 5);
  E.playCard(b, 0);
  b.enemy.hp = 3;
  b.enemy.block = 99;
  b.hp = 1;
  E.endTurn(b);
  assert.equal(b.status, 'won');
  assert.equal(b.hp, 1);
  const saved = JSON.stringify(b);
  assert.equal(E.playCard(b, 0), false);
  assert.equal(E.endTurn(b), false);
  assert.equal(JSON.stringify(b), saved);
});
test('boss phase transitions after the telegraphed action', () => {
  for (const boss of ['choir', 'abbess', 'eclipse']) {
    const b = encounter({ enemy: boss });
    const original = b.enemy.intent.name;
    b.enemy.hp = Math.ceil(b.enemy.maxHp / 2) - 1;
    E.endTurn(b);
    assert.equal(b.lastAction.intent.name, original);
    assert.equal(b.enemy.enraged, true);
    assert.equal(b.enemy.intent.name, E.enemies[boss].rage[0].name);
  }
});
test('guard carryover, energy and draw relics apply at the right time', () => {
  const b = encounter({ relics: ['latch', 'tongue', 'script', 'rivet', 'veil', 'pin', 'wickbone'] });
  assert.equal(b.energy, 4);
  assert.equal(b.hand.length, 6);
  assert.equal(b.block, 9);
  assert.equal(b.strength, 1);
  assert.equal(b.ember, 1);
  b.block = 20;
  E.endTurn(b);
  assert.equal(b.energy, 3);
  assert.equal(b.block, 3);
  assert.equal(b.hand.length, 6);
  assert.equal(b.ember, 2);
  const c = fixedHand(['ironveil+', 'bulwark']);
  E.playCard(c, 0);
  E.playCard(c, 0);
  E.endTurn(c);
  assert.equal(c.block, 7);
});
test('multihit damage applies Strength, Weak and Vulnerable per hit', () => {
  const b = fixedHand(['shackle', 'needle', 'needle']);
  E.playCard(b, 0);
  const original = b.enemy.hp;
  b.strength = 2;
  b.weak = 1;
  E.playCard(b, 0);
  assert.equal(original - b.enemy.hp, 12);
  assert.equal(b.enemy.vulnerable, 2);
  E.endTurn(b);
  assert.equal(b.enemy.vulnerable, 1);
  assert.equal(b.weak, 0);
});
test('temporary powers remain in combat but leave the next battle clean', () => {
  const b = fixedHand(['martyr', 'procession', 'hymn', 'coronation', 'strike']);
  const deck = b.hand.slice();
  for (let i = 0; i < deck.length; i++) E.playCard(b, 0);
  assert.equal(b.exhaust.length, 4);
  assert.equal(b.enemy.burn, 2);
  E.endTurn(b);
  assert.equal(b.block, 3);
  assert.equal(b.ember, 3);
  assert.equal(b.strength, 1);
  const next = encounter({ deck });
  assert.equal(next.powers.kindling, 0);
  assert.equal(next.exhaust.length, 0);
});
test('conditional damage, forge spends, relic healing and lethal attacks', () => {
  const b = fixedHand(['emberspear+', 'cinder', 'watchfire', 'strike'], { relics: ['casket'] });
  b.hp = 10;
  b.ember = 5;
  E.playCard(b, 0);
  assert.equal(b.ember, 2);
  assert.equal(b.enemy.hp, 11);
  E.playCard(b, 0);
  assert.equal(b.enemy.hp, 4);
  E.playCard(b, 0);
  assert.equal(b.ember, 0);
  E.playCard(b, 0);
  assert.equal(b.status, 'won');
  assert.equal(b.hp, 14);
  const lost = encounter({ hp: 1 });
  E.endTurn(lost);
  assert.equal(lost.status, 'lost');
  assert.equal(lost.hp, 0);
});
